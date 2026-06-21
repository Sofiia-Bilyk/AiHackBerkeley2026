from __future__ import annotations

import re
import unicodedata
from datetime import date

from sqlalchemy import select

from ..extensions import db
from ..models import Community, CommunityMembership, CulturalMoment, EventSuggestion
from .event_orchestrator_service import suggestion_from_cultural_moment


def scan_cultural_calendar(*, today: date | None = None, lookahead_days: int = 45) -> dict:
    """Create deduplicated suggestions for moments entering their planning windows."""
    if lookahead_days < 0 or lookahead_days > 366:
        raise ValueError("lookahead_days must be between 0 and 366")
    today = today or date.today()
    communities = db.session.scalars(
        select(Community)
        .join(CommunityMembership)
        .where(CommunityMembership.status == "active")
        .distinct()
    ).all()
    created: list[EventSuggestion] = []

    for community in communities:
        moments = db.session.scalars(
            select(CulturalMoment).where(CulturalMoment.nationality == community.nationality)
        ).all()
        for moment in moments:
            occurrence = next_occurrence(moment, today)
            days_until = (occurrence - today).days
            planning_window = min(lookahead_days, moment.planning_lead_days)
            if days_until < 0 or days_until > planning_window:
                continue

            source_key = cultural_moment_source_key(community, moment, occurrence.year)
            if db.session.scalar(
                select(EventSuggestion.id).where(EventSuggestion.source_key == source_key)
            ) is not None:
                continue
            suggestion = suggestion_from_cultural_moment(
                community, moment, source_key=source_key
            )
            db.session.add(suggestion)
            created.append(suggestion)

    db.session.commit()
    return {
        "communities_scanned": len(communities),
        "suggestions_created": len(created),
        "suggestions": [suggestion.to_dict() for suggestion in created],
    }


def next_occurrence(moment: CulturalMoment, today: date) -> date:
    year = today.year
    while True:
        try:
            occurrence = date(year, moment.month, moment.day)
        except ValueError:
            if not moment.is_recurring:
                raise
            year += 1
            continue
        if occurrence < today and moment.is_recurring:
            year += 1
            continue
        return occurrence


def cultural_moment_source_key(
    community: Community, moment: CulturalMoment, year: int
) -> str:
    raw = f"{community.nationality}-{community.location}-{moment.title}-{year}"
    ascii_value = unicodedata.normalize("NFKD", raw).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")
