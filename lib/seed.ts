// Seeds two showcase communities so the platform never shows an empty state.
// Ukrainian (Berkeley) is the flagship: a fully AI-coordinated Pysanky workshop
// mid-flight, plus completed events that feed the "club manager" analytics.

import type { Database } from "./store";
import { midjourneyPastEventImages } from "./midjourney-images";
import { daysFromNow } from "./utils";
import type {
  CulturalContent,
  CulturalEvent,
  EventTask,
  Membership,
  Message,
  ParticipationRecord,
  Profile,
  Rsvp,
} from "./types";

const ISO = (d: number) => daysFromNow(d);

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

function profile(p: Partial<Profile> & Pick<Profile, "id" | "name" | "city" | "lat" | "lng" | "primaryNationality" | "avatarColor">): Profile {
  return {
    phone: "+1 555 010 0000",
    secondaryInterest: undefined,
    bio: undefined,
    joinedAt: ISO(-40),
    strikes: 0,
    isDemoSeed: true,
    ...p,
  } as Profile;
}

const UA = "Ukrainian";
const NG = "Nigerian";

const profiles: Profile[] = [
  // Ukrainian — Bay Area
  profile({ id: "prof_maria", name: "Maria Kovalenko", city: "Berkeley, CA", lat: 37.8715, lng: -122.273, primaryNationality: UA, avatarColor: "#2563eb", secondaryInterest: "Polish", bio: "Grew up in Lviv. Loves folk craft and a strong cup of coffee.", joinedAt: ISO(-38) }),
  profile({ id: "prof_oksana", name: "Oksana Tkachuk", city: "Oakland, CA", lat: 37.8044, lng: -122.2712, primaryNationality: UA, avatarColor: "#7c3aed", bio: "Pastry chef. Will absolutely judge your paska.", joinedAt: ISO(-30) }),
  profile({ id: "prof_taras", name: "Taras Melnyk", city: "Palo Alto, CA", lat: 37.4419, lng: -122.143, primaryNationality: UA, avatarColor: "#0891b2", bio: "Engineer by day, bandura player by night.", joinedAt: ISO(-22) }),
  profile({ id: "prof_yuliia", name: "Yuliia Shevchenko", city: "San Jose, CA", lat: 37.3382, lng: -121.8863, primaryNationality: UA, avatarColor: "#db2777", bio: "New to the Bay. Looking to keep traditions alive far from home.", joinedAt: ISO(-12) }),
  profile({ id: "prof_andriy", name: "Andriy Bondar", city: "San Francisco, CA", lat: 37.7749, lng: -122.4194, primaryNationality: UA, avatarColor: "#ca8a04", bio: "Always says he'll bring something, sometimes forgets.", joinedAt: ISO(-35), strikes: 2 }),
  profile({ id: "prof_sofia", name: "Sofia Romanenko", city: "Berkeley, CA", lat: 37.8688, lng: -122.2588, primaryNationality: UA, avatarColor: "#16a34a", bio: "Just moved here for grad school. Hoping to meet people.", joinedAt: ISO(-1) }),

  // Nigerian — Bay Area
  profile({ id: "prof_chioma", name: "Chioma Okafor", city: "Oakland, CA", lat: 37.8044, lng: -122.2712, primaryNationality: NG, avatarColor: "#0f9d58", bio: "Igbo. Believes jollof is a love language.", joinedAt: ISO(-28) }),
  profile({ id: "prof_ade", name: "Adebayo Adeyemi", city: "San Francisco, CA", lat: 37.7749, lng: -122.4194, primaryNationality: NG, avatarColor: "#ea580c", bio: "Yoruba. DJ and amateur historian.", joinedAt: ISO(-25) }),
  profile({ id: "prof_ngozi", name: "Ngozi Eze", city: "Berkeley, CA", lat: 37.8715, lng: -122.273, primaryNationality: NG, avatarColor: "#9333ea", bio: "Textile artist working with adire.", joinedAt: ISO(-18) }),
  profile({ id: "prof_emeka", name: "Emeka Nwosu", city: "Hayward, CA", lat: 37.6688, lng: -122.0808, primaryNationality: NG, avatarColor: "#0d9488", bio: "Software guy who misses home cooking.", joinedAt: ISO(-9) }),
];

// ---------------------------------------------------------------------------
// Memberships
// ---------------------------------------------------------------------------

const memberships: Membership[] = [
  ...["prof_maria", "prof_oksana", "prof_taras", "prof_yuliia", "prof_andriy", "prof_sofia"].map(
    (pid) => mem(pid, "comm_ua"),
  ),
  ...["prof_chioma", "prof_ade", "prof_ngozi", "prof_emeka"].map((pid) => mem(pid, "comm_ng")),
];

function mem(profileId: string, communityId: string): Membership {
  return { id: `mship_${profileId}_${communityId}`, profileId, communityId, joinedAt: ISO(-30), role: "member" };
}

// ---------------------------------------------------------------------------
// Flagship event: Pysanky Egg-Writing Workshop (planned, mid-coordination)
// ---------------------------------------------------------------------------

const pysanky: CulturalEvent = {
  id: "evt_pysanky",
  communityId: "comm_ua",
  source: "ai",
  status: "planned",
  title: "Pysanky Egg-Writing Workshop",
  summary:
    "A hands-on workshop in the ancient Ukrainian art of pysanky — writing wax patterns onto eggs and dyeing them in layers to reveal protective folk symbols.",
  culturalSignificance:
    "Pysanky predate Christianity in Ukraine and were believed to hold the power to protect the home and ensure a good harvest. Each symbol — wheat for prosperity, the endless line for eternity, suns and stars for life — carries meaning passed down through generations of women in the family.",
  participantInstructions:
    "No experience needed. We'll teach the kistka (wax stylus) technique step by step. Wear clothes you don't mind getting dye on. Each participant leaves with at least one finished egg and a symbol guide to keep.",
  holiday: "Spring renewal & Easter (Velykden) tradition",
  category: "craft",
  startsAt: ISO(9),
  location: "Berkeley, CA",
  suggestedVenues: [
    { name: "Berkeley Fellowship Hall", type: "Community center", why: "Large tables, sinks for dye cleanup, easy parking for supplies." },
    { name: "Live Oak Park Recreation Room", type: "Public park facility", why: "Affordable, bookable by community groups, natural light." },
    { name: "St. John's Ukrainian Church basement", type: "Cultural/religious venue", why: "Culturally resonant, has experience hosting pysanky sessions." },
  ],
  materials: [
    { item: "White chicken eggs", quantity: "24 eggs" },
    { item: "Beeswax", quantity: "1 lb" },
    { item: "Kistka styluses", quantity: "8 styluses" },
    { item: "Candles", quantity: "12 candles" },
    { item: "Aniline dye kits (yellow, orange, red, black)", quantity: "4 kits" },
    { item: "Paper towels & newspaper", quantity: "1 bulk pack" },
    { item: "Snacks & tea", quantity: "for ~12 people" },
  ],
  capacity: 12,
  interestCount: 9,
  createdAt: ISO(-6),
  coordinatorTick: 1,
  imageSeed: "pysanky",
};

const pysankyTasks: EventTask[] = [
  task("task_eggs", "evt_pysanky", "Bring 24 white eggs", "Plain white chicken eggs, ideally room temperature so they don't crack when blown.", "prof_maria", "claimed", 2, true),
  task("task_wax", "evt_pysanky", "Source beeswax & kistka styluses", "1 lb natural beeswax plus 8 kistka styluses (fine tip).", "prof_oksana", "completed", 4, true),
  task("task_candles", "evt_pysanky", "Bring candles", "12 standard candles for melting wax on the kistka.", undefined, "open", 3, false),
  task("task_dye", "evt_pysanky", "Provide dye kits", "4 aniline dye kits covering yellow, orange, red and black.", undefined, "open", 3, true),
  task("task_snacks", "evt_pysanky", "Arrange snacks & tea", "Light snacks and tea for about 12 people.", "prof_yuliia", "claimed", 1, false),
  task("task_venue", "evt_pysanky", "Confirm the venue", "Lock in a venue with tables and a sink. Berkeley Fellowship Hall is first choice.", "prof_taras", "claimed", 5, true),
];

function task(
  id: string,
  eventId: string,
  title: string,
  detail: string,
  assigneeProfileId: string | undefined,
  status: EventTask["status"],
  dueOffsetDays: number,
  critical: boolean,
): EventTask {
  return { id, eventId, title, detail, assigneeProfileId, status, dueOffsetDays, critical, createdAt: ISO(-6) };
}

// One task is already complete to show the closed loop on the dashboard.

// ---------------------------------------------------------------------------
// A second Ukrainian event in "gauging" state (interest-first)
// ---------------------------------------------------------------------------

const varenyky: CulturalEvent = {
  id: "evt_varenyky",
  communityId: "comm_ua",
  source: "ai",
  status: "gauging",
  title: "Varenyky (Dumpling) Cooking Night",
  summary:
    "A communal evening folding varenyky — potato-and-cheese and cherry — the way families do it together around one big table.",
  culturalSignificance:
    "Varenyky are comfort and togetherness on a plate. The act of folding them as a group is itself the tradition — conversation, hands busy, the dough disappearing batch by batch.",
  participantInstructions:
    "Come hungry. We'll provide dough and fillings; you provide the company. We're gauging interest before we book a kitchen.",
  holiday: undefined,
  category: "cooking",
  startsAt: ISO(20),
  location: "Oakland, CA",
  suggestedVenues: [
    { name: "Temescal community kitchen", type: "Shared kitchen", why: "Commercial range and counter space for group cooking." },
  ],
  materials: [
    { item: "Flour, potatoes, farmer's cheese, cherries", quantity: "for ~10" },
    { item: "Rolling pins & cutters", quantity: "6 sets" },
  ],
  interestCount: 5,
  createdAt: ISO(-3),
  coordinatorTick: 0,
  imageSeed: "varenyky",
};

// ---------------------------------------------------------------------------
// Completed events — history that feeds attendance analytics
// ---------------------------------------------------------------------------

function completedEvent(
  id: string,
  communityId: string,
  title: string,
  category: string,
  daysAgo: number,
  imageSeed: string,
): CulturalEvent {
  const image = midjourneyPastEventImages[imageSeed];
  return {
    id,
    communityId,
    source: "ai",
    status: "completed",
    title,
    summary: `${title} — a past community gathering.`,
    culturalSignificance: "",
    participantInstructions: "",
    category,
    startsAt: ISO(-daysAgo),
    location: "San Francisco Bay Area",
    suggestedVenues: [],
    materials: [],
    interestCount: 0,
    createdAt: ISO(-daysAgo - 7),
    coordinatorTick: 3,
    imageSeed,
    imageUrl: image?.url,
    imagePrompt: image?.prompt,
  };
}

const completedUa: CulturalEvent[] = [
  completedEvent("evt_borscht", "comm_ua", "Borscht & Bread Night", "cooking", 14, "borscht"),
  completedEvent("evt_paska", "comm_ua", "Holiday Baking: Paska", "cooking", 35, "paska"),
  completedEvent("evt_conv", "comm_ua", "Ukrainian Conversation Hour", "language", 21, "language"),
  completedEvent("evt_poetry", "comm_ua", "Poetry & Language Exchange", "language", 49, "poetry"),
  completedEvent("evt_embroidery", "comm_ua", "Embroidery Circle", "craft", 28, "embroidery"),
];

const completedNg: CulturalEvent[] = [
  completedEvent("evt_afrobeats", "comm_ng", "Afrobeats Dance Night", "music", 16, "afrobeats"),
  completedEvent("evt_owambe", "comm_ng", "Owambe Potluck", "cooking", 30, "owambe"),
  completedEvent("evt_yoruba", "comm_ng", "Yoruba Basics Language Hour", "language", 24, "yoruba"),
];

// ---------------------------------------------------------------------------
// Nigerian flagship: Jollof Rice Cook-Off (planned)
// ---------------------------------------------------------------------------

const jollof: CulturalEvent = {
  id: "evt_jollof",
  communityId: "comm_ng",
  source: "ai",
  status: "planned",
  title: "Jollof Rice Cook-Off",
  summary:
    "A friendly cook-off celebrating the most debated dish in West Africa — party jollof, smoky and bright, cooked over open flame.",
  culturalSignificance:
    "Jollof rice is more than food; it's identity and friendly rivalry. The prized 'party jollof' carries a smoky bottom-of-the-pot flavor that signals a real celebration. Sharing it is an act of welcome.",
  participantInstructions:
    "Teams of two. We'll judge on flavor, color and that signature smoky base. Aso ebi (matching fabric) encouraged but optional.",
  holiday: "Community celebration",
  category: "cooking",
  startsAt: ISO(12),
  location: "Oakland, CA",
  suggestedVenues: [
    { name: "Mosswood Park picnic area", type: "Public park", why: "Open-air space that allows propane burners for that smoky finish." },
    { name: "Oakland community kitchen", type: "Shared kitchen", why: "Backup if weather turns; multiple ranges." },
  ],
  materials: [
    { item: "Long-grain parboiled rice", quantity: "10 lb" },
    { item: "Tomatoes, red pepper, onions, scotch bonnet", quantity: "for 6 teams" },
    { item: "Propane burners & large pots", quantity: "4 setups" },
    { item: "Proteins (chicken / beef)", quantity: "for ~24" },
    { item: "Drinks (zobo, chapman, water)", quantity: "for ~24" },
  ],
  capacity: 24,
  interestCount: 7,
  createdAt: ISO(-4),
  coordinatorTick: 0,
  imageSeed: "jollof",
};

const jollofTasks: EventTask[] = [
  task("task_rice", "evt_jollof", "Bring rice & tomato base", "10 lb parboiled long-grain rice plus tomatoes, red pepper and onions.", "prof_chioma", "claimed", 2, true),
  task("task_burners", "evt_jollof", "Provide burners & pots", "4 propane burner setups with large pots.", undefined, "open", 3, true),
  task("task_protein", "evt_jollof", "Marinate proteins", "Chicken and beef for ~24, seasoned the night before.", "prof_emeka", "claimed", 1, false),
  task("task_drinks", "evt_jollof", "Bring drinks", "Zobo, chapman and water for ~24.", undefined, "open", 2, false),
  task("task_jvenue", "evt_jollof", "Confirm park permit", "Reserve the Mosswood Park picnic area and confirm burner use is allowed.", "prof_ade", "claimed", 4, true),
];

// ---------------------------------------------------------------------------
// RSVPs — light for upcoming, fuller for completed (drives attendance avg)
// ---------------------------------------------------------------------------

const uaMembers = ["prof_maria", "prof_oksana", "prof_taras", "prof_yuliia", "prof_andriy", "prof_sofia"];
const ngMembers = ["prof_chioma", "prof_ade", "prof_ngozi", "prof_emeka"];

function going(eventId: string, profileIds: string[], status: Rsvp["status"] = "going"): Rsvp[] {
  return profileIds.map((profileId) => ({
    id: `rsvp_${eventId}_${profileId}`,
    eventId,
    profileId,
    status,
    createdAt: ISO(-5),
  }));
}

const rsvps: Rsvp[] = [
  // upcoming
  ...going("evt_pysanky", ["prof_maria", "prof_oksana", "prof_taras", "prof_yuliia"]),
  ...going("evt_pysanky", ["prof_andriy"], "interested"),
  ...going("evt_jollof", ["prof_chioma", "prof_ade", "prof_emeka"]),
  // completed — attendance counts (cooking > craft > language drives the insight)
  ...going("evt_borscht", uaMembers.slice(0, 6)),
  ...going("evt_paska", uaMembers.slice(0, 5)),
  ...going("evt_embroidery", uaMembers.slice(0, 4)),
  ...going("evt_conv", uaMembers.slice(0, 2)),
  ...going("evt_poetry", uaMembers.slice(0, 2)),
  ...going("evt_afrobeats", [...ngMembers, "prof_emeka"].slice(0, 4)),
  ...going("evt_owambe", ngMembers.slice(0, 4)),
  ...going("evt_yoruba", ngMembers.slice(0, 2)),
];

// ---------------------------------------------------------------------------
// Event chat — member messages interleaved with AI system messages
// ---------------------------------------------------------------------------

function msg(id: string, channelId: string, body: string, opts: { author?: string; system?: boolean; ago: number }): Message {
  return {
    id,
    kind: "event",
    channelId,
    authorProfileId: opts.author,
    isSystem: !!opts.system,
    body,
    createdAt: ISO(-opts.ago),
  };
}

const messages: Message[] = [
  msg("m1", "evt_pysanky", "Pysanky Egg-Writing Workshop is confirmed. I've created 6 tasks and opened this chat for coordination.", { system: true, ago: 6 }),
  msg("m2", "evt_pysanky", "So excited for this! I can bring the eggs 🥚", { author: "prof_maria", ago: 5.5 }),
  msg("m3", "evt_pysanky", "Maria volunteered to bring 24 white eggs. Thank you, Maria.", { system: true, ago: 5.4 }),
  msg("m4", "evt_pysanky", "I'll take beeswax and the styluses — I have a supplier.", { author: "prof_oksana", ago: 5 }),
  msg("m5", "evt_pysanky", "Oksana marked beeswax & styluses complete. ✅", { system: true, ago: 2 }),
  msg("m6", "evt_pysanky", "2 tasks still need a volunteer: candles and dye kits. They're due in 3 days.", { system: true, ago: 1 }),
  msg("m7", "evt_jollof", "Jollof Rice Cook-Off is planned. 5 tasks created — claim what you can!", { system: true, ago: 4 }),
  msg("m8", "evt_jollof", "Rice and tomato base is on me 🍅", { author: "prof_chioma", ago: 3.5 }),
  msg("m9", "evt_jollof", "Chioma is covering rice & tomato base. Thank you, Chioma.", { system: true, ago: 3.4 }),
];

// ---------------------------------------------------------------------------
// Accountability ledger — Andriy is at 2 strikes
// ---------------------------------------------------------------------------

const participation: ParticipationRecord[] = [
  { id: "pr1", profileId: "prof_andriy", eventId: "evt_borscht", taskId: undefined, outcome: "failed", note: "Committed to bring bread, did not show with it.", createdAt: ISO(-14) },
  { id: "pr2", profileId: "prof_andriy", eventId: "evt_embroidery", taskId: undefined, outcome: "failed", note: "Claimed supplies task, did not complete it by the deadline.", createdAt: ISO(-28) },
  { id: "pr3", profileId: "prof_maria", eventId: "evt_borscht", outcome: "completed", note: "Delivered and completed.", createdAt: ISO(-14) },
  { id: "pr4", profileId: "prof_oksana", eventId: "evt_paska", outcome: "completed", note: "Delivered and completed.", createdAt: ISO(-35) },
];

// ---------------------------------------------------------------------------
// Cultural knowledge base
// ---------------------------------------------------------------------------

function content(id: string, communityId: string, kind: CulturalContent["kind"], title: string, tag: string, body: string): CulturalContent {
  return { id, communityId, kind, title, tag, body };
}

const culturalContent: CulturalContent[] = [
  content("c_ua_1", "comm_ua", "tradition", "The symbols of pysanky", "Folk craft", "Every line and color on a pysanka means something: wheat for a good harvest, the endless line (bezkonechnyk) for eternity, deer for prosperity, and the triangle for the Holy Trinity or the family. Black backgrounds were considered especially powerful and protective."),
  content("c_ua_2", "comm_ua", "recipe", "Varenyky with potato & cheese", "Recipe", "Make a soft dough of flour, water, egg and salt; rest it. Fill rounds with mashed potato and farmer's cheese, seal the edges, and boil until they float. Finish in butter with caramelized onions. Best made in a group."),
  content("c_ua_3", "comm_ua", "activity", "Make a motanka doll (solo)", "Solo activity", "No community event nearby? Try a motanka — a Ukrainian protective doll made by winding (never sewing) scraps of cloth. Traditionally faceless to ward off bad spirits. A 30-minute meditative craft you can do at home with fabric you already own."),
  content("c_ua_4", "comm_ua", "holiday", "Velykden (Ukrainian Easter)", "Holiday", "The most important celebration of the year. Families bring baskets of paska bread, pysanky, butter and salt to be blessed, then break the fast with a joyful feast. Greetings of 'Khrystos voskres!' — Christ is risen — are answered with 'Voistynu voskres!'"),
  content("c_ua_5", "comm_ua", "history", "Trypillian roots", "History", "Some pysanky motifs trace back thousands of years to the Trypillian culture of the region, making egg-writing one of the oldest continuously practiced folk arts in Europe."),

  content("c_ng_1", "comm_ng", "recipe", "Party jollof rice", "Recipe", "Blend tomatoes, red bell pepper, onion and scotch bonnet; fry down in oil with tomato paste until rich and deep. Add parboiled rice and stock, then let the bottom catch gently — that smoky 'party' layer is the prize. Cover with foil and steam to finish."),
  content("c_ng_2", "comm_ng", "tradition", "Aso ebi", "Tradition", "For celebrations, guests wear aso ebi — a chosen fabric and color worn in coordination. A sea of matching cloth turns a gathering into a visible community, signaling belonging and shared joy."),
  content("c_ng_3", "comm_ng", "holiday", "New Yam Festival (Iri Ji)", "Holiday", "Across Igbo communities, the New Yam Festival gives thanks for the harvest. The eldest or the chief eats the first yam, followed by feasting, masquerades, drumming and dance."),
  content("c_ng_4", "comm_ng", "activity", "Try adire tie-dye (solo)", "Solo activity", "Adire is a Yoruba resist-dyeing technique. Tie or stitch patterns into plain cotton, dip in indigo, and reveal the design. A satisfying solo project — start with a single bandana and a cold-water indigo kit."),
  content("c_ng_5", "comm_ng", "history", "Nok culture", "History", "Nigeria's Nok culture produced striking terracotta sculptures over 2,000 years ago — among the earliest known figurative art in sub-Saharan Africa."),
];

// ---------------------------------------------------------------------------

export function seedDatabase(database: Database): void {
  database.profiles = profiles;
  database.memberships = memberships;
  database.events = [pysanky, varenyky, ...completedUa, jollof, ...completedNg];
  database.tasks = [...pysankyTasks, ...jollofTasks];
  database.rsvps = rsvps;
  database.messages = messages;
  database.participation = participation;
  database.content = culturalContent;
}
