from __future__ import annotations

from datetime import date

from ..extensions import db
from ..models import CulturalMoment, EventPlan, EventSuggestion, User
from ..utils.errors import ApiError
from .cultural_calendar_service import next_occurrence


def accept_suggestion(suggestion: EventSuggestion, organizer: User) -> EventPlan:
    """Accept a pending suggestion and create its private draft planning workspace."""
    if suggestion.status != "pending":
        raise ApiError("INVALID_STATE", "Only pending suggestions can be accepted.", 409)

    event_type = None
    target_date = None
    if suggestion.source_type == "cultural_calendar" and suggestion.source_ref_id:
        moment = db.session.get(CulturalMoment, suggestion.source_ref_id)
        if moment:
            event_type = (
                moment.suggested_event_types_json[0]
                if moment.suggested_event_types_json
                else None
            )
            target_date = next_occurrence(moment, date.today())

    plan = EventPlan(
        suggestion=suggestion,
        community_id=suggestion.community_id,
        organizer_id=organizer.id,
        title=suggestion.title,
        description=suggestion.description,
        event_type=event_type,
        target_date=target_date,
        status="draft",
    )
    suggestion.status = "accepted"
    db.session.add(plan)
    db.session.commit()
    return plan


def dismiss_suggestion(suggestion: EventSuggestion) -> EventSuggestion:
    """Dismiss a pending suggestion without creating public or planning records."""
    if suggestion.status != "pending":
        raise ApiError("INVALID_STATE", "Only pending suggestions can be dismissed.", 409)
    suggestion.status = "dismissed"
    db.session.commit()
    return suggestion
