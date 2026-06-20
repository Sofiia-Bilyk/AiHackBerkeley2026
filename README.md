# Connect — AI-managed cultural clubs

Connect helps diaspora communities keep their culture alive through real-world events.
Unlike a social network with an AI assistant bolted on, here **the AI is the organizer**:
it proposes culturally-authentic events, breaks them into tasks, assigns and chases the
work, and verifies completion from uploaded photos — an invisible operational layer that
keeps communities self-sustaining without a human admin.

Built for the UC Berkeley AI Hackathon 2026 with **Next.js + Claude (Anthropic)**.

## The three core capabilities

1. **Cultural Event Generation** — Claude knows each nationality's holidays, traditions,
   recipes and crafts. Given the cultural calendar, community size and past attendance, it
   proposes a specific event (e.g. a Pysanky workshop before Easter) with cultural
   significance, a materials list, suggested venues and a coordination plan.
2. **Autonomous Coordination** — every event becomes a task list. Members volunteer;
   unclaimed tasks are auto-assigned to attendees (deprioritizing unreliable members); the
   platform posts reminders and status updates into the event chat. *Advance coordination*
   on an event page to watch it work.
3. **Photo Task Verification** — a member uploads a photo as proof; **Claude vision** judges
   it `completed` / `uncertain` / `incomplete` with confidence and reasoning. Three verified
   failures restrict a member from events for six months.

Plus: cultural knowledge base + assistant, attendance analytics & "club manager"
recommendations (Community Coach), member matchmaking, event/DM chat, and an onboarding
flow with **AI-assisted ID extraction** for nationality verification.

## Run it locally

```bash
npm install
cp .env.example .env.local   # optional — add your ANTHROPIC_API_KEY for live AI
npm run dev                  # http://localhost:3000
```

No database or sign-up required: data is seeded in a local JSON-backed store and the
landing page lets you step into a seeded persona. **Everything degrades gracefully** — with
no API key the app runs on culturally-grounded fallbacks so the demo always works. Add a key
to make event generation, coordination messages, photo verification and ID extraction live.

### Environment (all optional)

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Live Claude calls (model `claude-opus-4-8` + vision). |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Upstash Redis for the AI's analytics/memory layer. Falls back to in-process memory. |

## 4-minute demo script

1. **Landing** → enter as **Maria Kovalenko** (Ukrainian club, Berkeley).
2. **Dashboard** shows a live community: upcoming events, nearby members, a "manager note"
   insight, cultural content. Click **Generate an event** — Claude proposes a real,
   holiday-aware event live.
3. Open the **Pysanky Egg-Writing Workshop**. Show the cultural significance, materials and
   venues. Note tasks are partly claimed, partly open.
4. Click **Advance coordination** → the AI assigns the unclaimed tasks and posts operational
   messages into the chat ("…had no volunteer, so it's been assigned to …").
5. On your task **Bring 24 white eggs**, click **Upload proof** and pick a photo of eggs →
   Claude vision returns *"Task likely completed — ~24 eggs detected."*
6. **Insights** tab → "Cooking events draw ~2.8x the turnout of language exchanges,"
   attendance trend, and the accountability ledger (Andriy at 2/3 strikes).
7. Closing line: *"No human organized any of this."*

> Tip: the **Sofia** persona is a brand-new member — use it to show the newcomer experience
> and member matchmaking.

## Architecture

```
app/
  page.tsx                 landing + persona picker
  onboarding/              sign-up + AI ID extraction
  app/                     authenticated shell
    page.tsx               dashboard
    events/[id]/           event detail: tasks, coordination, verification, chat
    members/ learn/ insights/ messages/
  actions.ts               all server actions (the only mutation surface)
lib/
  types.ts                 domain models
  store.ts  seed.ts        local JSON-backed repository + seeded communities
  communities.ts           static communities + cultural calendar
  selectors.ts             read helpers
  ai/
    client.ts              Anthropic wrapper (graceful fallback)
    events.ts              Feature 1 — event generation
    coordinator.ts         Feature 2 — autonomous coordination
    verify.ts              Feature 3 — photo verification (vision)
    idextract.ts           onboarding ID extraction (vision)
    memory.ts              analytics + pluggable KV (in-memory ↔ Upstash Redis)
components/                UI primitives + client components
```

**Designed to extend:** the store, auth (demo session), and memory KV are all behind seams,
so swapping in Supabase (Postgres/Auth/Storage) or Redis, and adding reputation systems,
richer matching, venue partnerships, multilingual support or a mobile app, are additive
changes — not rewrites.
