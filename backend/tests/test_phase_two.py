from __future__ import annotations

from datetime import date

from app.extensions import db
from app.models import CulturalMoment, EventPlan, EventSuggestion
from app.services.cultural_calendar_service import scan_cultural_calendar


ONBOARDING_PAYLOAD = {
    "name": "Rachael",
    "location": "Berkeley",
    "primary_nationality": "Ghanaian",
    "secondary_interest": None,
    "preferred_language": "English",
}


def onboard(client):
    response = client.post("/api/onboarding/typed", json=ONBOARDING_PAYLOAD)
    assert response.status_code == 200
    return response.get_json()["data"]


def test_seed_route_is_protected_and_idempotent(client, app):
    assert client.post("/api/admin/cultural-moments/seed").status_code == 401

    headers = {"X-Cron-Secret": "dev-cron-secret"}
    first = client.post("/api/admin/cultural-moments/seed", headers=headers)
    second = client.post("/api/admin/cultural-moments/seed", headers=headers)

    assert first.status_code == 200
    assert first.get_json()["data"] == {"inserted": 8, "skipped": 0, "total": 8}
    assert second.get_json()["data"] == {"inserted": 0, "skipped": 8, "total": 8}
    with app.app_context():
        assert db.session.query(CulturalMoment).count() == 8


def test_calendar_scan_obeys_planning_window_and_deduplicates(signed_up_client, app):
    onboard(signed_up_client)
    headers = {"X-Cron-Secret": "dev-cron-secret"}
    signed_up_client.post("/api/admin/cultural-moments/seed", headers=headers)

    with app.app_context():
        too_early = scan_cultural_calendar(today=date(2026, 2, 1), lookahead_days=45)
        first = scan_cultural_calendar(today=date(2026, 2, 10), lookahead_days=45)
        second = scan_cultural_calendar(today=date(2026, 2, 10), lookahead_days=45)

        assert too_early["suggestions_created"] == 0
        assert first["suggestions_created"] == 1
        assert second["suggestions_created"] == 0
        suggestion = db.session.scalar(db.select(EventSuggestion))
        assert suggestion is not None
        assert suggestion.source_key == (
            "ghanaian-berkeley-ghana-independence-day-2026"
        )
        assert suggestion.status == "pending"


def test_scanner_ignores_communities_without_active_memberships(client, app):
    with app.app_context():
        moment = CulturalMoment(
            nationality="Ghanaian",
            title="Test Moment",
            type="community",
            month=7,
            day=1,
            description="A test moment.",
            suggested_event_types_json=["dinner"],
            planning_lead_days=30,
        )
        db.session.add(moment)
        db.session.commit()
        result = scan_cultural_calendar(today=date(2026, 6, 20))
        assert result["communities_scanned"] == 0


def test_user_request_generation_requires_membership(signed_up_client):
    response = signed_up_client.post(
        "/api/event-suggestions/generate",
        json={
            "community_id": 999,
            "source_type": "user_request",
            "prompt": "Suggest a low-budget Ghanaian food event.",
        },
    )
    assert response.status_code == 403


def test_generate_and_accept_creates_private_draft(signed_up_client, app):
    onboarding = onboard(signed_up_client)
    community_id = onboarding["community"]["id"]
    generated = signed_up_client.post(
        "/api/event-suggestions/generate",
        json={
            "community_id": community_id,
            "source_type": "user_request",
            "prompt": "Suggest a low-budget Ghanaian food event for new members.",
        },
    )
    suggestion_id = generated.get_json()["data"]["event_suggestion"]["id"]

    accepted = signed_up_client.post(f"/api/event-suggestions/{suggestion_id}/accept")

    assert generated.status_code == 201
    assert accepted.status_code == 200
    plan = accepted.get_json()["data"]["event_plan"]
    assert plan["suggestion_id"] == suggestion_id
    assert plan["community_id"] == community_id
    assert plan["status"] == "draft"
    with app.app_context():
        assert db.session.get(EventSuggestion, suggestion_id).status == "accepted"
        assert db.session.query(EventPlan).count() == 1


def test_dismiss_and_invalid_second_transition(signed_up_client):
    onboarding = onboard(signed_up_client)
    generated = signed_up_client.post(
        "/api/event-suggestions/generate",
        json={
            "community_id": onboarding["community"]["id"],
            "source_type": "user_request",
            "prompt": "Plan a community dinner.",
        },
    )
    suggestion_id = generated.get_json()["data"]["event_suggestion"]["id"]

    dismissed = signed_up_client.post(
        f"/api/event-suggestions/{suggestion_id}/dismiss",
        json={"reason": "Not enough time this month"},
    )
    accepted = signed_up_client.post(f"/api/event-suggestions/{suggestion_id}/accept")

    assert dismissed.status_code == 200
    assert dismissed.get_json()["data"]["event_suggestion"]["status"] == "dismissed"
    assert accepted.status_code == 409
    assert accepted.get_json()["error"]["code"] == "INVALID_STATE"


def test_list_suggestions_only_returns_active_membership_data(signed_up_client):
    onboarding = onboard(signed_up_client)
    community_id = onboarding["community"]["id"]
    signed_up_client.post(
        "/api/event-suggestions/generate",
        json={
            "community_id": community_id,
            "source_type": "user_request",
            "prompt": "Plan a music night.",
        },
    )

    response = signed_up_client.get("/api/event-suggestions?status=pending")

    assert response.status_code == 200
    suggestions = response.get_json()["data"]["event_suggestions"]
    assert len(suggestions) == 1
    assert suggestions[0]["suggested_for_user_id"] is not None


def test_cron_scan_requires_secret(client):
    unauthorized = client.post("/api/cron/cultural-calendar-scan")
    authorized = client.post(
        "/api/cron/cultural-calendar-scan",
        headers={"X-Cron-Secret": "dev-cron-secret"},
        json={"lookahead_days": 45},
    )

    assert unauthorized.status_code == 401
    assert authorized.status_code == 200
