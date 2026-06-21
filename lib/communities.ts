// Static community definitions and the cultural calendar that drives AI event
// generation. Communities auto-exist for any represented nationality; these two
// are the seeded showcase communities.

import type { CalendarOccasion, Community } from "./types";

function bayAreaCommunity(
  id: string,
  nationality: string,
  demonym: string,
  flagEmoji: string,
  from: string,
  to: string,
  soft: string,
  ink: string,
  primer: string,
): Community {
  return {
    id, nationality, demonym, flagEmoji,
    accent: { from, to, soft, ink },
    region: { label: "San Francisco Bay Area", lat: 37.8715, lng: -122.273, radiusMiles: 100 },
    primer,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

export const COMMUNITIES: Community[] = [
  bayAreaCommunity("comm_fi", "Finnish", "Finnish", "🇫🇮", "#003580", "#ffffff", "#eff6ff", "#1e3a8a", "Finnish culture combines close ties to nature, sauna traditions, design, music, and seasonal celebrations. Juhannus, Vappu, Independence Day, shared coffee, and foods such as karjalanpiirakka create meaningful community gatherings."),
  bayAreaCommunity("comm_ge", "Georgian", "Georgian", "🇬🇪", "#b91c1c", "#ffffff", "#fff1f2", "#991b1b", "Georgian culture centers hospitality, polyphonic singing, dance, wine traditions, and the supra feast led by a tamada. Khachapuri, khinkali, and seasonal celebrations bring communities together."),
  bayAreaCommunity("comm_lt", "Lithuanian", "Lithuanian", "🇱🇹", "#fdb913", "#006a44", "#fffbea", "#14532d", "Lithuanian culture carries Baltic song, folk craft, seasonal rituals, and a strong midsummer tradition. Kūčios, Joninės, cepelinai, and communal singing connect families across generations."),
  bayAreaCommunity("comm_pl", "Polish", "Polish", "🇵🇱", "#dc143c", "#ffffff", "#fff1f2", "#9f1239", "Polish community traditions include Wigilia, Easter basket blessings, harvest festivals, folk music, and shared foods such as pierogi, żurek, and bigos."),
  bayAreaCommunity("comm_fr", "French", "French", "🇫🇷", "#0055a4", "#ef4135", "#eff6ff", "#1e3a8a", "French cultural life is shaped by regional food, art, language, music, and public celebration. Community tables, seasonal markets, cinema, and festivals create natural gathering points."),
  bayAreaCommunity("comm_jp", "Japanese", "Japanese", "🇯🇵", "#bc002d", "#ffffff", "#fff1f2", "#9f1239", "Japanese culture brings together seasonal observances, food, craft, music, and respect for community. Hanami, Obon, matsuri, tea, calligraphy, and shared cooking offer rich ways to gather."),
  bayAreaCommunity("comm_kr", "Korean", "Korean", "🇰🇷", "#0047a0", "#cd2e3a", "#eff6ff", "#1e3a8a", "Korean community life is expressed through shared meals, music, language, and seasonal holidays. Seollal, Chuseok, kimjang, traditional games, and performance connect generations."),
  bayAreaCommunity("comm_in", "Indian", "Indian", "🇮🇳", "#ff9933", "#138808", "#fff7ed", "#9a3412", "Indian communities encompass many languages, regions, faiths, foods, and artistic traditions. Diwali, Holi, regional new years, music, dance, and communal meals provide diverse gathering points."),
  bayAreaCommunity("comm_tw", "Taiwanese", "Taiwanese", "🇹🇼", "#006aa6", "#fe0000", "#eff6ff", "#164e63", "Taiwanese culture brings together Indigenous, Hokkien, Hakka, Chinese, Japanese, and contemporary influences. Lunar New Year, lantern festivals, night-market foods, tea culture, music, and temple traditions create rich community gatherings."),
  bayAreaCommunity("comm_no", "Norwegian", "Norwegian", "🇳🇴", "#ba0c2f", "#00205b", "#fff1f2", "#881337", "Norwegian culture combines outdoor life, folk music, craft, and seasonal celebrations. Constitution Day, Midsummer, holiday baking, and traditions such as rosemaling support community connection."),
  bayAreaCommunity("comm_se", "Swedish", "Swedish", "🇸🇪", "#006aa7", "#fecc02", "#eff6ff", "#164e63", "Swedish culture values seasonal gatherings, music, design, and shared pauses such as fika. Midsummer, Lucia, crayfish parties, and holiday baking bring communities together."),
];

export const CREATABLE_COMMUNITIES: Community[] = [
  bayAreaCommunity("comm_ua_ai", "Ukrainian", "Ukrainian", "🇺🇦", "#2563eb", "#f5b301", "#eef4ff", "#1e3a8a", "Ukrainian culture is rich in folk craft, ritual foods, and seasonal celebration. Pysanky carry protective symbolism; varenyky and borscht anchor the table; embroidery encodes regional identity; and major occasions include Velykden, Christmas, and Independence Day."),
];

export function communityById(id: string): Community | undefined {
  return [...COMMUNITIES, ...CREATABLE_COMMUNITIES].find((c) => c.id === id);
}

export function communityByNationality(n: string): Community | undefined {
  return [...COMMUNITIES, ...CREATABLE_COMMUNITIES].find((c) => c.nationality === n);
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
    nationality: "Finnish",
    name: "Vappu",
    month: 5,
    day: 1,
    significance: "A lively spring celebration with picnics, music, sima, and community festivities.",
    major: true,
  },
  {
    nationality: "Finnish",
    name: "Juhannus",
    month: 6,
    day: 20,
    significance: "Midsummer celebration centered on nature, bonfires, sauna, music, and time together.",
    major: true,
  },
  {
    nationality: "Finnish",
    name: "Finnish Independence Day",
    month: 12,
    day: 6,
    significance: "A reflective national celebration marked by candles, music, and shared history.",
    major: true,
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
