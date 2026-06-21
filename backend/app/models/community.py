from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..extensions import db
from .user import utc_now

if TYPE_CHECKING:
    from .user import User


class Community(db.Model):
    __tablename__ = "communities"
    __table_args__ = (
        UniqueConstraint("nationality", "location", name="uq_communities_nationality_location"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nationality: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    location: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(300), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    memberships: Mapped[list["CommunityMembership"]] = relationship(
        back_populates="community", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "nationality": self.nationality,
            "location": self.location,
            "display_name": self.display_name,
            "created_at": self.created_at.isoformat(),
        }


class CommunityMembership(db.Model):
    __tablename__ = "community_memberships"
    __table_args__ = (
        UniqueConstraint("user_id", "community_id", name="uq_memberships_user_community"),
        CheckConstraint(
            "role IN ('member', 'organizer', 'steward', 'admin')",
            name="ck_memberships_role",
        ),
        CheckConstraint("status IN ('active', 'inactive')", name="ck_memberships_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    community_id: Mapped[int] = mapped_column(
        ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(20), default="member", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    user: Mapped["User"] = relationship(back_populates="memberships")
    community: Mapped[Community] = relationship(back_populates="memberships")

    def to_dict(self, *, include_user: bool = False, include_community: bool = False) -> dict:
        result = {
            "id": self.id,
            "user_id": self.user_id,
            "community_id": self.community_id,
            "role": self.role,
            "status": self.status,
            "joined_at": self.joined_at.isoformat(),
        }
        if include_user:
            result["user"] = self.user.to_public_dict()
        if include_community:
            result["community"] = self.community.to_dict()
        return result
