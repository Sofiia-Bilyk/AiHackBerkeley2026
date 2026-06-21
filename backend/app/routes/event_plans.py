from __future__ import annotations

from datetime import date
from decimal import Decimal, InvalidOperation

from flask import Blueprint, request
from flask_login import current_user, login_required

from ..extensions import db
from ..models import EventPlan
from ..services.event_publishing_service import approve_plan, publish_plan
from ..services.plan_generation_service import generate_plan
from ..services.task_builder_service import generate_tasks
from ..services.venue_scout_service import research_venues
from ..utils.errors import ApiError, api_success
from ..utils.validation import json_body, optional_string, required_string


event_plans_bp = Blueprint("event_plans", __name__, url_prefix="/api/event-plans")


@event_plans_bp.get("/<int:plan_id>")
@login_required
def get_event_plan(plan_id: int):
    return api_success({"event_plan": _organizer_plan(plan_id).to_dict()})


@event_plans_bp.patch("/<int:plan_id>")
@login_required
def update_event_plan(plan_id: int):
    plan = _organizer_plan(plan_id)
    if plan.status in {"published", "cancelled"}:
        raise ApiError("INVALID_STATE", "Published or cancelled plans cannot be edited.", 409)
    data = json_body(request)
    if "title" in data:
        plan.title = required_string(data, "title", max_length=200)
    if "description" in data:
        plan.description = required_string(data, "description", max_length=5000)
    if "event_type" in data:
        plan.event_type = optional_string(data, "event_type", max_length=80)
    if "target_date" in data:
        plan.target_date = _date_value(data["target_date"], "target_date")
    if "expected_attendees" in data:
        plan.expected_attendees = _positive_int(data["expected_attendees"], "expected_attendees")
    if "budget_amount" in data:
        plan.budget_amount = _money_value(data["budget_amount"], "budget_amount")
    if "budget_currency" in data:
        plan.budget_currency = required_string(data, "budget_currency", max_length=3).upper()
    db.session.commit()
    return api_success({"event_plan": plan.to_dict()})


@event_plans_bp.post("/<int:plan_id>/generate-plan")
@login_required
def generate_event_plan(plan_id: int):
    plan = _mutable_plan(plan_id)
    data = json_body(request)
    plan = generate_plan(
        plan,
        budget_amount=_money_value(data.get("budget_amount"), "budget_amount"),
        expected_attendees=_positive_int(data.get("expected_attendees"), "expected_attendees"),
        constraints=optional_string(data, "constraints", max_length=2000),
    )
    return api_success({"event_plan": plan.to_dict()})


@event_plans_bp.post("/<int:plan_id>/research-venues")
@login_required
def research_event_plan_venues(plan_id: int):
    plan = _mutable_plan(plan_id)
    data = request.get_json(silent=True) or {}
    if "budget_amount" in data:
        plan.budget_amount = _money_value(data["budget_amount"], "budget_amount")
    if "expected_attendees" in data:
        plan.expected_attendees = _positive_int(data["expected_attendees"], "expected_attendees")
    preferences = optional_string(data, "venue_preferences", max_length=1000)
    db.session.flush()
    candidates = research_venues(plan, preferences=preferences)
    return api_success({"venue_candidates": [candidate.to_dict() for candidate in candidates]})


@event_plans_bp.post("/<int:plan_id>/generate-tasks")
@login_required
def generate_event_plan_tasks(plan_id: int):
    plan = _mutable_plan(plan_id)
    if plan.target_date is None:
        raise ApiError("VALIDATION_ERROR", "Generate or set the plan target date first.")
    tasks = generate_tasks(plan)
    return api_success({"tasks": [task.to_dict() for task in tasks]})


@event_plans_bp.post("/<int:plan_id>/approve")
@login_required
def approve_event_plan(plan_id: int):
    plan = _organizer_plan(plan_id)
    data = json_body(request)
    task_ids = _integer_list(data.get("approved_task_ids"), "approved_task_ids")
    budget_ids = _integer_list(data.get("approved_budget_item_ids", []), "approved_budget_item_ids")
    venue_id = _positive_int(data.get("selected_venue_candidate_id"), "selected_venue_candidate_id")
    plan = approve_plan(plan, task_ids=task_ids, venue_id=venue_id, budget_item_ids=budget_ids)
    return api_success({"event_plan": plan.to_dict()})


@event_plans_bp.post("/<int:plan_id>/publish")
@login_required
def publish_event_plan(plan_id: int):
    event = publish_plan(_organizer_plan(plan_id))
    return api_success({"event": event.to_dict()}, 201)


@event_plans_bp.post("/<int:plan_id>/cancel")
@login_required
def cancel_event_plan(plan_id: int):
    plan = _organizer_plan(plan_id)
    if plan.status == "published":
        raise ApiError("INVALID_STATE", "Cancel the published event through the event route.", 409)
    if plan.status == "cancelled":
        raise ApiError("INVALID_STATE", "The event plan is already cancelled.", 409)
    plan.status = "cancelled"
    db.session.commit()
    return api_success({"event_plan": plan.to_dict()})


def _organizer_plan(plan_id: int) -> EventPlan:
    plan = db.session.get(EventPlan, plan_id)
    if plan is None:
        raise ApiError("NOT_FOUND", "Event plan not found.", 404)
    if plan.organizer_id != current_user.id:
        raise ApiError("FORBIDDEN", "Only the plan organizer can access this workspace.", 403)
    return plan


def _mutable_plan(plan_id: int) -> EventPlan:
    plan = _organizer_plan(plan_id)
    if plan.status in {"approved", "published", "cancelled"}:
        raise ApiError("INVALID_STATE", "This plan can no longer be regenerated.", 409)
    return plan


def _positive_int(value, field: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ApiError("VALIDATION_ERROR", f"'{field}' must be a positive integer.")
    return value


def _money_value(value, field: str) -> Decimal:
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as error:
        raise ApiError("VALIDATION_ERROR", f"'{field}' must be a valid amount.") from error
    if not amount.is_finite() or amount < 0:
        raise ApiError("VALIDATION_ERROR", f"'{field}' must be zero or greater.")
    return amount.quantize(Decimal("0.01"))


def _date_value(value, field: str) -> date:
    if not isinstance(value, str):
        raise ApiError("VALIDATION_ERROR", f"'{field}' must be an ISO date.")
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise ApiError("VALIDATION_ERROR", f"'{field}' must be an ISO date.") from error


def _integer_list(value, field: str) -> list[int]:
    if not isinstance(value, list) or any(
        isinstance(item, bool) or not isinstance(item, int) or item <= 0 for item in value
    ):
        raise ApiError("VALIDATION_ERROR", f"'{field}' must be a list of positive integers.")
    if len(value) != len(set(value)):
        raise ApiError("VALIDATION_ERROR", f"'{field}' cannot contain duplicates.")
    return value
