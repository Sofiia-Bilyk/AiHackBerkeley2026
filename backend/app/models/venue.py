from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..extensions import db
from .user import utc_now


class VenueCandidate(db.Model):
    __tablename__ = "venue_candidates"
    __table_args__ = (
        CheckConstraint("source IN ('google_places', 'mock', 'manual')", name="ck_venues_source"),
        CheckConstraint("status IN ('suggested', 'selected', 'rejected')", name="ck_venues_status"),
        UniqueConstraint("event_plan_id", "source_place_id", name="uq_venues_plan_source_place"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    event_plan_id: Mapped[int] = mapped_column(ForeignKey("event_plans.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str] = mapped_column(String(300), nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(32))
    website_url: Mapped[str | None] = mapped_column(String(500))
    maps_url: Mapped[str | None] = mapped_column(String(500))
    rating: Mapped[Decimal | None] = mapped_column(Numeric(2, 1))
    review_count: Mapped[int | None] = mapped_column(Integer)
    estimated_cost: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    capacity: Mapped[int | None] = mapped_column(Integer)
    accessibility_notes: Mapped[str | None] = mapped_column(Text)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(30), nullable=False)
    source_place_id: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), default="suggested", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    event_plan = relationship("EventPlan", back_populates="venue_candidates")

    def to_dict(self) -> dict:
        return {
            "id": self.id, "event_plan_id": self.event_plan_id, "name": self.name,
            "address": self.address, "phone_number": self.phone_number,
            "website_url": self.website_url, "maps_url": self.maps_url,
            "rating": float(self.rating) if self.rating is not None else None,
            "review_count": self.review_count,
            "estimated_cost": float(self.estimated_cost) if self.estimated_cost is not None else None,
            "capacity": self.capacity, "accessibility_notes": self.accessibility_notes,
            "reason": self.reason, "source": self.source,
            "source_place_id": self.source_place_id, "status": self.status,
            "created_at": self.created_at.isoformat(),
        }


class BudgetItem(db.Model):
    __tablename__ = "budget_items"
    __table_args__ = (
        CheckConstraint("category IN ('venue', 'food', 'decor', 'supplies', 'transport', 'entertainment', 'other')", name="ck_budget_items_category"),
        CheckConstraint("status IN ('estimated', 'approved', 'spent')", name="ck_budget_items_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    event_plan_id: Mapped[int] = mapped_column(ForeignKey("event_plans.id", ondelete="CASCADE"), index=True)
    category: Mapped[str] = mapped_column(String(30), nullable=False)
    description: Mapped[str] = mapped_column(String(300), nullable=False)
    estimated_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    actual_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    status: Mapped[str] = mapped_column(String(20), default="estimated", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    event_plan = relationship("EventPlan", back_populates="budget_items")

    def to_dict(self) -> dict:
        return {
            "id": self.id, "event_plan_id": self.event_plan_id, "category": self.category,
            "description": self.description, "estimated_amount": float(self.estimated_amount),
            "actual_amount": float(self.actual_amount) if self.actual_amount is not None else None,
            "status": self.status, "created_at": self.created_at.isoformat(),
        }
