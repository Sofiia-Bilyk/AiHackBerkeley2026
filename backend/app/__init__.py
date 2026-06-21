from __future__ import annotations

from flask import Flask
from flask_cors import CORS

from .config import Config
from .extensions import db, login_manager, migrate, sock
from .routes import register_blueprints
from .utils.errors import register_error_handlers


def create_app(config: type[Config] | dict | None = None) -> Flask:
    """Create and configure the Connect API application."""
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)
    if config:
        if isinstance(config, dict):
            app.config.update(config)
        else:
            app.config.from_object(config)

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    sock.init_app(app)
    CORS(
        app,
        origins=[app.config["FRONTEND_ORIGIN"]],
        supports_credentials=True,
    )

    register_blueprints(app)
    register_error_handlers(app)

    return app
