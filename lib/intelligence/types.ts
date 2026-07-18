export type IntelligenceMode = "shadow";

export type IntelligenceReportStatus = "queued" | "processed";

export type IntelligenceRiskLevel = "low" | "medium" | "high" | "critical";

export type IntelligenceAgentName =
  | "Transaction Agent"
  | "Conversation Agent"
  | "Entity Agent"
  | "Graph Agent"
  | "Scam Pattern Agent"
  | "Education Agent"
  | "Orchestrator";

export type IntelligenceEvidenceStatus =
  | "observed"
  | "potentially_suspicious"
  | "user_reported"
  | "corroborated"
  | "bank_verified"
  | "cleared";

export type IntelligenceEvidenceSourceKind =
  | "synthetic_user_report"
  | "synthetic_transaction_context"
  | "synthetic_conversation_excerpt"
  | "synthetic_case_link";

export type IntelligenceIndicatorKind =
  | "account"
  | "phone"
  | "phrase"
  | "url";

export type IntelligenceGraphNodeKind =
  | "report"
  | IntelligenceIndicatorKind
  | "pattern";

export type IntelligenceGraphRelationship =
  | "MENTIONS"
  | "SHARES_ENTITY"
  | "MATCHES_PATTERN";

export interface IntelligenceBoundary {
  mode: IntelligenceMode;
  mainFlowConnected: false;
  shadowOnly: true;
  enforced: false;
  deployedRules: 0;
  store: "data/intelligence.json";
  syntheticDataOnly: true;
  externalCalls: false;
}

export interface IntelligenceAgentProfile {
  name: IntelligenceAgentName;
  role: string;
  deterministic: true;
  externalCalls: false;
}

export interface IntelligenceReportIndicator {
  kind: IntelligenceIndicatorKind;
  value: string;
  normalizedValue: string;
  label: string;
}

export interface IntelligenceEvidenceSource {
  id: string;
  kind: IntelligenceEvidenceSourceKind;
  label: string;
  caseId: string;
  observedAt: string;
  synthetic: true;
}

export interface IntelligenceEvidenceGovernance {
  status: IntelligenceEvidenceStatus;
  confidence: number;
  evidenceSources: IntelligenceEvidenceSource[];
  firstObservedAt: string;
  lastObservedAt: string;
  reason: string;
  reviewDate: string;
  expiryDate: string;
}

export interface IntelligenceTransactionContext {
  amount: number;
  currency: "MYR";
  isNewBeneficiary: boolean;
  previousTransfersToBeneficiary: number;
  transfersLastHour: number;
  usualAmountMaximum: number;
  minutesSinceBeneficiaryAdded: number;
}

export interface IntelligenceConversationContext {
  excerpt: string;
  language: "English" | "Malay" | "Mixed";
  messageCount: number;
  initiatedByUnknownContact: boolean;
}

export interface IntelligenceAgentFinding {
  agent: "Transaction Agent" | "Conversation Agent";
  code: string;
  label: string;
  confidence: number;
  evidence: string;
}

export interface IntelligenceReport {
  id: string;
  receivedAt: string;
  title: string;
  narrative: string;
  channel: string;
  location: string;
  scamType: string;
  status: IntelligenceReportStatus;
  evidenceSources: IntelligenceEvidenceSource[];
  governance: IntelligenceEvidenceGovernance;
  transactionContext: IntelligenceTransactionContext;
  conversationContext: IntelligenceConversationContext;
  indicators: IntelligenceReportIndicator[];
  agentFindings: IntelligenceAgentFinding[];
  linkedReportIds: string[];
  processedAt: string | null;
  riskScore: number | null;
  riskLevel: IntelligenceRiskLevel | null;
}

export interface IntelligenceGraphNode {
  id: string;
  kind: IntelligenceGraphNodeKind;
  label: string;
  value: string;
  reportIds: string[];
  weight: number;
  governance: IntelligenceEvidenceGovernance;
}

export interface IntelligenceGraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: IntelligenceGraphRelationship;
  evidence: string;
  weight: number;
  governance: IntelligenceEvidenceGovernance;
}

export interface IntelligenceLearnedPattern {
  id: string;
  name: string;
  scamType: string;
  status: "emerging" | "observed";
  description: string;
  confidence: number;
  evidenceReportIds: string[];
  sharedIndicators: IntelligenceReportIndicator[];
  firstSeenAt: string;
  lastLearnedAt: string;
  governance: IntelligenceEvidenceGovernance;
}

export interface IntelligenceShadowRule {
  id: string;
  name: string;
  status: "candidate";
  deploymentStatus: "shadow-only";
  condition: string;
  rationale: string;
  confidence: number;
  supportingPatternId: string;
  evidenceReportIds: string[];
  wouldFlagReportIds: string[];
  governance: IntelligenceEvidenceGovernance;
}

export interface IntelligenceRiskSignal {
  name: string;
  points: number;
  evidence: string;
}

export interface IntelligenceRiskAssessment {
  reportId: string;
  score: number;
  level: IntelligenceRiskLevel;
  signals: IntelligenceRiskSignal[];
  explanation: string;
  reviewer: "Orchestrator";
  reviewedAt: string;
}

export interface IntelligenceEducationOutput {
  title: string;
  summary: string;
  warningSigns: string[];
  safeNextSteps: string[];
}

export type IntelligenceShadowRecommendation =
  | "insufficient_evidence"
  | "monitor_in_shadow"
  | "pause_and_verify"
  | "human_review_recommended";

export interface IntelligenceShadowOutput {
  shadowOnly: true;
  enforced: false;
  mainFlowConnected: false;
  generatedBy: "Orchestrator";
  recommendation: IntelligenceShadowRecommendation;
  confidence: number;
  headline: string;
  rationale: string[];
  basedOnReportIds: string[];
  education: IntelligenceEducationOutput;
  limitations: string[];
  generatedAt: string | null;
}

export interface IntelligenceAgentTrace {
  id: string;
  agent: IntelligenceAgentName;
  order: number;
  status: "completed";
  startedAt: string;
  completedAt: string;
  inputSummary: string;
  decisions: string[];
  evidence: string[];
  outputSummary: string;
}

export interface IntelligenceAgentRun {
  id: string;
  action: "next" | "run_all";
  reportIds: string[];
  startedAt: string;
  completedAt: string;
  traces: IntelligenceAgentTrace[];
  summary: string;
}

export interface IntelligenceOverview {
  totalReports: number;
  queuedReports: number;
  processedReports: number;
  graphNodes: number;
  graphEdges: number;
  learnedPatterns: number;
  candidateRules: number;
  lastRunAt: string | null;
}

export interface IntelligenceSnapshot {
  schemaVersion: 2;
  generatedAt: string;
  boundary: IntelligenceBoundary;
  overview: IntelligenceOverview;
  agents: IntelligenceAgentProfile[];
  reports: IntelligenceReport[];
  graph: {
    nodes: IntelligenceGraphNode[];
    edges: IntelligenceGraphEdge[];
  };
  patterns: IntelligenceLearnedPattern[];
  shadowRules: IntelligenceShadowRule[];
  riskAssessments: IntelligenceRiskAssessment[];
  shadowOutput: IntelligenceShadowOutput;
  agentRuns: IntelligenceAgentRun[];
}

export type IntelligenceAction = "next" | "run_all" | "reset";

export interface IntelligenceActionRequest {
  action: IntelligenceAction;
}
