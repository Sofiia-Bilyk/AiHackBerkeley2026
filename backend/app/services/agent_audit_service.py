from __future__ import annotations

from ..extensions import db
from ..models import AgentRun


def start_agent_run(agent_type: str, input_data: dict, **references) -> AgentRun:
    """Create a traceable agent execution before any tool mutation runs."""
    run = AgentRun(agent_type=agent_type, input_json=input_data, status="started", **references)
    db.session.add(run)
    db.session.commit()
    return run


def complete_agent_run(run: AgentRun, output_data: dict) -> AgentRun:
    run.status = "completed"
    run.output_json = output_data
    db.session.commit()
    return run


def fail_agent_run(run: AgentRun, message: str) -> AgentRun:
    run.status = "failed"
    run.output_json = {"error": message}
    db.session.commit()
    return run
