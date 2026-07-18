# Scam Intelligence Lab — isolated hackathon simulation

The Scam Intelligence Lab is a standalone, deterministic simulation of how a bank could
turn incoming scam reports into explainable intelligence. It lives at `/intelligence` and
is intentionally isolated from the banking demo.

## Safety boundary

- The lab reads and writes only `data/intelligence.json`.
- It does not import or mutate the banking store, `data/db.json`, user balances, transfers,
  parental controls, the suspicious-account list, or verification calls.
- Every generated detection rule remains `shadow-only`; the number of deployed rules is
  always zero.
- All reports are synthetic and no external AI or network service is called.

This boundary keeps the `/bank` → `/settings` → `/transfer` demo unchanged while still
showing the intelligence concept during a hackathon presentation.

## Simulated agent pipeline

Each report passes through seven explainable agents:

1. **Transaction Agent** — reviews the mock amount, recipient novelty, timing, and behavioural
   context attached to a synthetic case.
2. **Conversation Agent** — detects urgency, secrecy, fear, authority pressure, and
   too-good-to-be-true language in the case narrative.
3. **Entity Agent** — normalizes and links accounts, phone numbers, phrases, and URLs.
4. **Graph Agent** — builds evidence-backed nodes and relationships between cases.
5. **Scam Pattern Agent** — detects repeated scam patterns, updates confidence, and proposes any
   shadow-only candidate rule.
6. **Education Agent** — turns technical evidence into calm, plain-language guidance.
7. **Orchestrator** — combines the mock findings into a non-enforced shadow recommendation.

The agents are ordinary deterministic TypeScript functions. Calling them "agents" describes
their separate responsibilities and traceable hand-offs; it does not imply an LLM is secretly
training itself.

Graph evidence uses careful statuses—observed, potentially suspicious, user-reported,
corroborated, bank-verified, or cleared. The simulation may derive corroboration from repeated
synthetic cases, but it never assigns bank-verified or cleared without a future human-review
workflow.

## What “learning” means here

The lab learns incrementally from evidence:

- a first report creates observations;
- later reports reuse entities or language and strengthen graph links;
- repeated signals become an emerging learned pattern;
- strong patterns produce a candidate rule with supporting evidence and confidence.

No model weights are changed. In a production design, reviewed shadow rules could later be
promoted through an approval workflow, or the same graph context could be supplied to a real
model. Neither action happens in this simulation.

## Demo

1. Run `npm run dev`.
2. Open [http://localhost:3000/intelligence](http://localhost:3000/intelligence).
3. Select **Analyze next signal** to watch one report move through all seven agents.
4. Repeat to see shared accounts, phone numbers, and phrases form a graph cluster.
5. Select **Run full simulation** to process the remaining queue.
6. Inspect the learned patterns, candidate shadow rules, risk explanations, and agent trace.
7. Select **Reset** to restore the synthetic queue.

The technical knowledge graph is paired with a simplified **Scam Link Map** that tells the
same evidence story as a short chain of phone, website or phrase, recipient account, and
previous reports. Its action buttons are presentation-only previews: they do not send a
report, contact anyone, or act on a transfer.

The banking demo can be used before, during, or after this sequence; lab actions do not change
its state.

## API

- `GET /api/intelligence` returns the complete lab snapshot.
- `POST /api/intelligence` with `{ "action": "next" }` processes one queued report.
- `POST /api/intelligence` with `{ "action": "run_all" }` processes the remaining queue.
- `POST /api/intelligence` with `{ "action": "reset" }` resets only the lab.
