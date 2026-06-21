from __future__ import annotations

from flask import Blueprint, request
from flask_login import current_user, login_required

from ..services.onboarding_service import complete_typed_onboarding
from ..services.voice_session_service import create_voice_session, finish_voice_session, require_owned_voice_session
from ..utils.errors import ApiError, api_success
from ..utils.validation import json_body, optional_string, required_string


onboarding_bp = Blueprint("onboarding", __name__, url_prefix="/api/onboarding")


@onboarding_bp.post("/start-voice")
@login_required
def start_voice_onboarding():
    data = request.get_json(silent=True) or {}
    language_hint = optional_string(data, "language_hint", max_length=20)
    voice_session = create_voice_session(
        current_user.id, agent_type="onboarding", mode="browser", language_hint=language_hint
    )
    return api_success({
        "voice_session_id": voice_session.id,
        "websocket_url": f"/api/voice/stream?session_id={voice_session.id}",
    }, 201)


@onboarding_bp.post("/typed")
@login_required
def typed_onboarding():
    data = json_body(request)
    membership = complete_typed_onboarding(
        current_user,
        name=required_string(data, "name", max_length=120),
        location=required_string(data, "location", max_length=160),
        primary_nationality=required_string(data, "primary_nationality", max_length=120),
        secondary_interest=optional_string(data, "secondary_interest", max_length=120),
        preferred_language=required_string(data, "preferred_language", max_length=80),
    )
    return api_success(
        {
            "user": current_user.to_dict(),
            "community": membership.community.to_dict(),
            "membership": membership.to_dict(),
        }
    )


@onboarding_bp.post("/complete")
@login_required
def complete_voice_onboarding():
    data = json_body(request)
    voice_session_id = data.get("voice_session_id")
    if isinstance(voice_session_id, bool) or not isinstance(voice_session_id, int):
        raise ApiError("VALIDATION_ERROR", "'voice_session_id' must be an integer.")
    voice_session = require_owned_voice_session(voice_session_id, current_user.id)
    if voice_session.status != "active":
        raise ApiError("INVALID_STATE", "Voice session is not active.", 409)
    membership = complete_typed_onboarding(
        current_user,
        name=required_string(data, "name", max_length=120),
        location=required_string(data, "location", max_length=160),
        primary_nationality=required_string(data, "primary_nationality", max_length=120),
        secondary_interest=optional_string(data, "secondary_interest", max_length=120),
        preferred_language=required_string(data, "preferred_language", max_length=80),
    )
    finish_voice_session(voice_session, outcome="onboarding_completed")
    return api_success({
        "user": current_user.to_dict(),
        "community": membership.community.to_dict(),
        "membership": membership.to_dict(),
        "voice_session": voice_session.to_dict(),
    })


@onboarding_bp.get("/status")
@login_required
def onboarding_status():
    return api_success({"onboarding_status": current_user.onboarding_status})
