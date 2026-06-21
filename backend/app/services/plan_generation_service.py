from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from ..extensions import db
from ..models import BudgetItem, EventPlan
from .claude_service import complete_json


def generate_plan(
    plan: EventPlan, *, budget_amount: Decimal, expected_attendees: int, constraints: str | None
) -> EventPlan:
    """Generate a practical deterministic draft that remains subject to human review."""
    plan.budget_amount = budget_amount
    plan.expected_attendees = expected_attendees
    plan.target_date = plan.target_date or (date.today() + timedelta(days=30))
    plan.event_type = plan.event_type or "community_gathering"
    generated = complete_json(
        "You improve realistic, culturally respectful, low-budget community event plans. Humans approve all outputs.",
        (
            f"Current title: {plan.title}\nCurrent description: {plan.description}\n"
            f"Event type: {plan.event_type}\nBudget: {budget_amount} {plan.budget_currency}\n"
            f"Expected attendees: {expected_attendees}\nConstraints: {constraints or 'None'}\n"
            "Return title, description, and event_type as strings."
        ),
    )
    if generated:
        title = generated.get("title")
        description = generated.get("description")
        event_type = generated.get("event_type")
        if isinstance(title, str) and 1 <= len(title.strip()) <= 200:
            plan.title = title.strip()
        if isinstance(description, str) and 1 <= len(description.strip()) <= 5000:
            plan.description = description.strip()
        if isinstance(event_type, str) and 1 <= len(event_type.strip()) <= 80:
            plan.event_type = event_type.strip()
    if constraints:
        base_description = plan.description.split("\n\nPlanning constraints:", 1)[0]
        plan.description = f"{base_description}\n\nPlanning constraints: {constraints}"
    plan.status = "draft"

    for item in list(plan.budget_items):
        db.session.delete(item)
    allocations = (
        ("venue", "Venue reservation", Decimal("0.35")),
        ("food", "Food and refreshments", Decimal("0.40")),
        ("supplies", "Event supplies", Decimal("0.15")),
        ("other", "Contingency", Decimal("0.10")),
    )
    for category, description, share in allocations:
        db.session.add(
            BudgetItem(
                event_plan=plan,
                category=category,
                description=description,
                estimated_amount=(budget_amount * share).quantize(Decimal("0.01")),
            )
        )
    db.session.commit()
    return plan
