from __future__ import annotations

from .claude_service import complete_json


INABILITY_PHRASES = ("cannot", "can't", "unable", "won't", "not able", "need help")


def evaluate_task_report(*, task_title: str, report_text: str) -> str:
    """Classify a task report, defaulting to acceptance for the MVP workflow."""
    generated = complete_json(
        "You coordinate volunteers. Accept clear completion reports; request follow-up when the task is incomplete or blocked.",
        (
            f"Task: {task_title}\nReport: {report_text}\n"
            "Return {\"status\": \"accepted\"} or {\"status\": \"needs_followup\"}."
        ),
        max_tokens=200,
    )
    if generated and generated.get("status") in {"accepted", "needs_followup"}:
        return generated["status"]
    lowered = report_text.lower()
    return "needs_followup" if any(phrase in lowered for phrase in INABILITY_PHRASES) else "accepted"

