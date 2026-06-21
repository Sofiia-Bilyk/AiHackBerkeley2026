from __future__ import annotations

import json

from flask import current_app, request
from flask_login import current_user, login_required
from simple_websocket.errors import ConnectionClosed
from websocket import WebSocketTimeoutException

from ..extensions import db, sock
from ..models import VoiceSession
from ..services.deepgram_service import final_transcript, open_deepgram_stream
from ..services.onboarding_agent_service import process_onboarding_transcript
from ..services.voice_session_service import create_voice_session, finish_voice_session, require_owned_voice_session
from ..utils.errors import ApiError, api_success
from ..utils.validation import json_body, optional_string


from flask import Blueprint

voice_bp = Blueprint("voice", __name__, url_prefix="/api/voice")


@voice_bp.post("/sessions")
@login_required
def start_session():
    data = request.get_json(silent=True) or {}
    agent_type = data.get("agent_type", "onboarding")
    if agent_type != "onboarding":
        raise ApiError("VALIDATION_ERROR", "Browser voice currently supports onboarding sessions.")
    language_hint = optional_string(data, "language_hint", max_length=20)
    voice_session = create_voice_session(
        current_user.id, agent_type=agent_type, mode="browser", language_hint=language_hint
    )
    return api_success(
        {
            "voice_session": voice_session.to_dict(),
            "websocket_url": f"/api/voice/stream?session_id={voice_session.id}",
        },
        201,
    )


@voice_bp.post("/sessions/<int:session_id>/end")
@login_required
def end_session(session_id: int):
    voice_session = require_owned_voice_session(session_id, current_user.id)
    outcome = optional_string(request.get_json(silent=True) or {}, "outcome", max_length=500)
    finish_voice_session(voice_session, outcome=outcome or "user_ended")
    return api_success({"voice_session": voice_session.to_dict()})


@sock.route("/api/voice/stream")
def voice_stream(ws):
    if not current_user.is_authenticated:
        ws.send(json.dumps({"type": "error", "code": "UNAUTHORIZED"}))
        return
    try:
        session_id = int(request.args.get("session_id", ""))
        voice_session = require_owned_voice_session(session_id, current_user.id)
        if voice_session.status != "active" or voice_session.mode != "browser":
            raise ApiError("INVALID_STATE", "Voice session is not active.", 409)
        deepgram = open_deepgram_stream(language_hint=voice_session.language_hint)
    except (ApiError, TypeError, ValueError) as error:
        ws.send(json.dumps({"type": "error", "message": str(error)}))
        return

    ws.send(json.dumps({"type": "ready", "voice_session_id": voice_session.id}))
    try:
        while True:
            try:
                incoming = ws.receive(timeout=0.05)
                if incoming is None:
                    break
                if isinstance(incoming, bytes):
                    deepgram.send_binary(incoming)
                elif isinstance(incoming, str):
                    control = json.loads(incoming)
                    if control.get("type") == "end":
                        break
            except TimeoutError:
                pass
            except (json.JSONDecodeError, TypeError):
                ws.send(json.dumps({"type": "error", "message": "Invalid control message."}))

            try:
                deepgram_message = deepgram.recv()
                transcript = final_transcript(deepgram_message)
                if transcript:
                    result = process_onboarding_transcript(voice_session, transcript)
                    ws.send(json.dumps({"type": "agent_response", "transcript": transcript, **result}))
            except WebSocketTimeoutException:
                pass
    except ConnectionClosed:
        pass
    finally:
        try:
            deepgram.send(json.dumps({"type": "CloseStream"}))
            deepgram.close()
        except Exception:
            current_app.logger.debug("Deepgram socket already closed")
