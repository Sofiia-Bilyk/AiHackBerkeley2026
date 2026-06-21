from __future__ import annotations

import re
from typing import Any

from flask import Request

from .errors import ApiError


EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def json_body(request: Request) -> dict[str, Any]:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("VALIDATION_ERROR", "A JSON request body is required.")
    return data


def required_string(data: dict[str, Any], field: str, *, max_length: int) -> str:
    value = data.get(field)
    if not isinstance(value, str) or not value.strip():
        raise ApiError("VALIDATION_ERROR", f"'{field}' is required.")
    value = value.strip()
    if len(value) > max_length:
        raise ApiError("VALIDATION_ERROR", f"'{field}' must be at most {max_length} characters.")
    return value


def optional_string(data: dict[str, Any], field: str, *, max_length: int) -> str | None:
    value = data.get(field)
    if value is None or value == "":
        return None
    if not isinstance(value, str):
        raise ApiError("VALIDATION_ERROR", f"'{field}' must be a string or null.")
    value = value.strip()
    if len(value) > max_length:
        raise ApiError("VALIDATION_ERROR", f"'{field}' must be at most {max_length} characters.")
    return value or None

