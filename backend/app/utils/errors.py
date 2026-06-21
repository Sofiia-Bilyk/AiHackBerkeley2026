from __future__ import annotations

from typing import Any

from flask import Flask, jsonify
from sqlalchemy.exc import IntegrityError


class ApiError(Exception):
    def __init__(self, code: str, message: str, status: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


def api_success(data: Any = None, status: int = 200):
    return jsonify({"success": True, "data": data if data is not None else {}}), status


def api_error(code: str, message: str, status: int):
    return jsonify({"success": False, "error": {"code": code, "message": message}}), status


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(ApiError)
    def handle_api_error(error: ApiError):
        return api_error(error.code, error.message, error.status)

    @app.errorhandler(IntegrityError)
    def handle_integrity_error(error: IntegrityError):
        from ..extensions import db

        db.session.rollback()
        app.logger.warning("Database integrity error: %s", error)
        return api_error("DUPLICATE_RESOURCE", "The resource already exists.", 409)

    @app.errorhandler(404)
    def handle_not_found(_error):
        return api_error("NOT_FOUND", "The requested resource was not found.", 404)

    @app.errorhandler(405)
    def handle_method_not_allowed(_error):
        return api_error("METHOD_NOT_ALLOWED", "The HTTP method is not allowed.", 405)

    @app.errorhandler(500)
    def handle_internal_error(error):
        app.logger.exception("Unhandled API error", exc_info=error)
        return api_error("INTERNAL_ERROR", "An unexpected error occurred.", 500)

