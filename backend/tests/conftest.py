from __future__ import annotations

import pytest

from app import create_app
from app.extensions import db


@pytest.fixture()
def app():
    app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-secret",
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SESSION_COOKIE_SECURE": False,
            "USE_MOCK_VENUES": True,
            "ANTHROPIC_API_KEY": None,
        }
    )
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def signed_up_client(client):
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "rachael@example.com",
            "password": "password123",
            "phone_number": "+14155550123",
        },
    )
    assert response.status_code == 201
    return client
