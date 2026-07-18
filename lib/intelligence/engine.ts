import "server-only";

import {
  mutateIntelligenceState,
  readIntelligenceState,
  resetIntelligenceState,
} from "./store";
import type { PersistedIntelligenceState } from "./state";
import type {
  IntelligenceAction,
  IntelligenceAgentFinding,
  IntelligenceAgentName,
  IntelligenceAgentRun,
  IntelligenceAgentTrace,
  IntelligenceEducationOutput,
  IntelligenceEvidenceGovernance,
  IntelligenceEvidenceSource,
  IntelligenceEvidenceStatus,
  IntelligenceGraphEdge,
  IntelligenceGraphNode,
  IntelligenceLearnedPattern,
  IntelligenceOverview,
  IntelligenceReport,
  IntelligenceReportIndicator,
  IntelligenceRiskAssessment,
  IntelligenceRiskLevel,
  IntelligenceRiskSignal,
  IntelligenceShadowOutput,
  IntelligenceShadowRule,
  IntelligenceSnapshot,
} from "./types";

type ProcessingAction = Exclude<IntelligenceAction, "reset">;
type AutomatedEvidenceStatus = Exclude<
  IntelligenceEvidenceStatus,
  "bank_verified" | "cleared"
>;

interface SharedFinding {
  leftReportId: string;
  rightReportId: string;
  indicator: IntelligenceReportIndicator;
}

interface GraphBuildResult {
  nodes: IntelligenceGraphNode[];
  edges: IntelligenceGraphEdge[];
  sharedFindings: SharedFinding[];
  mentionEdges: number;
  observedEntities: number;
  corroboratedEntities: number;
}

interface PatternResult {
  patterns: IntelligenceLearnedPattern[];
  shadowRules: IntelligenceShadowRule[];
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function stableId(prefix: string, ...parts: string[]): string {
  return `${prefix}_${stableHash(parts.join("|"))}`;
}

function dateAfter(value: string, days: number): string {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function reportNodeId(reportId: string): string {
  return `node_${reportId}`;
}

function entityNodeId(indicator: IntelligenceReportIndicator): string {
  return stableId("node_entity", indicator.kind, indicator.normalizedValue);
}

function sameIndicator(
  left: IntelligenceReportIndicator,
  right: IntelligenceReportIndicator,
): boolean {
  return (
    left.kind === right.kind &&
    left.normalizedValue === right.normalizedValue
  );
}

function uniqueSources(
  sources: IntelligenceEvidenceSource[],
): IntelligenceEvidenceSource[] {
  return [...new Map(sources.map((source) => [source.id, source])).values()].sort(
    (left, right) => left.id.localeCompare(right.id),
  );
}

function sourcesForReports(reports: IntelligenceReport[]): IntelligenceEvidenceSource[] {
  return uniqueSources(reports.flatMap((report) => report.evidenceSources));
}

function firstObserved(reports: IntelligenceReport[]): string {
  return reports.map((report) => report.receivedAt).sort()[0];
}

function lastObserved(reports: IntelligenceReport[]): string {
  return reports.map((report) => report.receivedAt).sort().at(-1) ?? reports[0].receivedAt;
}

function governance(
  status: AutomatedEvidenceStatus,
  confidence: number,
  reports: IntelligenceReport[],
  reason: string,
  extraSources: IntelligenceEvidenceSource[] = [],
): IntelligenceEvidenceGovernance {
  const first = firstObserved(reports);
  const last = lastObserved(reports);
  return {
    status,
    confidence: Number(Math.min(0.99, Math.max(0, confidence)).toFixed(2)),
    evidenceSources: uniqueSources([
      ...sourcesForReports(reports),
      ...extraSources,
    ]),
    firstObservedAt: first,
    lastObservedAt: last,
    reason,
    reviewDate: dateAfter(last, status === "corroborated" ? 7 : 14),
    expiryDate: dateAfter(last, status === "potentially_suspicious" ? 45 : 90),
  };
}

function caseLinkSource(
  left: IntelligenceReport,
  right: IntelligenceReport,
  indicator: IntelligenceReportIndicator,
): IntelligenceEvidenceSource {
  return {
    id: stableId(
      "source_case_link",
      left.id,
      right.id,
      indicator.kind,
      indicator.normalizedValue,
    ),
    kind: "synthetic_case_link",
    label: `Deterministic link through shared ${indicator.kind}`,
    caseId: `${left.id}|${right.id}`,
    observedAt: [left.receivedAt, right.receivedAt].sort().at(-1) ?? right.receivedAt,
    synthetic: true,
  };
}

function transactionFindings(report: IntelligenceReport): IntelligenceAgentFinding[] {
  const context = report.transactionContext;
  const findings: IntelligenceAgentFinding[] = [];
  if (context.amount > context.usualAmountMaximum) {
    const ratio = context.amount / Math.max(1, context.usualAmountMaximum);
    findings.push({
      agent: "Transaction Agent",
      code: "amount_above_usual",
      label: "Amount exceeds the synthetic usual range",
      confidence: Number(Math.min(0.95, 0.58 + ratio * 0.08).toFixed(2)),
      evidence: `RM${context.amount} exceeds the mock usual maximum of RM${context.usualAmountMaximum}.`,
    });
  }
  if (context.isNewBeneficiary && context.previousTransfersToBeneficiary === 0) {
    findings.push({
      agent: "Transaction Agent",
      code: "new_beneficiary",
      label: "First transfer to a new beneficiary",
      confidence: 0.78,
      evidence: "The synthetic context records no prior transfer to this beneficiary.",
    });
  }
  if (context.transfersLastHour >= 3) {
    findings.push({
      agent: "Transaction Agent",
      code: "high_velocity",
      label: "Unusual transfer velocity",
      confidence: 0.82,
      evidence: `${context.transfersLastHour} mock transfers occurred in the previous hour.`,
    });
  }
  if (context.minutesSinceBeneficiaryAdded <= 15) {
    findings.push({
      agent: "Transaction Agent",
      code: "recent_beneficiary",
      label: "Beneficiary was added shortly before payment",
      confidence: 0.74,
      evidence: `The beneficiary was added ${context.minutesSinceBeneficiaryAdded} minutes earlier.`,
    });
  }
  return findings;
}

function conversationFindings(report: IntelligenceReport): IntelligenceAgentFinding[] {
  const context = report.conversationContext;
  const excerpt = context.excerpt;
  const findings: IntelligenceAgentFinding[] = [];
  const add = (code: string, label: string, confidence: number, evidence: string) => {
    findings.push({
      agent: "Conversation Agent",
      code,
      label,
      confidence,
      evidence,
    });
  };
  if (context.initiatedByUnknownContact) {
    add(
      "unknown_contact",
      "Conversation initiated by an unknown contact",
      0.7,
      "The synthetic case marks the contact as previously unknown.",
    );
  }
  if (/now|immediate|final|last slot|expire|freeze/i.test(excerpt)) {
    add(
      "urgency_pressure",
      "Urgency or loss pressure",
      0.86,
      "The excerpt pressures the recipient to act now or lose funds.",
    );
  }
  if (/do not tell|do not call|keep (it )?secret|do not leave/i.test(excerpt)) {
    add(
      "secrecy_request",
      "Request for secrecy or isolation",
      0.9,
      "The excerpt discourages independent verification or speaking to others.",
    );
  }
  if (/bank negara|police|investigation|authority/i.test(excerpt)) {
    add(
      "authority_claim",
      "Official-authority manipulation",
      0.92,
      "The speaker invokes Bank Negara, police, or an investigation.",
    );
  }
  if (/unlock commission|release.*reward|top-up|task/i.test(excerpt)) {
    add(
      "reward_lock",
      "Reward-release manipulation",
      0.88,
      "Payment is framed as necessary to unlock a commission or reward.",
    );
  }
  return findings;
}

function refreshAgentFindings(reports: IntelligenceReport[]): void {
  for (const report of reports) {
    if (report.status !== "processed") {
      report.agentFindings = [];
      continue;
    }
    report.agentFindings = [
      ...transactionFindings(report),
      ...conversationFindings(report),
    ];
  }
}

function buildGraph(reports: IntelligenceReport[]): GraphBuildResult {
  const processed = reports.filter((report) => report.status === "processed");
  const nodes = new Map<string, IntelligenceGraphNode>();
  const edges = new Map<string, IntelligenceGraphEdge>();
  const sharedFindings: SharedFinding[] = [];
  for (const report of reports) report.linkedReportIds = [];

  for (const report of processed) {
    nodes.set(reportNodeId(report.id), {
      id: reportNodeId(report.id),
      kind: "report",
      label: report.title,
      value: report.id,
      reportIds: [report.id],
      weight: 1,
      governance: report.governance,
    });
    for (const indicator of report.indicators) {
      const nodeId = entityNodeId(indicator);
      const existing = nodes.get(nodeId);
      if (existing && !existing.reportIds.includes(report.id)) {
        existing.reportIds.push(report.id);
        existing.reportIds.sort();
        existing.weight = existing.reportIds.length;
      } else if (!existing) {
        nodes.set(nodeId, {
          id: nodeId,
          kind: indicator.kind,
          label: indicator.label,
          value: indicator.value,
          reportIds: [report.id],
          weight: 1,
          governance: governance(
            "observed",
            0.58,
            [report],
            "The entity was extracted from one synthetic user-reported case.",
          ),
        });
      }
      const edgeId = stableId("edge_mentions", report.id, nodeId);
      edges.set(edgeId, {
        id: edgeId,
        source: reportNodeId(report.id),
        target: nodeId,
        relationship: "MENTIONS",
        evidence: `${indicator.kind}: ${indicator.value}`,
        weight: 1,
        governance: governance(
          "user_reported",
          0.7,
          [report],
          "The relationship is asserted by one synthetic user report.",
        ),
      });
    }
  }

  const mentionEdges = edges.size;
  for (let leftIndex = 0; leftIndex < processed.length; leftIndex += 1) {
    const left = processed[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < processed.length; rightIndex += 1) {
      const right = processed[rightIndex];
      const matches = left.indicators.filter((candidate) =>
        right.indicators.some((indicator) => sameIndicator(candidate, indicator)),
      );
      for (const indicator of matches) {
        left.linkedReportIds.push(right.id);
        right.linkedReportIds.push(left.id);
        sharedFindings.push({
          leftReportId: left.id,
          rightReportId: right.id,
          indicator,
        });
        const edgeId = stableId(
          "edge_shared",
          left.id,
          right.id,
          indicator.kind,
          indicator.normalizedValue,
        );
        edges.set(edgeId, {
          id: edgeId,
          source: reportNodeId(left.id),
          target: reportNodeId(right.id),
          relationship: "SHARES_ENTITY",
          evidence: `Shared ${indicator.kind}: ${indicator.value}`,
          weight: 2,
          governance: governance(
            "corroborated",
            0.86,
            [left, right],
            "The same normalized entity appears in two independent synthetic cases. This is corroboration, not bank verification.",
            [caseLinkSource(left, right, indicator)],
          ),
        });
      }
    }
  }

  for (const report of reports) {
    report.linkedReportIds = [...new Set(report.linkedReportIds)].sort();
  }
  for (const node of nodes.values()) {
    if (node.kind === "report" || node.reportIds.length < 2) continue;
    const supportingReports = node.reportIds
      .map((id) => processed.find((report) => report.id === id))
      .filter((report): report is IntelligenceReport => Boolean(report));
    node.governance = governance(
      "corroborated",
      Math.min(0.95, 0.78 + supportingReports.length * 0.04),
      supportingReports,
      `The entity recurs across ${supportingReports.length} independent synthetic cases. It remains unverified by any bank.`,
    );
  }

  const sortedNodes = [...nodes.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  return {
    nodes: sortedNodes,
    edges: [...edges.values()].sort((left, right) => left.id.localeCompare(right.id)),
    sharedFindings: sharedFindings.sort((left, right) =>
      `${left.leftReportId}:${left.rightReportId}:${left.indicator.kind}`.localeCompare(
        `${right.leftReportId}:${right.rightReportId}:${right.indicator.kind}`,
      ),
    ),
    mentionEdges,
    observedEntities: sortedNodes.filter(
      (node) => node.kind !== "report" && node.governance.status === "observed",
    ).length,
    corroboratedEntities: sortedNodes.filter(
      (node) => node.kind !== "report" && node.governance.status === "corroborated",
    ).length,
  };
}

function repeatedIndicators(reports: IntelligenceReport[]): IntelligenceReportIndicator[] {
  const values = new Map<string, { indicator: IntelligenceReportIndicator; cases: Set<string> }>();
  for (const report of reports) {
    for (const indicator of report.indicators) {
      const key = `${indicator.kind}:${indicator.normalizedValue}`;
      const entry = values.get(key) ?? { indicator, cases: new Set<string>() };
      entry.cases.add(report.id);
      values.set(key, entry);
    }
  }
  return [...values.values()]
    .filter((entry) => entry.cases.size >= 2)
    .map((entry) => entry.indicator)
    .sort((left, right) =>
      `${left.kind}:${left.normalizedValue}`.localeCompare(
        `${right.kind}:${right.normalizedValue}`,
      ),
    );
}

function addPatternToGraph(
  graph: PersistedIntelligenceState["graph"],
  pattern: IntelligenceLearnedPattern,
  reports: IntelligenceReport[],
): void {
  const patternNodeId = `node_${pattern.id}`;
  graph.nodes.push({
    id: patternNodeId,
    kind: "pattern",
    label: pattern.name,
    value: pattern.description,
    reportIds: pattern.evidenceReportIds,
    weight: pattern.evidenceReportIds.length,
    governance: pattern.governance,
  });
  for (const reportId of pattern.evidenceReportIds) {
    const report = reports.find((candidate) => candidate.id === reportId);
    if (!report) continue;
    const edgeId = stableId("edge_pattern", reportId, pattern.id);
    graph.edges.push({
      id: edgeId,
      source: reportNodeId(reportId),
      target: patternNodeId,
      relationship: "MATCHES_PATTERN",
      evidence: `${reportId} matches ${pattern.name}`,
      weight: pattern.confidence,
      governance: governance(
        "potentially_suspicious",
        pattern.confidence,
        [report],
        "A deterministic scam-type rule matched this synthetic case; the result is advisory only.",
      ),
    });
  }
}

function learnPatterns(
  state: PersistedIntelligenceState,
  learnedAt: string,
): PatternResult {
  const processed = state.reports.filter((report) => report.status === "processed");
  const patterns: IntelligenceLearnedPattern[] = [];
  const shadowRules: IntelligenceShadowRule[] = [];
  const taskReports = processed.filter((report) => report.scamType === "task scam");
  if (taskReports.length >= 2) {
    const sharedIndicators = repeatedIndicators(taskReports);
    const confidence = Number(
      Math.min(0.99, 0.55 + taskReports.length * 0.08 + sharedIndicators.length * 0.05).toFixed(2),
    );
    const patternGovernance = governance(
      "potentially_suspicious",
      confidence,
      taskReports,
      "Independent synthetic cases match a known task-scam progression. This is a shadow inference, not a verified finding.",
    );
    const pattern: IntelligenceLearnedPattern = {
      id: "pattern_task_commission_unlock",
      name: "Commission-unlock task scam cluster",
      scamType: "task scam",
      status: taskReports.length >= 3 ? "emerging" : "observed",
      description:
        "Small paid tasks lead to larger transfers required before a promised commission can be released.",
      confidence,
      evidenceReportIds: taskReports.map((report) => report.id).sort(),
      sharedIndicators,
      firstSeenAt: firstObserved(taskReports),
      lastLearnedAt: learnedAt,
      governance: patternGovernance,
    };
    patterns.push(pattern);
    if (pattern.status === "emerging") {
      const wouldFlagReportIds = taskReports
        .filter(
          (report) =>
            sharedIndicators.filter((shared) =>
              report.indicators.some((indicator) => sameIndicator(shared, indicator)),
            ).length >= 2,
        )
        .map((report) => report.id)
        .sort();
      shadowRules.push({
        id: "rule_candidate_task_shared_indicators",
        name: "Task scam shared-indicator candidate",
        status: "candidate",
        deploymentStatus: "shadow-only",
        condition:
          "A task-scam case matches at least two repeated account, phone, phrase, or URL entities.",
        rationale:
          "Three independent synthetic cases share infrastructure or manipulation language.",
        confidence,
        supportingPatternId: pattern.id,
        evidenceReportIds: pattern.evidenceReportIds,
        wouldFlagReportIds,
        governance: patternGovernance,
      });
    }
  }

  const impersonationReports = processed.filter(
    (report) => report.scamType === "authority impersonation",
  );
  if (impersonationReports.length > 0) {
    const confidence = 0.72;
    patterns.push({
      id: "pattern_authority_pressure_sequence",
      name: "Authority-pressure impersonation sequence",
      scamType: "authority impersonation",
      status: "observed",
      description:
        "An official-sounding caller alleges an investigation, creates urgency, and redirects money to a safe account.",
      confidence,
      evidenceReportIds: impersonationReports.map((report) => report.id).sort(),
      sharedIndicators: impersonationReports[0].indicators,
      firstSeenAt: firstObserved(impersonationReports),
      lastLearnedAt: learnedAt,
      governance: governance(
        "potentially_suspicious",
        confidence,
        impersonationReports,
        "Manipulation language matches a deterministic impersonation pattern, but no external verification was performed.",
      ),
    });
  }

  state.patterns = patterns.sort((left, right) => left.id.localeCompare(right.id));
  state.shadowRules = shadowRules;
  for (const pattern of state.patterns) {
    addPatternToGraph(state.graph, pattern, processed);
  }
  state.graph.nodes.sort((left, right) => left.id.localeCompare(right.id));
  state.graph.edges.sort((left, right) => left.id.localeCompare(right.id));
  return { patterns: state.patterns, shadowRules: state.shadowRules };
}

function riskLevel(score: number): IntelligenceRiskLevel {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

const FINDING_POINTS: Record<string, number> = {
  amount_above_usual: 14,
  new_beneficiary: 8,
  high_velocity: 8,
  recent_beneficiary: 4,
  unknown_contact: 5,
  urgency_pressure: 8,
  secrecy_request: 10,
  authority_claim: 16,
  reward_lock: 12,
};

function assessRisks(
  state: PersistedIntelligenceState,
  reviewedAt: string,
): IntelligenceRiskAssessment[] {
  const assessments = state.reports
    .filter((report) => report.status === "processed")
    .map((report): IntelligenceRiskAssessment => {
      const signals: IntelligenceRiskSignal[] = report.agentFindings.map((finding) => ({
        name: finding.label,
        points: FINDING_POINTS[finding.code] ?? 0,
        evidence: finding.evidence,
      }));
      if (report.linkedReportIds.length > 0) {
        signals.push({
          name: "Corroborated cross-case links",
          points: Math.min(24, report.linkedReportIds.length * 12),
          evidence: `Shared entities connect ${report.id} to ${report.linkedReportIds.join(", ")}.`,
        });
      }
      const pattern = state.patterns.find((candidate) =>
        candidate.evidenceReportIds.includes(report.id),
      );
      if (pattern) {
        signals.push({
          name: `${pattern.status === "emerging" ? "Emerging" : "Observed"} scam-type match`,
          points: pattern.status === "emerging" ? 18 : 6,
          evidence: `${pattern.name} matched at ${Math.round(pattern.confidence * 100)}% shadow confidence.`,
        });
      }
      const candidate = state.shadowRules.find((rule) =>
        rule.wouldFlagReportIds.includes(report.id),
      );
      if (candidate) {
        signals.push({
          name: "Non-deployed candidate match",
          points: 8,
          evidence: `${candidate.name} matched in shadow mode and was not enforced.`,
        });
      }
      const score = Math.min(
        100,
        signals.reduce((sum, signal) => sum + signal.points, 0),
      );
      return {
        reportId: report.id,
        score,
        level: riskLevel(score),
        signals,
        explanation: `${riskLevel(score)} shadow risk (${score}/100) from fixed transaction, conversation, graph, and pattern evidence.`,
        reviewer: "Orchestrator",
        reviewedAt,
      };
    });
  state.riskAssessments = assessments;
  const byId = new Map(assessments.map((assessment) => [assessment.reportId, assessment]));
  for (const report of state.reports) {
    const assessment = byId.get(report.id);
    report.riskScore = assessment?.score ?? null;
    report.riskLevel = assessment?.level ?? null;
  }
  return assessments;
}

function educationFor(state: PersistedIntelligenceState): IntelligenceEducationOutput {
  const processed = state.reports.filter((report) => report.status === "processed");
  const taskScam = processed.some((report) => report.scamType === "task scam");
  const impersonation = processed.some(
    (report) => report.scamType === "authority impersonation",
  );
  const warningSigns = [
    ...(taskScam
      ? [
          "A simple online task changes into a request for an upfront top-up.",
          "A commission or withdrawal is locked until another payment is made.",
        ]
      : []),
    ...(impersonation
      ? [
          "A caller claims official authority and says your account is under investigation.",
          "You are told to move funds to a so-called safe account or keep the call secret.",
        ]
      : []),
  ];
  return {
    title: taskScam || impersonation ? "Recognise the pressure before you pay" : "Verify before transferring",
    summary:
      "Urgency, secrecy, and pay-to-release promises are reasons to stop and verify through a trusted channel.",
    warningSigns:
      warningSigns.length > 0
        ? warningSigns
        : ["An unfamiliar contact asks for money or banking information."],
    safeNextSteps: [
      "Pause the payment and stop communicating with the unknown contact.",
      "Verify the organisation using a phone number or website you found independently.",
      "Never disclose an OTP, password, or banking credential.",
      "If money was sent, contact your bank through its official channel promptly.",
    ],
  };
}

function shadowOutputFor(
  state: PersistedIntelligenceState,
  assessments: IntelligenceRiskAssessment[],
  generatedAt: string,
): IntelligenceShadowOutput {
  const education = educationFor(state);
  if (assessments.length === 0) {
    return { ...state.shadowOutput, education };
  }
  const sorted = [...assessments].sort((left, right) => right.score - left.score);
  const maximum = sorted[0].score;
  const recommendation =
    maximum >= 75
      ? "human_review_recommended"
      : maximum >= 50
        ? "pause_and_verify"
        : maximum >= 25
          ? "monitor_in_shadow"
          : "insufficient_evidence";
  const corroboratedEntities = state.graph.nodes.filter(
    (node) =>
      node.kind !== "report" &&
      node.kind !== "pattern" &&
      node.governance.status === "corroborated",
  ).length;
  const patternConfidence = Math.max(0, ...state.patterns.map((pattern) => pattern.confidence));
  return {
    shadowOnly: true,
    enforced: false,
    mainFlowConnected: false,
    generatedBy: "Orchestrator",
    recommendation,
    confidence: Number(Math.min(0.99, Math.max(maximum / 100, patternConfidence)).toFixed(2)),
    headline:
      recommendation === "human_review_recommended"
        ? "Independent human review is recommended"
        : recommendation === "pause_and_verify"
          ? "Pause and verify the request independently"
          : "Continue observation in the isolated lab",
    rationale: [
      `Highest deterministic shadow score: ${maximum}/100.`,
      `${corroboratedEntities} recurring ${corroboratedEntities === 1 ? "entity was" : "entities were"} corroborated across independent synthetic cases.`,
      `${state.shadowRules.length} candidate rule(s) remain shadow-only and undeployed.`,
    ],
    basedOnReportIds: sorted.map((assessment) => assessment.reportId),
    education,
    limitations: [
      "All cases, conversations, and transaction contexts are synthetic.",
      "No banking API, transfer flow, or suspicious-account list is connected.",
      "This recommendation is educational, shadow-only, and never enforced.",
    ],
    generatedAt,
  };
}

function traceTime(startedAt: Date, offset: number): string {
  return new Date(startedAt.getTime() + offset).toISOString();
}

function makeTrace(
  runId: string,
  agent: IntelligenceAgentName,
  order: number,
  startedAt: Date,
  inputSummary: string,
  decisions: string[],
  evidence: string[],
  outputSummary: string,
): IntelligenceAgentTrace {
  const offset = order * 2;
  return {
    id: `${runId}_trace_${order}`,
    agent,
    order,
    status: "completed",
    startedAt: traceTime(startedAt, offset),
    completedAt: traceTime(startedAt, offset + 1),
    inputSummary,
    decisions,
    evidence,
    outputSummary,
  };
}

function runPipeline(state: PersistedIntelligenceState, action: ProcessingAction): void {
  const queued = state.reports.filter((report) => report.status === "queued");
  const selected = action === "next" ? queued.slice(0, 1) : queued;
  if (selected.length === 0) return;
  const startedAt = new Date();
  const processedAt = startedAt.toISOString();
  state.runSequence += 1;
  const runId = `agent_run_${String(state.runSequence).padStart(3, "0")}`;
  for (const report of selected) {
    report.status = "processed";
    report.processedAt = processedAt;
  }

  refreshAgentFindings(state.reports);
  const processed = state.reports.filter((report) => report.status === "processed");
  const transactionEvidence = processed.flatMap((report) =>
    report.agentFindings
      .filter((finding) => finding.agent === "Transaction Agent")
      .map((finding) => `${report.id}: ${finding.evidence}`),
  );
  const conversationEvidence = processed.flatMap((report) =>
    report.agentFindings
      .filter((finding) => finding.agent === "Conversation Agent")
      .map((finding) => `${report.id}: ${finding.evidence}`),
  );
  const graphResult = buildGraph(state.reports);
  state.graph = { nodes: graphResult.nodes, edges: graphResult.edges };
  const patternResult = learnPatterns(state, processedAt);
  const assessments = assessRisks(state, processedAt);
  state.shadowOutput = shadowOutputFor(state, assessments, processedAt);
  const education = state.shadowOutput.education;

  const traces: IntelligenceAgentTrace[] = [
    makeTrace(
      runId,
      "Transaction Agent",
      1,
      startedAt,
      `${processed.length} synthetic transaction context(s).`,
      processed.map((report) => {
        const count = report.agentFindings.filter(
          (finding) => finding.agent === "Transaction Agent",
        ).length;
        return `${report.id}: found ${count} amount, velocity, or beneficiary anomaly signal(s).`;
      }),
      transactionEvidence,
      "Produced deterministic transaction context only; no bank transaction was read or changed.",
    ),
    makeTrace(
      runId,
      "Conversation Agent",
      2,
      startedAt,
      `${processed.length} supplied synthetic conversation excerpt(s).`,
      processed.map((report) => {
        const count = report.agentFindings.filter(
          (finding) => finding.agent === "Conversation Agent",
        ).length;
        return `${report.id}: detected ${count} manipulation-language cue(s).`;
      }),
      conversationEvidence,
      "Tagged urgency, secrecy, authority, and reward language using fixed phrase rules.",
    ),
    makeTrace(
      runId,
      "Entity Agent",
      3,
      startedAt,
      `${processed.length} processed cases with reported indicators.`,
      [
        `Built ${graphResult.nodes.length} report/entity nodes and ${graphResult.mentionEdges} user-reported mention edges.`,
        `${graphResult.observedEntities} one-case entities remain observed; ${graphResult.corroboratedEntities} recurring entities are corroborated.`,
      ],
      selected.flatMap((report) =>
        report.indicators.map(
          (indicator) => `${report.id} -> ${indicator.kind}:${indicator.normalizedValue}`,
        ),
      ),
      "Extracted entities with source, confidence, observation, review, and expiry metadata.",
    ),
    makeTrace(
      runId,
      "Graph Agent",
      4,
      startedAt,
      `${graphResult.mentionEdges} mention edges for pairwise cross-case linking.`,
      [
        `Found ${graphResult.sharedFindings.length} shared-entity relationship(s).`,
        "Only repeated evidence across independent synthetic cases was promoted to corroborated.",
      ],
      graphResult.sharedFindings.length > 0
        ? graphResult.sharedFindings.map(
            (finding) =>
              `${finding.leftReportId} <-> ${finding.rightReportId} via ${finding.indicator.kind}:${finding.indicator.normalizedValue}`,
          )
        : ["No independent cross-case entity match was found."],
      "Added governed graph links without assigning external verification status.",
    ),
    makeTrace(
      runId,
      "Scam Pattern Agent",
      5,
      startedAt,
      `${processed.length} cases and their governed graph links.`,
      patternResult.patterns.length > 0
        ? patternResult.patterns.map(
            (pattern) =>
              `${pattern.name}: ${pattern.status}, ${Math.round(pattern.confidence * 100)}% shadow confidence.`,
          )
        : ["Evidence remains below the cross-case task-pattern threshold."],
      patternResult.patterns.length > 0
        ? patternResult.patterns.map(
            (pattern) => `${pattern.id}: ${pattern.evidenceReportIds.join(", ")}`,
          )
        : ["No pattern evidence was persisted for this run."],
      `Matched ${patternResult.patterns.length} scam pattern(s) and proposed ${patternResult.shadowRules.length} non-deployed candidate rule(s).`,
    ),
    makeTrace(
      runId,
      "Education Agent",
      6,
      startedAt,
      "Detected warning signs from the processed synthetic cases.",
      education.warningSigns,
      education.safeNextSteps,
      "Generated plain-language education only; it does not approve, block, or alter a transfer.",
    ),
    makeTrace(
      runId,
      "Orchestrator",
      7,
      startedAt,
      "Transaction, conversation, entity, graph, pattern, and education outputs.",
      assessments.map(
        (assessment) =>
          `${assessment.reportId}: ${assessment.score}/100 (${assessment.level}) from ${assessment.signals.length} fixed signals.`,
      ),
      state.shadowOutput.rationale,
      `${state.shadowOutput.recommendation} at ${Math.round(state.shadowOutput.confidence * 100)}% shadow confidence; not enforced and not connected to the main flow.`,
    ),
  ];

  const completedAt = traceTime(startedAt, 18);
  const run: IntelligenceAgentRun = {
    id: runId,
    action,
    reportIds: selected.map((report) => report.id),
    startedAt: processedAt,
    completedAt,
    traces,
    summary: `Processed ${selected.length} case(s) through seven deterministic agents; recommendation ${state.shadowOutput.recommendation} remained shadow-only and unenforced.`,
  };
  state.agentRuns.unshift(run);
  state.updatedAt = completedAt;
}

function overviewFor(state: PersistedIntelligenceState): IntelligenceOverview {
  const queuedReports = state.reports.filter((report) => report.status === "queued").length;
  return {
    totalReports: state.reports.length,
    queuedReports,
    processedReports: state.reports.length - queuedReports,
    graphNodes: state.graph.nodes.length,
    graphEdges: state.graph.edges.length,
    learnedPatterns: state.patterns.length,
    candidateRules: state.shadowRules.length,
    lastRunAt: state.agentRuns[0]?.completedAt ?? null,
  };
}

function snapshotFor(state: PersistedIntelligenceState): IntelligenceSnapshot {
  return {
    boundary: state.boundary,
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    overview: overviewFor(state),
    agents: state.agents,
    reports: state.reports,
    graph: state.graph,
    patterns: state.patterns,
    shadowRules: state.shadowRules,
    riskAssessments: state.riskAssessments,
    shadowOutput: state.shadowOutput,
    agentRuns: state.agentRuns,
  };
}

export async function getIntelligenceSnapshot(): Promise<IntelligenceSnapshot> {
  return snapshotFor(await readIntelligenceState());
}

export async function applyIntelligenceAction(
  action: IntelligenceAction,
): Promise<IntelligenceSnapshot> {
  if (action === "reset") {
    return snapshotFor(await resetIntelligenceState());
  }
  const state = await mutateIntelligenceState((current) => {
    runPipeline(current, action);
  });
  return snapshotFor(state);
}
