// Local, process-resident data store with an optional JSON snapshot on disk.
// Survives Next.js HMR via globalThis. Swap this module for a Supabase-backed
// repository later — the rest of the app only touches the exported `db` helpers.

import "server-only";
import fs from "node:fs";
import path from "node:path";
import type {
  CulturalContent,
  CulturalEvent,
  EventTask,
  ID,
  Membership,
  Message,
  ParticipationRecord,
  Profile,
  Rsvp,
  TaskEvidence,
} from "./types";
import { seedDatabase } from "./seed";

export interface Database {
  profiles: Profile[];
  memberships: Membership[];
  events: CulturalEvent[];
  tasks: EventTask[];
  evidence: TaskEvidence[];
  rsvps: Rsvp[];
  messages: Message[];
  participation: ParticipationRecord[];
  content: CulturalContent[];
  seeded: boolean;
}

const SNAPSHOT_PATH = path.join(process.cwd(), "data", "db.json");

function emptyDb(): Database {
  return {
    profiles: [],
    memberships: [],
    events: [],
    tasks: [],
    evidence: [],
    rsvps: [],
    messages: [],
    participation: [],
    content: [],
    seeded: false,
  };
}

function loadFromDisk(): Database | null {
  try {
    if (fs.existsSync(SNAPSHOT_PATH)) {
      const raw = fs.readFileSync(SNAPSHOT_PATH, "utf-8");
      const parsed = JSON.parse(raw) as Database;
      if (parsed && parsed.seeded) return parsed;
    }
  } catch {
    // ignore corrupt snapshot — we'll reseed
  }
  return null;
}

function init(): Database {
  const fromDisk = loadFromDisk();
  if (fromDisk) return fromDisk;
  const fresh = emptyDb();
  seedDatabase(fresh);
  fresh.seeded = true;
  persist(fresh);
  return fresh;
}

// Persist with a short debounce; evidence images are kept out of the snapshot
// to keep it small (they live in-memory for the session).
let persistTimer: NodeJS.Timeout | null = null;
function persist(database: Database) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
      const snapshot: Database = {
        ...database,
        evidence: database.evidence.map((e) =>
          e.imageRef.startsWith("data:")
            ? { ...e, imageRef: "data:[stored-in-session]" }
            : e,
        ),
      };
      fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));
    } catch {
      // best-effort; demo continues from memory
    }
  }, 250);
}

const globalForDb = globalThis as unknown as { __connectDb?: Database };

const database: Database = globalForDb.__connectDb ?? init();
globalForDb.__connectDb = database;

export const db = {
  raw: database,
  save() {
    persist(database);
  },
  /** Wipe the snapshot and reseed (used by the demo reset control). */
  reset() {
    const fresh = emptyDb();
    seedDatabase(fresh);
    fresh.seeded = true;
    Object.assign(database, fresh);
    persist(database);
  },

  // ---- profiles ----
  profile(id: ID) {
    return database.profiles.find((p) => p.id === id);
  },
  profiles() {
    return database.profiles;
  },

  // ---- communities are static seed config (see seed.ts) ----

  // ---- memberships ----
  membersOf(communityId: ID): Profile[] {
    const ids = database.memberships
      .filter((m) => m.communityId === communityId)
      .map((m) => m.profileId);
    return database.profiles.filter((p) => ids.includes(p.id));
  },
  membershipsFor(profileId: ID) {
    return database.memberships.filter((m) => m.profileId === profileId);
  },

  // ---- events ----
  event(id: ID) {
    return database.events.find((e) => e.id === id);
  },
  eventsOf(communityId: ID) {
    return database.events
      .filter((e) => e.communityId === communityId)
      .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  },

  // ---- tasks ----
  task(id: ID) {
    return database.tasks.find((t) => t.id === id);
  },
  tasksOf(eventId: ID) {
    return database.tasks.filter((t) => t.eventId === eventId);
  },

  // ---- evidence ----
  evidenceOf(taskId: ID) {
    return database.evidence
      .filter((e) => e.taskId === taskId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },

  // ---- rsvps ----
  rsvpsOf(eventId: ID) {
    return database.rsvps.filter((r) => r.eventId === eventId);
  },
  rsvpFor(eventId: ID, profileId: ID) {
    return database.rsvps.find(
      (r) => r.eventId === eventId && r.profileId === profileId,
    );
  },

  // ---- messages ----
  messagesOf(channelId: ID) {
    return database.messages
      .filter((m) => m.channelId === channelId)
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  },

  // ---- participation ----
  participationOf(profileId: ID) {
    return database.participation.filter((p) => p.profileId === profileId);
  },

  // ---- content ----
  contentOf(communityId: ID) {
    return database.content.filter((c) => c.communityId === communityId);
  },
};

export type Db = typeof db;
