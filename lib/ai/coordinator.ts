// Feature 2 — Autonomous Event Coordinator.
// A "pass" advances an event's coordination: it auto-assigns unclaimed tasks to
// reliable participants, flags reminders for what's due, and posts operational
// messages into the event chat as the invisible AI layer (never a named bot).
//
// Decisions are deterministic and explainable; Claude is used only to phrase the
// resulting operational messages naturally (with a templated fallback).

import "server-only";
import { complete, hasApiKey } from "./client";
import { db } from "../store";
import { newId, nowIso } from "../utils";
import type { CulturalEvent, EventTask, ID, Message, Profile } from "../types";

export interface CoordinatorOutcome {
  assigned: { task: EventTask; assignee: Profile }[];
  reminders: { task: EventTask; assignee: Profile; daysUntilDue: number }[];
  allCriticalCovered: boolean;
  messages: Message[];
}

function isAvailable(p: Profile): boolean {
  if (p.restrictedUntil && new Date(p.restrictedUntil) > new Date()) return false;
  return true;
}

function dueInDays(event: CulturalEvent, task: EventTask): number {
  const due = new Date(event.startsAt);
  due.setDate(due.getDate() - task.dueOffsetDays);
  return Math.ceil((+due - Date.now()) / 86_400_000);
}

/** Pick the most reliable available participant with the lightest task load. */
function pickAssignee(
  candidates: Profile[],
  tasks: EventTask[],
  preferReliableForCritical: boolean,
): Profile | undefined {
  const load = (pid: ID) => tasks.filter((t) => t.assigneeProfileId === pid).length;
  const pool = candidates.filter(isAvailable);
  if (pool.length === 0) return undefined;
  return pool
    .slice()
    .sort((a, b) => {
      if (preferReliableForCritical && a.strikes !== b.strikes) return a.strikes - b.strikes;
      return load(a.id) - load(b.id);
    })[0];
}

export async function runCoordinatorPass(eventId: ID): Promise<CoordinatorOutcome> {
  const event = db.event(eventId);
  if (!event) throw new Error("Unknown event");
  const tasks = db.tasksOf(eventId);

  // participants = those who RSVP'd going/interested, else all community members
  const rsvpIds = db
    .rsvpsOf(eventId)
    .filter((r) => r.status !== "declined")
    .map((r) => r.profileId);
  let participants = db
    .membersOf(event.communityId)
    .filter((m) => rsvpIds.includes(m.id));
  if (participants.length === 0) participants = db.membersOf(event.communityId);

  const assigned: CoordinatorOutcome["assigned"] = [];
  const reminders: CoordinatorOutcome["reminders"] = [];

  // 1) reassign tasks whose assignee became restricted
  for (const task of tasks) {
    if (task.assigneeProfileId) {
      const a = db.profile(task.assigneeProfileId);
      if (a && !isAvailable(a) && task.status !== "completed") {
        task.assigneeProfileId = undefined;
        task.status = "open";
      }
    }
  }

  // 2) auto-assign open tasks to outstanding participants
  const openTasks = tasks
    .filter((t) => t.status === "open")
    .sort((a, b) => Number(b.critical) - Number(a.critical));
  for (const task of openTasks) {
    const assignee = pickAssignee(participants, tasks, task.critical);
    if (assignee) {
      task.assigneeProfileId = assignee.id;
      task.status = "assigned";
      assigned.push({ task, assignee });
    }
  }

  // 3) reminders for outstanding tasks coming due
  for (const task of tasks) {
    if ((task.status === "claimed" || task.status === "assigned") && task.assigneeProfileId) {
      const d = dueInDays(event, task);
      if (d <= 3) {
        const assignee = db.profile(task.assigneeProfileId);
        if (assignee) reminders.push({ task, assignee, daysUntilDue: d });
      }
    }
  }

  const criticalTasks = tasks.filter((t) => t.critical);
  const allCriticalCovered = criticalTasks.every(
    (t) => t.status !== "open" && !!t.assigneeProfileId,
  );

  event.coordinatorTick += 1;

  const messages = await composeMessages(event, { assigned, reminders, allCriticalCovered });
  db.raw.messages.push(...messages);
  db.save();

  return { assigned, reminders, allCriticalCovered, messages };
}

async function composeMessages(
  event: CulturalEvent,
  outcome: Omit<CoordinatorOutcome, "messages">,
): Promise<Message[]> {
  const lines = await phraseLines(event, outcome);
  return lines.map((body) => systemMessage(event.id, body));
}

function systemMessage(eventId: ID, body: string): Message {
  return {
    id: newId("msg"),
    kind: "event",
    channelId: eventId,
    authorProfileId: undefined,
    isSystem: true,
    body,
    createdAt: nowIso(),
  };
}

/** Deterministic templated lines, optionally re-phrased by Claude. */
async function phraseLines(
  event: CulturalEvent,
  outcome: Omit<CoordinatorOutcome, "messages">,
): Promise<string[]> {
  const templated: string[] = [];
  for (const a of outcome.assigned) {
    templated.push(
      `"${a.task.title}" had no volunteer, so it's been assigned to ${first(a.assignee)} to keep the event on track.`,
    );
  }
  for (const r of outcome.reminders) {
    templated.push(
      r.daysUntilDue < 0
        ? `Reminder: "${r.task.title}" is overdue. ${first(r.assignee)}, please update the group.`
        : `Reminder: ${first(r.assignee)}, "${r.task.title}" is due in ${r.daysUntilDue} day${r.daysUntilDue === 1 ? "" : "s"}.`,
    );
  }
  if (outcome.allCriticalCovered) {
    templated.push("All critical tasks now have an owner. The event is on track.");
  } else {
    const openCritical = db
      .tasksOf(event.id)
      .filter((t) => t.critical && t.status === "open");
    if (openCritical.length > 0) {
      templated.push(
        `Still needs a volunteer: ${openCritical.map((t) => `"${t.title}"`).join(", ")}.`,
      );
    }
  }
  if (templated.length === 0) {
    templated.push("Coordination check complete — no action needed right now.");
  }

  if (!hasApiKey()) return templated;
  try {
    const system =
      "You are the invisible operational layer of a cultural-club platform. Rewrite the given coordination notes as short, warm, plain group-chat messages. Rules: no name for yourself, never refer to yourself as an assistant or AI, no greetings, at most one short sentence each, keep every fact unchanged. Return one message per line.";
    const out = await complete(system, templated.join("\n"), 400);
    const rephrased = out
      .split("\n")
      .map((l) => l.replace(/^[-*\d.\s]+/, "").trim())
      .filter(Boolean);
    return rephrased.length >= templated.length ? rephrased.slice(0, templated.length) : templated;
  } catch {
    return templated;
  }
}

function first(p: Profile): string {
  return p.name.split(" ")[0];
}
