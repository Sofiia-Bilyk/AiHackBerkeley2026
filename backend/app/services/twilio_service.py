from __future__ import annotations

import base64
import hashlib
import hmac
import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from xml.sax.saxutils import escape

from flask import current_app, request

from ..utils.errors import ApiError


def validate_twilio_request() -> None:
    """Validate Twilio's HMAC-SHA1 webhook signature outside test mode."""
    if current_app.config.get("TESTING"):
        return
    token = current_app.config.get("TWILIO_AUTH_TOKEN")
    signature = request.headers.get("X-Twilio-Signature", "")
    if not token or token == "replace_me" or not signature:
        raise ApiError("UNAUTHORIZED", "A valid Twilio signature is required.", 401)
    public_base = current_app.config.get("PUBLIC_BASE_URL", "").rstrip("/")
    url = f"{public_base}{request.full_path.rstrip('?')}" if public_base else request.url
    signed = url + "".join(
        key + value for key in sorted(request.form) for value in request.form.getlist(key)
    )
    expected = base64.b64encode(
        hmac.new(token.encode(), signed.encode(), hashlib.sha1).digest()
    ).decode()
    if not hmac.compare_digest(signature, expected):
        raise ApiError("UNAUTHORIZED", "A valid Twilio signature is required.", 401)


def twiml_say(message: str) -> str:
    return f'<?xml version="1.0" encoding="UTF-8"?><Response><Say>{escape(message)}</Say></Response>'


def twiml_gather(message: str, *, action: str) -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8"?><Response>'
        f'<Gather input="speech" action="{escape(action)}" method="POST" speechTimeout="auto">'
        f"<Say>{escape(message)}</Say></Gather>"
        "<Say>I did not hear a response. Goodbye.</Say></Response>"
    )


def place_outbound_call(*, to: str, webhook_url: str) -> dict:
    """Create an outbound Twilio call using the Voice REST API."""
    sid = current_app.config.get("TWILIO_ACCOUNT_SID")
    token = current_app.config.get("TWILIO_AUTH_TOKEN")
    from_number = current_app.config.get("TWILIO_PHONE_NUMBER")
    if any(not value or value == "replace_me" for value in (sid, token, from_number)):
        raise ApiError("EXTERNAL_SERVICE_FAILED", "Twilio calling is not configured.", 503)
    endpoint = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Calls.json"
    status_url = f"{current_app.config['PUBLIC_BASE_URL'].rstrip('/')}/api/twilio/status"
    body = urlencode(
        [
            ("To", to),
            ("From", from_number),
            ("Url", webhook_url),
            ("Method", "POST"),
            ("StatusCallback", status_url),
            ("StatusCallbackMethod", "POST"),
            ("StatusCallbackEvent", "completed"),
        ]
    ).encode()
    credentials = base64.b64encode(f"{sid}:{token}".encode()).decode()
    outbound = Request(
        endpoint,
        data=body,
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )
    try:
        with urlopen(outbound, timeout=10) as response:
            payload = json.load(response)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise ApiError("EXTERNAL_SERVICE_FAILED", "Twilio could not place the call.", 502) from error
    return {"call_sid": payload.get("sid"), "status": payload.get("status")}
