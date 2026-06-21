from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from app.extensions import db
from app.models import AgentInteraction, AgentRun, Task, User, VoiceSession
from app.services.deepgram_service import final_transcript
from app.services.onboarding_agent_service import process_onboarding_transcript
from test_phase_four import publish_event, sign_up_member


def test_browser_voice_session_lifecycle_is_idempotent(signed_up_client, app):
    first = signed_up_client.post(
        "/api/voice/sessions", json={"agent_type": "onboarding", "language_hint": "en"}
    )
    second = signed_up_client.post(
        "/api/onboarding/start-voice", json={"language_hint": "en"}
    )
    session_id = first.get_json()["data"]["voice_session"]["id"]

    ended = signed_up_client.post(
        f"/api/voice/sessions/{session_id}/end", json={"outcome": "user_ended"}
    )

    assert first.status_code == 201
    assert second.get_json()["data"]["voice_session_id"] == session_id
    assert ended.get_json()["data"]["voice_session"]["status"] == "completed"
    with app.app_context():
        assert db.session.query(VoiceSession).count() == 1
        assert db.session.query(AgentInteraction).count() == 1


def test_voice_completion_route_places_user_in_community(signed_up_client, app):
    started = signed_up_client.post("/api/onboarding/start-voice", json={})
    session_id = started.get_json()["data"]["voice_session_id"]
    completed = signed_up_client.post(
        "/api/onboarding/complete",
        json={
            "voice_session_id": session_id,
            "name": "Rachael",
            "location": "Berkeley",
            "primary_nationality": "Ghanaian",
            "secondary_interest": None,
            "preferred_language": "English",
        },
    )

    assert completed.status_code == 200
    data = completed.get_json()["data"]
    assert data["user"]["onboarding_status"] == "completed"
    assert data["community"]["location"] == "berkeley"
    assert data["voice_session"]["status"] == "completed"
    with app.app_context():
        assert db.session.query(AgentInteraction).count() == 1


def test_onboarding_agent_executes_only_validated_completion_tool(
    signed_up_client, app, monkeypatch
):
    session_id = signed_up_client.post(
        "/api/onboarding/start-voice", json={}
    ).get_json()["data"]["voice_session_id"]
    monkeypatch.setattr(
        "app.services.onboarding_agent_service.complete_json",
        lambda *args, **kwargs: {
            "response": "Thanks. I have confirmed your details.",
            "tool": "complete_onboarding",
            "arguments": {
                "name": "Rachael",
                "location": "Berkeley",
                "primary_nationality": "Ghanaian",
                "secondary_interest": None,
                "preferred_language": "English",
            },
        },
    )
    with app.app_context():
        voice_session = db.session.get(VoiceSession, session_id)
        result = process_onboarding_transcript(voice_session, "Yes, those details are right.")

        assert result["tool"] == "complete_onboarding"
        assert voice_session.status == "completed"
        assert voice_session.user.onboarding_status == "completed"
        run = db.session.scalar(db.select(AgentRun))
        assert run.status == "completed"
        assert run.output_json["tool_result"]["onboarding_status"] == "completed"
        assert db.session.query(AgentInteraction).count() == 1


def test_onboarding_agent_rejects_unapproved_tool(signed_up_client, app, monkeypatch):
    session_id = signed_up_client.post(
        "/api/onboarding/start-voice", json={}
    ).get_json()["data"]["voice_session_id"]
    monkeypatch.setattr(
        "app.services.onboarding_agent_service.complete_json",
        lambda *args, **kwargs: {
            "response": "Publishing now.",
            "tool": "publish_event",
            "arguments": {"event_id": 1},
        },
    )
    with app.app_context():
        result = process_onboarding_transcript(
            db.session.get(VoiceSession, session_id), "Please publish something."
        )
        assert result["tool"] is None
        run = db.session.scalar(db.select(AgentRun))
        assert run.status == "failed"
        assert db.session.get(User, 1).onboarding_status == "started"


def test_deepgram_final_transcript_parser_ignores_interim_results():
    interim = json.dumps(
        {"type": "Results", "is_final": False, "channel": {"alternatives": [{"transcript": "partial"}]}}
    )
    final = json.dumps(
        {"type": "Results", "is_final": True, "channel": {"alternatives": [{"transcript": "final words"}]}}
    )
    assert final_transcript(interim) is None
    assert final_transcript(final) == "final words"
    assert final_transcript("not-json") is None


def test_twilio_hotline_identifies_user_and_records_interaction(signed_up_client, app):
    unknown = signed_up_client.post(
        "/api/twilio/inbound", data={"From": "+19999999999", "CallSid": "CA-unknown"}
    )
    initial = signed_up_client.post(
        "/api/twilio/inbound", data={"From": "+14155550123", "CallSid": "CA-hotline"}
    )
    reply = signed_up_client.post(
        "/api/twilio/inbound",
        data={
            "From": "+14155550123",
            "CallSid": "CA-hotline",
            "SpeechResult": "I need help with my events",
        },
    )

    assert "could not find" in unknown.get_data(as_text=True)
    assert "<Gather" in initial.get_data(as_text=True)
    assert "Goodbye" in reply.get_data(as_text=True)
    with app.app_context():
        voice_session = db.session.scalar(
            db.select(VoiceSession).where(VoiceSession.external_id == "CA-hotline")
        )
        assert voice_session.status == "completed"
        assert db.session.query(AgentRun).count() == 1
        assert db.session.query(AgentInteraction).count() == 1


def test_twilio_task_followup_marks_claimed_task_done(signed_up_client, app):
    _, tasks = publish_event(signed_up_client)
    sign_up_member(signed_up_client)
    task_id = tasks[0]["id"]
    signed_up_client.post(f"/api/tasks/{task_id}/claim")

    initial = signed_up_client.post(
        f"/api/twilio/task-followup?task_id={task_id}",
        data={"CallSid": "CA-followup"},
    )
    reply = signed_up_client.post(
        f"/api/twilio/task-followup?task_id={task_id}",
        data={"CallSid": "CA-followup", "SpeechResult": "It is finished and done."},
    )

    assert "<Gather" in initial.get_data(as_text=True)
    assert "marked the task done" in reply.get_data(as_text=True)
    with app.app_context():
        assert db.session.get(Task, task_id).status == "done"
        assert db.session.query(AgentRun).count() == 1


def test_protected_task_followup_agent_and_cron_audit_runs(signed_up_client, app):
    _, tasks = publish_event(signed_up_client)
    sign_up_member(signed_up_client)
    task_id = tasks[1]["id"]
    signed_up_client.post(f"/api/tasks/{task_id}/claim")
    headers = {"X-Cron-Secret": "dev-cron-secret"}

    response = signed_up_client.post(
        "/api/agents/task-coordinator/follow-up",
        headers=headers,
        json={"task_id": task_id, "response_text": "I am still on track."},
    )
    with app.app_context():
        task = db.session.get(Task, task_id)
        task.due_at = datetime.now(timezone.utc) + timedelta(hours=12)
        db.session.commit()
    cron = signed_up_client.post("/api/cron/task-followups", headers=headers)

    assert response.status_code == 200
    assert response.get_json()["data"]["outcome"] == "still_on_track"
    assert cron.status_code == 200
    assert cron.get_json()["data"]["followups_created"] == 1
    with app.app_context():
        assert db.session.query(AgentRun).count() == 2


def test_agent_plan_route_creates_auditable_run(signed_up_client, app):
    profile = signed_up_client.post(
        "/api/onboarding/typed",
        json={
            "name": "Rachael", "location": "Berkeley",
            "primary_nationality": "Ghanaian", "secondary_interest": None,
            "preferred_language": "English",
        },
    ).get_json()["data"]
    suggestion = signed_up_client.post(
        "/api/event-suggestions/generate",
        json={"community_id": profile["community"]["id"], "source_type": "user_request", "prompt": "Dinner"},
    ).get_json()["data"]["event_suggestion"]
    plan = signed_up_client.post(
        f"/api/event-suggestions/{suggestion['id']}/accept"
    ).get_json()["data"]["event_plan"]

    response = signed_up_client.post(
        "/api/agents/event-orchestrator/plan",
        headers={"X-Cron-Secret": "dev-cron-secret"},
        json={"event_plan_id": plan["id"], "budget_amount": 200, "expected_attendees": 20},
    )

    assert response.status_code == 200
    with app.app_context():
        run = db.session.scalar(db.select(AgentRun))
        assert run.agent_type == "event_orchestrator"
        assert run.status == "completed"
