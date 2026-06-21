from __future__ import annotations

from flask import Blueprint, request
from flask_login import login_required
from sqlalchemy import select

from ..extensions import db
from ..models import CulturalMoment
from ..services.cultural_moment_service import seed_cultural_moments
from ..utils.errors import api_success
from ..utils.normalization import normalize_nationality
from ..utils.security import require_cron_secret


cultural_moments_bp = Blueprint("cultural_moments", __name__)


@cultural_moments_bp.get("/api/cultural-moments")
@login_required
def list_cultural_moments():
    query = select(CulturalMoment).order_by(
        CulturalMoment.month, CulturalMoment.day, CulturalMoment.title
    )
    nationality = request.args.get("nationality", "").strip()
    if nationality:
        query = query.where(
            CulturalMoment.nationality == normalize_nationality(nationality)
        )
    moments = db.session.scalars(query).all()
    return api_success({"cultural_moments": [moment.to_dict() for moment in moments]})


@cultural_moments_bp.post("/api/admin/cultural-moments/seed")
def seed_moments():
    require_cron_secret()
    return api_success(seed_cultural_moments())

