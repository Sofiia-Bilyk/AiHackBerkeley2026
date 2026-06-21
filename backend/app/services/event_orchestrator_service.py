from __future__ import annotations

from uuid import uuid4

from ..models import Community, CulturalMoment, EventSuggestion, User


def suggestion_from_cultural_moment(
    community: Community, moment: CulturalMoment, *, source_key: str
) -> EventSuggestion:
    """Build a predictable, culturally grounded calendar suggestion."""
    event_type = (
        moment.suggested_event_types_json[0]
        if moment.suggested_event_types_json
        else "community celebration"
    ).replace("_", " ")
    return EventSuggestion(
        community_id=community.id,
        source_type="cultural_calendar",
        source_ref_id=moment.id,
        source_key=source_key,
        title=f"{moment.title}: {event_type.title()}",
        description=(
            f"Bring the {community.display_name} together for a {event_type} connected to "
            f"{moment.title}. {moment.description}"
        ),
        reason=(
            f"{moment.title} is approaching, and this format is one of the seeded event ideas "
            f"for {moment.nationality} communities."
        ),
        created_by_agent=True,
    )


def suggestion_from_user_request(
    community: Community, user: User, *, prompt: str
) -> EventSuggestion:
    """Convert a member request into a reviewable suggestion without publishing an event."""
    return EventSuggestion(
        community_id=community.id,
        suggested_for_user_id=user.id,
        source_type="user_request",
        source_key=f"user-request-{community.id}-{user.id}-{uuid4().hex}",
        title=f"{community.nationality} Community Event Idea",
        description=prompt,
        reason="A community member requested this event idea for agent-assisted planning.",
        created_by_agent=True,
    )

