from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..extensions import db
from .user import utc_now


class CulturalMoment(db.Model):
    __tablename__ = "cultural_moments"
    __table_args__ = (
        UniqueConstraint(
            "nationality", "title", "month", "day", name="uq_cultural_moments_identity"
        ),
        CheckConstraint("month BETWEEN 1 AND 12", name="ck_cultural_moments_month"),
        CheckConstraint("day BETWEEN 1 AND 31", name="ck_cultural_moments_day"),
        CheckConstraint(
            "type IN ('national_holiday', 'religious', 'food', 'tradition', 'seasonal', 'community')",
            name="ck_cultural_moments_type",
        ),
        CheckConstraint("planning_lead_days >= 0", name="ck_cultural_moments_lead_days"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nationality: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    day: Mapped[int] = mapped_column(Integer, nullable=False)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_event_types_json: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    planning_lead_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "nationality": self.nationality,
            "title": self.title,
            "type": self.type,
            "month": self.month,
            "day": self.day,
            "is_recurring": self.is_recurring,
            "description": self.description,
            "suggested_event_types": self.suggested_event_types_json,
            "planning_lead_days": self.planning_lead_days,
            "created_at": self.created_at.isoformat(),
        }

