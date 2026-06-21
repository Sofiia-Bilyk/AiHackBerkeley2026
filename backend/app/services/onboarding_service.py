from __future__ import annotations

from sqlalchemy import select

from ..extensions import db
from ..models import Community, CommunityMembership, User
from ..utils.normalization import normalize_location, normalize_nationality


def complete_typed_onboarding(
    user: User,
    *,
    name: str,
    location: str,
    primary_nationality: str,
    secondary_interest: str | None,
    preferred_language: str,
) -> CommunityMembership:
    """Save a profile and place the user in its exact nationality/location community."""
    normalized_location = normalize_location(location)
    normalized_nationality = normalize_nationality(primary_nationality)

    community = db.session.scalar(
        select(Community).where(
            Community.nationality == normalized_nationality,
            Community.location == normalized_location,
        )
    )
    if community is None:
        community = Community(
            nationality=normalized_nationality,
            location=normalized_location,
            display_name=f"{normalized_nationality} community in {normalized_location.title()}",
        )
        db.session.add(community)
        db.session.flush()

    membership = db.session.scalar(
        select(CommunityMembership).where(
            CommunityMembership.user_id == user.id,
            CommunityMembership.community_id == community.id,
        )
    )
    if membership is None:
        membership = CommunityMembership(user=user, community=community)
        db.session.add(membership)
    else:
        membership.status = "active"

    other_memberships = db.session.scalars(
        select(CommunityMembership).where(
            CommunityMembership.user_id == user.id,
            CommunityMembership.community_id != community.id,
            CommunityMembership.status == "active",
        )
    ).all()
    for other_membership in other_memberships:
        other_membership.status = "inactive"

    user.name = name
    user.location = normalized_location
    user.primary_nationality = normalized_nationality
    user.secondary_interest = (
        normalize_nationality(secondary_interest) if secondary_interest else None
    )
    user.preferred_language = preferred_language.strip()
    user.onboarding_status = "completed"

    db.session.commit()
    return membership
