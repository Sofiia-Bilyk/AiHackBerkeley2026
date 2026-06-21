from __future__ import annotations

from flask import Blueprint, request, session
from flask_login import current_user, login_required, login_user, logout_user
from sqlalchemy import select

from ..extensions import db
from ..models import User
from ..utils.errors import ApiError, api_success
from ..utils.normalization import normalize_email
from ..utils.validation import EMAIL_PATTERN, json_body, required_string


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/signup")
def signup():
    data = json_body(request)
    email = normalize_email(required_string(data, "email", max_length=320))
    password = required_string(data, "password", max_length=256)
    phone_number = required_string(data, "phone_number", max_length=32)

    if not EMAIL_PATTERN.fullmatch(email):
        raise ApiError("VALIDATION_ERROR", "A valid email address is required.")
    if len(password) < 8:
        raise ApiError("VALIDATION_ERROR", "Password must be at least 8 characters.")
    if db.session.scalar(select(User.id).where(User.email == email)) is not None:
        raise ApiError("DUPLICATE_RESOURCE", "An account with that email already exists.", 409)

    user = User(email=email, phone_number=phone_number, onboarding_status="started")
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    login_user(user, remember=True)
    session.permanent = True

    return api_success({"user": user.to_dict()}, 201)


@auth_bp.post("/login")
def login():
    data = json_body(request)
    email = normalize_email(required_string(data, "email", max_length=320))
    password = required_string(data, "password", max_length=256)
    user = db.session.scalar(select(User).where(User.email == email))

    if user is None or not user.check_password(password):
        raise ApiError("UNAUTHORIZED", "Invalid email or password.", 401)

    login_user(user, remember=True)
    session.permanent = True
    return api_success({"user": user.to_dict()})


@auth_bp.post("/logout")
@login_required
def logout():
    logout_user()
    session.clear()
    return api_success()


@auth_bp.get("/me")
@login_required
def me():
    return api_success({"user": current_user.to_dict()})

