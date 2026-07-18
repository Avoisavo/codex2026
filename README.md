# Scam Guard

> **The agents investigate. The graph remembers. The user learns.**

Scam Guard is a hackathon prototype for safer bank transfers. It creates a calm pause when a payment looks unusual, explains the warning signs, offers an account-holder verification conversation, and holds protected transfers for a separate trusted-contact decision.

The visible bank is **NusaSafe Bank**, an explicitly fictional brand. This repository is a product simulation—not a bank, fraud-verification service, or production authentication system.

## Product promise

**Scam Guard is a pause button for the moment when emotion takes over.**

The prototype combines:

- transaction and configurable-limit signals;
- four contextual questions about urgency, secrecy, promised rewards, and device access;
- a simulated specialist-agent trace with one orchestrated recommendation;
- a privacy-safe Scam Link Map backed by a governed knowledge graph;
- an optional, user-requested voice verification call with a temporary safety phrase;
- transaction-bound trusted approval that is separate from every banking OTP, TAC, PIN, or Secure2u approval;
- short, contextual scam education and safe next steps.

AI and graph findings are advisory. They never release money and never make an irreversible fraud verdict.

## Implemented journeys

| Route | What is implemented |
|---|---|
| `/bank` | Responsive fictional banking dashboard and transaction history |
| `/transfer` | Normal transfers plus the fully wired protected-transfer journey |
| `/settings` | Explicit account-holder consent, limits, privacy choices, and separate trusted contacts |
| `/family-guard` | Contact-scoped pending/history review with approve, reject, report, call, or bank-review actions |
| `/scam-safety` | Six short lessons, quick questions, Semak Mule, and urgent NSRC guidance |
| `/intelligence` | An isolated seven-agent shadow lab and synthetic knowledge-graph pipeline |
| `/test` | Consent-gated standalone voice-call test; it cannot affect a transfer |

## Two-layer protection flow

```text
Account holder enters transfer
        ↓
Server freezes the exact recipient, amount and reference
        ↓
Transaction + context + graph signals are explained
        ↓
Account holder requests a safe call or uses the deterministic demo assessment
        ↓
AI records a recommendation only—no balance change
        ↓
Trusted contact reviews the exact protected request
        ↓
Approve low/uncertain risk, reject, report, or request bank review
        ↓
Only a valid transaction-bound low/uncertain approval can release funds
```

Important state-machine rules:

- Family Guard must be enabled by the account holder with current consent.
- A normal transfer still uses the atomic server transfer seam; the browser cannot patch balances.
- Creating a protected request or recording AI verification never debits the account.
- The trusted-contact code is salted and hashed at rest and bound to the frozen request.
- Changing the recipient or amount requires a new request and code.
- High-risk approval attempts go to `bank_review`; they do not release money.
- A `bank_verified` suspicious-account match is a hard block.
- Requests expire safely if nobody decides in time.
- Replayed or stale decisions fail through optimistic version checks.
- A trusted contact sees only assigned protected transfers, not full account history.

## Simulated agent swarm

The user interacts with one calm Scam Guard assistant. Internally, the hackathon simulation presents seven roles:

1. **Transaction Agent** — new recipient, amount, frequency, limits, and behavioural differences.
2. **Conversation Agent** — urgency, secrecy, fear, rewards, authority, and remote-access requests.
3. **Entity Agent** — account, phone, and website clues with masked presentation.
4. **Graph Agent** — repeated connections to earlier governed cases.
5. **Scam Pattern Agent** — investment, impersonation, job, loan, and related patterns.
6. **Education Agent** — converts evidence into simple explanations and safe actions.
7. **Orchestrator** — recommends low risk, uncertain, or high risk.

These roles are deterministic tools and prompts for the demo, not seven separately trained models. The dedicated `/intelligence` lab remains isolated and unenforced.

## Knowledge graph and learning loop

The live Family Guard graph stores masked display values and SHA-256 fingerprints rather than raw account/phone identifiers. Its logical data model is:

```text
entities · relationships · cases · signals
```

The seeded Quick Cash scenario connects a WhatsApp number, an example investment website, recipient account `•••• 3321`, a scam pattern, and two synthetic prior reports.

Evidence is governed as `observed`, `potentially_suspicious`, `user_reported`, `corroborated`, `bank_verified`, or `cleared`. Automated code cannot assign `bank_verified` or `cleared`. A missing graph match is never presented as proof that a recipient is safe.

When the account holder has opted into intelligence feedback, a terminal outcome is written to a durable outbox and then idempotently added to the live graph. Only consented outcomes participate; cancelling or merely pausing a transfer is not treated as confirmed fraud.

See [Family Guard intelligence](docs/family-guard-intelligence.md) and the [isolated intelligence lab](docs/intelligence-lab.md).

## Privacy and safe-call design

- A call starts only after an explicit request and voice-consent setting.
- It calls the configured **account-holder** number, not the trusted contact.
- The in-app safety phrase must be repeated by the caller.
- The call begins with a warning that it will never request a password, PIN, OTP, TAC, or Secure2u approval.
- Raw account numbers are discarded at the call boundary; the provider receives only a masked suffix and allowlisted context.
- Provider transcripts are redacted before reaching the UI.
- Local transcript storage can be off, summary-only, or redacted with 1–30 day retention.
- The legacy permanent `transcript.txt` store has been removed.

The deterministic assessment keeps the hackathon demo usable without voice credentials and is clearly labelled as a simulation.

## Quick demo

1. Run the app and open `/settings`.
2. Accept the account-holder consent notice, add the account-holder phone, configure the three limits, and enable Family Guard.
3. Add an accepted trusted contact such as **Sarah Tan**. For this local demo, accepted means the invitation step has been simulated.
4. On `/transfer`, press **Space** or choose **Fill demo transfer**.
5. Review the RM10,000 Quick Cash payment. The contextual answers are prefilled with WhatsApp investment-group pressure, secrecy, guaranteed returns, and the example graph entities.
6. Review the agent trace, warning signs, and Scam Link Map.
7. Use the deterministic demo assessment, or request a configured verification call.
8. Open `/family-guard`. The transaction-bound demo code is `4821` unless `FAMILY_GUARD_DEMO_APPROVAL_CODE` overrides it.
9. Because the scenario is high risk, the dashboard offers bank review, reject, and report—not one-tap release.

For a release-path contrast, use an unflagged recipient, a small amount, calm context, a `low_risk` demo recommendation, and trusted approval.

See the detailed [demo script](docs/demo-script-block.md) and [voice-agent prompt](docs/scam-guard-agent.md).

## Scam education and Malaysian help

The Scam Safety page covers WhatsApp/SMS, calls, social media, marketplaces, job offers, and fake apps/sites. It links to the official [PDRM Semak Mule portal](https://semakmule.rmp.gov.my/) and [NSRC information](https://nfcc.jpm.gov.my/index.php/en/about-nsrc).

If money has already been sent, the UI tells the user to contact their bank immediately and call Malaysia’s NSRC at **997** during its published operating hours.

## Tech stack

- Next.js 16.2 App Router, React 19, TypeScript, Tailwind CSS v4
- Local atomic JSON source of truth with optional Databricks mirroring
- ElevenLabs Conversational AI outbound-call endpoint with a connected Twilio number
- Deterministic multi-agent and graph simulation for explainability

The voice provider can use its configured conversational model; this repository does not hard-code or claim a specific LLM version.

## Local setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000/bank](http://localhost:3000/bank).

Optional `.env.local` values:

```env
# Voice verification (optional; deterministic demo works without these)
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_PHONE_NUMBER_ID=your_connected_phone_number_id

# Optional Databricks mirror
DATABRICKS_SERVER_HOSTNAME=your-workspace.cloud.databricks.com
DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/xxxxxxxx
DATABRICKS_TOKEN=your_pat
DATABRICKS_CATALOG=workspace
DATABRICKS_SCHEMA=banking_app
DATABRICKS_MIRROR=off

# Optional test/demo overrides
FAMILY_GUARD_DEMO_APPROVAL_CODE=4821
SCAM_GUARD_DB_FILE=/absolute/path/to/isolated-db.json
SCAM_GUARD_LIVE_GRAPH_FILE=/absolute/path/to/isolated-graph.json
SCAM_GUARD_TRANSCRIPT_FILE=/absolute/path/to/isolated-transcripts.json
```

For ElevenLabs, publish an agent using [the safe prompt](docs/scam-guard-agent.md), connect a voice-capable Twilio number, then copy the IDs into the environment variables. Trial calling restrictions are controlled by the provider.

## Data and persistence

`data/db.json` is migrated non-destructively to schema v2 and contains:

- users and transaction history;
- transfers and suspicious-account evidence;
- Family Guard settings and contacts;
- approval requests and verification sessions;
- audit events and consented intelligence-feedback outbox entries.

`data/intelligence.json` belongs only to the isolated shadow lab. `data/family-guard-intelligence.json` is the separate live advisory graph. Redacted retained transcripts use `data/transcripts.json` only when that privacy option is enabled.

Writes use an in-process lock plus temporary-file rename. Corrupt JSON is not silently overwritten. Databricks is a best-effort mirror and never becomes the authority for release decisions.

## Main APIs

| Route | Methods | Purpose |
|---|---|---|
| `/api/users/[id]` | GET | Read the demo account; direct balance PATCH is intentionally unavailable |
| `/api/transfers` | GET | Read transfer history; direct transfer POST is intentionally unavailable |
| `/api/family-guard/settings/[userId]` | GET, PATCH | Account-holder consent, limits, phone, and privacy |
| `/api/family-guard/contacts` | GET, POST | List/add trusted contacts |
| `/api/family-guard/contacts/[id]` | PATCH, DELETE | Update or revoke a trusted contact |
| `/api/family-guard/requests` | GET, POST | Scoped requests and atomic transfer entry point |
| `/api/family-guard/requests/[id]` | GET, DELETE | Refresh or safely cancel a pending request |
| `/api/family-guard/requests/[id]/verification` | POST | Record advisory AI result; never releases money |
| `/api/family-guard/requests/[id]/decision` | POST | Transaction-bound trusted decision |
| `/api/intelligence/lookup` | GET | Advisory masked graph lookup |
| `/api/intelligence` | GET, POST | Run/reset the isolated shadow lab |
| `/api/call` | POST | Consent-gated, allowlisted outbound verification call |
| `/api/transcript` | GET | Fetch and redact a provider transcript |
| `/api/transcripts` | POST, DELETE | Retain or delete time-limited redacted transcript data |

All sensitive dynamic routes return `Cache-Control: no-store`.

## Validation

```bash
npm run lint
npm run build
```

The integration suite used isolated file overrides to verify:

- normal transfer completion when Family Guard is off;
- no debit at protected-request creation or AI verification;
- invalid guardian code rejection;
- high-risk approval routing to bank review without debit;
- low-risk trusted approval debiting exactly once;
- stale decision replay rejection;
- consented feedback processing and idempotent graph learning;
- legacy direct user/transfer write endpoints returning `405`.

## Production gaps

This is intentionally a hackathon simulation. A real banking deployment still requires authenticated account-holder/guardian identities, device binding and biometrics, signed provider webhooks, rate limiting, notification delivery, bank-operated evidence review, legal/privacy review, audit retention policy, recovery workflows, and institution-controlled integration with payment rails.

## License

Private project.
