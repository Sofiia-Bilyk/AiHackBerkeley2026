# Connect

Connect is an AI-managed cultural club platform for diaspora communities. The repository currently contains:

- a Next.js demo frontend on port `3000`;
- a Flask, SQLAlchemy, and SQLite API on port `5000`;
- optional Claude, Deepgram, Google Places, and Twilio integrations.

> Current integration status: the Next.js UI still uses its local JSON-backed demo store. The Flask backend runs separately and can be exercised with HTTP requests. Migrating the UI to the Flask routes is a separate frontend task.

## Prerequisites

- Node.js 20.9 or newer
- Python 3.10 or newer
- `curl`
- `jq` for the complete command-line API walkthrough

External API credentials are optional. Claude-backed features use deterministic fallbacks, and venue research uses local mock data when `USE_MOCK_VENUES=true`.

## Start the frontend

From the repository root:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Start the backend

Create the virtual environment and install dependencies from the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements-dev.txt
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set at least:

```dotenv
SECRET_KEY=use-a-long-random-local-value
CRON_SECRET=local-cron-secret
USE_MOCK_VENUES=true
```

Then initialize the database and start Flask:

```bash
cd backend
flask --app run:app db upgrade
flask --app run:app run --debug --port 5000
```

The API is available at [http://localhost:5000](http://localhost:5000). SQLite data is stored in `backend/instance/connect.db`.

Run the frontend and backend in separate terminals when you need both.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `SECRET_KEY` | Yes | Signs Flask session cookies. |
| `DATABASE_URL` | No | Defaults to `sqlite:///connect.db`. |
| `FRONTEND_ORIGIN` | No | Credentialed CORS origin; defaults to `http://localhost:3000`. |
| `CRON_SECRET` | Yes | Protects seed, cron, and backend-only agent routes. |
| `ANTHROPIC_API_KEY` | No | Enables live Claude agent output. |
| `DEEPGRAM_API_KEY` | No | Enables browser and Twilio streaming transcription. |
| `GOOGLE_PLACES_API_KEY` | No | Used when mock venues are disabled. |
| `USE_MOCK_VENUES` | No | Set to `true` for credential-free venue testing. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | No | Enable phone calls and signed Twilio webhooks. |
| `PUBLIC_BASE_URL` | For Twilio | Public HTTPS URL forwarding to the Flask server. |

Never put real credentials in `.env.example` or commit `backend/.env`.

## Run backend tests

```bash
source .venv/bin/activate
cd backend
python -m pytest -q
flask --app run:app db check
```

`db check` should print `No new upgrade operations detected.`

## API conventions

Successful responses use:

```json
{"success": true, "data": {}}
```

Errors use:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message"
  }
}
```

Authentication uses an HTTP-only Flask session cookie. The examples below use a cookie jar so authentication persists between `curl` requests.

## API walkthrough

Start Flask first, then run these commands from another terminal.

### 1. Configure shell variables

The cron secret must match `backend/.env`.

```bash
export API=http://localhost:5000/api
export COOKIE=/tmp/connect-cookie.txt
export CRON_SECRET=local-cron-secret
```

### 2. Sign up and inspect the session

```bash
curl -sS -c "$COOKIE" \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "rachael@example.com",
    "password": "password123",
    "phone_number": "+14155550123"
  }' \
  "$API/auth/signup" | jq

curl -sS -b "$COOKIE" "$API/auth/me" | jq
```

If the account already exists, log in instead:

```bash
curl -sS -c "$COOKIE" \
  -H 'Content-Type: application/json' \
  -d '{"email":"rachael@example.com","password":"password123"}' \
  "$API/auth/login" | jq
```

### 3. Complete typed onboarding

```bash
ONBOARDING=$(curl -sS -b "$COOKIE" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Rachael",
    "location": "Berkeley",
    "primary_nationality": "Ghanaian",
    "secondary_interest": "Nigerian",
    "preferred_language": "English"
  }' \
  "$API/onboarding/typed")

echo "$ONBOARDING" | jq
export COMMUNITY_ID=$(echo "$ONBOARDING" | jq -r '.data.community.id')
```

### 4. Seed and scan the cultural calendar

```bash
curl -sS -X POST \
  -H "X-Cron-Secret: $CRON_SECRET" \
  "$API/admin/cultural-moments/seed" | jq

curl -sS -X POST \
  -H "X-Cron-Secret: $CRON_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{"lookahead_days":45}' \
  "$API/cron/cultural-calendar-scan" | jq

curl -sS -b "$COOKIE" "$API/cultural-moments?nationality=Ghanaian" | jq
```

The scan only creates suggestions when a seeded moment is within its planning window. The user-request route below is deterministic at any time of year.

### 5. Generate and accept an event suggestion

```bash
SUGGESTION=$(curl -sS -b "$COOKIE" \
  -H 'Content-Type: application/json' \
  -d "{
    \"community_id\": $COMMUNITY_ID,
    \"source_type\": \"user_request\",
    \"prompt\": \"Suggest a low-budget Ghanaian food event for new members.\"
  }" \
  "$API/event-suggestions/generate")

echo "$SUGGESTION" | jq
export SUGGESTION_ID=$(echo "$SUGGESTION" | jq -r '.data.event_suggestion.id')

PLAN=$(curl -sS -b "$COOKIE" -X POST \
  "$API/event-suggestions/$SUGGESTION_ID/accept")

echo "$PLAN" | jq
export PLAN_ID=$(echo "$PLAN" | jq -r '.data.event_plan.id')
```

### 6. Generate the plan, venues, and tasks

```bash
GENERATED_PLAN=$(curl -sS -b "$COOKIE" \
  -H 'Content-Type: application/json' \
  -d '{
    "budget_amount": 200,
    "expected_attendees": 25,
    "constraints": "Keep it beginner-friendly and affordable."
  }' \
  "$API/event-plans/$PLAN_ID/generate-plan")

VENUES=$(curl -sS -b "$COOKIE" \
  -H 'Content-Type: application/json' \
  -d '{"venue_preferences":"Indoor venue with tables and food allowed."}' \
  "$API/event-plans/$PLAN_ID/research-venues")

TASKS=$(curl -sS -b "$COOKIE" -X POST \
  "$API/event-plans/$PLAN_ID/generate-tasks")

echo "$GENERATED_PLAN" | jq
echo "$VENUES" | jq
echo "$TASKS" | jq
```

### 7. Approve and publish

```bash
export VENUE_ID=$(echo "$VENUES" | jq -r '.data.venue_candidates[0].id')
export TASK_IDS=$(echo "$TASKS" | jq -c '[.data.tasks[].id]')
export BUDGET_IDS=$(echo "$GENERATED_PLAN" | jq -c '[.data.event_plan.budget_items[].id]')

APPROVAL=$(jq -n \
  --argjson tasks "$TASK_IDS" \
  --argjson venue "$VENUE_ID" \
  --argjson budgets "$BUDGET_IDS" \
  '{
    approved_task_ids: $tasks,
    selected_venue_candidate_id: $venue,
    approved_budget_item_ids: $budgets
  }')

curl -sS -b "$COOKIE" \
  -H 'Content-Type: application/json' \
  -d "$APPROVAL" \
  "$API/event-plans/$PLAN_ID/approve" | jq

PUBLISHED=$(curl -sS -b "$COOKIE" -X POST \
  "$API/event-plans/$PLAN_ID/publish")

echo "$PUBLISHED" | jq
export EVENT_ID=$(echo "$PUBLISHED" | jq -r '.data.event.id')
```

### 8. Test community execution

```bash
curl -sS -b "$COOKIE" "$API/events" | jq

curl -sS -b "$COOKIE" \
  -H 'Content-Type: application/json' \
  -d '{"status":"yes"}' \
  "$API/events/$EVENT_ID/rsvp" | jq

EVENT_TASKS=$(curl -sS -b "$COOKIE" "$API/events/$EVENT_ID/tasks")
echo "$EVENT_TASKS" | jq
export TASK_ID=$(echo "$EVENT_TASKS" | jq -r '.data.tasks[0].id')

curl -sS -b "$COOKIE" -X POST "$API/tasks/$TASK_ID/claim" | jq

curl -sS -b "$COOKIE" \
  -H 'Content-Type: application/json' \
  -d '{"report_text":"The task is finished and ready for the event."}' \
  "$API/tasks/$TASK_ID/report" | jq
```

### 9. Start and end a browser voice session

Creating a voice session does not require a Deepgram key. Streaming microphone audio does.

```bash
VOICE=$(curl -sS -b "$COOKIE" \
  -H 'Content-Type: application/json' \
  -d '{"agent_type":"onboarding","language_hint":"en"}' \
  "$API/voice/sessions")

echo "$VOICE" | jq
export VOICE_SESSION_ID=$(echo "$VOICE" | jq -r '.data.voice_session.id')

curl -sS -b "$COOKIE" \
  -H 'Content-Type: application/json' \
  -d '{"outcome":"manual_test_complete"}' \
  "$API/voice/sessions/$VOICE_SESSION_ID/end" | jq
```

The browser audio socket is:

```text
ws://localhost:5000/api/voice/stream?session_id=<VOICE_SESSION_ID>
```

It requires the authenticated session cookie and binary microphone audio chunks.

## Protected agent and cron routes

Backend-only routes require the `X-Cron-Secret` header:

```bash
curl -sS \
  -H "X-Cron-Secret: $CRON_SECRET" \
  -H 'Content-Type: application/json' \
  -d "{\"task_id\":$TASK_ID}" \
  "$API/agents/task-coordinator/follow-up" | jq
```

Do not expose `CRON_SECRET` to browser code.

## Testing Twilio locally

Twilio needs a public HTTPS URL. Run an HTTPS tunnel such as ngrok or Cloudflare Tunnel pointing to port `5000`, then set:

```dotenv
PUBLIC_BASE_URL=https://your-public-host.example
```

Configure the Twilio phone number's incoming voice webhook as:

```text
POST https://your-public-host.example/api/twilio/inbound
```

Configure status callbacks as:

```text
POST https://your-public-host.example/api/twilio/status
```

Twilio webhooks require a valid `X-Twilio-Signature`; ordinary production `curl` requests are rejected.

## Useful maintenance commands

```bash
# Display every backend route
cd backend
flask --app run:app routes

# Create a migration after changing SQLAlchemy models
flask --app run:app db migrate -m "describe the schema change"

# Apply migrations
flask --app run:app db upgrade

# Build and lint the frontend
cd ..
npm run lint
npm run build
```
