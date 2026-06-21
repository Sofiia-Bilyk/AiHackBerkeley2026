from __future__ import annotations

from datetime import date, datetime, timezone

from flask import Blueprint, request
from flask_login import current_user, login_required
from sqlalchemy import select

from ..extensions import db
from ..models import CommunityMembership, Event
from ..services.community_execution_service import check_in, upsert_rsvp
from ..utils.errors import ApiError, api_success
from ..utils.memberships import require_active_membership
from ..utils.validation import json_body, optional_string, required_string


events_bp = Blueprint("events", __name__, url_prefix="/api/events")
EVENT_STATUSES = {"published", "completed", "cancelled"}


@events_bp.get("")
@login_required
def list_events():
    community_ids = select(CommunityMembership.community_id).where(
        CommunityMembership.user_id == current_user.id,
        CommunityMembership.status == "active",
    )
    query = select(Event).where(Event.community_id.in_(community_ids)).order_by(Event.date)
    status = request.args.get("status", "").strip()
    if status:
        if status not in EVENT_STATUSES:
            raise ApiError("VALIDATION_ERROR", "Unsupported event status.")
        query = query.where(Event.status == status)
    events = db.session.scalars(query).all()
    return api_success({"events": [event.to_dict() for event in events]})


@events_bp.get("/<int:event_id>")
@login_required
def get_event(event_id: int):
    return api_success({"event": _community_event(event_id).to_dict()})


@events_bp.patch("/<int:event_id>")
@login_required
def update_event(event_id: int):
    event = _organizer_event(event_id)
    if event.status != "published":
        raise ApiError("INVALID_STATE", "Only published events can be edited.", 409)
    data = json_body(request)
    if "title" in data:
        event.title = required_string(data, "title", max_length=200)
    if "description" in data:
        event.description = required_string(data, "description", max_length=5000)
    if "event_type" in data:
        event.event_type = optional_string(data, "event_type", max_length=80)
    if "date" in data:
        event.date = _date_value(data["date"])
    if "venue_name" in data:
        event.venue_name = optional_string(data, "venue_name", max_length=200)
    if "venue_address" in data:
        event.venue_address = optional_string(data, "venue_address", max_length=300)
    db.session.commit()
    return api_success({"event": event.to_dict()})


@events_bp.post("/<int:event_id>/rsvp")
@login_required
def rsvp(event_id: int):
    event = _active_event(event_id)
    data = json_body(request)
    status = required_string(data, "status", max_length=10)
    if status not in {"yes", "no", "maybe"}:
        raise ApiError("VALIDATION_ERROR", "RSVP status must be 'yes', 'no', or 'maybe'.")
    return api_success({"rsvp": upsert_rsvp(event, current_user, status).to_dict()})


@events_bp.post("/<int:event_id>/check-in")
@login_required
def event_check_in(event_id: int):
    record = check_in(_active_event(event_id), current_user)
    return api_success({"attendance": record.to_dict()})


@events_bp.post("/<int:event_id>/complete")
@login_required
def complete_event(event_id: int):
    event = _organizer_event(event_id)
    if event.status != "published":
        raise ApiError("INVALID_STATE", "Only published events can be completed.", 409)
    data = json_body(request)
    count = data.get("attendance_count")
    if isinstance(count, bool) or not isinstance(count, int) or count < 0:
        raise ApiError("VALIDATION_ERROR", "'attendance_count' must be zero or greater.")
    event.attendance_count = count
    event.completion_notes = optional_string(data, "notes", max_length=5000)
    event.completed_at = datetime.now(timezone.utc)
    event.status = "completed"
    db.session.commit()
    return api_success({"event": event.to_dict()})


@events_bp.post("/<int:event_id>/cancel")
@login_required
def cancel_event(event_id: int):
    event = _organizer_event(event_id)
    if event.status != "published":
        raise ApiError("INVALID_STATE", "Only published events can be cancelled.", 409)
    event.status = "cancelled"
    for task in event.tasks:
        if task.status in {"open", "claimed"}:
            task.status = "cancelled"
            task.assignee_id = None
    db.session.commit()
    return api_success({"event": event.to_dict()})


def _community_event(event_id: int) -> Event:
    event = db.session.get(Event, event_id)
    if event is None:
        raise ApiError("NOT_FOUND", "Event not found.", 404)
    require_active_membership(current_user.id, event.community_id)
    return event


def _active_event(event_id: int) -> Event:
    event = _community_event(event_id)
    if event.status != "published":
        raise ApiError("INVALID_STATE", "This event is not active.", 409)
    return event


def _organizer_event(event_id: int) -> Event:
    event = _community_event(event_id)
    if event.organizer_id != current_user.id:
        raise ApiError("FORBIDDEN", "Only the event organizer can perform this action.", 403)
    return event


def _date_value(value) -> date:
    if not isinstance(value, str):
        raise ApiError("VALIDATION_ERROR", "'date' must be an ISO date.")
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise ApiError("VALIDATION_ERROR", "'date' must be an ISO date.") from error
