# Scam intelligence architecture

This repository has two deliberately separate intelligence surfaces. They share evidence-governance language, but they do not share state and must not be presented as one self-learning system.

| Surface | Purpose | Persistence | Connection to money movement |
|---|---|---|---|
| Scam Intelligence Lab at `/intelligence` | Deterministic hackathon simulation with a visible seven-agent pipeline | `data/intelligence.json` | None. `mainFlowConnected` is always `false`; output is shadow-only and unenforced. |
| Family Guard advisory graph | Privacy-safe lookup of prior synthetic cases and, when explicitly consented, terminal Family Guard outcomes | `data/family-guard-intelligence.json` | Advisory evidence only. The Family Guard state machine remains responsible for every hold, review, rejection, or release. |

The standalone lab is implemented today as an isolated demo. The Family Guard graph is a separate live-design surface with a read-only lookup API and a reviewed feedback bridge. Running the lab does not train or update the Family Guard graph, and a Family Guard result does not enter the lab store.

## Scam Intelligence Lab boundary

- The lab reads and writes only `data/intelligence.json`.
- It does not read or mutate `data/db.json`, balances, transfers, Family Guard requests, parental controls, the suspicious-account list, or verification calls.
- Its API makes no LLM, provider, or other network call.
- All reports, conversations, transaction contexts, accounts, phones, phrases, and websites are synthetic.
- Every candidate rule has `deploymentStatus: "shadow-only"`; `deployedRules` remains zero.
- Its Orchestrator returns education and a recommendation with `shadowOnly: true`, `enforced: false`, and `mainFlowConnected: false`.
- Neither an agent nor the graph can approve, block, execute, or release a transfer.

This boundary keeps the bank and Family Guard flows usable while the hackathon audience can inspect how evidence might be processed.

## Seven deterministic lab agents

Each queued synthetic case passes through seven ordered, explainable TypeScript stages:

1. **Transaction Agent** — evaluates mock amount, velocity, usual-range, and new-beneficiary context.
2. **Conversation Agent** — identifies urgency, secrecy, authority pressure, isolation, and pay-to-release language in a supplied synthetic excerpt.
3. **Entity Agent** — normalizes reported accounts, phone numbers, phrases, and URLs into evidence entities.
4. **Graph Agent** — links independent cases through repeated entities and applies evidence-governance metadata.
5. **Scam Pattern Agent** — matches explainable scam types and proposes non-deployed shadow candidates.
6. **Education Agent** — translates warning signs into calm, plain-language safety guidance.
7. **Orchestrator** — combines the six preceding outputs into an advisory shadow score and recommendation.

Every run records the input summary, fixed decisions, supporting evidence, output summary, and timestamps for all seven stages. “Agent” means a bounded responsibility with a traceable hand-off. There is no hidden LLM and no autonomous model-weight training.

## Evidence governance

Every governed node, relationship, pattern, and candidate includes a status, confidence, evidence sources, first and last observation times, a reason, a review date, and an expiry date.

The status vocabulary is:

- `observed`
- `potentially_suspicious`
- `user_reported`
- `corroborated`
- `bank_verified`
- `cleared`

Automatic code uses only the first four. A synthetic report begins as `user_reported`; an entity found in one processed case remains `observed`; the same normalized entity found across independent synthetic cases can become `corroborated`; a deterministic scam-type inference is `potentially_suspicious`.

Automatic code never assigns `bank_verified` or `cleared`. Those statuses are reserved for a separate, authenticated human or bank review workflow that is not implemented by the simulator. Corroboration means that evidence recurs—it is not a fraud verdict.

## What “learning” means in the lab

The lab incrementally recomputes an evidence graph:

1. The first processed report creates user-reported case evidence and observed entities.
2. Later independent reports may repeat an account, phone, phrase, or URL.
3. Repeated entities become corroborated links with their supporting synthetic cases.
4. A repeatable scam sequence can become an observed or emerging pattern.
5. A sufficiently supported pattern may produce a shadow-only candidate rule.
6. The Orchestrator explains what the candidate would have flagged, but deploys nothing.

No model weights change. Resetting the lab restores the four queued synthetic reports and clears its graph, scores, patterns, candidate rules, and traces.

## Lab demo and API

1. Run `npm run dev` and open `http://localhost:3000/intelligence`.
2. Select **Analyze next signal** to process one report through all seven agents.
3. Repeat to see shared accounts, phones, and phrases form a governed cluster.
4. Select **Run full simulation** to process the remaining queue.
5. Inspect the evidence graph, learned patterns, shadow candidates, education, recommendation, and seven-agent trace.
6. Select **Reset** to restore the initial synthetic queue.

The API mirrors those controls:

- `GET /api/intelligence` returns the isolated lab snapshot.
- `POST /api/intelligence` with `{ "action": "next" }` processes one case.
- `POST /api/intelligence` with `{ "action": "run_all" }` processes the remaining queue.
- `POST /api/intelligence` with `{ "action": "reset" }` resets only the lab.

For the separate Family Guard graph, privacy model, learning loop, and Quick Cash demo, see [Family Guard intelligence](./family-guard-intelligence.md).
