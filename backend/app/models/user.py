from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from flask_login import UserMixin
from sqlalchemy import CheckConstraint, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from werkzeug.security import check_password_hash, generate_password_hash

from ..extensions import db

if TYPE_CHECKING:
    from .community import CommunityMembership


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(UserMixin, db.Model):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "onboarding_status IN ('started', 'completed')",
            name="ck_users_onboarding_status",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str | None] = mapped_column(String(120))
    preferred_language: Mapped[str | None] = mapped_column(String(80))
    location: Mapped[str | None] = mapped_column(String(160), index=True)
    primary_nationality: Mapped[str | None] = mapped_column(String(120), index=True)
    secondary_interest: Mapped[str | None] = mapped_column(String(120))
    onboarding_status: Mapped[str] = mapped_column(String(20), default="started", nullable=False)
    task_failure_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    restricted_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    memberships: Mapped[list["CommunityMembership"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "phone_number": self.phone_number,
            "name": self.name,
            "preferred_language": self.preferred_language,
            "location": self.location,
            "primary_nationality": self.primary_nationality,
            "secondary_interest": self.secondary_interest,
            "onboarding_status": self.onboarding_status,
            "task_failure_count": self.task_failure_count,
            "restricted_until": self.restricted_until.isoformat() if self.restricted_until else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def to_public_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "preferred_language": self.preferred_language,
            "location": self.location,
            "primary_nationality": self.primary_nationality,
            "secondary_interest": self.secondary_interest,
            "created_at": self.created_at.isoformat(),
        }
