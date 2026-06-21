from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from decimal import Decimal, InvalidOperation

from ..extensions import db
from ..models import EventPlan, Task
from .claude_service import complete_json


def generate_tasks(plan: EventPlan) -> list[Task]:
    """Generate small volunteer-ready draft tasks for a reviewed event plan."""
    for task in list(plan.tasks):
        if task.status == "draft":
            db.session.delete(task)
    event_day = plan.target_date
    fallback_templates = [
        ("Confirm venue reservation", "Confirm availability, rules, and reservation details.", "venue", "high", 21, Decimal("0")),
        ("Coordinate food plan", "Confirm the menu, quantities, and food safety needs.", "food", "high", 10, None),
        ("Create event flyer", "Prepare and share a clear community event announcement.", "outreach", "medium", 14, Decimal("0")),
        ("Buy plates and cups", "Purchase reusable or compostable serving supplies.", "supplies", "medium", 5, Decimal("25")),
        ("Set up tables", "Arrive early to arrange tables, seating, and signs.", "setup", "medium", 0, Decimal("0")),
        ("Clean up after event", "Restore the venue and remove waste after the gathering.", "cleanup", "high", 0, Decimal("0")),
    ]
    generated = complete_json(
        "You create small, realistic volunteer tasks for community cultural events. Do not assign people.",
        (
            f"Title: {plan.title}\nDescription: {plan.description}\nType: {plan.event_type}\n"
            f"Date: {plan.target_date}\nAttendees: {plan.expected_attendees}\nBudget: {plan.budget_amount}\n"
            "Return {\"tasks\": [...]} with 4-10 tasks. Each task needs title, description, "
            "category, priority, days_before_event, and estimated_cost."
        ),
    )
    templates = _validated_templates(generated) or fallback_templates
    tasks = []
    for title, description, category, priority, days_before, cost in templates:
        due_at = None
        if event_day:
            due_date = event_day - timedelta(days=days_before)
            due_at = datetime.combine(due_date, time(hour=17), tzinfo=timezone.utc)
        task = Task(
            event_plan=plan, title=title, description=description, category=category,
            priority=priority, due_at=due_at, estimated_cost=cost,
            status="draft", created_by_agent=True,
        )
        db.session.add(task)
        tasks.append(task)
    plan.status = "needs_review"
    db.session.commit()
    return tasks


def _validated_templates(generated: dict | None) -> list[tuple] | None:
    if not generated or not isinstance(generated.get("tasks"), list):
        return None
    categories = {"food", "decor", "venue", "setup", "cleanup", "outreach", "supplies", "transport", "other"}
    priorities = {"low", "medium", "high"}
    templates = []
    for item in generated["tasks"][:10]:
        if not isinstance(item, dict):
            return None
        title, description = item.get("title"), item.get("description")
        category, priority = item.get("category"), item.get("priority")
        days = item.get("days_before_event")
        try:
            cost = Decimal(str(item.get("estimated_cost", 0)))
        except (InvalidOperation, TypeError, ValueError):
            return None
        if not (
            isinstance(title, str) and 1 <= len(title.strip()) <= 200
            and isinstance(description, str) and 1 <= len(description.strip()) <= 2000
            and category in categories and priority in priorities
            and isinstance(days, int) and not isinstance(days, bool) and 0 <= days <= 90
            and cost.is_finite() and cost >= 0
        ):
            return None
        templates.append((title.strip(), description.strip(), category, priority, days, cost))
    return templates if len(templates) >= 4 else None
