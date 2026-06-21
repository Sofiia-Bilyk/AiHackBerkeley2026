"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/store";
import { clearSession, getCurrentProfile, setSession } from "@/lib/session";
import { generateEvent } from "@/lib/ai/events";
import { runCoordinatorPass } from "@/lib/ai/coordinator";
import { complete, hasApiKey } from "@/lib/ai/client";
import { communityById, communityByNationality } from "@/lib/communities";
import { sendPoke } from "@/lib/poke";
import type { Profile } from "@/lib/types";
import { daysFromNow, dmChannelId, newId, nowIso } from "@/lib/utils";
import type { CulturalEvent, EventTask, Message } from "@/lib/types";

// --------------------------------------------------------------------------
// Session
// --------------------------------------------------------------------------

export async function loginAs(profileId: string) {
  if (!db.profile(profileId)) throw new Error("Unknown persona");
  await setSession(profileId);
  redirect("/app");
}

export async function logout() {
  await clearSession();
  redirect("/");
}

export async function resetDemo() {
  db.reset();
  revalidatePath("/", "layout");
  redirect("/app");
}

// --------------------------------------------------------------------------
// Event generation (Feature 1)
// --------------------------------------------------------------------------

export async function generateEventAction(communityId: string) {
  const generated = await generateEvent(communityId);

  const status: CulturalEvent["status"] = generated.recommendedAsMajor ? "planned" : "gauging";
  const eventId = newId("evt");
  const event: CulturalEvent = {
    id: eventId,
    communityId,
    source: "ai",
    status,
    title: generated.title,
    summary: generated.summary,
    culturalSignificance: generated.culturalSignificance,
    participantInstructions: generated.participantInstructions,
    holiday: generated.holiday,
    category: generated.category,
    startsAt: daysFromNow(status === "planned" ? 10 : 18),
    location: communityLocation(communityId),
    suggestedVenues: generated.suggestedVenues,
    materials: generated.materials,
    capacity: 16,
    interestCount: 0,
    createdAt: nowIso(),
    coordinatorTick: 0,
    imageSeed: generated.title.toLowerCase().replace(/\s+/g, "-").slice(0, 24),
  };
  db.raw.events.push(event);

  // tasks (only materialized once an event is planned; gauging events wait)
  if (status === "planned") {
    const tasks: EventTask[] = generated.tasks.map((t) => ({
      id: newId("task"),
      eventId,
      title: t.title,
      detail: t.detail,
      assigneeProfileId: undefined,
      status: "open",
      dueOffsetDays: t.dueOffsetDays,
      critical: t.critical,
      createdAt: nowIso(),
    }));
    db.raw.tasks.push(...tasks);
    db.raw.messages.push(
      systemMsg(eventId, `${event.title} is on the calendar. ${tasks.length} tasks created — claim what you can help with.`),
    );
  } else {
    db.raw.messages.push(
      systemMsg(eventId, `${event.title} has been proposed. Mark your interest — once enough people are in, it'll be confirmed and tasks will open.`),
    );
  }

  db.save();
  if (status === "planned") {
    await pokeEventMembers(eventId, `New event: ${event.title}. Volunteer tasks are ready to claim.`, "event_confirmed");
  }
  revalidatePath("/app");
  redirect(`/app/events/${eventId}`);
}

/** Member-proposed event idea — AI takes over organizing it. */
export async function proposeEventAction(formData: FormData) {
  const me = await getCurrentProfile();
  if (!me) throw new Error("Not signed in");
  const communityId = String(formData.get("communityId"));
  const title = String(formData.get("title") || "Community gathering").slice(0, 80);
  const idea = String(formData.get("idea") || "");

  const eventId = newId("evt");
  const event: CulturalEvent = {
    id: eventId,
    communityId,
    source: "member",
    proposedByProfileId: me.id,
    status: "gauging",
    title,
    summary: idea || "A member-proposed gathering.",
    culturalSignificance: "Proposed by a community member; the platform will organize logistics if interest is strong.",
    participantInstructions: "Mark your interest to help this happen.",
    category: "meetup",
    startsAt: daysFromNow(21),
    location: communityLocation(communityId),
    suggestedVenues: [],
    materials: [],
    interestCount: 1,
    createdAt: nowIso(),
    coordinatorTick: 0,
    imageSeed: title.toLowerCase().replace(/\s+/g, "-").slice(0, 24),
  };
  db.raw.events.push(event);
  db.raw.rsvps.push({ id: newId("rsvp"), eventId, profileId: me.id, status: "interested", createdAt: nowIso() });
  db.raw.messages.push(systemMsg(eventId, `${me.name.split(" ")[0]} proposed "${title}". Gathering interest before committing.`));
  db.save();
  revalidatePath("/app");
  redirect(`/app/events/${eventId}`);
}

/** Promote a gauging event to planned and open its tasks via the AI. */
export async function commitEventAction(eventId: string) {
  const event = db.event(eventId);
  if (!event) throw new Error("Unknown event");
  event.status = "planned";
  if (event.startsAt < daysFromNow(7)) event.startsAt = daysFromNow(12);

  // generate a fresh task list for the committed event
  const generated = await generateEvent(event.communityId);
  const tasks: EventTask[] = generated.tasks.map((t) => ({
    id: newId("task"),
    eventId,
    title: t.title,
    detail: t.detail,
    assigneeProfileId: undefined,
    status: "open",
    dueOffsetDays: t.dueOffsetDays,
    critical: t.critical,
    createdAt: nowIso(),
  }));
  db.raw.tasks.push(...tasks);
  db.raw.messages.push(systemMsg(eventId, `${event.title} is confirmed. ${tasks.length} tasks created — claim what you can help with.`));
  db.save();
  await pokeEventMembers(eventId, `Confirmed: ${event.title}. New volunteer tasks are open.`, "event_confirmed");
  revalidatePath(`/app/events/${eventId}`);
}

// --------------------------------------------------------------------------
// RSVP & interest
// --------------------------------------------------------------------------

export async function rsvpAction(eventId: string, status: "going" | "interested" | "declined") {
  const me = await getCurrentProfile();
  if (!me) throw new Error("Not signed in");

  if (me.restrictedUntil && new Date(me.restrictedUntil) > new Date() && status !== "declined") {
    throw new Error("You are currently restricted from joining events.");
  }

  const existing = db.rsvpFor(eventId, me.id);
  if (existing) existing.status = status;
  else db.raw.rsvps.push({ id: newId("rsvp"), eventId, profileId: me.id, status, createdAt: nowIso() });

  const event = db.event(eventId);
  if (event) event.interestCount = db.rsvpsOf(eventId).filter((r) => r.status !== "declined").length;

  db.save();
  revalidatePath(`/app/events/${eventId}`);
  revalidatePath("/app");
}

// --------------------------------------------------------------------------
// Volunteer / coordinator (Feature 2)
// --------------------------------------------------------------------------

export async function volunteerAction(taskId: string) {
  const me = await getCurrentProfile();
  if (!me) throw new Error("Not signed in");
  const task = db.task(taskId);
  if (!task) throw new Error("Unknown task");
  task.assigneeProfileId = me.id;
  task.status = "claimed";

  // ensure they're RSVP'd
  if (!db.rsvpFor(task.eventId, me.id)) {
    db.raw.rsvps.push({ id: newId("rsvp"), eventId: task.eventId, profileId: me.id, status: "going", createdAt: nowIso() });
  }
  db.raw.messages.push(systemMsg(task.eventId, `${me.name.split(" ")[0]} volunteered for "${task.title}". Thank you.`));
  db.save();
  const event = db.event(task.eventId);
  await sendPoke(me, {
    reason: "task_claimed",
    message: event ? `You claimed "${task.title}" for ${event.title}. Connect will keep the group coordinated.` : `You claimed "${task.title}".`,
    metadata: { taskId, eventId: task.eventId },
  });
  revalidatePath(`/app/events/${task.eventId}`);
}

export async function advanceCoordinatorAction(eventId: string) {
  await runCoordinatorPass(eventId);
  revalidatePath(`/app/events/${eventId}`);
}

// --------------------------------------------------------------------------
// Task completion
// --------------------------------------------------------------------------

export async function completeTaskAction(taskId: string) {
  const me = await getCurrentProfile();
  if (!me) throw new Error("Not signed in");
  const task = db.task(taskId);
  if (!task) throw new Error("Unknown task");

  if (task.assigneeProfileId !== me.id) throw new Error("Only the assignee can complete this task");
  if (task.status !== "claimed" && task.status !== "assigned") throw new Error("Task cannot be completed");
  task.status = "completed";
  db.raw.participation.push({
    id: newId("pr"), profileId: me.id, eventId: task.eventId, taskId,
    outcome: "completed", note: `Completed "${task.title}".`, createdAt: nowIso(),
  });
  db.raw.messages.push(systemMsg(task.eventId, `"${task.title}" is complete. Thank you, ${me.name.split(" ")[0]}.`));

  db.save();
  const event = db.event(task.eventId);
  await sendPoke(me, {
    reason: "task_completed",
    message: event ? `Nice work. "${task.title}" is marked complete for ${event.title}.` : `Nice work. "${task.title}" is marked complete.`,
    metadata: { taskId, eventId: task.eventId },
  });
  revalidatePath(`/app/events/${task.eventId}`);
}

// --------------------------------------------------------------------------
// Messaging
// --------------------------------------------------------------------------

export async function postMessageAction(channelId: string, kind: "event" | "dm", body: string) {
  const me = await getCurrentProfile();
  if (!me) throw new Error("Not signed in");
  const text = body.trim();
  if (!text) return;
  const message: Message = {
    id: newId("msg"),
    kind,
    channelId,
    authorProfileId: me.id,
    isSystem: false,
    body: text.slice(0, 1000),
    createdAt: nowIso(),
  };
  db.raw.messages.push(message);
  db.save();
  if (kind === "event") revalidatePath(`/app/events/${channelId}`);
  else revalidatePath(`/app/messages`);
}

export async function sendDmAction(toProfileId: string, body: string) {
  const me = await getCurrentProfile();
  if (!me) throw new Error("Not signed in");
  const channelId = dmChannelId(me.id, toProfileId);
  await postMessageAction(channelId, "dm", body);
  await sendPoke(db.profile(toProfileId), {
    reason: "dm",
    message: `${me.name.split(" ")[0]} sent you a Connect message: ${body.trim().slice(0, 120)}`,
    metadata: { fromProfileId: me.id, channelId },
  });
  revalidatePath(`/app/messages/${toProfileId}`);
}

// --------------------------------------------------------------------------
// Onboarding
// --------------------------------------------------------------------------

export async function createAccountAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim() || "New Member";
  const phone = String(formData.get("phone") || "").trim() || "+1 555 010 0000";
  const city = String(formData.get("city") || "").trim() || "Berkeley, CA";
  const nationality = String(formData.get("nationality") || "Ukrainian");
  const secondary = String(formData.get("secondary") || "").trim() || undefined;

  const community = communityByNationality(nationality);
  // place near the community's region for the demo
  const lat = community ? community.region.lat + (Math.random() - 0.5) * 0.1 : 37.8715;
  const lng = community ? community.region.lng + (Math.random() - 0.5) * 0.1 : -122.273;

  const profileId = newId("prof");
  const palette = ["#2563eb", "#7c3aed", "#0891b2", "#db2777", "#16a34a", "#ca8a04", "#ea580c"];
  const profile: Profile = {
    id: profileId,
    name,
    phone,
    avatarColor: palette[Math.floor(Math.random() * palette.length)],
    city,
    lat,
    lng,
    primaryNationality: nationality,
    secondaryInterest: secondary,
    bio: "Just joined Connect.",
    joinedAt: nowIso(),
    strikes: 0,
  };
  db.raw.profiles.push(profile);
  if (community) {
    db.raw.memberships.push({ id: newId("mship"), profileId, communityId: community.id, joinedAt: nowIso(), role: "member" });
  }
  db.save();
  await setSession(profileId);
  redirect("/app");
}

// --------------------------------------------------------------------------
// Cultural knowledge assistant
// --------------------------------------------------------------------------

export async function askCultureAction(communityId: string, question: string): Promise<string> {
  const community = communityById(communityId);
  if (!community) return "Unknown community.";
  const q = question.trim().slice(0, 400);
  if (!q) return "Ask anything about the culture — a tradition, recipe, holiday or craft.";

  if (!hasApiKey()) {
    return `Here's what I can share about ${community.demonym} culture: ${community.primer} (Connect an API key to ask Claude open-ended cultural questions.)`;
  }
  try {
    const system = `You are the cultural knowledge layer for a ${community.demonym} community club. Answer warmly and accurately about ${community.demonym} traditions, recipes, holidays, crafts and history. Keep answers concise (2-4 short paragraphs). Do not present yourself as a named assistant. Cultural primer for grounding: ${community.primer}`;
    return await complete(system, q, 700);
  } catch {
    return "Couldn't reach the cultural knowledge service right now. Please try again.";
  }
}

// --------------------------------------------------------------------------
// helpers
// --------------------------------------------------------------------------

function systemMsg(eventId: string, body: string): Message {
  return { id: newId("msg"), kind: "event", channelId: eventId, authorProfileId: undefined, isSystem: true, body, createdAt: nowIso() };
}

function communityLocation(communityId: string): string {
  void communityId;
  return "Berkeley, CA";
}

async function pokeEventMembers(eventId: string, message: string, reason: "event_confirmed") {
  const event = db.event(eventId);
  if (!event) return;
  const profileIds = new Set(
    db.rsvpsOf(eventId)
      .filter((rsvp) => rsvp.status !== "declined")
      .map((rsvp) => rsvp.profileId),
  );
  if (profileIds.size === 0) {
    db.membersOf(event.communityId).slice(0, 3).forEach((member) => profileIds.add(member.id));
  }

  await Promise.all(
    [...profileIds].map((profileId) =>
      sendPoke(db.profile(profileId), {
        reason,
        message,
        metadata: { eventId, communityId: event.communityId },
      }),
    ),
  );
}
