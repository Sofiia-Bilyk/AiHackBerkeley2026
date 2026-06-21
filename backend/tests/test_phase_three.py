from __future__ import annotations

from app.extensions import db
from app.models import BudgetItem, Event, EventPlan, Task, VenueCandidate


def create_plan(client):
    onboarding = client.post(
        "/api/onboarding/typed",
        json={
            "name": "Rachael",
            "location": "Berkeley",
            "primary_nationality": "Ghanaian",
            "secondary_interest": None,
            "preferred_language": "English",
        },
    ).get_json()["data"]
    suggestion = client.post(
        "/api/event-suggestions/generate",
        json={
            "community_id": onboarding["community"]["id"],
            "source_type": "user_request",
            "prompt": "Plan a Ghanaian community dinner for new members.",
        },
    ).get_json()["data"]["event_suggestion"]
    return client.post(
        f"/api/event-suggestions/{suggestion['id']}/accept"
    ).get_json()["data"]["event_plan"]


def generate_plan_assets(client, plan_id):
    generated = client.post(
        f"/api/event-plans/{plan_id}/generate-plan",
        json={
            "budget_amount": 200,
            "expected_attendees": 25,
            "constraints": "Keep it beginner-friendly.",
        },
    )
    venues = client.post(
        f"/api/event-plans/{plan_id}/research-venues",
        json={"venue_preferences": "Low-cost, indoor, and food allowed."},
    )
    tasks = client.post(f"/api/event-plans/{plan_id}/generate-tasks")
    return generated, venues, tasks


def test_generate_plan_creates_budget_and_is_idempotent(signed_up_client, app):
    plan = create_plan(signed_up_client)
    first, _, _ = generate_plan_assets(signed_up_client, plan["id"])
    second = signed_up_client.post(
        f"/api/event-plans/{plan['id']}/generate-plan",
        json={
            "budget_amount": 250,
            "expected_attendees": 30,
            "constraints": "Use an accessible indoor venue.",
        },
    )

    assert first.status_code == 200
    assert second.status_code == 200
    result = second.get_json()["data"]["event_plan"]
    assert result["budget_amount"] == 250.0
    assert result["expected_attendees"] == 30
    assert len(result["budget_items"]) == 4
    assert result["description"].count("Planning constraints:") == 1
    with app.app_context():
        assert db.session.query(BudgetItem).count() == 4


def test_mock_venue_research_ranks_and_replaces_candidates(signed_up_client, app):
    plan = create_plan(signed_up_client)
    signed_up_client.post(
        f"/api/event-plans/{plan['id']}/generate-plan",
        json={"budget_amount": 200, "expected_attendees": 25},
    )
    first = signed_up_client.post(f"/api/event-plans/{plan['id']}/research-venues")
    second = signed_up_client.post(f"/api/event-plans/{plan['id']}/research-venues")

    assert first.status_code == 200
    assert second.status_code == 200
    venues = second.get_json()["data"]["venue_candidates"]
    assert len(venues) == 3
    assert venues[0]["rating"] >= venues[1]["rating"]
    assert all(venue["source"] == "mock" for venue in venues)
    with app.app_context():
        assert db.session.query(VenueCandidate).count() == 3


def test_task_generation_creates_reviewable_drafts(signed_up_client, app):
    plan = create_plan(signed_up_client)
    _, _, response = generate_plan_assets(signed_up_client, plan["id"])

    assert response.status_code == 200
    tasks = response.get_json()["data"]["tasks"]
    assert len(tasks) == 6
    assert all(task["status"] == "draft" for task in tasks)
    assert all(task["assignee_id"] is None for task in tasks)
    with app.app_context():
        assert db.session.get(EventPlan, plan["id"]).status == "needs_review"


def test_approval_and_publish_preserve_human_boundary(signed_up_client, app):
    plan = create_plan(signed_up_client)
    generated, venues_response, tasks_response = generate_plan_assets(
        signed_up_client, plan["id"]
    )
    budget_ids = [
        item["id"] for item in generated.get_json()["data"]["event_plan"]["budget_items"]
    ]
    venue_id = venues_response.get_json()["data"]["venue_candidates"][0]["id"]
    task_ids = [task["id"] for task in tasks_response.get_json()["data"]["tasks"]]

    before_approval = signed_up_client.post(f"/api/event-plans/{plan['id']}/publish")
    approved = signed_up_client.post(
        f"/api/event-plans/{plan['id']}/approve",
        json={
            "approved_task_ids": task_ids[:4],
            "selected_venue_candidate_id": venue_id,
            "approved_budget_item_ids": budget_ids[:3],
        },
    )
    published = signed_up_client.post(f"/api/event-plans/{plan['id']}/publish")

    assert before_approval.status_code == 409
    assert approved.status_code == 200
    assert published.status_code == 201
    event = published.get_json()["data"]["event"]
    assert event["status"] == "published"
    assert event["venue_name"] == "Berkeley Community Meeting Hall"
    with app.app_context():
        assert db.session.query(Event).count() == 1
        tasks = db.session.scalars(db.select(Task).order_by(Task.id)).all()
        assert [task.status for task in tasks] == ["open"] * 4 + ["cancelled"] * 2
        assert all(task.event_id == event["id"] for task in tasks[:4])
        assert all(task.event_id is None for task in tasks[4:])
        assert db.session.get(EventPlan, plan["id"]).status == "published"


def test_only_organizer_can_access_private_plan(client, signed_up_client):
    plan = create_plan(signed_up_client)
    signed_up_client.post("/api/auth/logout")
    client.post(
        "/api/auth/signup",
        json={
            "email": "other@example.com",
            "password": "password123",
            "phone_number": "+14155550124",
        },
    )

    response = client.get(f"/api/event-plans/{plan['id']}")
    assert response.status_code == 403


def test_approval_rejects_assets_from_another_plan(signed_up_client):
    first = create_plan(signed_up_client)
    _, first_venues, first_tasks = generate_plan_assets(signed_up_client, first["id"])
    second = create_plan(signed_up_client)
    second_generated, _, _ = generate_plan_assets(signed_up_client, second["id"])

    response = signed_up_client.post(
        f"/api/event-plans/{second['id']}/approve",
        json={
            "approved_task_ids": [first_tasks.get_json()["data"]["tasks"][0]["id"]],
            "selected_venue_candidate_id": first_venues.get_json()["data"]["venue_candidates"][0]["id"],
            "approved_budget_item_ids": [
                second_generated.get_json()["data"]["event_plan"]["budget_items"][0]["id"]
            ],
        },
    )
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "VALIDATION_ERROR"
