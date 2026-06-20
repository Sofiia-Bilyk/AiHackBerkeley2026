import "server-only";
import { db } from "./store";
import { distanceMiles } from "./utils";
import type { CulturalEvent, Profile } from "./types";

export function taskProgress(eventId: string) {
  const tasks = db.tasksOf(eventId);
  const verified = tasks.filter((t) => t.status === "verified").length;
  const open = tasks.filter((t) => t.status === "open").length;
  const claimed = tasks.filter((t) => t.status === "claimed" || t.status === "assigned").length;
  const ratio = tasks.length ? verified / tasks.length : 0;
  return { total: tasks.length, verified, open, claimed, ratio };
}

export function attendance(eventId: string) {
  const rsvps = db.rsvpsOf(eventId);
  return {
    going: rsvps.filter((r) => r.status === "going").length,
    interested: rsvps.filter((r) => r.status === "interested").length,
  };
}

export function upcomingEvents(communityId: string): CulturalEvent[] {
  return db
    .eventsOf(communityId)
    .filter((e) => e.status === "planned" || e.status === "gauging");
}

export function pastEvents(communityId: string): CulturalEvent[] {
  return db
    .eventsOf(communityId)
    .filter((e) => e.status === "completed")
    .reverse();
}

/** Members within the community's proximity radius of `me`, nearest first. */
export function nearbyMembers(me: Profile, communityId: string) {
  return db
    .membersOf(communityId)
    .filter((m) => m.id !== me.id)
    .map((m) => ({ member: m, miles: distanceMiles(me, m) }))
    .sort((a, b) => a.miles - b.miles);
}

export function isRestricted(p: Profile): boolean {
  return !!p.restrictedUntil && new Date(p.restrictedUntil) > new Date();
}
