from __future__ import annotations

from ..extensions import db
from ..models import BudgetItem, Event, EventPlan, Task, VenueCandidate
from ..utils.errors import ApiError


def approve_plan(
    plan: EventPlan, *, task_ids: list[int], venue_id: int, budget_item_ids: list[int]
) -> EventPlan:
    """Apply explicit human selections and approve a private plan."""
    if plan.status not in {"draft", "needs_review"}:
        raise ApiError("INVALID_STATE", "Only draft plans awaiting review can be approved.", 409)
    venue = db.session.get(VenueCandidate, venue_id)
    if venue is None or venue.event_plan_id != plan.id:
        raise ApiError("VALIDATION_ERROR", "Selected venue does not belong to this plan.")
    tasks = {task.id: task for task in plan.tasks}
    budgets = {item.id: item for item in plan.budget_items}
    if not task_ids or any(task_id not in tasks for task_id in task_ids):
        raise ApiError("VALIDATION_ERROR", "Approved tasks must belong to this plan.")
    if any(item_id not in budgets for item_id in budget_item_ids):
        raise ApiError("VALIDATION_ERROR", "Approved budget items must belong to this plan.")

    for candidate in plan.venue_candidates:
        candidate.status = "selected" if candidate.id == venue_id else "rejected"
    for task in plan.tasks:
        task.status = "draft" if task.id in task_ids else "cancelled"
    for item in plan.budget_items:
        item.status = "approved" if item.id in budget_item_ids else "estimated"
    plan.status = "approved"
    db.session.commit()
    return plan


def publish_plan(plan: EventPlan) -> Event:
    """Atomically create the public event and open only human-approved tasks."""
    if plan.status != "approved":
        raise ApiError("INVALID_STATE", "The event plan must be approved before publishing.", 409)
    if plan.target_date is None:
        raise ApiError("VALIDATION_ERROR", "The event plan needs a target date before publishing.")
    selected = next((venue for venue in plan.venue_candidates if venue.status == "selected"), None)
    if selected is None:
        raise ApiError("VALIDATION_ERROR", "Select a venue before publishing.")
    if plan.event is not None:
        raise ApiError("INVALID_STATE", "This event plan has already been published.", 409)

    event = Event(
        event_plan=plan, community_id=plan.community_id, organizer_id=plan.organizer_id,
        title=plan.title, description=plan.description, event_type=plan.event_type,
        date=plan.target_date, status="published", venue_name=selected.name,
        venue_address=selected.address, budget_amount=plan.budget_amount,
    )
    db.session.add(event)
    db.session.flush()
    for task in plan.tasks:
        if task.status == "draft":
            task.status = "open"
            task.event_id = event.id
    plan.status = "published"
    db.session.commit()
    return event
