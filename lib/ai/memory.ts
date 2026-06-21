// The AI's "club manager" memory & analytics layer.
//
// Today the signals are computed from the local store and cached in a pluggable
// KV. The KV defaults to an in-process Map but transparently upgrades to Upstash
// Redis when UPSTASH_REDIS_REST_URL / _TOKEN are set — this is the seam for the
// Redis-backed agent memory (vector search / cross-session recall) we'd add next.

import "server-only";
import { db } from "../store";
import { communityById } from "../community-registry";
import type { CommunityInsights, ID } from "../types";

// ---- pluggable KV (in-memory default, Upstash Redis when configured) --------

interface KV {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  readonly backend: "memory" | "redis";
}

class MemoryKV implements KV {
  readonly backend = "memory" as const;
  private store = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | null> {
    return (this.store.get(key) as T) ?? null;
  }
  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }
}

class RedisKV implements KV {
  readonly backend = "redis" as const;
  constructor(private url: string, private token: string) {}
  private async cmd(args: (string | number)[]): Promise<unknown> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const json = (await res.json()) as { result?: unknown };
    return json.result ?? null;
  }
  async get<T>(key: string): Promise<T | null> {
    const raw = (await this.cmd(["GET", key])) as string | null;
    return raw ? (JSON.parse(raw) as T) : null;
  }
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const args: (string | number)[] = ["SET", key, JSON.stringify(value)];
    if (ttlSeconds) args.push("EX", ttlSeconds);
    await this.cmd(args);
  }
}

function makeKv(): KV {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return new RedisKV(url, token);
  return new MemoryKV();
}

const globalForKv = globalThis as unknown as { __connectKv?: KV };
export const kv: KV = globalForKv.__connectKv ?? makeKv();
globalForKv.__connectKv = kv;

// ---- analytics computed from the local store --------------------------------

/** Count of "going" RSVPs for an event = its attendance proxy. */
function attendanceOf(eventId: ID): number {
  return db.raw.rsvps.filter((r) => r.eventId === eventId && r.status === "going").length;
}

export function computeInsights(communityId: ID): CommunityInsights {
  const completed = db.raw.events.filter(
    (e) => e.communityId === communityId && e.status === "completed",
  );

  // attendance by category
  const byCat = new Map<string, number[]>();
  for (const ev of completed) {
    const arr = byCat.get(ev.category) ?? [];
    arr.push(attendanceOf(ev.id));
    byCat.set(ev.category, arr);
  }
  const categoryPerformance = [...byCat.entries()]
    .map(([category, counts]) => ({
      category,
      avgAttendance:
        Math.round((counts.reduce((a, b) => a + b, 0) / counts.length) * 10) / 10,
      events: counts.length,
    }))
    .sort((a, b) => b.avgAttendance - a.avgAttendance);

  // attendance trend over the last several events (chronological)
  const attendanceTrend = completed
    .slice()
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
    .map((e) => ({
      label: new Date(e.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: attendanceOf(e.id),
    }));

  const recommendations = buildRecommendations(communityId, categoryPerformance, attendanceTrend);
  const memberMatches = buildMatches(communityId);

  return { communityId, categoryPerformance, attendanceTrend, recommendations, memberMatches };
}

function buildRecommendations(
  communityId: ID,
  perf: CommunityInsights["categoryPerformance"],
  trend: CommunityInsights["attendanceTrend"],
): string[] {
  const recs: string[] = [];
  if (perf.length >= 2) {
    const top = perf[0];
    const bottom = perf[perf.length - 1];
    if (bottom.avgAttendance > 0 && top.avgAttendance / bottom.avgAttendance >= 2) {
      const ratio = Math.round((top.avgAttendance / bottom.avgAttendance) * 10) / 10;
      recs.push(
        `${cap(top.category)} events draw about ${ratio}x the turnout of ${bottom.category} events — weight upcoming planning toward ${top.category}.`,
      );
    }
  }
  if (trend.length >= 2) {
    const recent = trend.slice(-2);
    if (recent[1].value < recent[0].value) {
      recs.push("Attendance dipped at the most recent event — a lower-commitment social (coffee meetup) could re-energize the group.");
    }
  }
  // newcomer signal
  const newcomers = db.membersOf(communityId).filter(
    (m) => Date.now() - +new Date(m.joinedAt) < 7 * 86_400_000,
  );
  if (newcomers.length >= 1) {
    recs.push(
      `${newcomers.length} new member${newcomers.length > 1 ? "s" : ""} joined this week — consider a newcomer meetup to help them connect.`,
    );
  }
  if (recs.length === 0) {
    recs.push("Healthy, steady participation — keep the current event mix.");
  }
  return recs;
}

function buildMatches(communityId: ID): CommunityInsights["memberMatches"] {
  const members = db.membersOf(communityId);
  const matches: CommunityInsights["memberMatches"] = [];

  const newcomers = members.filter((m) => Date.now() - +new Date(m.joinedAt) < 14 * 86_400_000);
  if (newcomers.length >= 2) {
    matches.push({
      kind: "Newcomer meetup",
      rationale: `${newcomers.map((n) => n.name.split(" ")[0]).join(", ")} all joined recently and could form a welcoming circle.`,
      memberIds: newcomers.map((n) => n.id),
    });
  }

  // shared secondary interest
  const byInterest = new Map<string, ID[]>();
  for (const m of members) {
    if (m.secondaryInterest) {
      const arr = byInterest.get(m.secondaryInterest) ?? [];
      arr.push(m.id);
      byInterest.set(m.secondaryInterest, arr);
    }
  }

  // cooking-club suggestion when cooking outperforms
  const community = communityById(communityId);
  if (community) {
    matches.push({
      kind: "Cooking club",
      rationale: `Cooking events consistently outperform here — a recurring ${community.demonym} cooking club would likely thrive.`,
      memberIds: members.slice(0, 3).map((m) => m.id),
    });
  }
  return matches;
}

/**
 * A compact natural-language summary of what's worked, fed into the event
 * generation prompt so the AI plans like a club manager that remembers.
 */
export async function attendanceMemo(communityId: ID): Promise<string> {
  const cacheKey = `insights:${communityId}`;
  const insights = computeInsights(communityId);
  await kv.set(cacheKey, insights, 300);

  if (insights.categoryPerformance.length === 0) {
    return "No event history yet — this is an early-stage community; favor inclusive, low-barrier activities and cultural education.";
  }
  const lines = insights.categoryPerformance.map(
    (c) => `- ${cap(c.category)}: avg ${c.avgAttendance} attendees over ${c.events} event(s)`,
  );
  return `Past event performance (use this to weight recommendations):\n${lines.join("\n")}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function memoryBackend(): "memory" | "redis" {
  return kv.backend;
}
