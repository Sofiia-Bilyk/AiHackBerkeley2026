from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..extensions import db
from .user import utc_now


class Task(db.Model):
    __tablename__ = "tasks"
    __table_args__ = (
        CheckConstraint("category IN ('food', 'decor', 'venue', 'setup', 'cleanup', 'outreach', 'supplies', 'transport', 'other')", name="ck_tasks_category"),
        CheckConstraint("status IN ('draft', 'open', 'claimed', 'done', 'failed', 'cancelled')", name="ck_tasks_status"),
        CheckConstraint("priority IN ('low', 'medium', 'high')", name="ck_tasks_priority"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    event_plan_id: Mapped[int] = mapped_column(ForeignKey("event_plans.id", ondelete="CASCADE"), index=True)
    event_id: Mapped[int | None] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False)
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    estimated_cost: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    created_by_agent: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    self_reported_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    event_plan = relationship("EventPlan", back_populates="tasks")
    event = relationship("Event", back_populates="tasks")

    def to_dict(self) -> dict:
        return {
            "id": self.id, "event_plan_id": self.event_plan_id, "event_id": self.event_id,
            "title": self.title, "description": self.description, "category": self.category,
            "assignee_id": self.assignee_id, "status": self.status, "priority": self.priority,
            "due_at": self.due_at.isoformat() if self.due_at else None,
            "estimated_cost": float(self.estimated_cost) if self.estimated_cost is not None else None,
            "created_by_agent": self.created_by_agent,
            "self_reported_at": self.self_reported_at.isoformat() if self.self_reported_at else None,
            "created_at": self.created_at.isoformat(), "updated_at": self.updated_at.isoformat(),
        }


class TaskReport(db.Model):
    __tablename__ = "task_reports"
    __table_args__ = (
        CheckConstraint(
            "status IN ('submitted', 'accepted', 'needs_followup', 'rejected')",
            name="ck_task_reports_status",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    reporter_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    report_text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="submitted", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    task = relationship("Task", backref="reports")

    def to_dict(self) -> dict:
        return {
            "id": self.id, "task_id": self.task_id, "reporter_id": self.reporter_id,
            "report_text": self.report_text, "status": self.status,
            "created_at": self.created_at.isoformat(),
        }
