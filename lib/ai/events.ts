// Feature 1 — Cultural Event Generation.
// Given a community, the upcoming cultural calendar, community size and past
// attendance, Claude proposes a culturally-grounded event with significance,
// materials, suggested venues and a coordination task list.

import "server-only";
import { completeJson, hasApiKey } from "./client";
import { attendanceMemo } from "./memory";
import { upcomingOccasions } from "../communities";
import { communityById } from "../community-registry";
import { db } from "../store";
import type { ID, MaterialItem, SuggestedVenue } from "../types";

export interface GeneratedTask {
  title: string;
  detail: string;
  critical: boolean;
  dueOffsetDays: number;
}

export interface GeneratedEvent {
  title: string;
  summary: string;
  culturalSignificance: string;
  participantInstructions: string;
  category: string; // craft | cooking | language | music | meetup | dance | history
  holiday?: string;
  recommendedAsMajor: boolean; // true -> auto-create; false -> gauge interest first
  suggestedVenues: SuggestedVenue[];
  materials: MaterialItem[];
  tasks: GeneratedTask[];
  source: "claude" | "fallback";
}

const SYSTEM = `You are the cultural organizer for Connect, a platform of AI-managed cultural clubs for diaspora communities. You are NOT a chatbot or a named assistant — you are an invisible operational layer that proposes and organizes real-world cultural events.

You possess deep cultural knowledge: holidays, traditions, recipes, crafts, celebrations and customs for many nationalities. When proposing an event you:
- Choose something authentic and specific to the nationality and the upcoming occasion (avoid generic "cultural night" filler).
- Explain WHY it matters culturally in a warm, concrete way.
- Produce a realistic materials list with quantities sized to the community.
- Suggest 2-3 plausible venue TYPES (you do not book them).
- Break execution into 4-7 concrete tasks. Mark genuinely critical tasks (venue, core supplies) as critical.
- Weight your recommendation using the community's past attendance: if cooking outperforms language exchange, lean into what works.

Keep all text in English. Be specific, never vague.`;

export async function generateEvent(communityId: ID): Promise<GeneratedEvent> {
  const community = communityById(communityId);
  if (!community) throw new Error("Unknown community");

  const size = db.membersOf(communityId).length;
  const occasions = upcomingOccasions(community.nationality, new Date(), 150);
  const next = occasions[0];
  const memo = await attendanceMemo(communityId);

  if (!hasApiKey()) {
    return fallbackEvent(community.nationality, next?.occasion.name, next?.occasion.significance, next?.occasion.major ?? false, size);
  }

  try {
    const user = `Community: ${community.nationality} cultural club in ${community.region.label}.
Cultural primer: ${community.primer}
Community size: ${size} member(s) within ~${community.region.radiusMiles} miles.
${next ? `Upcoming occasion: ${next.occasion.name} in ${next.daysAway} days. Significance: ${next.occasion.significance}. This is a ${next.occasion.major ? "MAJOR" : "minor"} holiday.` : "No major holiday imminent — propose a meaningful cultural activity that keeps the community engaged."}

${memo}

Propose ONE event. Return JSON with exactly these fields:
{
  "title": string,
  "summary": string,
  "culturalSignificance": string,
  "participantInstructions": string,
  "category": "craft" | "cooking" | "language" | "music" | "dance" | "history" | "meetup",
  "holiday": string | null,
  "recommendedAsMajor": boolean,
  "suggestedVenues": [{ "name": string, "type": string, "why": string }],
  "materials": [{ "item": string, "quantity": string }],
  "tasks": [{ "title": string, "detail": string, "critical": boolean, "dueOffsetDays": number }]
}`;

    const data = await completeJson<Omit<GeneratedEvent, "source">>(SYSTEM, user, 3200);
    return { ...normalize(data), source: "claude" };
  } catch {
    return fallbackEvent(community.nationality, next?.occasion.name, next?.occasion.significance, next?.occasion.major ?? false, size);
  }
}

function normalize(data: Omit<GeneratedEvent, "source">): Omit<GeneratedEvent, "source"> {
  return {
    ...data,
    holiday: data.holiday ?? undefined,
    suggestedVenues: (data.suggestedVenues ?? []).slice(0, 3),
    materials: data.materials ?? [],
    tasks: (data.tasks ?? []).slice(0, 7),
  };
}

// --- canned fallbacks (no API key) — still culturally specific ---------------

function fallbackEvent(
  nationality: string,
  occasionName: string | undefined,
  significance: string | undefined,
  major: boolean,
  size: number,
): GeneratedEvent {
  const ua = nationality === "Ukrainian";
  if (ua) {
    return {
      title: occasionName?.includes("Independence")
        ? "Ukrainian Independence Day Picnic"
        : "Ukrainian Folk Craft & Song Afternoon",
      summary:
        "A gathering to mark the season with shared food, folk songs and a simple craft — a way to keep the culture close while far from home.",
      culturalSignificance:
        significance ??
        "Coming together around food and song is how Ukrainian communities have always preserved identity through hard times. The table is where the culture lives on.",
      participantInstructions:
        "Bring a dish if you can, and a song or story to share. Families welcome.",
      category: "meetup",
      holiday: occasionName,
      recommendedAsMajor: major,
      suggestedVenues: [
        { name: "Cesar Chavez Park", type: "Public park", why: "Open lawn for a picnic and room for music." },
        { name: "Ukrainian community hall", type: "Cultural venue", why: "Culturally resonant and weather-proof." },
      ],
      materials: [
        { item: "Potluck dishes", quantity: `for ~${Math.max(size * 2, 10)}` },
        { item: "Blue & yellow decorations", quantity: "1 set" },
        { item: "Portable speaker", quantity: "1" },
      ],
      tasks: [
        { title: "Reserve the picnic spot", detail: "Book or scout a shaded lawn area.", critical: true, dueOffsetDays: 4 },
        { title: "Coordinate the potluck", detail: "Make sure dishes don't all overlap.", critical: false, dueOffsetDays: 2 },
        { title: "Bring decorations", detail: "Blue & yellow bunting and a flag.", critical: false, dueOffsetDays: 2 },
        { title: "Set up music", detail: "Speaker + a folk playlist.", critical: false, dueOffsetDays: 1 },
      ],
      source: "fallback",
    };
  }
  if (nationality !== "Nigerian") {
    return {
      title: `${nationality} Community Gathering`,
      summary: `A welcoming ${nationality} cultural gathering with shared food, music, stories, and activities.`,
      culturalSignificance: significance ?? `A chance for the local ${nationality} community to share traditions, build relationships, and keep culture active across generations.`,
      participantInstructions: "Bring a favorite dish, song, story, or tradition to share. Families and newcomers are welcome.",
      category: "meetup",
      holiday: occasionName,
      recommendedAsMajor: major,
      suggestedVenues: [
        { name: "Local community center", type: "Community venue", why: "Accessible indoor space for food, conversation, and activities." },
        { name: "Neighborhood park", type: "Public park", why: "Flexible outdoor space for a relaxed gathering." },
      ],
      materials: [
        { item: "Shared dishes", quantity: `for ~${Math.max(size * 2, 10)}` },
        { item: "Cultural decorations", quantity: "1 set" },
        { item: "Portable speaker", quantity: "1" },
      ],
      tasks: [
        { title: "Confirm the venue", detail: "Reserve an accessible gathering space.", critical: true, dueOffsetDays: 4 },
        { title: "Coordinate shared food", detail: "Organize dishes and dietary information.", critical: true, dueOffsetDays: 2 },
        { title: "Plan cultural activities", detail: "Choose music, stories, games, or a simple cultural activity.", critical: false, dueOffsetDays: 2 },
        { title: "Welcome participants", detail: "Prepare signs and greet newcomers.", critical: false, dueOffsetDays: 1 },
      ],
      source: "fallback",
    };
  }
  // Nigerian fallback
  return {
    title: occasionName?.includes("Yam")
      ? "New Yam Festival Gathering"
      : "Nigerian Community Feast & Drum Circle",
    summary:
      "A celebration of harvest and home with shared food, drumming and dance — bringing the warmth of an owambe to the Bay.",
    culturalSignificance:
      significance ??
      "Communal feasting and drumming are at the heart of Nigerian celebration. Sharing food and rhythm is an act of welcome and belonging.",
    participantInstructions:
      "Bring an appetite and, if you have it, aso ebi or bright fabric. All are welcome.",
    category: "cooking",
    holiday: occasionName,
    recommendedAsMajor: major,
    suggestedVenues: [
      { name: "Mosswood Park", type: "Public park", why: "Space for cooking, drumming and dancing outdoors." },
      { name: "Community kitchen & hall", type: "Shared kitchen", why: "Indoor backup with cooking facilities." },
    ],
    materials: [
      { item: "Jollof rice ingredients", quantity: `for ~${Math.max(size * 3, 12)}` },
      { item: "Proteins & sides", quantity: `for ~${Math.max(size * 3, 12)}` },
      { item: "Drums / percussion", quantity: "a few" },
    ],
    tasks: [
      { title: "Confirm the venue/permit", detail: "Reserve the park area and confirm cooking is allowed.", critical: true, dueOffsetDays: 4 },
      { title: "Cook the jollof", detail: "Lead the main dish.", critical: true, dueOffsetDays: 1 },
      { title: "Bring drinks", detail: "Zobo, chapman and water.", critical: false, dueOffsetDays: 2 },
      { title: "Organize drumming/music", detail: "Gather percussion and a playlist.", critical: false, dueOffsetDays: 2 },
    ],
    source: "fallback",
  };
}
