from __future__ import annotations

from sqlalchemy import select

from ..extensions import db
from ..models import AgentInteraction, CommunityMembership, VoiceSession
from ..utils.errors import ApiError


def create_voice_session(user_id: int, *, agent_type: str, mode: str, language_hint: str | None = None, external_id: str | None = None) -> VoiceSession:
    """Create one active browser or Twilio voice-agent session."""
    if external_id:
        query = select(VoiceSession).where(VoiceSession.external_id == external_id)
    else:
        query = select(VoiceSession).where(
            VoiceSession.user_id == user_id,
            VoiceSession.agent_type == agent_type,
            VoiceSession.mode == mode,
            VoiceSession.status == "active",
        )
    existing = db.session.scalar(query)
    if existing:
        return existing
    voice_session = VoiceSession(
        user_id=user_id,
        agent_type=agent_type,
        mode=mode,
        language_hint=language_hint,
        external_id=external_id,
    )
    db.session.add(voice_session)
    db.session.commit()
    return voice_session


def finish_voice_session(voice_session: VoiceSession, *, status: str = "completed", outcome: str | None = None) -> VoiceSession:
    """Close a voice session and persist its transcript as an interaction."""
    if voice_session.status != "active" and status == "completed":
        return voice_session
    voice_session.status = status
    voice_session.outcome = outcome or voice_session.outcome
    community_id = db.session.scalar(
        select(CommunityMembership.community_id).where(
            CommunityMembership.user_id == voice_session.user_id,
            CommunityMembership.status == "active",
        )
    )
    channel = "browser_voice" if voice_session.mode == "browser" else "phone_call"
    db.session.add(
        AgentInteraction(
            user_id=voice_session.user_id,
            community_id=community_id,
            agent_type=voice_session.agent_type,
            channel=channel,
            transcript=voice_session.transcript or "No transcript captured.",
            outcome=voice_session.outcome,
        )
    )
    db.session.commit()
    return voice_session


def require_owned_voice_session(session_id: int, user_id: int) -> VoiceSession:
    voice_session = db.session.get(VoiceSession, session_id)
    if voice_session is None:
        raise ApiError("NOT_FOUND", "Voice session not found.", 404)
    if voice_session.user_id != user_id:
        raise ApiError("FORBIDDEN", "This voice session belongs to another user.", 403)
    return voice_session
