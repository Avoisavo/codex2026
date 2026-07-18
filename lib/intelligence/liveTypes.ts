import type { IntelligenceEvidenceStatus } from "./types";

export type LiveEntityKind = "account" | "phone" | "website" | "case" | "pattern";

export type LiveRelationship =
  | "CONTACTED_BY"
  | "PROMOTED_WEBSITE"
  | "LINKED_TO_ACCOUNT"
  | "REPORTED_IN_CASE"
  | "ASSOCIATED_WITH_SCAM_TYPE";

export interface LiveGovernance {
  status: IntelligenceEvidenceStatus;
  confidence: number;
  reason: string;
  evidenceCaseIds: string[];
  firstObservedAt: string;
  lastObservedAt: string;
  reviewDate: string;
  expiryDate: string;
}

export interface LiveScamCase {
  id: string;
  source: "synthetic_prior_report" | "family_guard_outcome";
  title: string;
  scamType: string;
  observedAt: string;
  accountFingerprint: string;
  accountMasked: string;
  phoneFingerprint: string | null;
  phoneMasked: string | null;
  websiteHost: string | null;
  warningSigns: string[];
  outcome:
    | "reported_suspicious"
    | "rejected"
    | "approved_after_verification"
    | "bank_review"
    | "expired"
    | "seed_report";
  governance: LiveGovernance;
}

export interface LiveGraphNode {
  id: string;
  kind: LiveEntityKind;
  label: string;
  maskedValue: string;
  caseIds: string[];
  governance: LiveGovernance;
}

export interface LiveGraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: LiveRelationship;
  explanation: string;
  governance: LiveGovernance;
}

export interface LiveGraphState {
  schemaVersion: 1;
  updatedAt: string;
  cases: LiveScamCase[];
  nodes: LiveGraphNode[];
  edges: LiveGraphEdge[];
}

export interface ScamLinkLookup {
  matched: boolean;
  status: IntelligenceEvidenceStatus | null;
  confidence: number;
  headline: string;
  explanation: string;
  previousReportCount: number;
  warningSigns: string[];
  nodes: LiveGraphNode[];
  edges: LiveGraphEdge[];
  limitations: string[];
}

export interface FamilyGuardGraphOutcome {
  requestId: string;
  recipientName: string;
  accountNumber: string;
  contactPhone?: string | null;
  website?: string | null;
  contactChannel: string;
  warningSigns: string[];
  recommendation: string;
  outcome: LiveScamCase["outcome"];
  observedAt?: string;
}
