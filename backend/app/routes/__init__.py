from __future__ import annotations

from flask import Flask

from .auth import auth_bp
from .communities import communities_bp
from .cron import cron_bp
from .cultural_moments import cultural_moments_bp
from .event_suggestions import event_suggestions_bp
from .event_plans import event_plans_bp
from .events import events_bp
from .tasks import tasks_bp
from .onboarding import onboarding_bp
from .voice import voice_bp
from .twilio import twilio_bp
from .agents import agents_bp


def register_blueprints(app: Flask) -> None:
    app.register_blueprint(auth_bp)
    app.register_blueprint(onboarding_bp)
    app.register_blueprint(communities_bp)
    app.register_blueprint(cultural_moments_bp)
    app.register_blueprint(event_suggestions_bp)
    app.register_blueprint(event_plans_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(voice_bp)
    app.register_blueprint(twilio_bp)
    app.register_blueprint(agents_bp)
    app.register_blueprint(cron_bp)
