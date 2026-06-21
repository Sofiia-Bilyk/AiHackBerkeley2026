from __future__ import annotations

from sqlalchemy import select

from ..extensions import db
from ..models import CommunityMembership
from .errors import ApiError


def require_active_membership(user_id: int, community_id: int) -> CommunityMembership:
    membership = db.session.scalar(
        select(CommunityMembership).where(
            CommunityMembership.user_id == user_id,
            CommunityMembership.community_id == community_id,
            CommunityMembership.status == "active",
        )
    )
    if membership is None:
        raise ApiError("FORBIDDEN", "You are not an active member of this community.", 403)
    return membership

