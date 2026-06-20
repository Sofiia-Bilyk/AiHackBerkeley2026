// Static community definitions and the cultural calendar that drives AI event
// generation. Communities auto-exist for any represented nationality; these two
// are the seeded showcase communities.

import type { CalendarOccasion, Community } from "./types";

export const COMMUNITIES: Community[] = [
  {
    id: "comm_ua",
    nationality: "Ukrainian",
    demonym: "Ukrainian",
    flagEmoji: "🇺🇦",
    accent: { from: "#2563eb", to: "#f5b301", soft: "#eef4ff", ink: "#1e3a8a" },
    region: {
      label: "San Francisco Bay Area",
      lat: 37.8715,
      lng: -122.273,
      radiusMiles: 100,
    },
    primer:
      "Ukrainian culture is rich in folk craft, ritual foods, and seasonal celebration. " +
      "Pysanky (wax-resist dyed eggs) carry protective symbolism; varenyky and borscht " +
      "anchor the table; embroidery (vyshyvanka) encodes regional identity. Major occasions " +
      "include Easter (Velykden), Christmas with kutia and carols, and Independence Day.",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "comm_ng",
    nationality: "Nigerian",
    demonym: "Nigerian",
    flagEmoji: "🇳🇬",
    accent: { from: "#0f9d58", to: "#0b8043", soft: "#eafaf1", ink: "#0b5f37" },
    region: {
      label: "San Francisco Bay Area",
      lat: 37.8044,
      lng: -122.2712,
      radiusMiles: 100,
    },
    primer:
      "Nigeria is home to Yoruba, Igbo, Hausa and many other peoples, with a shared love of " +
      "communal celebration, drumming and dance. Jollof rice is a point of joyful pride; " +
      "aso ebi (coordinated fabric) marks gatherings; festivals like the New Yam Festival " +
      "(Iri Ji) honor harvest, and naming ceremonies and owambe parties bring people together.",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

export function communityById(id: string): Community | undefined {
  return COMMUNITIES.find((c) => c.id === id);
}

export function communityByNationality(n: string): Community | undefined {
  return COMMUNITIES.find((c) => c.nationality === n);
}

// Cultural calendar — month/day, resolved to the nearest upcoming occurrence.
export const CULTURAL_CALENDAR: CalendarOccasion[] = [
  {
    nationality: "Ukrainian",
    name: "Velykden (Ukrainian Easter)",
    month: 4,
    day: 12,
    significance:
      "The most important feast of the year — a celebration of renewal marked by pysanky, paska bread, and blessed baskets.",
    major: true,
  },
  {
    nationality: "Ukrainian",
    name: "Vyshyvanka Day",
    month: 5,
    day: 15,
    significance:
      "A day to wear embroidered shirts celebrating Ukrainian identity and folk craft.",
    major: false,
  },
  {
    nationality: "Ukrainian",
    name: "Independence Day",
    month: 8,
    day: 24,
    significance: "Marks Ukraine's declaration of independence in 1991.",
    major: true,
  },
  {
    nationality: "Ukrainian",
    name: "Koliada (Christmas carols)",
    month: 1,
    day: 7,
    significance:
      "Christmas season of caroling, kutia, and the Holy Supper of twelve dishes.",
    major: true,
  },
  {
    nationality: "Nigerian",
    name: "New Yam Festival (Iri Ji)",
    month: 8,
    day: 15,
    significance:
      "A harvest thanksgiving across Igbo communities celebrating the first yams of the season.",
    major: true,
  },
  {
    nationality: "Nigerian",
    name: "Independence Day",
    month: 10,
    day: 1,
    significance: "Celebrates Nigeria's independence in 1960 with food, music and color.",
    major: true,
  },
  {
    nationality: "Nigerian",
    name: "Eid celebrations",
    month: 3,
    day: 30,
    significance: "Communal feasting and giving observed widely across northern Nigeria.",
    major: false,
  },
];

/** Returns the next occurrence (within `windowDays`) for a nationality. */
export function upcomingOccasions(
  nationality: string,
  from: Date = new Date(),
  windowDays = 60,
): { occasion: CalendarOccasion; date: Date; daysAway: number }[] {
  const results: { occasion: CalendarOccasion; date: Date; daysAway: number }[] = [];
  for (const occ of CULTURAL_CALENDAR.filter((o) => o.nationality === nationality)) {
    // resolve to this year or next, whichever is the next future occurrence
    for (const yearOffset of [0, 1]) {
      const d = new Date(from.getFullYear() + yearOffset, occ.month - 1, occ.day);
      const daysAway = Math.ceil((+d - +from) / 86_400_000);
      if (daysAway >= -2 && daysAway <= windowDays) {
        results.push({ occasion: occ, date: d, daysAway });
        break;
      }
    }
  }
  return results.sort((a, b) => a.daysAway - b.daysAway);
}
