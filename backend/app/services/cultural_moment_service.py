from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from sqlalchemy import select

from ..extensions import db
from ..models import CulturalMoment
from ..utils.errors import ApiError
from ..utils.normalization import normalize_nationality


SEED_PATH = Path(__file__).resolve().parents[2] / "seeds" / "cultural_moments.json"
MOMENT_TYPES = {
    "national_holiday",
    "religious",
    "food",
    "tradition",
    "seasonal",
    "community",
}


def seed_cultural_moments(path: Path = SEED_PATH) -> dict[str, int]:
    """Insert bundled cultural moments while preserving existing rows."""
    try:
        records = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ApiError("SEED_FAILED", "Cultural moment seed data could not be loaded.", 500) from error

    if not isinstance(records, list):
        raise ApiError("SEED_FAILED", "Cultural moment seed data must be a JSON array.", 500)

    inserted = 0
    skipped = 0
    for raw in records:
        record = _validate_seed_record(raw)
        existing_id = db.session.scalar(
            select(CulturalMoment.id).where(
                CulturalMoment.nationality == record["nationality"],
                CulturalMoment.title == record["title"],
                CulturalMoment.month == record["month"],
                CulturalMoment.day == record["day"],
            )
        )
        if existing_id is not None:
            skipped += 1
            continue
        db.session.add(CulturalMoment(**record))
        inserted += 1

    db.session.commit()
    return {"inserted": inserted, "skipped": skipped, "total": inserted + skipped}


def _validate_seed_record(raw: object) -> dict:
    if not isinstance(raw, dict):
        raise ApiError("SEED_FAILED", "Each cultural moment seed must be an object.", 500)
    required = ("nationality", "title", "type", "month", "day", "description")
    if any(not raw.get(field) for field in required):
        raise ApiError("SEED_FAILED", "A cultural moment seed is missing required fields.", 500)
    if raw["type"] not in MOMENT_TYPES:
        raise ApiError("SEED_FAILED", f"Unsupported cultural moment type: {raw['type']}", 500)
    try:
        date(2000, int(raw["month"]), int(raw["day"]))
    except (TypeError, ValueError) as error:
        raise ApiError("SEED_FAILED", "A cultural moment seed has an invalid date.", 500) from error

    event_types = raw.get("suggested_event_types", [])
    if not isinstance(event_types, list) or not all(
        isinstance(value, str) and value.strip() for value in event_types
    ):
        raise ApiError("SEED_FAILED", "Suggested event types must be a list of strings.", 500)

    return {
        "nationality": normalize_nationality(str(raw["nationality"])),
        "title": str(raw["title"]).strip(),
        "type": raw["type"],
        "month": int(raw["month"]),
        "day": int(raw["day"]),
        "is_recurring": bool(raw.get("is_recurring", True)),
        "description": str(raw["description"]).strip(),
        "suggested_event_types_json": [value.strip() for value in event_types],
        "planning_lead_days": int(raw.get("planning_lead_days", 30)),
    }

