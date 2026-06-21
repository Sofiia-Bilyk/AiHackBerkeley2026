from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..extensions import db
from .user import utc_now

if TYPE_CHECKING:
    from .community import Community
    from .user import User


class EventSuggestion(db.Model):
    __tablename__ = "event_suggestions"
    __table_args__ = (
        CheckConstraint(
            "source_type IN ('cultural_calendar', 'new_member', 'user_request', 'low_activity', 'successful_past_event')",
            name="ck_event_suggestions_source_type",
        ),
        CheckConstraint(
            "status IN ('pending', 'accepted', 'dismissed', 'expired')",
            name="ck_event_suggestions_status",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    community_id: Mapped[int] = mapped_column(
        ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    suggested_for_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    source_type: Mapped[str] = mapped_column(String(40), nullable=False)
    source_ref_id: Mapped[int | None] = mapped_column(Integer)
    source_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False, index=True)
    created_by_agent: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    community: Mapped["Community"] = relationship()
    suggested_for_user: Mapped["User | None"] = relationship()
    event_plan: Mapped["EventPlan | None"] = relationship(back_populates="suggestion", uselist=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "community_id": self.community_id,
            "suggested_for_user_id": self.suggested_for_user_id,
            "source_type": self.source_type,
            "source_ref_id": self.source_ref_id,
            "source_key": self.source_key,
            "title": self.title,
            "description": self.description,
            "reason": self.reason,
            "status": self.status,
            "created_by_agent": self.created_by_agent,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

