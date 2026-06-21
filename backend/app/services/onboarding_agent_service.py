from __future__ import annotations

from ..extensions import db
from ..models import VoiceSession
from ..utils.normalization import normalize_location, normalize_nationality
from .agent_audit_service import complete_agent_run, fail_agent_run, start_agent_run
from .claude_service import complete_json
from .onboarding_service import complete_typed_onboarding
from .voice_session_service import finish_voice_session


PROFILE_FIELDS = {
    "name": 120,
    "location": 160,
    "primary_nationality": 120,
    "secondary_interest": 120,
    "preferred_language": 80,
}


def process_onboarding_transcript(voice_session: VoiceSession, transcript: str) -> dict:
    """Ask the onboarding agent for one validated tool call and execute it server-side."""
    user = voice_session.user
    run = start_agent_run(
        "onboarding",
        {"voice_session_id": voice_session.id, "transcript": transcript},
        user_id=user.id,
    )
    voice_session.transcript = _append_turn(voice_session.transcript, "User", transcript)
    generated = complete_json(
        """You are a concise voice onboarding agent. Ask one question at a time and support the user's language.
Never infer nationality. Confirm all details before completion. You may request one tool:
save_onboarding_details with partial profile arguments, or complete_onboarding with all required profile arguments.
Return {"response": string, "tool": null|string, "arguments": object}.""",
        (
            f"Known profile: name={user.name}, location={user.location}, "
            f"primary_nationality={user.primary_nationality}, secondary_interest={user.secondary_interest}, "
            f"preferred_language={user.preferred_language}.\nConversation:\n{voice_session.transcript}"
        ),
        max_tokens=700,
    )
    if generated is None:
        generated = {"response": _fallback_question(user), "tool": None, "arguments": {}}

    try:
        response = _required_agent_string(generated.get("response"), "response", 1000)
        tool = generated.get("tool")
        arguments = generated.get("arguments") or {}
        if not isinstance(arguments, dict):
            raise ValueError("Agent tool arguments must be an object")
        tool_result = _execute_tool(voice_session, tool, arguments)
        voice_session.transcript = _append_turn(voice_session.transcript, "Assistant", response)
        if tool == "complete_onboarding":
            finish_voice_session(voice_session, outcome="onboarding_completed")
        else:
            db.session.commit()
        output = {"response": response, "tool": tool, "tool_result": tool_result}
        complete_agent_run(run, output)
        return output
    except (TypeError, ValueError) as error:
        db.session.rollback()
        run = db.session.get(type(run), run.id)
        fail_agent_run(run, str(error))
        return {
            "response": "I couldn't safely save that. Please repeat the last detail.",
            "tool": None,
            "tool_result": None,
        }


def _execute_tool(voice_session: VoiceSession, tool, arguments: dict):
    if tool is None:
        return None
    if tool == "save_onboarding_details":
        saved = _validated_profile_arguments(arguments, require_all=False)
        for field, value in saved.items():
            setattr(voice_session.user, field, value)
        return {"saved_fields": sorted(saved)}
    if tool == "complete_onboarding":
        saved = _validated_profile_arguments(arguments, require_all=True)
        membership = complete_typed_onboarding(voice_session.user, **saved)
        voice_session.outcome = "onboarding_completed"
        return {"community_id": membership.community_id, "onboarding_status": "completed"}
    raise ValueError("Unsupported onboarding tool")


def _validated_profile_arguments(arguments: dict, *, require_all: bool) -> dict:
    required = {"name", "location", "primary_nationality", "preferred_language"}
    if require_all and not required.issubset(arguments):
        raise ValueError("Completion tool is missing required profile fields")
    if any(field not in PROFILE_FIELDS for field in arguments):
        raise ValueError("Completion tool contains unsupported profile fields")
    values = {}
    for field, max_length in PROFILE_FIELDS.items():
        if field not in arguments:
            continue
        value = arguments[field]
        if field == "secondary_interest" and value is None:
            values[field] = None
            continue
        value = _required_agent_string(value, field, max_length)
        if field == "location":
            value = normalize_location(value)
        elif field in {"primary_nationality", "secondary_interest"}:
            value = normalize_nationality(value)
        values[field] = value
    if require_all:
        values.setdefault("secondary_interest", None)
    return values


def _required_agent_string(value, field: str, max_length: int) -> str:
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > max_length:
        raise ValueError(f"Agent field '{field}' is invalid")
    return value.strip()


def _fallback_question(user) -> str:
    missing = (
        ("name", "What name should I use for you?"),
        ("location", "What city are you located in?"),
        ("primary_nationality", "What is your primary nationality?"),
        ("preferred_language", "What language do you prefer?"),
    )
    return next((question for field, question in missing if not getattr(user, field)), "Please confirm those details on screen to finish onboarding.")


def _append_turn(existing: str, speaker: str, text: str) -> str:
    return f"{existing}\n{speaker}: {text}".strip()
