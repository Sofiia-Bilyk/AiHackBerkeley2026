from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import update

from ..extensions import db
from ..models import Attendance, Event, RSVP, Task, TaskReport, User
from ..utils.errors import ApiError
from .task_coordinator_service import evaluate_task_report


def upsert_rsvp(event: Event, user: User, status: str) -> RSVP:
    rsvp = db.session.scalar(
        db.select(RSVP).where(RSVP.event_id == event.id, RSVP.user_id == user.id)
    )
    if rsvp is None:
        rsvp = RSVP(event_id=event.id, user_id=user.id, status=status)
        db.session.add(rsvp)
    else:
        rsvp.status = status
    db.session.commit()
    return rsvp


def check_in(event: Event, user: User) -> Attendance:
    record = db.session.scalar(
        db.select(Attendance).where(
            Attendance.event_id == event.id, Attendance.user_id == user.id
        )
    )
    if record is None:
        record = Attendance(event_id=event.id, user_id=user.id)
        db.session.add(record)
    record.status = "attended"
    record.checked_in_at = datetime.now(timezone.utc)
    db.session.commit()
    return record


def claim_task(task: Task, user: User) -> Task:
    result = db.session.execute(
        update(Task)
        .where(Task.id == task.id, Task.status == "open")
        .values(status="claimed", assignee_id=user.id)
    )
    if result.rowcount != 1:
        db.session.rollback()
        raise ApiError("INVALID_STATE", "Only open tasks can be claimed.", 409)
    db.session.commit()
    return db.session.get(Task, task.id)


def report_task(task: Task, user: User, report_text: str) -> TaskReport:
    if task.status != "claimed" or task.assignee_id != user.id:
        raise ApiError("FORBIDDEN", "Only the member who claimed this task can report it.", 403)
    status = evaluate_task_report(task_title=task.title, report_text=report_text)
    report = TaskReport(
        task_id=task.id,
        reporter_id=user.id,
        report_text=report_text,
        status=status,
    )
    db.session.add(report)
    if status == "accepted":
        task.status = "done"
        task.self_reported_at = datetime.now(timezone.utc)
    db.session.commit()
    return report


def reopen_task(task: Task, actor: User, reason: str) -> Task:
    previous_status = task.status
    previous_assignee_id = task.assignee_id
    if actor.id not in {task.assignee_id, task.event.organizer_id}:
        raise ApiError("FORBIDDEN", "Only the assignee or organizer can reopen this task.", 403)
    if task.status not in {"claimed", "failed", "done"}:
        raise ApiError("INVALID_STATE", "This task cannot be reopened.", 409)
    task.status = "open"
    task.assignee_id = None
    task.self_reported_at = None
    if previous_assignee_id is not None and previous_status in {"claimed", "failed"}:
        assignee = db.session.get(User, previous_assignee_id)
        if assignee:
            assignee.task_failure_count += 1
    if previous_assignee_id is not None:
        db.session.add(
            TaskReport(
                task_id=task.id,
                reporter_id=actor.id,
                report_text=reason,
                status="needs_followup",
            )
        )
    db.session.commit()
    return task
