from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..extensions import db
from .user import utc_now


class Event(db.Model):
    """Minimal public event produced only by publishing an approved plan."""

    __tablename__ = "events"
    __table_args__ = (
        CheckConstraint("status IN ('published', 'completed', 'cancelled')", name="ck_events_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    event_plan_id: Mapped[int] = mapped_column(ForeignKey("event_plans.id", ondelete="CASCADE"), unique=True)
    community_id: Mapped[int] = mapped_column(ForeignKey("communities.id", ondelete="CASCADE"), index=True)
    organizer_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    event_type: Mapped[str | None] = mapped_column(String(80))
    date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="published", nullable=False)
    venue_name: Mapped[str | None] = mapped_column(String(200))
    venue_address: Mapped[str | None] = mapped_column(String(300))
    budget_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    attendance_count: Mapped[int | None] = mapped_column(Integer)
    completion_notes: Mapped[str | None] = mapped_column(Text)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    event_plan = relationship("EventPlan", back_populates="event", uselist=False)
    tasks = relationship("Task", back_populates="event")
    rsvps = relationship("RSVP", back_populates="event", cascade="all, delete-orphan")
    attendance_records = relationship("Attendance", back_populates="event", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id, "event_plan_id": self.event_plan_id,
            "community_id": self.community_id, "organizer_id": self.organizer_id,
            "title": self.title, "description": self.description, "event_type": self.event_type,
            "date": self.date.isoformat(), "status": self.status,
            "venue_name": self.venue_name, "venue_address": self.venue_address,
            "budget_amount": float(self.budget_amount) if self.budget_amount is not None else None,
            "attendance_count": self.attendance_count,
            "completion_notes": self.completion_notes,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "created_at": self.created_at.isoformat(), "updated_at": self.updated_at.isoformat(),
        }


class RSVP(db.Model):
    __tablename__ = "rsvps"
    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_rsvps_event_user"),
        CheckConstraint("status IN ('yes', 'no', 'maybe')", name="ck_rsvps_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(10), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    event = relationship("Event", back_populates="rsvps")

    def to_dict(self) -> dict:
        return {
            "id": self.id, "event_id": self.event_id, "user_id": self.user_id,
            "status": self.status, "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class Attendance(db.Model):
    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_attendance_event_user"),
        CheckConstraint("status IN ('attended', 'no_show')", name="ck_attendance_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    event = relationship("Event", back_populates="attendance_records")

    def to_dict(self) -> dict:
        return {
            "id": self.id, "event_id": self.event_id, "user_id": self.user_id,
            "status": self.status,
            "checked_in_at": self.checked_in_at.isoformat() if self.checked_in_at else None,
        }
