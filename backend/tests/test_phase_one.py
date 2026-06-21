from __future__ import annotations

from app.extensions import db
from app.models import Community, CommunityMembership, User


ONBOARDING_PAYLOAD = {
    "name": "Rachael",
    "location": "  Berkeley  ",
    "primary_nationality": "ghanaian",
    "secondary_interest": "nigerian",
    "preferred_language": "English",
}


def test_signup_hashes_password_and_authenticates(client, app):
    response = client.post(
        "/api/auth/signup",
        json={
            "email": " USER@Example.com ",
            "password": "password123",
            "phone_number": "+14155550123",
        },
    )

    assert response.status_code == 201
    assert response.get_json()["data"]["user"]["onboarding_status"] == "started"
    assert client.get("/api/auth/me").status_code == 200
    with app.app_context():
        user = db.session.scalar(db.select(User).where(User.email == "user@example.com"))
        assert user is not None
        assert user.password_hash != "password123"
        assert user.check_password("password123")


def test_duplicate_signup_returns_contract_error(client):
    payload = {
        "email": "user@example.com",
        "password": "password123",
        "phone_number": "+14155550123",
    }
    assert client.post("/api/auth/signup", json=payload).status_code == 201
    response = client.post("/api/auth/signup", json=payload)

    assert response.status_code == 409
    assert response.get_json()["error"]["code"] == "DUPLICATE_RESOURCE"


def test_typed_onboarding_normalizes_and_creates_membership(signed_up_client, app):
    response = signed_up_client.post("/api/onboarding/typed", json=ONBOARDING_PAYLOAD)

    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["user"]["location"] == "berkeley"
    assert data["user"]["primary_nationality"] == "Ghanaian"
    assert data["user"]["onboarding_status"] == "completed"
    assert data["community"]["display_name"] == "Ghanaian community in Berkeley"
    with app.app_context():
        assert db.session.query(Community).count() == 1
        assert db.session.query(CommunityMembership).count() == 1


def test_repeated_onboarding_is_idempotent(signed_up_client, app):
    assert signed_up_client.post("/api/onboarding/typed", json=ONBOARDING_PAYLOAD).status_code == 200
    assert signed_up_client.post("/api/onboarding/typed", json=ONBOARDING_PAYLOAD).status_code == 200

    with app.app_context():
        assert db.session.query(Community).count() == 1
        assert db.session.query(CommunityMembership).count() == 1


def test_new_onboarding_placement_deactivates_previous_membership(signed_up_client, app):
    assert signed_up_client.post("/api/onboarding/typed", json=ONBOARDING_PAYLOAD).status_code == 200
    updated = {
        **ONBOARDING_PAYLOAD,
        "location": "Oakland",
        "primary_nationality": "Ukrainian",
    }
    assert signed_up_client.post("/api/onboarding/typed", json=updated).status_code == 200

    with app.app_context():
        memberships = db.session.scalars(
            db.select(CommunityMembership).order_by(CommunityMembership.id)
        ).all()
        assert [membership.status for membership in memberships] == ["inactive", "active"]


def test_same_normalized_identity_reuses_community(client, app):
    for index, location in enumerate(("Berkeley", "  BERKELEY ")):
        client.post(
            "/api/auth/signup",
            json={
                "email": f"user{index}@example.com",
                "password": "password123",
                "phone_number": f"+1415555012{index}",
            },
        )
        payload = {**ONBOARDING_PAYLOAD, "location": location}
        assert client.post("/api/onboarding/typed", json=payload).status_code == 200
        client.post("/api/auth/logout")

    with app.app_context():
        assert db.session.query(Community).count() == 1
        assert db.session.query(CommunityMembership).count() == 2


def test_community_routes_require_membership(client, app):
    with app.app_context():
        community = Community(
            nationality="Ukrainian",
            location="oakland",
            display_name="Ukrainian community in Oakland",
        )
        db.session.add(community)
        db.session.commit()
        community_id = community.id

    assert client.get(f"/api/communities/{community_id}").status_code == 401
    client.post(
        "/api/auth/signup",
        json={
            "email": "user@example.com",
            "password": "password123",
            "phone_number": "+14155550123",
        },
    )
    response = client.get(f"/api/communities/{community_id}")
    assert response.status_code == 403
    assert response.get_json()["error"]["code"] == "FORBIDDEN"


def test_validation_uses_json_error_contract(client):
    response = client.post("/api/auth/signup", json={"email": "invalid"})

    assert response.status_code == 400
    assert response.get_json() == {
        "success": False,
        "error": {"code": "VALIDATION_ERROR", "message": "'password' is required."},
    }
