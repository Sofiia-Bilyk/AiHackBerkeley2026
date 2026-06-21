from __future__ import annotations

import base64
import json

from flask import Blueprint, Response, request
from simple_websocket.errors import ConnectionClosed
from sqlalchemy import select
from websocket import WebSocketTimeoutException

from ..extensions import db, sock
from ..models import Task, User, VoiceSession
from ..services.deepgram_service import final_transcript, open_deepgram_stream
from ..services.hotline_agent_service import handle_hotline_request
from ..services.task_followup_service import process_followup_response
from ..services.twilio_service import twiml_gather, twiml_say, validate_twilio_request
from ..services.voice_session_service import create_voice_session, finish_voice_session
from ..utils.errors import ApiError


twilio_bp = Blueprint("twilio", __name__, url_prefix="/api/twilio")


@twilio_bp.post("/inbound")
def inbound_call():
    validate_twilio_request()
    caller = request.form.get("From", "").strip()
    call_sid = request.form.get("CallSid", "").strip()
    user = db.session.scalar(select(User).where(User.phone_number == caller))
    if user is None:
        return _xml(twiml_say("We could not find a Connect account for this phone number."))
    voice_session = create_voice_session(
        user.id, agent_type="hotline", mode="twilio", external_id=call_sid or None
    )
    speech = request.form.get("SpeechResult", "").strip()
    if not speech:
        action = f"/api/twilio/inbound?voice_session_id={voice_session.id}"
        return _xml(twiml_gather("Welcome to Connect. How can I help with your events or volunteer tasks?", action=action))

    result = handle_hotline_request(user, speech)
    voice_session.transcript = _append_turn(voice_session.transcript, "Caller", speech)
    voice_session.transcript = _append_turn(voice_session.transcript, "Assistant", result["response"])
    finish_voice_session(voice_session, outcome=result["action"])
    return _xml(twiml_say(f"{result['response']} Goodbye."))


@twilio_bp.post("/status")
def call_status():
    validate_twilio_request()
    call_sid = request.form.get("CallSid", "")
    call_status = request.form.get("CallStatus", "")
    voice_session = db.session.scalar(
        select(VoiceSession).where(VoiceSession.external_id == call_sid)
    )
    if voice_session and voice_session.status == "active" and call_status in {
        "completed", "busy", "failed", "no-answer", "canceled"
    }:
        status = "completed" if call_status == "completed" else "failed"
        finish_voice_session(voice_session, status=status, outcome=call_status)
    return Response(status=204)


@twilio_bp.post("/task-followup")
def task_followup_call():
    validate_twilio_request()
    try:
        task_id = int(request.args.get("task_id", ""))
    except ValueError:
        return _xml(twiml_say("This task follow-up link is invalid."))
    task = db.session.get(Task, task_id)
    if task is None or task.status != "claimed" or task.assignee_id is None:
        return _xml(twiml_say("This task no longer needs a follow-up."))
    user = db.session.get(User, task.assignee_id)
    if user is None:
        return _xml(twiml_say("The task assignee could not be found."))
    call_sid = request.form.get("CallSid", "").strip()
    voice_session = create_voice_session(
        user.id, agent_type="task_followup", mode="twilio", external_id=call_sid or None
    )
    speech = request.form.get("SpeechResult", "").strip()
    if not speech:
        action = f"/api/twilio/task-followup?task_id={task.id}&voice_session_id={voice_session.id}"
        prompt = f"Quick check-in on {task.title}. Is it done, still on track, or should we reassign it?"
        return _xml(twiml_gather(prompt, action=action))

    result = process_followup_response(task, user, speech, channel="phone_call")
    voice_session.transcript = _append_turn(voice_session.transcript, "Member", speech)
    finish_voice_session(voice_session, outcome=result["outcome"])
    messages = {
        "done": "Thank you. I marked the task done.",
        "still_on_track": "Thanks. I recorded that it is still on track.",
        "needs_reassignment": "Understood. I reopened the task for another volunteer.",
        "failed": "I recorded the issue for organizer follow-up.",
        "no_response": "I could not determine the task status. Please update it in the app.",
    }
    return _xml(twiml_say(messages[result["outcome"]]))


@sock.route("/api/twilio/media-stream")
def twilio_media_stream(ws):
    try:
        validate_twilio_request()
    except ApiError:
        ws.close()
        return
    deepgram = None
    voice_session = None
    try:
        while True:
            try:
                raw = ws.receive(timeout=0.05)
                if raw is None:
                    break
                event = json.loads(raw)
                event_type = event.get("event")
                if event_type == "start":
                    parameters = event.get("start", {}).get("customParameters", {})
                    session_id = int(parameters.get("voice_session_id"))
                    voice_session = db.session.get(VoiceSession, session_id)
                    if voice_session is None or voice_session.mode != "twilio":
                        break
                    deepgram = open_deepgram_stream(
                        language_hint=voice_session.language_hint, telephony=True
                    )
                elif event_type == "media" and deepgram:
                    deepgram.send_binary(base64.b64decode(event["media"]["payload"]))
                elif event_type == "stop":
                    break
            except TimeoutError:
                pass
            if deepgram:
                try:
                    transcript = final_transcript(deepgram.recv())
                    if transcript and voice_session:
                        voice_session.transcript = _append_turn(
                            voice_session.transcript, "Caller", transcript
                        )
                        db.session.commit()
                except WebSocketTimeoutException:
                    pass
    except (ConnectionClosed, ValueError, TypeError, KeyError, json.JSONDecodeError):
        pass
    finally:
        if deepgram:
            try:
                deepgram.send(json.dumps({"type": "CloseStream"}))
                deepgram.close()
            except Exception:
                pass


def _xml(body: str) -> Response:
    return Response(body, status=200, mimetype="text/xml")


def _append_turn(existing: str, speaker: str, text: str) -> str:
    return f"{existing}\n{speaker}: {text}".strip()
