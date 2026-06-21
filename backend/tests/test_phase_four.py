from __future__ import annotations

from app.extensions import db
from app.models import Attendance, Event, RSVP, Task, TaskReport, User


def onboard(client, *, name="Rachael", nationality="Ghanaian", location="Berkeley"):
    return client.post(
        "/api/onboarding/typed",
        json={
            "name": name,
            "location": location,
            "primary_nationality": nationality,
            "secondary_interest": None,
            "preferred_language": "English",
        },
    ).get_json()["data"]


def publish_event(client):
    profile = onboard(client)
    suggestion = client.post(
        "/api/event-suggestions/generate",
        json={
            "community_id": profile["community"]["id"],
            "source_type": "user_request",
            "prompt": "Plan a community dinner.",
        },
    ).get_json()["data"]["event_suggestion"]
    plan = client.post(
        f"/api/event-suggestions/{suggestion['id']}/accept"
    ).get_json()["data"]["event_plan"]
    generated = client.post(
        f"/api/event-plans/{plan['id']}/generate-plan",
        json={"budget_amount": 200, "expected_attendees": 25},
    ).get_json()["data"]["event_plan"]
    venues = client.post(
        f"/api/event-plans/{plan['id']}/research-venues"
    ).get_json()["data"]["venue_candidates"]
    tasks = client.post(
        f"/api/event-plans/{plan['id']}/generate-tasks"
    ).get_json()["data"]["tasks"]
    client.post(
        f"/api/event-plans/{plan['id']}/approve",
        json={
            "approved_task_ids": [task["id"] for task in tasks],
            "selected_venue_candidate_id": venues[0]["id"],
            "approved_budget_item_ids": [item["id"] for item in generated["budget_items"]],
        },
    )
    event = client.post(
        f"/api/event-plans/{plan['id']}/publish"
    ).get_json()["data"]["event"]
    return event, tasks


def sign_up_member(client, *, email="member@example.com", nationality="Ghanaian", location="Berkeley"):
    client.post("/api/auth/logout")
    response = client.post(
        "/api/auth/signup",
        json={"email": email, "password": "password123", "phone_number": "+14155550999"},
    )
    assert response.status_code == 201
    onboard(client, name="Member", nationality=nationality, location=location)


def test_event_list_detail_rsvp_and_check_in_upsert(signed_up_client, app):
    event, _ = publish_event(signed_up_client)
    sign_up_member(signed_up_client)

    listing = signed_up_client.get("/api/events?status=published")
    detail = signed_up_client.get(f"/api/events/{event['id']}")
    signed_up_client.post(f"/api/events/{event['id']}/rsvp", json={"status": "maybe"})
    rsvp = signed_up_client.post(
        f"/api/events/{event['id']}/rsvp", json={"status": "yes"}
    )
    signed_up_client.post(f"/api/events/{event['id']}/check-in")
    check_in = signed_up_client.post(f"/api/events/{event['id']}/check-in")

    assert listing.status_code == 200
    assert len(listing.get_json()["data"]["events"]) == 1
    assert detail.status_code == 200
    assert rsvp.get_json()["data"]["rsvp"]["status"] == "yes"
    assert check_in.get_json()["data"]["attendance"]["status"] == "attended"
    with app.app_context():
        assert db.session.query(RSVP).count() == 1
        assert db.session.query(Attendance).count() == 1


def test_member_claim_report_and_completion(signed_up_client, app):
    event, tasks = publish_event(signed_up_client)
    sign_up_member(signed_up_client)
    task_id = tasks[0]["id"]

    claimed = signed_up_client.post(f"/api/tasks/{task_id}/claim")
    second_claim = signed_up_client.post(f"/api/tasks/{task_id}/claim")
    reported = signed_up_client.post(
        f"/api/tasks/{task_id}/report",
        json={"report_text": "The venue reservation is confirmed and paid."},
    )

    assert claimed.status_code == 200
    assert claimed.get_json()["data"]["task"]["status"] == "claimed"
    assert second_claim.status_code == 409
    assert reported.status_code == 201
    assert reported.get_json()["data"]["task_report"]["status"] == "accepted"
    assert reported.get_json()["data"]["task"]["status"] == "done"
    with app.app_context():
        assert db.session.query(TaskReport).count() == 1
        assert db.session.get(Task, task_id).event_id == event["id"]


def test_blocked_report_needs_followup_then_unclaim(signed_up_client):
    _, tasks = publish_event(signed_up_client)
    sign_up_member(signed_up_client)
    task_id = tasks[1]["id"]
    signed_up_client.post(f"/api/tasks/{task_id}/claim")

    report = signed_up_client.post(
        f"/api/tasks/{task_id}/report",
        json={"report_text": "I cannot finish this and need help."},
    )
    unclaimed = signed_up_client.post(f"/api/tasks/{task_id}/unclaim")

    assert report.get_json()["data"]["task_report"]["status"] == "needs_followup"
    assert report.get_json()["data"]["task"]["status"] == "claimed"
    assert unclaimed.get_json()["data"]["task"]["status"] == "open"


def test_reopen_records_failure_and_clears_assignee(signed_up_client, app):
    _, tasks = publish_event(signed_up_client)
    sign_up_member(signed_up_client)
    task_id = tasks[2]["id"]
    signed_up_client.post(f"/api/tasks/{task_id}/claim")

    reopened = signed_up_client.post(
        f"/api/tasks/{task_id}/reopen",
        json={"reason": "I cannot complete this anymore."},
    )

    assert reopened.status_code == 200
    assert reopened.get_json()["data"]["task"]["status"] == "open"
    assert reopened.get_json()["data"]["task"]["assignee_id"] is None
    with app.app_context():
        member = db.session.scalar(db.select(User).where(User.email == "member@example.com"))
        assert member.task_failure_count == 1


def test_organizer_can_edit_and_delete_open_task(signed_up_client, app):
    event, tasks = publish_event(signed_up_client)
    task_id = tasks[-1]["id"]

    updated = signed_up_client.patch(
        f"/api/tasks/{task_id}",
        json={"title": "Lead final cleanup", "priority": "medium", "estimated_cost": 10},
    )
    deleted = signed_up_client.delete(f"/api/tasks/{task_id}")

    assert updated.status_code == 200
    assert updated.get_json()["data"]["task"]["title"] == "Lead final cleanup"
    assert deleted.status_code == 200
    with app.app_context():
        assert db.session.get(Task, task_id) is None
        assert db.session.get(Event, event["id"]) is not None


def test_event_completion_stores_adaptation_summary(signed_up_client, app):
    event, _ = publish_event(signed_up_client)

    completed = signed_up_client.post(
        f"/api/events/{event['id']}/complete",
        json={"attendance_count": 22, "notes": "Great turnout; food arrived on time."},
    )

    assert completed.status_code == 200
    result = completed.get_json()["data"]["event"]
    assert result["status"] == "completed"
    assert result["attendance_count"] == 22
    assert result["completion_notes"].startswith("Great turnout")
    with app.app_context():
        assert db.session.get(Event, event["id"]).completed_at is not None


def test_event_cancel_closes_unfinished_tasks(signed_up_client, app):
    event, tasks = publish_event(signed_up_client)
    task_id = tasks[0]["id"]
    signed_up_client.post(f"/api/tasks/{task_id}/claim")

    cancelled = signed_up_client.post(f"/api/events/{event['id']}/cancel")

    assert cancelled.status_code == 200
    assert cancelled.get_json()["data"]["event"]["status"] == "cancelled"
    with app.app_context():
        statuses = db.session.scalars(
            db.select(Task.status).where(Task.event_id == event["id"])
        ).all()
        assert set(statuses) == {"cancelled"}


def test_nonmember_cannot_view_event(signed_up_client):
    event, _ = publish_event(signed_up_client)
    sign_up_member(
        signed_up_client,
        email="outsider@example.com",
        nationality="Ukrainian",
        location="Oakland",
    )

    response = signed_up_client.get(f"/api/events/{event['id']}")
    assert response.status_code == 403
