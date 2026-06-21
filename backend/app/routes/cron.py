from __future__ import annotations

from datetime import datetime, timedelta, timezone

from flask import Blueprint, request
from sqlalchemy import select

from ..extensions import db
from ..models import Task
from ..services.cultural_calendar_service import scan_cultural_calendar
from ..services.task_followup_service import followup_prompt
from ..utils.errors import ApiError, api_success
from ..utils.security import require_cron_secret


cron_bp = Blueprint("cron", __name__, url_prefix="/api/cron")


@cron_bp.post("/cultural-calendar-scan")
def cultural_calendar_scan():
    require_cron_secret()
    data = request.get_json(silent=True) or {}
    lookahead_days = data.get("lookahead_days", 45)
    if isinstance(lookahead_days, bool) or not isinstance(lookahead_days, int):
        raise ApiError("VALIDATION_ERROR", "'lookahead_days' must be an integer.")
    try:
        result = scan_cultural_calendar(lookahead_days=lookahead_days)
    except ValueError as error:
        raise ApiError("VALIDATION_ERROR", str(error)) from error
    return api_success(result)


@cron_bp.post("/task-followups")
def task_followups():
    require_cron_secret()
    deadline = datetime.now(timezone.utc) + timedelta(days=2)
    tasks = db.session.scalars(
        select(Task).where(
            Task.status == "claimed",
            Task.assignee_id.is_not(None),
            Task.due_at.is_not(None),
            Task.due_at <= deadline,
        ).order_by(Task.due_at)
    ).all()
    followups = [{"task_id": task.id, **followup_prompt(task)} for task in tasks]
    return api_success({"followups_created": len(followups), "followups": followups})
