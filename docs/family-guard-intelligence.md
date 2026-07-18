# Family Guard intelligence graph

The Family Guard graph is a privacy-safe advisory layer for protected transfers. It is not the `/intelligence` simulator and does not use `data/intelligence.json`. Its graph state is stored separately in `data/family-guard-intelligence.json`.

The graph can answer a narrow question: “Do the supplied account, phone, or website details connect to governed prior cases?” Its answer can contribute an explainable `graph` risk signal. It cannot decide whether a person is a scammer, approve or reject a request, change a balance, execute a transfer, or release money.

## Safety and privacy boundary

- Account numbers are normalized and SHA-256 fingerprinted before storage in the graph; the display value keeps only the last four digits, such as `•••• 3321`.
- Phone numbers are normalized and SHA-256 fingerprinted; the display value is masked, such as `+60 ••• ••• 4421`.
- Websites are reduced to a normalized hostname. Query strings, page content, credentials, and conversation transcripts are not graph entities.
- The seed graph contains synthetic prior reports only.
- A Family Guard case can become learning evidence only after a terminal outcome has been durably recorded and the account holder has enabled `intelligenceFeedbackConsent`.
- The feedback record contains minimized evidence: the request and transfer identifiers, terminal outcome, evidence status, signal codes, and entity fingerprints—not full transaction history.
- Lookup results are advisory. A graph match is evidence, not proof of fraud.
- No match is not proof of safety. New scams, new infrastructure, incomplete reports, and expired evidence may have no graph connection.
- Automatic code never assigns `bank_verified` or `cleared`; those statuses require a separate authenticated human or bank workflow.
- AI and graph components never release money. Only the transaction-bound Family Guard state machine can progress a transfer after its required verification and human decision conditions are satisfied.

## Four logical collections

The hackathon uses JSON persistence, but the design maps cleanly to four logical tables or collections:

| Collection | Purpose | Important fields and controls |
|---|---|---|
| `cases` | One synthetic prior report or one consented terminal Family Guard outcome | Source, scam type, terminal outcome, warning signs, observed time, and governed evidence status |
| `entities` / `nodes` | Privacy-safe account, phone, website, case, and pattern vertices | Fingerprint or normalized host, masked display value, supporting case IDs, confidence, reason, review and expiry dates |
| `relationships` / `edges` | Explainable links such as case-to-account, contact-to-case, website-to-account, and case-to-pattern | Source and target IDs, relationship type, human-readable explanation, evidence status, and supporting cases |
| `consented_outcomes` | Durable outbox of eligible terminal Family Guard feedback awaiting idempotent graph ingestion | Request ID, transfer ID, terminal outcome, signal codes, entity fingerprints, consent marker, and processing status |

The physical live-graph JSON contains `cases`, `nodes`, and `edges`. The fourth collection is the Family Guard `intelligenceFeedback` outbox, kept with the protected workflow so a failed graph sync can be retried without losing the terminal outcome.

## Governed statuses

The graph uses the same six-status vocabulary as the lab:

| Status | Meaning |
|---|---|
| `observed` | An association was seen, but there is not enough independent evidence to strengthen it. |
| `potentially_suspicious` | Deterministic warning signs justify caution, not a fraud verdict. |
| `user_reported` | A user or guardian explicitly reported the consented case as suspicious. |
| `corroborated` | The same fingerprinted entity recurs across multiple independent governed cases. |
| `bank_verified` | Reserved for a separate authenticated bank-review decision. Never assigned automatically. |
| `cleared` | Reserved for a separate authenticated review that found the evidence resolved. Never assigned automatically. |

An approval after verification is an observed terminal outcome; it does not automatically clear an account. A rejection or report can add cautionary evidence; it does not automatically make the recipient bank-verified fraud. Review and expiry dates keep stale evidence visible to governance rather than silently treating it as permanent truth.

## Advisory lookup

`GET /api/intelligence/lookup` accepts at least one of `account`, `phone`, or `website`. The server normalizes and fingerprints the submitted value, compares it with the live graph, and returns only the relevant governed nodes and edges.

A match response includes:

- evidence status and confidence;
- previous report count;
- a plain-language explanation;
- up to five warning signs;
- masked nodes and governed relationships; and
- limitations explaining that the connection is not a fraud verdict.

For no match, the response deliberately says that no connection was found in the small demo graph and that independent verification is still required. The UI must not translate `matched: false` into “safe.”

If a lookup is supplied to Family Guard policy, it is added as an advisory `source: "graph"` signal alongside transaction context, limits, user answers, and governed suspicious-list evidence. The approval state machine—not the graph—calculates requirements and owns every state transition.

## Consent-gated learning loop

The safe learning loop runs after, not during, the money decision:

1. Family Guard evaluates a protected-transfer snapshot and may request an advisory graph lookup using the recipient account and optional contact details.
2. Other policy inputs remain authoritative for the workflow; a graph hit or miss cannot release funds.
3. Verification, guardian review, rejection, report, expiry, block, or bank-review handling completes through the transaction-bound state machine.
4. The terminal outcome is persisted before any learning notification is attempted.
5. If `intelligenceFeedbackConsent` is off, no intelligence feedback is queued.
6. If consent is on, a minimized `consented_outcomes` record is queued with fingerprints and signal codes.
7. A reviewed, idempotent bridge can ingest that outcome into `data/family-guard-intelligence.json`; the request ID prevents duplicate cases.
8. Nodes and relationships are rebuilt from governed cases. Repeated independent evidence may raise an entity to `corroborated`, but never automatically to `bank_verified` or `cleared`.
9. A future lookup can use the new association as one advisory signal, subject to review and expiry.

The durable feedback collection is the source of truth for retries. The bridge can remain a no-op until explicitly enabled and reviewed; that must not weaken the Family Guard approval workflow.

## Quick Cash hackathon scenario

The live graph seeds two independent synthetic investment-scam cases that share these demo details:

| Detail | Demo input | Graph display |
|---|---|---|
| Recipient | Quick Cash Enterprise | Case title or recipient context only |
| Account | `8842 1190 3321` | `•••• 3321` |
| Phone | `+60 11-9088 4421` | `+60 ••• ••• 4421` |
| Website | `quickcash-growth.example` | `quickcash-growth.example` |

Suggested demo:

1. Start a protected transfer of RM10,000 to Quick Cash Enterprise using account `8842 1190 3321`.
2. In the context questions, select an investment or social contact and indicate urgency, secrecy, and a promised return.
3. The graph lookup finds two prior synthetic cases sharing the fingerprinted account, phone, and website. It returns a `corroborated` advisory connection, masked entities, previous-report count, and warning signs.
4. Explain that the match strengthens the risk explanation but is not proof of fraud and does not itself block or release the transfer.
5. Continue through Family Guard verification and guardian review. The money remains unsent while required decisions are pending.
6. Choose a terminal rejection or report for the clearest learning demo. If intelligence-feedback consent is enabled, a minimized outcome can enter the durable outbox for later idempotent ingestion.
7. Contrast with an unrelated account: the graph returns no match, but the UI still warns that absence from a small demo graph is not a safety guarantee.

At every step, the presenter should use the same line: **the graph explains risk, the Family Guard state machine controls the transfer, and AI never releases money.**
