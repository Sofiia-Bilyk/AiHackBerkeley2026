from __future__ import annotations

import hmac

from flask import current_app, request

from .errors import ApiError


def require_cron_secret() -> None:
    supplied = request.headers.get("X-Cron-Secret", "")
    expected = current_app.config["CRON_SECRET"]
    if not supplied or not hmac.compare_digest(supplied, expected):
        raise ApiError("UNAUTHORIZED", "A valid cron secret is required.", 401)

