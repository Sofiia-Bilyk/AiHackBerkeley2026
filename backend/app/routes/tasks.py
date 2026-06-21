from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from flask import Blueprint, request
from flask_login import current_user, login_required
from sqlalchemy import select

from ..extensions import db
from ..models import Event, Task
from ..services.community_execution_service import claim_task, reopen_task, report_task
from ..utils.errors import ApiError, api_success
from ..utils.memberships import require_active_membership
from ..utils.validation import json_body, required_string


tasks_bp = Blueprint("tasks", __name__)


@tasks_bp.get("/api/events/<int:event_id>/tasks")
@login_required
def list_event_tasks(event_id: int):
    event = _community_event(event_id)
    tasks = db.session.scalars(
        select(Task).where(Task.event_id == event.id).order_by(Task.due_at, Task.id)
    ).all()
    return api_success({"tasks": [task.to_dict() for task in tasks]})


@tasks_bp.get("/api/tasks/<int:task_id>")
@login_required
def get_task(task_id: int):
    return api_success({"task": _execution_task(task_id).to_dict()})


@tasks_bp.post("/api/tasks/<int:task_id>/claim")
@login_required
def claim(task_id: int):
    task = _active_task(task_id)
    restricted_until = current_user.restricted_until
    if restricted_until:
        if restricted_until.tzinfo is None:
            restricted_until = restricted_until.replace(tzinfo=timezone.utc)
        if restricted_until > datetime.now(timezone.utc):
            raise ApiError("FORBIDDEN", "You are temporarily restricted from claiming tasks.", 403)
    return api_success({"task": claim_task(task, current_user).to_dict()})


@tasks_bp.post("/api/tasks/<int:task_id>/unclaim")
@login_required
def unclaim(task_id: int):
    task = _active_task(task_id)
    if task.status != "claimed" or task.assignee_id != current_user.id:
        raise ApiError("FORBIDDEN", "Only the current assignee can unclaim this task.", 403)
    task.status = "open"
    task.assignee_id = None
    db.session.commit()
    return api_success({"task": task.to_dict()})


@tasks_bp.post("/api/tasks/<int:task_id>/report")
@login_required
def report(task_id: int):
    task = _active_task(task_id)
    data = json_body(request)
    report_text = required_string(data, "report_text", max_length=2000)
    task_report = report_task(task, current_user, report_text)
    return api_success({"task_report": task_report.to_dict(), "task": task.to_dict()}, 201)


@tasks_bp.post("/api/tasks/<int:task_id>/mark-done")
@login_required
def mark_done(task_id: int):
    task = _active_task(task_id)
    if current_user.id not in {task.assignee_id, task.event.organizer_id}:
        raise ApiError("FORBIDDEN", "Only the assignee or organizer can complete this task.", 403)
    if task.status != "claimed":
        raise ApiError("INVALID_STATE", "Only claimed tasks can be marked done.", 409)
    task.status = "done"
    task.self_reported_at = datetime.now(timezone.utc)
    db.session.commit()
    return api_success({"task": task.to_dict()})


@tasks_bp.post("/api/tasks/<int:task_id>/reopen")
@login_required
def reopen(task_id: int):
    task = _active_task(task_id, allow_completed=True)
    data = json_body(request)
    reason = required_string(data, "reason", max_length=1000)
    return api_success({"task": reopen_task(task, current_user, reason).to_dict()})


@tasks_bp.patch("/api/tasks/<int:task_id>")
@login_required
def update_task(task_id: int):
    task = _active_task(task_id)
    _require_organizer(task)
    if task.status in {"done", "cancelled"}:
        raise ApiError("INVALID_STATE", "Completed or cancelled tasks cannot be edited.", 409)
    data = json_body(request)
    if "title" in data:
        task.title = required_string(data, "title", max_length=200)
    if "description" in data:
        task.description = required_string(data, "description", max_length=2000)
    if "category" in data:
        category = required_string(data, "category", max_length=30)
        if category not in {"food", "decor", "venue", "setup", "cleanup", "outreach", "supplies", "transport", "other"}:
            raise ApiError("VALIDATION_ERROR", "Unsupported task category.")
        task.category = category
    if "priority" in data:
        priority = required_string(data, "priority", max_length=20)
        if priority not in {"low", "medium", "high"}:
            raise ApiError("VALIDATION_ERROR", "Unsupported task priority.")
        task.priority = priority
    if "due_at" in data:
        task.due_at = _datetime_value(data["due_at"])
    if "estimated_cost" in data:
        task.estimated_cost = _money_value(data["estimated_cost"])
    db.session.commit()
    return api_success({"task": task.to_dict()})


@tasks_bp.delete("/api/tasks/<int:task_id>")
@login_required
def delete_task(task_id: int):
    task = _active_task(task_id)
    _require_organizer(task)
    if task.status not in {"open", "cancelled"} or task.assignee_id is not None:
        raise ApiError("INVALID_STATE", "Only unassigned open or cancelled tasks can be deleted.", 409)
    db.session.delete(task)
    db.session.commit()
    return api_success()


def _community_event(event_id: int) -> Event:
    event = db.session.get(Event, event_id)
    if event is None:
        raise ApiError("NOT_FOUND", "Event not found.", 404)
    require_active_membership(current_user.id, event.community_id)
    return event


def _execution_task(task_id: int) -> Task:
    task = db.session.get(Task, task_id)
    if task is None or task.event_id is None:
        raise ApiError("NOT_FOUND", "Task not found.", 404)
    _community_event(task.event_id)
    return task


def _active_task(task_id: int, *, allow_completed: bool = False) -> Task:
    task = _execution_task(task_id)
    allowed_statuses = {"published", "completed"} if allow_completed else {"published"}
    if task.event.status not in allowed_statuses:
        raise ApiError("INVALID_STATE", "This event is not active.", 409)
    return task


def _require_organizer(task: Task) -> None:
    if task.event.organizer_id != current_user.id:
        raise ApiError("FORBIDDEN", "Only the event organizer can modify this task.", 403)


def _datetime_value(value) -> datetime | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ApiError("VALIDATION_ERROR", "'due_at' must be an ISO datetime or null.")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise ApiError("VALIDATION_ERROR", "'due_at' must be an ISO datetime or null.") from error
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _money_value(value) -> Decimal | None:
    if value is None:
        return None
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as error:
        raise ApiError("VALIDATION_ERROR", "'estimated_cost' must be a valid amount.") from error
    if not amount.is_finite() or amount < 0:
        raise ApiError("VALIDATION_ERROR", "'estimated_cost' must be zero or greater.")
    return amount.quantize(Decimal("0.01"))
