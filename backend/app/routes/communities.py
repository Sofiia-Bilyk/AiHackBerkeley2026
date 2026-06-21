from __future__ import annotations

from flask import Blueprint
from flask_login import current_user, login_required
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..extensions import db
from ..models import Community, CommunityMembership
from ..utils.errors import ApiError, api_success
from ..utils.memberships import require_active_membership


communities_bp = Blueprint("communities", __name__, url_prefix="/api/communities")


@communities_bp.get("/me")
@login_required
def my_communities():
    memberships = db.session.scalars(
        select(CommunityMembership)
        .options(selectinload(CommunityMembership.community))
        .where(
            CommunityMembership.user_id == current_user.id,
            CommunityMembership.status == "active",
        )
        .order_by(CommunityMembership.joined_at)
    ).all()
    return api_success(
        {"memberships": [item.to_dict(include_community=True) for item in memberships]}
    )


@communities_bp.get("/<int:community_id>")
@login_required
def get_community(community_id: int):
    community = db.session.get(Community, community_id)
    if community is None:
        raise ApiError("NOT_FOUND", "Community not found.", 404)
    require_active_membership(current_user.id, community_id)
    return api_success({"community": community.to_dict()})


@communities_bp.get("/<int:community_id>/members")
@login_required
def get_community_members(community_id: int):
    if db.session.get(Community, community_id) is None:
        raise ApiError("NOT_FOUND", "Community not found.", 404)
    require_active_membership(current_user.id, community_id)
    memberships = db.session.scalars(
        select(CommunityMembership)
        .options(selectinload(CommunityMembership.user))
        .where(
            CommunityMembership.community_id == community_id,
            CommunityMembership.status == "active",
        )
        .order_by(CommunityMembership.joined_at)
    ).all()
    return api_success(
        {"members": [item.to_dict(include_user=True) for item in memberships]}
    )
