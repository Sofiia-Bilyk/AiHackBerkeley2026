from __future__ import annotations

from decimal import Decimal, InvalidOperation

from flask import Blueprint, current_app, request

from ..extensions import db
from ..models import Community, CommunityMembership, EventPlan, Task, User
from ..services.agent_audit_service import complete_agent_run, fail_agent_run, start_agent_run
from ..services.event_orchestrator_service import suggestion_from_user_request
from ..services.plan_generation_service import generate_plan
from ..services.task_builder_service import generate_tasks
from ..services.task_followup_service import followup_prompt, process_followup_response
from ..services.twilio_service import place_outbound_call
from ..services.venue_scout_service import research_venues
from ..utils.errors import ApiError, api_success
from ..utils.security import require_cron_secret
from ..utils.validation import json_body, optional_string


agents_bp = Blueprint("agents", __name__, url_prefix="/api/agents")


@agents_bp.post("/event-orchestrator/suggest")
def event_orchestrator_suggest():
    require_cron_secret()
    data = json_body(request)
    community_id = _integer(data.get("community_id"), "community_id")
    user_id = _integer(data.get("user_id"), "user_id")
    prompt = data.get("prompt")
    if not isinstance(prompt, str) or not prompt.strip() or len(prompt.strip()) > 2000:
        raise ApiError("VALIDATION_ERROR", "'prompt' is required.")
    community = db.session.get(Community, community_id)
    user = db.session.get(User, user_id)
    membership = db.session.scalar(db.select(CommunityMembership.id).where(
        CommunityMembership.community_id == community_id,
        CommunityMembership.user_id == user_id,
        CommunityMembership.status == "active",
    ))
    if community is None or user is None or membership is None:
        raise ApiError("NOT_FOUND", "Active user and community context is required.", 404)
    run = start_agent_run("event_orchestrator", data, community_id=community_id, user_id=user_id)
    try:
        suggestion = suggestion_from_user_request(community, user, prompt=prompt.strip())
        db.session.add(suggestion)
        db.session.commit()
        output = {"event_suggestion": suggestion.to_dict()}
        complete_agent_run(run, output)
        return api_success(output, 201)
    except Exception as error:
        db.session.rollback()
        fail_agent_run(run, str(error))
        raise


@agents_bp.post("/event-orchestrator/plan")
def event_orchestrator_plan():
    require_cron_secret()
    data = json_body(request)
    plan = _plan(data.get("event_plan_id"))
    run = start_agent_run("event_orchestrator", data, community_id=plan.community_id, user_id=plan.organizer_id, event_plan_id=plan.id)
    try:
        generated = generate_plan(
            plan,
            budget_amount=_amount(data.get("budget_amount")),
            expected_attendees=_integer(data.get("expected_attendees"), "expected_attendees"),
            constraints=optional_string(data, "constraints", max_length=2000),
        )
        output = {"event_plan": generated.to_dict()}
        complete_agent_run(run, output)
        return api_success(output)
    except Exception as error:
        fail_agent_run(run, str(error))
        raise


@agents_bp.post("/venue-scout/research")
def venue_scout_research():
    require_cron_secret()
    data = json_body(request)
    plan = _plan(data.get("event_plan_id"))
    run = start_agent_run("venue_scout", data, community_id=plan.community_id, user_id=plan.organizer_id, event_plan_id=plan.id)
    try:
        candidates = research_venues(
            plan, preferences=optional_string(data, "venue_preferences", max_length=1000)
        )
        output = {"venue_candidates": [candidate.to_dict() for candidate in candidates]}
        complete_agent_run(run, output)
        return api_success(output)
    except Exception as error:
        db.session.rollback()
        fail_agent_run(run, str(error))
        raise


@agents_bp.post("/task-builder/generate")
def task_builder_generate():
    require_cron_secret()
    data = json_body(request)
    plan = _plan(data.get("event_plan_id"))
    run = start_agent_run("task_builder", data, community_id=plan.community_id, user_id=plan.organizer_id, event_plan_id=plan.id)
    try:
        tasks = generate_tasks(plan)
        output = {"tasks": [task.to_dict() for task in tasks]}
        complete_agent_run(run, output)
        return api_success(output)
    except Exception as error:
        db.session.rollback()
        fail_agent_run(run, str(error))
        raise


@agents_bp.post("/task-coordinator/follow-up")
def task_coordinator_follow_up():
    require_cron_secret()
    data = json_body(request)
    task_id = data.get("task_id")
    if isinstance(task_id, bool) or not isinstance(task_id, int):
        raise ApiError("VALIDATION_ERROR", "'task_id' must be an integer.")
    task = db.session.get(Task, task_id)
    if task is None or task.status != "claimed" or task.assignee_id is None:
        raise ApiError("INVALID_STATE", "Task must be claimed before follow-up.", 409)
    response_text = optional_string(data, "response_text", max_length=2000)
    assignee = db.session.get(User, task.assignee_id)
    if assignee is None:
        raise ApiError("NOT_FOUND", "Task assignee not found.", 404)
    if response_text:
        result = process_followup_response(task, assignee, response_text, channel="text")
    else:
        result = followup_prompt(task)
        if data.get("place_call") is True:
            webhook = f"{current_app.config['PUBLIC_BASE_URL'].rstrip('/')}/api/twilio/task-followup?task_id={task.id}"
            result["call"] = place_outbound_call(to=assignee.phone_number, webhook_url=webhook)
    return api_success(result)


def _plan(value) -> EventPlan:
    plan_id = _integer(value, "event_plan_id")
    plan = db.session.get(EventPlan, plan_id)
    if plan is None:
        raise ApiError("NOT_FOUND", "Event plan not found.", 404)
    if plan.status in {"approved", "published", "cancelled"}:
        raise ApiError("INVALID_STATE", "This plan cannot be regenerated.", 409)
    return plan


def _integer(value, field: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ApiError("VALIDATION_ERROR", f"'{field}' must be a positive integer.")
    return value


def _amount(value) -> Decimal:
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as error:
        raise ApiError("VALIDATION_ERROR", "'budget_amount' must be valid.") from error
    if not amount.is_finite() or amount < 0:
        raise ApiError("VALIDATION_ERROR", "'budget_amount' must be zero or greater.")
    return amount.quantize(Decimal("0.01"))
