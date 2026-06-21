from __future__ import annotations

import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import current_app


MESSAGES_URL = "https://api.anthropic.com/v1/messages"


def complete_json(system: str, prompt: str, *, max_tokens: int = 1800) -> dict | None:
    """Request structured Claude output, returning None for the demo-safe fallback path."""
    api_key = current_app.config.get("ANTHROPIC_API_KEY")
    if not api_key or api_key == "replace_me":
        return None
    body = {
        "model": current_app.config["ANTHROPIC_MODEL"],
        "max_tokens": max_tokens,
        "system": f"{system}\nReturn only one valid JSON object. No markdown or prose.",
        "messages": [{"role": "user", "content": prompt}],
    }
    request = Request(
        MESSAGES_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=20) as response:
            payload = json.load(response)
        text = "".join(
            block.get("text", "")
            for block in payload.get("content", [])
            if block.get("type") == "text"
        ).strip()
        result = _parse_json_object(text)
        current_app.logger.info("Claude structured generation completed")
        return result
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, TypeError, ValueError) as error:
        current_app.logger.warning("Claude generation failed; using fallback: %s", error)
        return None


def _parse_json_object(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("Claude response did not contain a JSON object")
    parsed = json.loads(text[start : end + 1])
    if not isinstance(parsed, dict):
        raise ValueError("Claude response was not a JSON object")
    return parsed
