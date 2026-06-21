from __future__ import annotations

import json
from pathlib import Path

from flask import current_app

from ..extensions import db
from ..models import EventPlan, VenueCandidate
from ..utils.errors import ApiError
from .google_places_service import search_places
from .claude_service import complete_json


MOCK_VENUES_PATH = Path(__file__).resolve().parents[2] / "seeds" / "mock_venues.json"


def research_venues(plan: EventPlan, *, preferences: str | None) -> list[VenueCandidate]:
    """Research, deduplicate, rank, and save venue options for a private plan."""
    location = plan.suggestion.community.location if plan.suggestion else ""
    queries = [
        f"community center in {location}",
        f"affordable event space in {location}",
        f"cultural center or library meeting room in {location}",
    ]
    generated_queries = complete_json(
        "You create practical Google Places search queries for affordable community events.",
        (
            f"Location: {location}\nEvent: {plan.title}\nAttendees: {plan.expected_attendees}\n"
            f"Budget: {plan.budget_amount}\nPreferences: {preferences or 'None'}\n"
            "Return {\"queries\": [three concise location-specific search strings]}."
        ),
        max_tokens=500,
    )
    if generated_queries and isinstance(generated_queries.get("queries"), list):
        validated = [
            value.strip() for value in generated_queries["queries"][:5]
            if isinstance(value, str) and 3 <= len(value.strip()) <= 200
        ]
        if validated:
            queries = validated
    if current_app.config["USE_MOCK_VENUES"]:
        raw = _load_mock_venues(location)
        source = "mock"
    else:
        api_key = current_app.config.get("GOOGLE_PLACES_API_KEY")
        if not api_key:
            raise ApiError("EXTERNAL_SERVICE_FAILED", "GOOGLE_PLACES_API_KEY is not configured.", 503)
        raw = [place for query in queries for place in search_places(query, api_key=api_key)]
        source = "google_places"

    deduped: dict[str, dict] = {}
    for venue in raw:
        key = venue.get("source_place_id") or venue["address"].strip().lower()
        deduped.setdefault(key, venue)
    ranked = sorted(
        deduped.values(),
        key=lambda item: (item.get("rating") or 0, item.get("review_count") or 0),
        reverse=True,
    )[:5]
    generated_ranking = complete_json(
        "You rank venues for event fit, affordability, capacity, accessibility, distance, and risk.",
        json.dumps({
            "event": plan.title,
            "preferences": preferences,
            "venues": ranked,
            "response_schema": {"ordered_source_place_ids": ["place-id"]},
        }),
        max_tokens=900,
    )
    if generated_ranking:
        ordered_ids = generated_ranking.get("ordered_source_place_ids")
        if isinstance(ordered_ids, list):
            positions = {value: index for index, value in enumerate(ordered_ids) if isinstance(value, str)}
            ranked.sort(key=lambda item: positions.get(item.get("source_place_id"), len(positions)))

    for existing in list(plan.venue_candidates):
        if existing.status != "selected":
            db.session.delete(existing)
    db.session.flush()
    candidates = []
    for item in ranked:
        reason = f"Fits a {plan.expected_attendees or 'small'}-person community event in {location.title()}."
        if preferences:
            reason += f" Reviewed against: {preferences}"
        candidate = VenueCandidate(event_plan=plan, source=source, reason=reason, **item)
        db.session.add(candidate)
        candidates.append(candidate)
    db.session.commit()
    return candidates


def _load_mock_venues(location: str) -> list[dict]:
    try:
        records = json.loads(MOCK_VENUES_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ApiError("EXTERNAL_SERVICE_FAILED", "Mock venue data could not be loaded.", 500) from error
    return [
        {key: value for key, value in record.items() if key != "location"}
        for record in records
        if record.get("location", "").lower() == location.lower()
    ]
