from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..extensions import db
from .user import utc_now


class VoiceSession(db.Model):
    __tablename__ = "voice_sessions"
    __table_args__ = (
        CheckConstraint("agent_type IN ('onboarding', 'hotline', 'task_followup')", name="ck_voice_sessions_agent_type"),
        CheckConstraint("mode IN ('browser', 'twilio')", name="ck_voice_sessions_mode"),
        CheckConstraint("status IN ('active', 'completed', 'failed')", name="ck_voice_sessions_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    agent_type: Mapped[str] = mapped_column(String(30), nullable=False)
    mode: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    language_hint: Mapped[str | None] = mapped_column(String(20))
    external_id: Mapped[str | None] = mapped_column(String(100), unique=True, index=True)
    transcript: Mapped[str] = mapped_column(Text, default="", nullable=False)
    outcome: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User")

    def to_dict(self) -> dict:
        return {
            "id": self.id, "user_id": self.user_id, "agent_type": self.agent_type,
            "mode": self.mode, "status": self.status, "language_hint": self.language_hint,
            "external_id": self.external_id, "transcript": self.transcript,
            "outcome": self.outcome, "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class AgentRun(db.Model):
    __tablename__ = "agent_runs"
    __table_args__ = (
        CheckConstraint("status IN ('started', 'completed', 'failed')", name="ck_agent_runs_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    agent_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    community_id: Mapped[int | None] = mapped_column(ForeignKey("communities.id", ondelete="SET NULL"), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    event_plan_id: Mapped[int | None] = mapped_column(ForeignKey("event_plans.id", ondelete="SET NULL"), index=True)
    task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id", ondelete="SET NULL"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="started", nullable=False)
    input_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    output_json: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "agent_type": self.agent_type, "community_id": self.community_id,
            "user_id": self.user_id, "event_plan_id": self.event_plan_id, "task_id": self.task_id,
            "status": self.status, "input": self.input_json, "output": self.output_json,
            "created_at": self.created_at.isoformat(),
        }


class AgentInteraction(db.Model):
    __tablename__ = "agent_interactions"
    __table_args__ = (
        CheckConstraint("channel IN ('browser_voice', 'phone_call', 'text', 'system')", name="ck_agent_interactions_channel"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    community_id: Mapped[int | None] = mapped_column(ForeignKey("communities.id", ondelete="SET NULL"), index=True)
    agent_type: Mapped[str] = mapped_column(String(50), nullable=False)
    channel: Mapped[str] = mapped_column(String(30), nullable=False)
    transcript: Mapped[str] = mapped_column(Text, nullable=False)
    outcome: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "user_id": self.user_id, "community_id": self.community_id,
            "agent_type": self.agent_type, "channel": self.channel,
            "transcript": self.transcript, "outcome": self.outcome,
            "created_at": self.created_at.isoformat(),
        }
