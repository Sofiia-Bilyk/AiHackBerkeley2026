from __future__ import annotations

from flask import Blueprint, request
from flask_login import current_user, login_required
from sqlalchemy import or_, select

from ..extensions import db
from ..models import Community, CommunityMembership, EventSuggestion
from ..services.event_orchestrator_service import suggestion_from_user_request
from ..services.event_suggestion_service import accept_suggestion, dismiss_suggestion
from ..utils.errors import ApiError, api_success
from ..utils.memberships import require_active_membership
from ..utils.validation import json_body, optional_string, required_string


event_suggestions_bp = Blueprint(
    "event_suggestions", __name__, url_prefix="/api/event-suggestions"
)


@event_suggestions_bp.get("")
@login_required
def list_event_suggestions():
    community_ids = select(CommunityMembership.community_id).where(
        CommunityMembership.user_id == current_user.id,
        CommunityMembership.status == "active",
    )
    query = (
        select(EventSuggestion)
        .where(
            EventSuggestion.community_id.in_(community_ids),
            or_(
                EventSuggestion.suggested_for_user_id.is_(None),
                EventSuggestion.suggested_for_user_id == current_user.id,
            ),
        )
        .order_by(EventSuggestion.created_at.desc())
    )
    status = request.args.get("status", "").strip()
    if status:
        if status not in {"pending", "accepted", "dismissed", "expired"}:
            raise ApiError("VALIDATION_ERROR", "Unsupported suggestion status.")
        query = query.where(EventSuggestion.status == status)
    suggestions = db.session.scalars(query).all()
    return api_success({"event_suggestions": [item.to_dict() for item in suggestions]})


@event_suggestions_bp.post("/generate")
@login_required
def generate_event_suggestion():
    data = json_body(request)
    community_id = data.get("community_id")
    if isinstance(community_id, bool) or not isinstance(community_id, int):
        raise ApiError("VALIDATION_ERROR", "'community_id' must be an integer.")
    source_type = required_string(data, "source_type", max_length=40)
    if source_type != "user_request":
        raise ApiError(
            "VALIDATION_ERROR", "The public generation route only supports 'user_request'."
        )
    prompt = required_string(data, "prompt", max_length=2000)
    require_active_membership(current_user.id, community_id)
    community = db.session.get(Community, community_id)
    if community is None:
        raise ApiError("NOT_FOUND", "Community not found.", 404)

    suggestion = suggestion_from_user_request(community, current_user, prompt=prompt)
    db.session.add(suggestion)
    db.session.commit()
    return api_success({"event_suggestion": suggestion.to_dict()}, 201)


@event_suggestions_bp.post("/<int:suggestion_id>/accept")
@login_required
def accept_event_suggestion(suggestion_id: int):
    suggestion = _accessible_suggestion(suggestion_id)
    plan = accept_suggestion(suggestion, current_user)
    return api_success({"event_plan": plan.to_dict()})


@event_suggestions_bp.post("/<int:suggestion_id>/dismiss")
@login_required
def dismiss_event_suggestion(suggestion_id: int):
    data = request.get_json(silent=True) or {}
    optional_string(data, "reason", max_length=500)
    suggestion = _accessible_suggestion(suggestion_id)
    dismiss_suggestion(suggestion)
    return api_success({"event_suggestion": suggestion.to_dict()})


def _accessible_suggestion(suggestion_id: int) -> EventSuggestion:
    suggestion = db.session.get(EventSuggestion, suggestion_id)
    if suggestion is None:
        raise ApiError("NOT_FOUND", "Event suggestion not found.", 404)
    require_active_membership(current_user.id, suggestion.community_id)
    if (
        suggestion.suggested_for_user_id is not None
        and suggestion.suggested_for_user_id != current_user.id
    ):
        raise ApiError("FORBIDDEN", "This suggestion belongs to another user.", 403)
    return suggestion
