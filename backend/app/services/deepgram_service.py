from __future__ import annotations

import json
from urllib.parse import urlencode

from flask import current_app
from websocket import WebSocket, create_connection

from ..utils.errors import ApiError


DEEPGRAM_URL = "wss://api.deepgram.com/v1/listen"


def open_deepgram_stream(*, language_hint: str | None, telephony: bool = False) -> WebSocket:
    """Open a live Deepgram transcription socket for browser or Twilio audio."""
    api_key = current_app.config.get("DEEPGRAM_API_KEY")
    if not api_key or api_key == "replace_me":
        raise ApiError("EXTERNAL_SERVICE_FAILED", "DEEPGRAM_API_KEY is not configured.", 503)
    params = {
        "model": current_app.config["DEEPGRAM_MODEL"],
        "smart_format": "true",
        "interim_results": "false",
        "punctuate": "true",
    }
    if language_hint:
        params["language"] = language_hint
    if telephony:
        params.update({"encoding": "mulaw", "sample_rate": "8000", "channels": "1"})
    connection = create_connection(
        f"{DEEPGRAM_URL}?{urlencode(params)}",
        header=[f"Authorization: Token {api_key}"],
        timeout=10,
    )
    connection.settimeout(0.05)
    return connection


def final_transcript(message: str) -> str | None:
    try:
        payload = json.loads(message)
        if payload.get("type") != "Results" or not payload.get("is_final"):
            return None
        alternatives = payload.get("channel", {}).get("alternatives", [])
        text = alternatives[0].get("transcript", "").strip() if alternatives else ""
        return text or None
    except (AttributeError, IndexError, json.JSONDecodeError, TypeError):
        return None
