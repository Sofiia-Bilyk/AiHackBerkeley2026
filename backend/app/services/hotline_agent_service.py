from __future__ import annotations

from datetime import date

from sqlalchemy import select

from ..extensions import db
from ..models import CommunityMembership, Event, Task, User
from ..utils.errors import ApiError
from .agent_audit_service import complete_agent_run, fail_agent_run, start_agent_run
from .claude_service import complete_json
from .community_execution_service import claim_task, report_task, upsert_rsvp


def handle_hotline_request(user: User, speech: str) -> dict:
    """Resolve one hotline utterance through a validated, limited tool set."""
    community_ids = db.session.scalars(
        select(CommunityMembership.community_id).where(
            CommunityMembership.user_id == user.id,
            CommunityMembership.status == "active",
        )
    ).all()
    events = db.session.scalars(
        select(Event).where(
            Event.community_id.in_(community_ids),
            Event.status == "published",
            Event.date >= date.today(),
        ).order_by(Event.date)
    ).all()
    tasks = db.session.scalars(
        select(Task).join(Event).where(
            Event.community_id.in_(community_ids),
            Event.status == "published",
            Task.status.in_(("open", "claimed")),
        )
    ).all()
    run = start_agent_run(
        "hotline",
        {"speech": speech, "events": [event.to_dict() for event in events], "tasks": [task.to_dict() for task in tasks]},
        user_id=user.id,
        community_id=community_ids[0] if community_ids else None,
    )
    generated = complete_json(
        "You are a concise phone hotline. Select at most one allowed action: list_events, rsvp, list_tasks, claim_task, report_task, or help.",
        (
            f"User said: {speech}\nReturn response plus action and arguments. "
            "IDs and statuses must come from the supplied context.\n"
            f"Events: {[event.to_dict() for event in events]}\nTasks: {[task.to_dict() for task in tasks]}"
        ),
        max_tokens=600,
    ) or _fallback_hotline_action(speech)
    try:
        result = _execute_hotline_action(user, events, tasks, generated)
        complete_agent_run(run, result)
        return result
    except (ApiError, TypeError, ValueError) as error:
        fail_agent_run(run, str(error))
        return {"response": "I could not safely complete that request. Please try again in the app.", "action": "help"}


def _execute_hotline_action(user: User, events: list[Event], tasks: list[Task], generated: dict) -> dict:
    response = generated.get("response")
    action = generated.get("action", "help")
    arguments = generated.get("arguments") or {}
    if not isinstance(response, str) or not response.strip() or not isinstance(arguments, dict):
        raise ValueError("Invalid hotline agent output")
    event_map = {event.id: event for event in events}
    task_map = {task.id: task for task in tasks}
    tool_result = None
    if action == "rsvp":
        event = event_map.get(arguments.get("event_id"))
        status = arguments.get("status")
        if event is None or status not in {"yes", "no", "maybe"}:
            raise ValueError("Invalid RSVP tool arguments")
        tool_result = upsert_rsvp(event, user, status).to_dict()
    elif action == "claim_task":
        task = task_map.get(arguments.get("task_id"))
        if task is None:
            raise ValueError("Invalid task claim arguments")
        tool_result = claim_task(task, user).to_dict()
    elif action == "report_task":
        task = task_map.get(arguments.get("task_id"))
        report_text = arguments.get("report_text")
        if task is None or not isinstance(report_text, str) or not report_text.strip():
            raise ValueError("Invalid task report arguments")
        tool_result = report_task(task, user, report_text.strip()).to_dict()
    elif action not in {"list_events", "list_tasks", "help"}:
        raise ValueError("Unsupported hotline action")
    return {"response": response.strip(), "action": action, "tool_result": tool_result}


def _fallback_hotline_action(speech: str) -> dict:
    lowered = speech.lower()
    if "event" in lowered:
        return {"response": "You can review your upcoming community events in the Connect app.", "action": "list_events", "arguments": {}}
    if "task" in lowered:
        return {"response": "You can review and claim your open tasks in the Connect app.", "action": "list_tasks", "arguments": {}}
    return {"response": "I can help with events, RSVPs, and volunteer tasks. What would you like to do?", "action": "help", "arguments": {}}
