from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..extensions import db
from .user import utc_now

if TYPE_CHECKING:
    from .event_suggestion import EventSuggestion


class EventPlan(db.Model):
    """Minimal phase-2 draft created when a suggestion is accepted."""

    __tablename__ = "event_plans"
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'needs_review', 'approved', 'published', 'cancelled')",
            name="ck_event_plans_status",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    suggestion_id: Mapped[int | None] = mapped_column(
        ForeignKey("event_suggestions.id", ondelete="SET NULL"), unique=True
    )
    community_id: Mapped[int] = mapped_column(
        ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    organizer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    event_type: Mapped[str | None] = mapped_column(String(80))
    target_date: Mapped[date | None] = mapped_column(Date)
    expected_attendees: Mapped[int | None] = mapped_column(Integer)
    budget_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    budget_currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    suggestion: Mapped["EventSuggestion | None"] = relationship(back_populates="event_plan")
    venue_candidates = relationship("VenueCandidate", back_populates="event_plan", cascade="all, delete-orphan")
    budget_items = relationship("BudgetItem", back_populates="event_plan", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="event_plan", cascade="all, delete-orphan")
    event = relationship("Event", back_populates="event_plan", uselist=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "suggestion_id": self.suggestion_id,
            "community_id": self.community_id,
            "organizer_id": self.organizer_id,
            "title": self.title,
            "description": self.description,
            "event_type": self.event_type,
            "target_date": self.target_date.isoformat() if self.target_date else None,
            "expected_attendees": self.expected_attendees,
            "budget_amount": float(self.budget_amount) if self.budget_amount is not None else None,
            "budget_currency": self.budget_currency,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "venue_candidates": [item.to_dict() for item in self.venue_candidates],
            "budget_items": [item.to_dict() for item in self.budget_items],
            "tasks": [item.to_dict() for item in self.tasks],
        }
