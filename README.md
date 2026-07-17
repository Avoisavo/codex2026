# Scam Guard — AI-verified bank transfers

**Verified before it's gone.**

Scam Guard is a Maybank2u-style banking app with an AI guardian that steps in at the
**moment of a transfer** — before the money leaves the account. When a family enables
parental control, every outgoing transfer is screened, and anything risky triggers a
real-time **AI phone call** that talks to the user, decides whether it's a scam, and
**blocks or approves** the transfer based on the conversation.

Built at an OpenAI hackathon with **OpenAI Codex** and **GPT-5.6**.

---

## The problem

In Malaysia, scammers move faster than families can react. The elderly are prime targets,
transfers are instant and irreversible, and scam tactics (loan scams, impersonation, fake
investments) evolve every week — faster than any parent can keep up with. Today's
protection is reactive; the money is already gone by the time anyone finds out.

## What it does

Scam Guard adds a live, human-in-the-loop verification layer at the point of no return.

- **My Accounts** (`/bank`) — balance, money-in/out, spending insights, live transaction
  history, and a promo carousel.
- **Pay & Transfer** (`/transfer`) — a full transfer flow with an AI pre-check and
  verification call when parental control is on.
- **Settings** (`/settings`) — security, notifications, and **Parental Control** (limits +
  guardian phone) that persists to the store.

## How it works

1. **Children set up parental control** for their parent's account (transaction limit,
   daily frequency, monthly cap, guardian phone).
2. **Every transfer is pre-checked** against risk criteria — the first layer of protection:
   - amount over the transaction limit,
   - recipient on the bank's suspicious/mule-account list,
   - a new/unknown payee not in the transfer history.
3. If flagged, the app shows an **"AI Scam Guard analyzing…"** modal, then places a
   **phone call** to the guardian via ElevenLabs + Twilio, passing the full transaction
   context (amount, recipient, why it was flagged) as dynamic variables.
4. The agent confirms the transfer, verifies purpose and relationship, checks for pressure,
   and reaches a clear decision.
5. **Block or approve** based on the user's context:
   - **APPROVED** → balance is deducted, a transaction is logged, transfer recorded →
     *Transfer successful*.
   - **BLOCKED** → nothing is sent, a blocked attempt is recorded, an SMS notice goes to the
     guardian → *Transfer rejected*.
6. Every verification call is appended to `transcript.txt` with timestamps.

## Tech stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript** · **Tailwind CSS v4**
- **OpenAI GPT-5.6** — the phone verification agent (reasoning over the live conversation)
- **ElevenLabs** — real-time TTS and voice for the outbound call
- **Twilio** — real-time phone calling / call routing
- **OpenAI GPT-5.6** — knowledge indexing and continuous improvement of scam heuristics
- **Databricks** — SQL warehouse for the data pipeline (mirrored behind a fast local store)

## Data layer (hybrid store)

Reads/writes go through a hybrid store so the demo can never break:

- **Local JSON** (`data/db.json`) is the source of truth — instant reads/writes, auto-seeded.
- **Databricks** is a best-effort mirror, toggled by `DATABRICKS_MIRROR` (off by default).
  Writes are fire-and-forget; a slow/cold warehouse never blocks the UI.

Three collections: **users** (balance, parental control, transaction history), **transfers**
(every executed/blocked transfer), and **suspicious_accounts** (the flagged-account list).

## Getting started

### Prerequisites

- Node.js 18+
- An [ElevenLabs](https://elevenlabs.io) Conversational AI agent (published) with a Twilio
  phone number attached
- (Optional) A [Databricks](https://databricks.com) SQL warehouse for the cloud mirror

### Setup

```bash
git clone <repo-url>
cd codex2026
npm install
```

Create `.env.local` in the project root:

```env
# ElevenLabs + Twilio (voice verification call)
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_PHONE_NUMBER_ID=your_twilio_number_id_in_elevenlabs

# Databricks (optional cloud mirror — app runs fine without it)
DATABRICKS_SERVER_HOSTNAME=your-workspace.cloud.databricks.com
DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/xxxxxxxx
DATABRICKS_TOKEN=your_pat
DATABRICKS_CATALOG=workspace
DATABRICKS_SCHEMA=banking_app
DATABRICKS_MIRROR=off
```

Run the app:

```bash
npm run dev
```

Then:

1. Open [http://localhost:3000/bank](http://localhost:3000/bank).
2. In **Settings → Parental Control**, turn it on and set your **real phone number** as the
   guardian (any format — it's normalized to E.164). Save.
3. On **/transfer**, press **Space** to autofill a flagged transfer → **Continue** →
   **Confirm & Transfer** → your phone rings for verification.

> The local JSON store seeds itself, so the app works out of the box. To (re)seed or reset:
> `curl -X POST "http://localhost:3000/api/db/init?reset=true"`.

## Demo shortcut

On `/transfer`, pressing **Space** (when not typing in a field) autofills the flagged
scenario: recipient *Quick Cash Enterprise*, account `8842 1190 3321` (seeded as suspicious),
RM 10,000. See [`docs/demo-script-block.md`](docs/demo-script-block.md) for the call script
and [`docs/scam-guard-agent.md`](docs/scam-guard-agent.md) for the agent prompt.

## Project structure

```
app/
  bank/            # My Accounts — balance, transactions, spending, carousel
  transfer/        # Pay & Transfer — pre-check, analyzing modal, verification call
  settings/        # Security, notifications, parental control
  components/maybank/   # Shared chrome, card modules, ad carousel
  api/
    users/         # GET/POST users, GET/PATCH /[id]
    transfers/     # GET/POST executed & blocked transfers
    suspicious/    # GET (list/check), POST, DELETE flagged accounts
    transcripts/   # POST — append a call transcript to transcript.txt
    call/          # POST — ElevenLabs + Twilio outbound call (dynamic variables)
    transcript/    # GET — live call transcript from ElevenLabs
    db/init/       # POST — create/seed the hybrid store (?reset=true)
lib/
  store.ts         # Hybrid orchestrator (JSON-first reads, best-effort DB mirror)
  jsonStore.ts     # Local JSON persistence with a write-lock
  databricks.ts    # Databricks SQL client + high-level data access
  types.ts         # Domain types + seed data
docs/              # Agent prompt + demo scripts
```

## API routes

| Route | Method | Description |
|---|---|---|
| `/api/db/init` | POST | Create + seed the store (`?reset=true` wipes & reseeds) |
| `/api/users` · `/api/users/[id]` | GET/POST · GET/PATCH | Read/update balance, parental control, transactions |
| `/api/transfers` | GET/POST | List / record executed & blocked transfers |
| `/api/suspicious` | GET/POST/DELETE | List, check `?account=`, flag, or remove |
| `/api/call` | POST | Trigger the ElevenLabs + Twilio verification call with `dynamic_variables` |
| `/api/transcript` | GET | Live transcript for a `conversation_id` |
| `/api/transcripts` | POST | Append a completed call transcript to `transcript.txt` |

## Built with OpenAI Codex

This project was built end-to-end at an OpenAI hackathon with **Codex** (GPT-5.6) as an
agentic pair programmer. Codex didn't just autocomplete — it read the codebase, ran
commands, verified its own work with screenshots, and iterated. Where it accelerated the
build the most:

- **UI from a screenshot to pixels.** Starting from a Maybank2u reference image, Codex
  built the `/bank`, `/transfer`, and `/settings` pages and iterated on layout, spacing, and
  a fluid 16:9 no-scroll system with `clamp()`-based responsive typography — capturing
  headless-browser screenshots each pass to self-correct instead of guessing.
- **Whole features, wired.** It scaffolded the pages, API routes, and a hybrid
  JSON + Databricks data layer, then connected the frontend to it (balance, live transaction
  history, persisted parental control) in a single pass.
- **The scam-guard flow, end to end.** Codex wired the pre-check → analyzing modal →
  ElevenLabs/Twilio call → transcript-based **APPROVED/BLOCKED** verdict → block/approve
  outcome, including passing the transaction context to the agent as dynamic variables and
  saving transcripts to disk.
- **Real debugging, not just generation.** When Databricks cold-starts made every request
  take 20–60s, Codex diagnosed it from the dev-server logs and refactored the store so the
  cloud mirror is fire-and-forget and off by default — dropping response times to
  single-digit milliseconds.
- **Docs, prompts, and glue.** It wrote the ElevenLabs system prompt, the demo call scripts,
  the phone-number normalization, the Space-to-autofill demo shortcut, and this README.

The result: a working, demo-ready product — front end, data pipeline, and a live AI voice
verification loop — built in hours instead of days.

## License
Private Project
