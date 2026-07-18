import "server-only";

import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import { maskAccountNumber, maskPhoneNumber } from "@/lib/voiceSafety";
import type { IntelligenceEvidenceStatus } from "./types";
import type {
  FamilyGuardGraphOutcome,
  LiveGovernance,
  LiveGraphEdge,
  LiveGraphNode,
  LiveGraphState,
  LiveScamCase,
  ScamLinkLookup,
} from "./liveTypes";

const DEFAULT_FILE = path.join(
  process.cwd(),
  "data",
  "family-guard-intelligence.json",
);
const FILE = process.env.SCAM_GUARD_LIVE_GRAPH_FILE || DEFAULT_FILE;
const QUICK_CASH_ACCOUNT = "8842 1190 3321";
const QUICK_CASH_PHONE = "+60 11-9088 4421";
const QUICK_CASH_WEBSITE = "quickcash-growth.example";

let accessChain: Promise<unknown> = Promise.resolve();
let writeSequence = 0;

function withLock<T>(operation: () => Promise<T>): Promise<T> {
  const pending = accessChain.then(operation, operation);
  accessChain = pending.then(
    () => undefined,
    () => undefined,
  );
  return pending;
}

function normalizeEntity(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function fingerprint(kind: string, value: string): string {
  return createHash("sha256")
    .update(`${kind}:${normalizeEntity(value)}`)
    .digest("hex");
}

function accountFingerprint(value: string): string {
  return createHash("sha256")
    .update(`account:${value.replace(/\D/g, "")}`)
    .digest("hex");
}

function phoneFingerprint(value: string): string {
  return createHash("sha256")
    .update(`phone:${value.replace(/\D/g, "")}`)
    .digest("hex");
}

function websiteHost(value: string): string | null {
  const candidate = value.trim();
  if (!candidate) return null;
  try {
    return new URL(candidate.includes("://") ? candidate : `https://${candidate}`)
      .hostname.toLowerCase();
  } catch {
    return null;
  }
}

function dateAfter(value: string, days: number): string {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function governance(input: {
  status: IntelligenceEvidenceStatus;
  confidence: number;
  reason: string;
  cases: LiveScamCase[];
}): LiveGovernance {
  const observed = input.cases.map((item) => item.observedAt).sort();
  const first = observed[0] ?? new Date().toISOString();
  const last = observed.at(-1) ?? first;
  return {
    status: input.status,
    confidence: Number(Math.min(0.99, Math.max(0, input.confidence)).toFixed(2)),
    reason: input.reason,
    evidenceCaseIds: input.cases.map((item) => item.id).sort(),
    firstObservedAt: first,
    lastObservedAt: last,
    reviewDate: dateAfter(last, 14),
    expiryDate: dateAfter(last, 180),
  };
}

function seedCase(input: {
  id: string;
  title: string;
  observedAt: string;
  warningSigns: string[];
}): LiveScamCase {
  const base = {
    id: input.id,
    source: "synthetic_prior_report" as const,
    title: input.title,
    scamType: "investment scam",
    observedAt: input.observedAt,
    accountFingerprint: accountFingerprint(QUICK_CASH_ACCOUNT),
    accountMasked: maskAccountNumber(QUICK_CASH_ACCOUNT),
    phoneFingerprint: phoneFingerprint(QUICK_CASH_PHONE),
    phoneMasked: maskPhoneNumber(QUICK_CASH_PHONE),
    websiteHost: QUICK_CASH_WEBSITE,
    warningSigns: input.warningSigns,
    outcome: "seed_report" as const,
  };
  return {
    ...base,
    governance: {
      status: "user_reported",
      confidence: 0.7,
      reason:
        "A synthetic prior case reported the association. It is not a bank fraud verdict.",
      evidenceCaseIds: [input.id],
      firstObservedAt: input.observedAt,
      lastObservedAt: input.observedAt,
      reviewDate: dateAfter(input.observedAt, 14),
      expiryDate: dateAfter(input.observedAt, 180),
    },
  };
}

function createSeedCases(): LiveScamCase[] {
  return [
    seedCase({
      id: "live_case_investment_101",
      title: "WhatsApp investment group requested an urgent deposit",
      observedAt: "2026-07-14T04:20:00.000Z",
      warningSigns: [
        "Guaranteed-profit promise",
        "Urgency to transfer on the same day",
        "Payment requested outside a regulated platform",
      ],
    }),
    seedCase({
      id: "live_case_investment_102",
      title: "Fast-return website redirected payment to a personal account",
      observedAt: "2026-07-16T08:40:00.000Z",
      warningSigns: [
        "Unusually fast return promised",
        "Recipient account reused across an unrelated approach",
        "Contact discouraged independent verification",
      ],
    }),
  ];
}

function entityStatus(cases: LiveScamCase[]): IntelligenceEvidenceStatus {
  const suspiciousCases = cases.filter((item) =>
    ["seed_report", "reported_suspicious", "rejected", "bank_review"].includes(
      item.outcome,
    ),
  );
  if (suspiciousCases.length >= 2) return "corroborated";
  if (suspiciousCases.some((item) => item.outcome === "reported_suspicious")) {
    return "user_reported";
  }
  if (suspiciousCases.length === 1) return "potentially_suspicious";
  return "observed";
}

function confidenceFor(status: IntelligenceEvidenceStatus, count: number): number {
  if (status === "corroborated") return Math.min(0.94, 0.78 + count * 0.04);
  if (status === "user_reported") return 0.7;
  if (status === "potentially_suspicious") return 0.64;
  return 0.52;
}

function nodeId(kind: string, value: string): string {
  return `live_${kind}_${fingerprint(kind, value).slice(0, 16)}`;
}

function edgeId(source: string, relationship: string, target: string): string {
  return `live_edge_${createHash("sha256")
    .update(`${source}|${relationship}|${target}`)
    .digest("hex")
    .slice(0, 16)}`;
}

function buildGraph(cases: LiveScamCase[]): Pick<LiveGraphState, "nodes" | "edges"> {
  const nodes = new Map<string, LiveGraphNode>();
  const edges = new Map<string, LiveGraphEdge>();

  const groups = new Map<
    string,
    { kind: LiveGraphNode["kind"]; label: string; masked: string; cases: LiveScamCase[] }
  >();
  const addGroup = (
    key: string,
    kind: LiveGraphNode["kind"],
    label: string,
    masked: string,
    item: LiveScamCase,
  ) => {
    const current = groups.get(key) ?? { kind, label, masked, cases: [] };
    current.cases.push(item);
    groups.set(key, current);
  };

  for (const item of cases) {
    addGroup(
      `account:${item.accountFingerprint}`,
      "account",
      "Recipient account",
      item.accountMasked,
      item,
    );
    if (item.phoneFingerprint && item.phoneMasked) {
      addGroup(
        `phone:${item.phoneFingerprint}`,
        "phone",
        "Contact number",
        item.phoneMasked,
        item,
      );
    }
    if (item.websiteHost) {
      addGroup(
        `website:${item.websiteHost}`,
        "website",
        "Promoted website",
        item.websiteHost,
        item,
      );
    }
    addGroup(
      `pattern:${item.scamType}`,
      "pattern",
      "Scam pattern",
      item.scamType,
      item,
    );

    const caseNodeId = `live_case_${item.id}`;
    nodes.set(caseNodeId, {
      id: caseNodeId,
      kind: "case",
      label: item.title,
      maskedValue: item.id,
      caseIds: [item.id],
      governance: item.governance,
    });
  }

  for (const [key, group] of groups) {
    const status = entityStatus(group.cases);
    const id = nodeId(group.kind, key);
    nodes.set(id, {
      id,
      kind: group.kind,
      label: group.label,
      maskedValue: group.masked,
      caseIds: group.cases.map((item) => item.id).sort(),
      governance: governance({
        status,
        confidence: confidenceFor(status, group.cases.length),
        cases: group.cases,
        reason:
          status === "corroborated"
            ? `The masked entity recurs across ${group.cases.length} independent cases. This is corroboration, not bank verification.`
            : "The entity is retained with its evidence status and review date; it is not a fraud verdict.",
      }),
    });
  }

  for (const item of cases) {
    const caseNode = `live_case_${item.id}`;
    const accountNode = nodeId("account", `account:${item.accountFingerprint}`);
    const patternNode = nodeId("pattern", `pattern:${item.scamType}`);
    const governedCases = [item];
    const relationGovernance = governance({
      status: item.governance.status,
      confidence: item.governance.confidence,
      cases: governedCases,
      reason: "The relationship was observed in the cited case and remains reviewable.",
    });
    const reportEdge = edgeId(caseNode, "REPORTED_IN_CASE", accountNode);
    edges.set(reportEdge, {
      id: reportEdge,
      source: caseNode,
      target: accountNode,
      relationship: "REPORTED_IN_CASE",
      explanation: `${item.title} referenced ${item.accountMasked}.`,
      governance: relationGovernance,
    });
    const patternEdge = edgeId(caseNode, "ASSOCIATED_WITH_SCAM_TYPE", patternNode);
    edges.set(patternEdge, {
      id: patternEdge,
      source: caseNode,
      target: patternNode,
      relationship: "ASSOCIATED_WITH_SCAM_TYPE",
      explanation: `${item.title} contains ${item.scamType} indicators.`,
      governance: relationGovernance,
    });

    if (item.phoneFingerprint) {
      const phoneNode = nodeId("phone", `phone:${item.phoneFingerprint}`);
      const contactEdge = edgeId(caseNode, "CONTACTED_BY", phoneNode);
      edges.set(contactEdge, {
        id: contactEdge,
        source: caseNode,
        target: phoneNode,
        relationship: "CONTACTED_BY",
        explanation: `${item.title} was associated with ${item.phoneMasked}.`,
        governance: relationGovernance,
      });
      if (item.websiteHost) {
        const webNode = nodeId("website", `website:${item.websiteHost}`);
        const promotedEdge = edgeId(phoneNode, "PROMOTED_WEBSITE", webNode);
        edges.set(promotedEdge, {
          id: promotedEdge,
          source: phoneNode,
          target: webNode,
          relationship: "PROMOTED_WEBSITE",
          explanation: `${item.phoneMasked} was reported alongside ${item.websiteHost}.`,
          governance: relationGovernance,
        });
        const paymentEdge = edgeId(webNode, "LINKED_TO_ACCOUNT", accountNode);
        edges.set(paymentEdge, {
          id: paymentEdge,
          source: webNode,
          target: accountNode,
          relationship: "LINKED_TO_ACCOUNT",
          explanation: `${item.websiteHost} was reported with payment to ${item.accountMasked}.`,
          governance: relationGovernance,
        });
      }
    }
  }

  return {
    nodes: [...nodes.values()].sort((left, right) => left.id.localeCompare(right.id)),
    edges: [...edges.values()].sort((left, right) => left.id.localeCompare(right.id)),
  };
}

function createSeedState(): LiveGraphState {
  const cases = createSeedCases();
  const graph = buildGraph(cases);
  return {
    schemaVersion: 1,
    updatedAt: "2026-07-18T00:00:00.000Z",
    cases,
    ...graph,
  };
}

function isState(value: unknown): value is LiveGraphState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LiveGraphState>;
  return (
    candidate.schemaVersion === 1 &&
    typeof candidate.updatedAt === "string" &&
    Array.isArray(candidate.cases) &&
    Array.isArray(candidate.nodes) &&
    Array.isArray(candidate.edges)
  );
}

async function writeRaw(state: LiveGraphState): Promise<void> {
  const directory = path.dirname(FILE);
  const temporary = `${FILE}.${process.pid}.${++writeSequence}.tmp`;
  await fs.mkdir(directory, { recursive: true });
  try {
    await fs.writeFile(temporary, JSON.stringify(state, null, 2), "utf8");
    await fs.rename(temporary, FILE);
  } catch (error) {
    await fs.unlink(temporary).catch(() => undefined);
    throw error;
  }
}

async function readRaw(): Promise<LiveGraphState> {
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(FILE, "utf8"));
    if (isState(parsed)) return parsed;
  } catch {
    // Seed below.
  }
  const seeded = createSeedState();
  await writeRaw(seeded);
  return seeded;
}

export function lookupLiveIntelligence(input: {
  account?: string;
  phone?: string;
  website?: string;
}): Promise<ScamLinkLookup> {
  return withLock(async () => {
    const state = await readRaw();
    const account = input.account ? accountFingerprint(input.account) : null;
    const phone = input.phone ? phoneFingerprint(input.phone) : null;
    const website = input.website ? websiteHost(input.website) : null;
    const matches = state.cases.filter(
      (item) =>
        (account && item.accountFingerprint === account) ||
        (phone && item.phoneFingerprint === phone) ||
        (website && item.websiteHost === website),
    );

    if (matches.length === 0) {
      return {
        matched: false,
        status: null,
        confidence: 0,
        headline: "No matching connection found in the demo graph",
        explanation:
          "No graph match does not prove that a recipient is safe. Continue using independent verification.",
        previousReportCount: 0,
        warningSigns: [],
        nodes: [],
        edges: [],
        limitations: [
          "This hackathon graph contains a small set of synthetic and consented demo outcomes.",
          "A missing match is not a safety guarantee.",
        ],
      };
    }

    const caseIds = new Set(matches.map((item) => item.id));
    const nodes = state.nodes.filter((node) =>
      node.caseIds.some((caseId) => caseIds.has(caseId)),
    );
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = state.edges.filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
    );
    const status = entityStatus(matches);
    const warningSigns = [...new Set(matches.flatMap((item) => item.warningSigns))];

    return {
      matched: true,
      status,
      confidence: confidenceFor(status, matches.length),
      headline: `This recipient may be connected across ${matches.length} previous report${matches.length === 1 ? "" : "s"}`,
      explanation:
        "The graph found repeated masked entities and reported associations. This is explainable risk evidence, not proof of fraud.",
      previousReportCount: matches.length,
      warningSigns: warningSigns.slice(0, 5),
      nodes,
      edges,
      limitations: [
        "Connections are advisory and do not automatically label a person or account as fraudulent.",
        "Bank-verified and cleared statuses require an independent human workflow.",
      ],
    };
  });
}

export function recordFamilyGuardOutcome(
  input: FamilyGuardGraphOutcome,
): Promise<LiveGraphState> {
  return withLock(async () => {
    const state = await readRaw();
    const id = `live_case_family_guard_${input.requestId}`;
    if (state.cases.some((item) => item.id === id)) return state;
    const observedAt = input.observedAt ?? new Date().toISOString();
    const userReported = input.outcome === "reported_suspicious";
    const highRisk = input.recommendation === "high_risk";
    const status: IntelligenceEvidenceStatus = userReported
      ? "user_reported"
      : highRisk
        ? "potentially_suspicious"
        : "observed";
    const item: LiveScamCase = {
      id,
      source: "family_guard_outcome",
      title: `${input.recipientName} Family Guard review`,
      scamType: highRisk ? "multi-signal suspected scam" : "reviewed transfer",
      observedAt,
      accountFingerprint: accountFingerprint(input.accountNumber),
      accountMasked: maskAccountNumber(input.accountNumber),
      phoneFingerprint: input.contactPhone
        ? phoneFingerprint(input.contactPhone)
        : null,
      phoneMasked: input.contactPhone ? maskPhoneNumber(input.contactPhone) : null,
      websiteHost: input.website ? websiteHost(input.website) : null,
      warningSigns: [
        ...input.warningSigns,
        input.contactChannel
          ? `Payment request began through ${input.contactChannel}`
          : "",
      ].filter(Boolean),
      outcome: input.outcome,
      governance: {
        status,
        confidence: userReported ? 0.7 : highRisk ? 0.64 : 0.52,
        reason: userReported
          ? "A guardian explicitly reported this consented demo case as suspicious; it is not bank verified."
          : "The protected-transfer outcome was observed with consent and remains advisory evidence.",
        evidenceCaseIds: [id],
        firstObservedAt: observedAt,
        lastObservedAt: observedAt,
        reviewDate: dateAfter(observedAt, 14),
        expiryDate: dateAfter(observedAt, 180),
      },
    };
    state.cases.push(item);
    const graph = buildGraph(state.cases);
    state.nodes = graph.nodes;
    state.edges = graph.edges;
    state.updatedAt = new Date().toISOString();
    await writeRaw(state);
    return state;
  });
}

export function resetLiveIntelligence(): Promise<LiveGraphState> {
  return withLock(async () => {
    const seeded = createSeedState();
    await writeRaw(seeded);
    return seeded;
  });
}
