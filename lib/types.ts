// Core domain models for Connect — an AI-managed cultural club platform.
// Persistence-agnostic: today these live in a local JSON-backed store, but the
// shapes are written so a Supabase/Postgres swap is a repository change only.

export type ID = string;

/** A nationality-based cultural community scoped to a geographic region. */
export interface Community {
  id: ID;
  nationality: string; // e.g. "Ukrainian"
  demonym: string; // adjective form, e.g. "Ukrainian"
  flagEmoji: string;
  /** Tailwind-friendly accent tokens used to theme the community UI. */
  accent: {
    from: string; // hex
    to: string; // hex
    soft: string; // hex, light tint for surfaces
    ink: string; // hex, readable text on soft
  };
  region: {
    label: string; // e.g. "San Francisco Bay Area"
    lat: number;
    lng: number;
    radiusMiles: number; // ~100mi proximity
  };
  // A short cultural primer the AI uses as grounding context.
  primer: string;
  createdAt: string;
}

export interface Profile {
  id: ID;
  name: string;
  email: string;
  avatarColor: string; // hex seed for generated avatar
  city: string;
  lat: number;
  lng: number;
  primaryNationality: string; // matches a Community.nationality
  secondaryInterest?: string;
  bio?: string;
  joinedAt: string;
  /** Accountability: rolling count of task failures and no-shows. */
  strikes: number;
  /** ISO date until which the user is restricted from events, if any. */
  restrictedUntil?: string;
  isDemoSeed?: boolean;
}

export interface Membership {
  id: ID;
  profileId: ID;
  communityId: ID;
  joinedAt: string;
  role: "member"; // future: organizer, etc.
}

export type EventStatus =
  | "proposed" // AI drafted, awaiting nothing — major holiday auto-creates here
  | "gauging" // smaller event: collecting interest before committing
  | "planned" // committed, tasks active
  | "completed"
  | "cancelled";

export type EventSource = "ai" | "member";

export interface SuggestedVenue {
  name: string;
  type: string; // e.g. "Community center"
  why: string;
}

export interface MaterialItem {
  item: string;
  quantity: string; // e.g. "24 eggs"
}

/** A cultural event — AI-generated or member-proposed, AI-coordinated. */
export interface CulturalEvent {
  id: ID;
  communityId: ID;
  source: EventSource;
  proposedByProfileId?: ID; // for member-proposed
  status: EventStatus;
  title: string;
  summary: string;
  culturalSignificance: string;
  participantInstructions: string;
  holiday?: string; // the cultural occasion this ties to
  category: string; // e.g. "craft", "cooking", "language", "music", "meetup"
  startsAt: string; // ISO
  location: string;
  suggestedVenues: SuggestedVenue[];
  materials: MaterialItem[];
  capacity?: number;
  /** Interest signals while gauging. */
  interestCount: number;
  createdAt: string;
  /** Demo clock: how many coordinator "advance" passes have run. */
  coordinatorTick: number;
  imageSeed: string; // for decorative gradient art
}

export type TaskStatus =
  | "open" // nobody claimed
  | "claimed" // a member volunteered
  | "assigned" // AI auto-assigned to a member
  | "completed"; // assignee marked the task complete

export interface EventTask {
  id: ID;
  eventId: ID;
  title: string;
  detail: string;
  assigneeProfileId?: ID;
  status: TaskStatus;
  dueOffsetDays: number; // due N days before event
  critical: boolean; // venue / core supplies vs. nice-to-have
  createdAt: string;
}

export interface Rsvp {
  id: ID;
  eventId: ID;
  profileId: ID;
  status: "going" | "interested" | "declined";
  createdAt: string;
}

export type MessageChannelKind = "event" | "dm";

export interface Message {
  id: ID;
  kind: MessageChannelKind;
  /** eventId for event chat, or a sorted "dm:<a>:<b>" key for DMs. */
  channelId: ID;
  authorProfileId?: ID; // undefined when system/AI
  isSystem: boolean; // AI operational layer — never anthropomorphized
  body: string;
  createdAt: string;
}

/** Accountability ledger entry. */
export interface ParticipationRecord {
  id: ID;
  profileId: ID;
  eventId: ID;
  taskId?: ID;
  outcome: "completed" | "failed" | "no-show";
  note: string;
  createdAt: string;
}

export type CulturalContentKind =
  | "tradition"
  | "recipe"
  | "craft"
  | "holiday"
  | "history"
  | "activity"; // solo activity for low-participation communities

export interface CulturalContent {
  id: ID;
  communityId: ID;
  kind: CulturalContentKind;
  title: string;
  body: string;
  tag: string;
}

/** Cultural calendar entry used to drive AI event generation. */
export interface CalendarOccasion {
  nationality: string;
  name: string;
  /** Month/day; year resolved relative to "now". */
  month: number;
  day: number;
  significance: string;
  major: boolean; // major holiday -> auto-create event
}

/** Aggregated analytics the AI uses as a "club manager" memory. */
export interface CommunityInsights {
  communityId: ID;
  categoryPerformance: { category: string; avgAttendance: number; events: number }[];
  attendanceTrend: { label: string; value: number }[];
  recommendations: string[];
  memberMatches: { kind: string; rationale: string; memberIds: ID[] }[];
}
