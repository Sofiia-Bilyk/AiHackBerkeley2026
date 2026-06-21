# AGENTS.md
THIS IS A RUNNING DOCUMENT, IF WE MAKE ANY CHANGES TO THE DESIGN ARCHITECTURE, THIS DOCUMENT MUST BE UPDATED. 

WE ARE NOT BUILDING FRONTEND FOR NOW. NO FRONTEND CODE AT THE MOMENT.

IF YOU RUN INTO AN ERROR OR A BLOCKER, DO NOT CHOOSE AN ALTERNATIVE ACTION BY YOURSELF. EXPLAIN WHAT THE ISSUE IS TO ME, GUSSET POSSIBLE OPTIONS TO RESOLVING IT AND I WOULD CHOOSE WHAT I THINK IS BEST.

## Project: Connect

Connect is an AI-managed cultural club platform for diaspora communities. The product helps communities preserve cultural identity through real-world events, task coordination, venue discovery, and voice-first access.

The core idea is:

> Agents remove the operational bottleneck of organizing cultural events, while humans stay in control of approval, cultural judgment, and final publishing.

Agents may suggest events, draft plans, research venues, generate tasks, follow up with volunteers, and summarize what worked. Humans approve plans before anything is published to the community.

---

## Build Philosophy

This project is a hackathon MVP. Favor clarity, speed, and demo reliability over enterprise-grade complexity.

Build the smallest complete loop:

1. User signs up.
2. User completes onboarding by form or voice.
3. User is placed into a nationality + location community.
4. Seeded cultural calendar scanner creates an event suggestion.
5. User accepts suggestion.
6. Agent creates event plan.
7. Venue Scout researches venues through Google Places.
8. Task Builder generates tasks.
9. Human approves and publishes event.
10. Community members claim and report tasks.
11. Agent follows up on incomplete tasks.
12. Adaptation loop records what worked.

Do not overbuild social networking, identity verification, matching, feeds, or archive features.

---

## Tech Stack

### Backend

* Flask
* Flask-CORS for credentialed browser requests from the Next.js development origin
* Flask-Sock for browser and Twilio WebSocket media routes
* websocket-client for the server-side Deepgram streaming relay
* Flask-Login
* SQLAlchemy
* Alembic
* SQLite
* APScheduler or protected cron-style routes
* Python dotenv config

### External Services

* Claude API for agent reasoning
* Deepgram for speech-to-text
* Google Places API for venue search
* Twilio for phone calls, hotline, and huddles

### Frontend

* Next.js
* Browser microphone APIs for voice onboarding
* Browser `speechSynthesis` for text-to-speech in onboarding
* Normal HTTP calls to Flask backend

---

## Current Scope

### Included

* Email/password signup
* Hash-based authentication
* Session-based login
* Typed onboarding
* Browser voice onboarding
* Exact nationality + location community matching
* Seeded cultural calendar
* Agent-generated event suggestions
* Human-reviewed event planning
* Google Places venue research
* AI-generated task checklists
* Community task claiming
* Self-reported task completion
* Agent follow-up
* Huddles through Twilio conference rooms
* Basic adaptation loop

### Not Included

* Supabase
* OAuth
* Government ID verification
* Cultural Archive
* Social matchmaking
* Complex recommendation feed
* WebRTC audio rooms
* Payment processing
* Real-time push notifications
* Enterprise identity verification
* Evidence-based task verification

---

## Core Product Lifecycle

The system should follow this lifecycle:

```text
User joins community
→ Agent suggests event opportunity
→ Human accepts suggestion
→ Agent creates event plan
→ Agent researches venues
→ Agent generates tasks
→ Human reviews and approves
→ Event is published
→ Community members claim tasks
→ Agents follow up
→ Users report completion
→ System learns what worked
```

The most important concept is that an `event_plan` is not the same as an `event`.

An `event_plan` is the private planning workspace.

An `event` is the public community event created only after human approval.

---

## Backend Architecture

Recommended backend structure:

```text
backend/
  app/
    __init__.py
    config.py
    extensions.py

    models/
      user.py
      community.py
      cultural_moment.py
      event_suggestion.py
      event_plan.py
      venue.py
      budget.py
      event.py
      task.py
      agent.py
      voice.py
      huddle.py

    routes/
      auth.py
      onboarding.py
      voice.py
      communities.py
      cultural_moments.py
      event_suggestions.py
      event_plans.py
      events.py
      tasks.py
      huddles.py
      agents.py
      twilio.py
      cron.py
      demo.py

    services/
      claude_service.py
      deepgram_service.py
      google_places_service.py
      twilio_service.py
      event_orchestrator_service.py
      venue_scout_service.py
      task_builder_service.py
      task_coordinator_service.py
      cultural_calendar_service.py
      adaptation_service.py

    jobs/
      scheduler.py
      cultural_calendar_scan.py
      new_member_suggestions.py
      task_followups.py
      adaptation_loop.py

    utils/
      auth.py
      normalization.py
      errors.py
      dates.py

  migrations/
  instance/
    connect.db

  run.py
  requirements.txt
  .env.example
```

---

## Required Environment Variables

Use `.env` for local development.

```text
FLASK_ENV=development
SECRET_KEY=replace_me
DATABASE_URL=sqlite:///connect.db

ANTHROPIC_API_KEY=replace_me
DEEPGRAM_API_KEY=replace_me
GOOGLE_PLACES_API_KEY=replace_me

TWILIO_ACCOUNT_SID=replace_me
TWILIO_AUTH_TOKEN=replace_me
TWILIO_PHONE_NUMBER=replace_me

CRON_SECRET=replace_me
USE_MOCK_VENUES=false
```

For hackathon demo reliability, support:

```text
USE_MOCK_VENUES=true
```

When enabled, venue research should use seeded local venue data instead of Google Places.

---

## Database Models

Use SQLAlchemy models. Keep the schema simple and explicit.

---

### users

Purpose: core identity.

Fields:

```text
id
email
password_hash
phone_number
name
preferred_language
location
primary_nationality
secondary_interest
onboarding_status
task_failure_count
restricted_until
created_at
updated_at
```

Rules:

* `email` must be unique.
* `phone_number` is required because agents may call users.
* `location` should be normalized to lowercase for matching.
* `onboarding_status` should be one of:

  * started
  * completed

---

### sessions

Purpose: login sessions.

Fields:

```text
id
user_id
token
expires_at
created_at
```

Use Flask-Login for session management. Keep raw token handling minimal unless needed.

---

### communities

Purpose: nationality + location community.

Fields:

```text
id
nationality
location
display_name
created_at
```

Matching rule:

```text
community = exact lowercase location + exact primary nationality
```

Example:

```text
nationality: Ghanaian
location: berkeley
display_name: Ghanaian community in Berkeley
```

---

### community_memberships

Purpose: connect users to communities.

Fields:

```text
id
user_id
community_id
role
status
joined_at
```

Roles:

```text
member
organizer
steward
admin
```

Statuses:

```text
active
inactive
```

For MVP, most users are `member`. The user who accepts a suggestion becomes the `organizer` for that event plan.

---

### cultural_moments

Purpose: seeded cultural calendar.

Fields:

```text
id
nationality
title
type
month
day
is_recurring
description
suggested_event_types_json
planning_lead_days
created_at
```

Types:

```text
national_holiday
religious
food
tradition
seasonal
community
```

Example rows:

```text
Ghana Independence Day
nationality: Ghanaian
type: national_holiday
month: 3
day: 6
is_recurring: true
planning_lead_days: 30
suggested_event_types_json: ["dinner", "music_night", "community_celebration"]
```

```text
Nigerian Independence Day
nationality: Nigerian
type: national_holiday
month: 10
day: 1
is_recurring: true
planning_lead_days: 30
suggested_event_types_json: ["potluck", "cultural_showcase", "music_night"]
```

```text
Pysanky Season
nationality: Ukrainian
type: tradition
month: 4
day: 1
is_recurring: true
planning_lead_days: 21
suggested_event_types_json: ["craft_workshop", "family_event"]
```

Do not call an external holiday API in the MVP. Seed this table.

---

### cultural_content

Purpose: static cultural knowledge base used by agents.

Fields:

```text
id
nationality
type
title
body
created_at
```

Types:

```text
holiday
recipe
tradition
craft
music
language
```

Use this to ground event suggestions and task generation.

---

### event_suggestions

Purpose: agent-generated nudges. These are not events yet.

Fields:

```text
id
community_id
suggested_for_user_id
source_type
source_ref_id
source_key
title
description
reason
status
created_by_agent
created_at
updated_at
```

Source types:

```text
cultural_calendar
new_member
user_request
low_activity
successful_past_event
```

Statuses:

```text
pending
accepted
dismissed
expired
```

Important:

* `source_key` should be unique.
* Use `source_key` for duplicate prevention.

Example source keys:

```text
ghanaian-berkeley-ghana-independence-day-2027
new-member-user-123-community-55
```

---

### event_plans

Purpose: private planning workspace.

Fields:

```text
id
suggestion_id
community_id
organizer_id
title
description
event_type
target_date
expected_attendees
budget_amount
budget_currency
status
created_at
updated_at
```

Statuses:

```text
draft
needs_review
approved
published
cancelled
```

Rules:

* Created when a suggestion is accepted or when a user manually starts planning.
* Agents may edit plans.
* Humans must approve before publishing.

---

### venue_candidates

Purpose: venue options researched by Venue Scout.

Fields:

```text
id
event_plan_id
name
address
phone_number
website_url
maps_url
rating
review_count
estimated_cost
capacity
accessibility_notes
reason
source
source_place_id
status
created_at
```

Sources:

```text
google_places
mock
manual
```

Statuses:

```text
suggested
selected
rejected
```

Rules:

* Venue Scout saves multiple candidates.
* Human selects one.
* Do not automatically publish a venue without review.

---

### budget_items

Purpose: optional budget breakdown.

Fields:

```text
id
event_plan_id
category
description
estimated_amount
actual_amount
status
created_at
```

Categories:

```text
venue
food
decor
supplies
transport
entertainment
other
```

Statuses:

```text
estimated
approved
spent
```

For MVP, this table can be lightweight.

---

### events

Purpose: public community event.

Fields:

```text
id
event_plan_id
community_id
organizer_id
title
description
event_type
date
status
venue_name
venue_address
budget_amount
attendance_count
completion_notes
completed_at
created_at
updated_at
```

Statuses:

```text
published
completed
cancelled
```

Rules:

* Created only when an approved event plan is published.
* Published events are visible to community members.

---

### rsvps

Purpose: event attendance intent.

Fields:

```text
id
event_id
user_id
status
created_at
updated_at
```

Statuses:

```text
yes
no
maybe
```

---

### attendance

Purpose: post-event attendance tracking.

Fields:

```text
id
event_id
user_id
status
checked_in_at
```

Statuses:

```text
attended
no_show
```

For MVP, this can be optional.

---

### tasks

Purpose: work items needed to make an event happen.

Fields:

```text
id
event_plan_id
event_id
title
description
category
assignee_id
status
priority
due_at
estimated_cost
created_by_agent
self_reported_at
created_at
updated_at
```

Categories:

```text
food
decor
venue
setup
cleanup
outreach
supplies
transport
other
```

Statuses:

```text
draft
open
claimed
done
failed
cancelled
```

Priorities:

```text
low
medium
high
```

Rules:

* Before publishing, tasks should be `draft`.
* When an event is published, approved tasks become `open`.
* Members can claim `open` tasks.
* Users can self-report tasks as done.

---

### task_reports

Purpose: user reports about task progress.

Fields:

```text
id
task_id
reporter_id
report_text
status
created_at
```

Statuses:

```text
submitted
accepted
needs_followup
rejected
```

For MVP, most reports can auto-accept and mark the task as done.

---

### huddles

Purpose: scheduled Twilio conference rooms.

Fields:

```text
id
community_id
title
scheduled_at
twilio_conference_sid
status
created_at
```

Statuses:

```text
scheduled
live
ended
cancelled
```

---

### voice_sessions

Purpose: browser or Twilio voice agent sessions.

Fields:

```text
id
user_id
agent_type
mode
status
language_hint
external_id
transcript
outcome
created_at
updated_at
```

Agent types:

```text
onboarding
hotline
task_followup
```

Modes:

```text
browser
twilio
```

Statuses:

```text
active
completed
failed
```

---

### agent_runs

Purpose: structured record of agent executions.

Fields:

```text
id
agent_type
community_id
user_id
event_plan_id
task_id
status
input_json
output_json
created_at
```

Statuses:

```text
started
completed
failed
```

Use this for debugging and demo traceability.

---

### agent_interactions

Purpose: transcript and outcome history.

Fields:

```text
id
user_id
community_id
agent_type
channel
transcript
outcome
created_at
```

Channels:

```text
browser_voice
phone_call
text
system
```

Use this instead of `call_logs` because not every agent interaction is a phone call.

---

### community_insights

Purpose: adaptation loop memory.

Fields:

```text
id
community_id
summary
event_type_scores_json
task_completion_summary
updated_at
```

Example summary:

```text
The Ghanaian Berkeley community responds well to food-centered events under $250. Potlucks get higher task completion than music nights.
```

---

## Backend Routes

Use `/api` prefix for all routes.

---

## Auth Routes

```text
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### POST /api/auth/signup

Input:

```json
{
  "email": "user@example.com",
  "password": "password",
  "phone_number": "+14155550123"
}
```

Behavior:

1. Hash password.
2. Create user.
3. Set onboarding_status to `started`.
4. Log user in.

---

## Onboarding Routes

```text
POST /api/onboarding/typed
POST /api/onboarding/start-voice
POST /api/onboarding/complete
GET  /api/onboarding/status
```

### POST /api/onboarding/typed

Input:

```json
{
  "name": "Rachael",
  "location": "Berkeley",
  "primary_nationality": "Ghanaian",
  "secondary_interest": "Nigerian",
  "preferred_language": "English"
}
```

Behavior:

1. Normalize location to lowercase.
2. Update user.
3. Find or create community.
4. Create community membership.
5. Set onboarding_status to `completed`.
6. Optionally create a new-member event suggestion.

---

### POST /api/onboarding/start-voice

Input:

```json
{
  "language_hint": "en"
}
```

Behavior:

1. Create `voice_sessions` row.
2. Return websocket URL for browser audio streaming.

Output:

```json
{
  "voice_session_id": "vs_123",
  "websocket_url": "/api/voice/stream?session_id=vs_123"
}
```

---

### POST /api/onboarding/complete

Used after voice onboarding gathers required details.

Input:

```json
{
  "voice_session_id": "vs_123",
  "name": "Rachael",
  "location": "Berkeley",
  "primary_nationality": "Ghanaian",
  "secondary_interest": null,
  "preferred_language": "English"
}
```

Behavior:

1. Save profile details.
2. Find or create community.
3. Create membership.
4. Mark onboarding complete.
5. End voice session.

---

## Voice Routes

```text
POST /api/voice/sessions
WS   /api/voice/stream
POST /api/voice/sessions/:id/end
```

### Voice Streaming Flow

```text
Browser mic
→ Flask websocket
→ Deepgram STT
→ final transcript chunk
→ Claude
→ optional tool call
→ database write
→ agent text response
→ browser speechSynthesis
```

For MVP, use browser `speechSynthesis` instead of adding a separate text-to-speech service.

---

## Community Routes

```text
GET /api/communities/me
GET /api/communities/:id
GET /api/communities/:id/members
GET /api/communities/:id/dashboard
```

### GET /api/communities/:id/dashboard

Return:

```json
{
  "community": {},
  "pending_suggestions": [],
  "active_event_plans": [],
  "upcoming_events": [],
  "open_tasks": [],
  "my_tasks": []
}
```

---

## Cultural Moment Routes

```text
GET  /api/cultural-moments
POST /api/admin/cultural-moments/seed
```

### POST /api/admin/cultural-moments/seed

Behavior:

1. Load seed JSON.
2. Insert cultural moments.
3. Avoid duplicates by nationality + title + month + day.

Seed file location:

```text
backend/seeds/cultural_moments.json
```

---

## Event Suggestion Routes

```text
GET  /api/event-suggestions
POST /api/event-suggestions/generate
POST /api/event-suggestions/:id/accept
POST /api/event-suggestions/:id/dismiss
```

### POST /api/event-suggestions/generate

Input:

```json
{
  "community_id": 1,
  "source_type": "user_request",
  "prompt": "Suggest a low-budget Ghanaian food event for new members."
}
```

Behavior:

1. Call Event Orchestrator Agent.
2. Create event_suggestion row.
3. Return suggestion.

---

### POST /api/event-suggestions/:id/accept

Behavior:

1. Mark suggestion as `accepted`.
2. Create event_plan.
3. Set current user as organizer.
4. Optionally run generate-plan automatically.

Output:

```json
{
  "event_plan": {}
}
```

---

### POST /api/event-suggestions/:id/dismiss

Input:

```json
{
  "reason": "Not enough time this month"
}
```

Behavior:

1. Mark suggestion as `dismissed`.
2. Store reason if implemented.

---

## Event Plan Routes

```text
GET   /api/event-plans/:id
PATCH /api/event-plans/:id

POST  /api/event-plans/:id/generate-plan
POST  /api/event-plans/:id/research-venues
POST  /api/event-plans/:id/generate-tasks
POST  /api/event-plans/:id/approve
POST  /api/event-plans/:id/publish
POST  /api/event-plans/:id/cancel
```

### POST /api/event-plans/:id/generate-plan

Input:

```json
{
  "budget_amount": 200,
  "expected_attendees": 25,
  "constraints": "Keep it beginner-friendly and easy for new members."
}
```

Behavior:

1. Read event plan.
2. Read cultural content.
3. Read community insights.
4. Ask Claude to improve the plan.
5. Save plan updates and optional budget items.

---

### POST /api/event-plans/:id/research-venues

Input:

```json
{
  "budget_amount": 200,
  "expected_attendees": 25,
  "venue_preferences": "Low-cost indoor venue with tables and food allowed."
}
```

Behavior:

1. Read event plan and community location.
2. Ask Claude to generate Google Places search queries.
3. Call Google Places Text Search.
4. Normalize and dedupe results.
5. Ask Claude to rank venues.
6. Save top venues as `venue_candidates`.

---

### POST /api/event-plans/:id/generate-tasks

Behavior:

1. Read event plan, budget, venue candidates, and cultural context.
2. Ask Task Builder Agent to generate task checklist.
3. Save tasks as `draft`.

---

### POST /api/event-plans/:id/approve

Input:

```json
{
  "approved_task_ids": [1, 2, 3],
  "selected_venue_candidate_id": 1,
  "approved_budget_item_ids": [1, 2]
}
```

Behavior:

1. Set event_plan status to `approved`.
2. Mark selected venue as `selected`.
3. Keep approved tasks ready for publishing.

---

### POST /api/event-plans/:id/publish

Behavior:

1. Validate event plan is approved.
2. Create `events` row.
3. Copy selected venue into event.
4. Convert approved draft tasks into `open` tasks.
5. Set event_plan status to `published`.

---

## Event Routes

```text
GET   /api/events
GET   /api/events/:id
PATCH /api/events/:id
POST  /api/events/:id/rsvp
POST  /api/events/:id/check-in
POST  /api/events/:id/complete
POST  /api/events/:id/cancel
```

### POST /api/events/:id/rsvp

Input:

```json
{
  "status": "yes"
}
```

Behavior:

1. Upsert RSVP for current user.
2. Return RSVP.

---

### POST /api/events/:id/complete

Input:

```json
{
  "attendance_count": 22,
  "notes": "Great turnout. Food tasks completed on time."
}
```

Behavior:

1. Mark event as `completed`.
2. Store notes if implemented.
3. Data should be used by adaptation loop.

---

## Task Routes

```text
GET   /api/events/:id/tasks
GET   /api/tasks/:id
POST  /api/tasks/:id/claim
POST  /api/tasks/:id/unclaim
POST  /api/tasks/:id/report
POST  /api/tasks/:id/mark-done
POST  /api/tasks/:id/reopen
PATCH /api/tasks/:id
DELETE /api/tasks/:id
```

### POST /api/tasks/:id/claim

Behavior:

1. Check task status is `open`.
2. Set assignee_id to current user.
3. Set status to `claimed`.

---

### POST /api/tasks/:id/report

Input:

```json
{
  "report_text": "I bought the flowers and will bring them by 5pm."
}
```

Behavior:

1. Create task_report.
2. Run Task Coordinator Agent.
3. If accepted, mark task as done.
4. Otherwise set report status to `needs_followup`.

For MVP, accept most reports automatically.

---

### POST /api/tasks/:id/mark-done

Behavior:

1. Set task status to `done`.
2. Set self_reported_at to now.

---

### POST /api/tasks/:id/reopen

Input:

```json
{
  "reason": "I cannot complete this anymore."
}
```

Behavior:

1. Clear assignee_id.
2. Set task status to `open`.
3. Optionally record task failure.

---

## Huddle Routes

```text
GET  /api/huddles
POST /api/huddles
GET  /api/huddles/:id
POST /api/huddles/:id/join
POST /api/huddles/:id/end
```

### POST /api/huddles/:id/join

Behavior:

1. Read current user phone number.
2. Create or reuse Twilio conference.
3. Place outbound call to the user.
4. Drop them into the conference.

---

## Agent Routes

These are backend-only or admin-only orchestration routes.

```text
POST /api/agents/event-orchestrator/suggest
POST /api/agents/event-orchestrator/plan
POST /api/agents/venue-scout/research
POST /api/agents/task-builder/generate
POST /api/agents/task-coordinator/follow-up
POST /api/agents/adaptation/run
```

These routes should create `agent_runs` entries for debugging.

---

## Cron Routes

Protect these with `CRON_SECRET`.

```text
POST /api/cron/cultural-calendar-scan
POST /api/cron/new-member-suggestions
POST /api/cron/task-followups
POST /api/cron/adaptation-loop
```

---

### POST /api/cron/cultural-calendar-scan

Behavior:

1. Get all active communities.
2. For each community, find upcoming cultural moments.
3. Check duplicate source_key.
4. Ask Event Orchestrator Agent to create suggestion.
5. Save event_suggestion.

Lookahead default:

```text
45 days
```

Duplicate source_key format:

```text
{nationality}-{location}-{moment-title}-{year}
```

Normalize source_key to lowercase and slug format.

---

### POST /api/cron/new-member-suggestions

Behavior:

1. Find users who recently completed onboarding.
2. Check whether they already received a new-member suggestion.
3. Create a welcome or intro event suggestion.

---

### POST /api/cron/task-followups

Behavior:

1. Find claimed tasks due soon.
2. Trigger Task Coordinator Agent.
3. Follow up through phone call, browser voice, or text simulation.
4. Update task based on response.

Outcomes:

```text
done
still_on_track
needs_reassignment
failed
no_response
```

---

### POST /api/cron/adaptation-loop

Behavior:

1. Analyze events, RSVPs, attendance, task completion, and agent interactions.
2. Generate community insight summary.
3. Save to `community_insights`.

---

## Twilio Routes

```text
POST /api/twilio/inbound
POST /api/twilio/status
POST /api/twilio/task-followup
POST /api/twilio/huddle
WS   /api/twilio/media-stream
```

### POST /api/twilio/inbound

Purpose: hotline.

Behavior:

1. Identify caller by phone number.
2. Create voice session.
3. Route to Hotline Agent.
4. Handle RSVP, task report, event question, or help request.

---

### POST /api/twilio/huddle

Purpose: join user to conference room.

Behavior:

1. Return TwiML that dials user into Twilio conference.

---

## Demo Routes

Demo routes are allowed for hackathon reliability. Disable them outside development.

```text
POST /api/demo/seed
POST /api/demo/reset
GET  /api/demo/state
POST /api/demo/run-cultural-scan
POST /api/demo/create-ghana-independence-suggestion
POST /api/demo/run-venue-scout
POST /api/demo/run-task-builder
POST /api/demo/run-task-followup
```

### POST /api/demo/seed

Should seed:

1. Users
2. Communities
3. Community memberships
4. Cultural moments
5. Cultural content
6. Mock venues if needed
7. One or two demo event suggestions

---

## Agent Definitions

Agents should not directly mutate the database. They should request tool calls. Backend services execute those tool calls.

---

### Onboarding Agent

Purpose:

Collect onboarding information through browser voice.

Collect:

```text
name
location
primary_nationality
secondary_interest
preferred_language
```

Available tools:

```text
save_onboarding_details
find_or_create_community
complete_onboarding
create_new_member_event_suggestion
```

Behavior:

* Be concise.
* Ask one question at a time.
* Support non-English users.
* Confirm details before saving.
* End once onboarding is complete.

---

### Event Orchestrator Agent

Purpose:

Create culturally relevant event suggestions and draft event plans.

Inputs:

```text
community
cultural_moment
cultural_content
community_insights
recent_events
budget
expected_attendees
```

Available tools:

```text
create_event_suggestion
create_event_plan
update_event_plan
create_budget_item
read_community_insights
read_cultural_content
```

Behavior:

* Do not invent cultural facts when seeded content is available.
* Prefer realistic, low-budget events.
* Explain why the event fits the community.
* Keep human approval in the loop.
* Do not publish events directly.

---

### Venue Scout Agent

Purpose:

Find and rank venue options.

Inputs:

```text
event_plan
community location
budget
expected attendees
venue preferences
Google Places results
```

Available tools:

```text
create_venue_candidate
select_venue_candidate
reject_venue_candidate
```

Behavior:

* Generate practical Google Places search queries.
* Search for more than just generic venues.
* Consider community centers, restaurants, halls, studios, libraries, classrooms, and cultural centers.
* Rank by event fit, affordability, capacity, distance, accessibility, and risk.
* Save top 3 to 5 candidates.
* Do not select final venue automatically unless user explicitly asks.

Example search queries:

```text
community center in Berkeley CA
affordable event space in Berkeley CA
church hall rental in Berkeley CA
African restaurant private room Berkeley CA
cultural center near Berkeley CA
```

---

### Task Builder Agent

Purpose:

Generate a realistic task checklist for an event plan.

Inputs:

```text
event_plan
selected venue
budget
expected attendees
event type
cultural context
```

Available tools:

```text
create_task
update_task
delete_task
estimate_task_cost
```

Behavior:

* Generate tasks as `draft`.
* Include food, setup, cleanup, supplies, outreach, and venue tasks where relevant.
* Assign due dates where possible.
* Keep tasks small enough for volunteers.
* Do not assign tasks before publishing.
* Do not create unrealistic tasks for low-budget events.

Example tasks:

```text
Buy flowers
Cook jollof rice
Bring speakers
Create event flyer
Set up tables
Clean up after event
Confirm venue
Buy plates and cups
```

---

### Task Coordinator Agent

Purpose:

Follow up with users about claimed tasks.

Inputs:

```text
task
assignee
event
due date
previous task reports
```

Available tools:

```text
mark_task_done
mark_task_open
record_task_report
record_task_failure
send_followup_message
```

Behavior:

* Ask for quick status update.
* If user says task is done, mark it done.
* If user says they cannot complete it, reopen it.
* If user says they are on track, log that.
* If repeated failure occurs, increment task_failure_count.
* Be friendly and direct.

---

### Hotline Agent

Purpose:

Handle inbound phone calls.

Supported intents:

```text
RSVP
event schedule question
task report
task claim
help request
```

Available tools:

```text
find_user_by_phone
get_upcoming_events
record_rsvp
get_user_tasks
record_task_report
answer_event_question
```

Behavior:

* Identify user by phone number.
* Ask clarifying questions only when needed.
* Complete the action with minimal friction.
* End call gracefully.

---

### Adaptation Loop

Purpose:

Summarize what worked and improve future suggestions.

This is not conversational.

Inputs:

```text
events
rsvps
attendance
tasks
task_reports
agent_interactions
```

Output:

```text
community_insights
```

Behavior:

* Identify event types that work.
* Identify task categories that fail often.
* Identify good budget ranges.
* Summarize learnings in plain language.
* Do not overfit from one event unless it is the only data available.

---

## Claude Tool Calling Pattern

Every agent should follow this pattern:

```text
1. Backend gathers context.
2. Backend sends context and tool schema to Claude.
3. Claude replies with text and optional tool call.
4. Backend validates tool call.
5. Backend executes database mutation.
6. Backend stores agent_run.
7. Backend returns result to frontend.
```

Never parse arbitrary free text as a database mutation. Mutations should happen through explicit backend functions.

---

## Google Places Venue Search Pattern

Route:

```text
POST /api/event-plans/:id/research-venues
```

Service flow:

```text
event_plan
→ Claude generates search queries
→ Google Places Text Search
→ normalize results
→ dedupe by place_id or address
→ Claude ranks candidates
→ save venue_candidates
```

If `USE_MOCK_VENUES=true`, skip Google Places and use seeded mock venue data.

Venue ranking rubric:

```text
event fit
distance
likely affordability
capacity fit
accessibility
cultural relevance
risk level
```

Save the reason for each venue. The explanation is part of the user value.

---

## Seed Data

Create seed files:

```text
backend/seeds/cultural_moments.json
backend/seeds/cultural_content.json
backend/seeds/mock_venues.json
backend/seeds/demo_users.json
```

Seed cultural moments for at least:

```text
Ghanaian
Nigerian
Ukrainian
Indian
Mexican
Brazilian
Chinese
Korean
```

Demo should strongly support Ghanaian community in Berkeley.

---

## MVP Demo Scenario

Build the demo around this story:

```text
1. User signs up.
2. User completes voice onboarding.
3. User is added to Ghanaian community in Berkeley.
4. Cultural calendar scanner notices Ghana Independence Day.
5. Event Orchestrator suggests Ghana Independence Day Jollof Night.
6. User accepts.
7. Agent creates event plan with $200 budget.
8. Venue Scout finds local venue options.
9. Task Builder creates volunteer tasks.
10. User approves and publishes.
11. Community member claims "Buy flowers."
12. Member reports completion.
13. Task Coordinator marks it done.
14. Adaptation loop records that food-centered events work well.
```

---

## Frontend Pages Needed

Minimum pages:

```text
/sign-up
/login
/onboarding
/onboarding/voice
/dashboard
/suggestions
/event-plans/[id]
/events/[id]
/tasks
/huddles
```

Dashboard should show:

```text
pending suggestions
active event plans
upcoming events
open tasks
my tasks
```

Event plan page should show:

```text
event details
budget
venue candidates
draft tasks
approve button
publish button
```

---

## Response and Error Conventions

Use JSON responses.

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

Common error codes:

```text
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
VALIDATION_ERROR
DUPLICATE_RESOURCE
AGENT_FAILED
EXTERNAL_SERVICE_FAILED
```

---

## Security Rules

* Passwords must be hashed.
* Use httpOnly cookies for sessions.
* Protect cron routes with `CRON_SECRET`.
* Do not expose API keys to frontend.
* Validate all agent tool calls before execution.
* Do not allow agents to publish events without human approval.
* Restrict Twilio test calls during development.
* Demo routes should be disabled outside development.

---

## Coding Guidelines

* Keep routes thin.
* Put business logic in services.
* Put database schema in models.
* Use clear enum-like strings for statuses.
* Normalize locations before matching.
* Use source_key for duplicate prevention.
* Add docstrings to service functions.
* Keep agent prompts in separate files or service constants.
* Log agent inputs and outputs for debugging.
* Prefer predictable demo behavior over clever automation.

---

## Implementation Order

Build in this order:

### Phase 1: Core backend

1. Flask app setup
2. SQLAlchemy setup
3. Auth
4. User model
5. Community model
6. Community membership
7. Typed onboarding

### Phase 2: Cultural scanner and suggestions

1. cultural_moments table
2. seed route
3. event_suggestions table
4. cultural calendar scan service
5. suggestion accept and dismiss routes

Implementation note: the accept route creates a minimal private `event_plan` draft so it
can satisfy the route contract. Phase 3 adds plan generation, venue research, task
generation, and the approval/publishing workflow.

### Phase 3: Event planning

1. event_plans table
2. generate plan route
3. venue_candidates table
4. Google Places service
5. venue scout service
6. tasks table
7. task generation service
8. approve and publish flow

Implementation note: publishing creates the minimal public `events` row required by
the publish contract. Phase 4 adds event listing/detail actions, RSVPs, attendance,
task claiming, and task reporting. Plan, venue, and task generation use deterministic
fallbacks so the demo works without external credentials; Google Places Text Search
is used when mock venues are disabled and a key is configured.

### Phase 4: Community execution

1. events table
2. rsvps table
3. task claiming
4. task reporting
5. task completion

Implementation note: event completion stores `attendance_count`, `completion_notes`,
and `completed_at` for the phase-6 adaptation loop. Check-in uses the lightweight
`attendance` table. Reopening an assigned task records a follow-up report and
increments the prior assignee's `task_failure_count`; unclaiming does not count as a
failure.

### Phase 5: Voice and agents

1. voice_sessions table
2. Deepgram browser voice onboarding
3. Claude onboarding agent
4. Twilio hotline
5. Task follow-up agent

Implementation note: browser audio and optional Twilio media audio are relayed to
Deepgram through Flask-Sock. The Twilio hotline uses signed speech `<Gather>`
webhooks for predictable request/response calls; the media-stream socket records
live transcripts but is not required for hotline actions. `voice_sessions.external_id`
maps Twilio call SIDs to sessions. Every phase-5 agent orchestration route records an
`agent_run`, and completed voice calls are retained as `agent_interactions`. Huddles
remain outside this phase's implementation list.

### Phase 6: Demo reliability

1. demo seed route
2. demo reset route
3. mock venue fallback
4. manual run-cultural-scan route
5. manual run-task-followup route
6. demo state route

---

## Non-Negotiable Product Rules

1. Agents suggest. Humans approve.
2. Event plans are private until published.
3. Published events must come from approved plans.
4. Tasks are drafts until the event is published.
5. Venue Scout saves options, not final decisions.
6. Cultural calendar uses seeded data for MVP.
7. Voice should call the same backend tools as the UI.
8. Demo routes are allowed, but should be clearly separated.
9. Do not add unnecessary features before the core loop works.
10. The product should feel like an AI organizer, not a generic event app.

---

## Final Mental Model

Connect is not just an events app.

Connect is an agent-managed organizing system.

The backend should reflect this:

```text
cultural moment
→ event suggestion
→ event plan
→ venue candidates
→ draft tasks
→ human approval
→ published event
→ claimed tasks
→ reports
→ follow-up
→ insights
```

Build that loop first.
