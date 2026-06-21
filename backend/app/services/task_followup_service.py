from __future__ import annotations

from datetime import datetime, timezone

from ..extensions import db
from ..models import AgentInteraction, Task, TaskReport, User
from .agent_audit_service import complete_agent_run, start_agent_run
from .claude_service import complete_json
from .community_execution_service import reopen_task


def followup_prompt(task: Task) -> dict:
    """Create and audit a concise follow-up prompt for a claimed task."""
    run = start_agent_run(
        "task_coordinator",
        {"task": task.to_dict()},
        community_id=task.event.community_id,
        user_id=task.assignee_id,
        task_id=task.id,
    )
    prompt = f"Quick check-in on {task.title}: is it done, still on track, or do you need it reassigned?"
    result = {"prompt": prompt, "outcome": "awaiting_response"}
    complete_agent_run(run, result)
    return result


def process_followup_response(task: Task, user: User, response_text: str, *, channel: str) -> dict:
    """Apply one validated task-follow-up outcome and retain its audit trail."""
    run = start_agent_run(
        "task_coordinator",
        {"task": task.to_dict(), "response": response_text},
        community_id=task.event.community_id,
        user_id=user.id,
        task_id=task.id,
    )
    generated = complete_json(
        "Classify a volunteer task update. Return only done, still_on_track, needs_reassignment, failed, or no_response.",
        f"Task: {task.title}\nUpdate: {response_text}\nReturn {{\"outcome\": string}}.",
        max_tokens=150,
    )
    outcome = generated.get("outcome") if generated else _fallback_outcome(response_text)
    if outcome not in {"done", "still_on_track", "needs_reassignment", "failed", "no_response"}:
        outcome = "no_response"

    if outcome == "done":
        task.status = "done"
        task.self_reported_at = datetime.now(timezone.utc)
        db.session.add(TaskReport(task_id=task.id, reporter_id=user.id, report_text=response_text, status="accepted"))
    elif outcome == "still_on_track":
        db.session.add(TaskReport(task_id=task.id, reporter_id=user.id, report_text=response_text, status="submitted"))
    elif outcome == "needs_reassignment":
        reopen_task(task, user, response_text)
    elif outcome == "failed":
        task.status = "failed"
        user.task_failure_count += 1
        db.session.add(TaskReport(task_id=task.id, reporter_id=user.id, report_text=response_text, status="needs_followup"))

    db.session.add(
        AgentInteraction(
            user_id=user.id,
            community_id=task.event.community_id,
            agent_type="task_coordinator",
            channel=channel,
            transcript=response_text,
            outcome=outcome,
        )
    )
    db.session.commit()
    result = {"outcome": outcome, "task": task.to_dict()}
    complete_agent_run(run, result)
    return result


def _fallback_outcome(text: str) -> str:
    lowered = text.lower().strip()
    if not lowered:
        return "no_response"
    if any(value in lowered for value in ("can't", "cannot", "unable", "reassign")):
        return "needs_reassignment"
    if any(value in lowered for value in ("done", "finished", "completed")):
        return "done"
    if any(value in lowered for value in ("on track", "working on", "in progress")):
        return "still_on_track"
    return "no_response"

