export const FAMILY_GUARD_SCHEMA_VERSION = 1 as const;

export type FamilyGuardContactChannel =
  | "whatsapp_or_sms"
  | "phone_call"
  | "social_media"
  | "online_marketplace"
  | "investment_group"
  | "job_or_task"
  | "known_person"
  | "other";

export type FamilyGuardRiskLevel = "low" | "medium" | "high" | "critical";

export type FamilyGuardRecommendation =
  | "low_risk"
  | "uncertain"
  | "high_risk";

export type FamilyGuardRequestStatus =
  | "awaiting_verification"
  | "awaiting_guardian"
  | "bank_review"
  | "completed"
  | "rejected"
  | "reported"
  | "blocked"
  | "expired"
  | "cancelled";

export type FamilyGuardGuardianAction =
  | "approve"
  | "reject"
  | "report"
  | "escalate";

export type FamilyGuardEvidenceStatus =
  | "observed"
  | "potentially_suspicious"
  | "user_reported"
  | "corroborated"
  | "bank_verified"
  | "cleared";

export interface FamilyGuardConsent {
  accountHolderAccepted: boolean;
  acceptedAt: string | null;
  version: string;
}

export interface FamilyGuardPrivacy {
  shareProtectedTransferOnly: true;
  shareFullTransactionHistory: false;
  voiceVerificationConsent: boolean;
  transcriptMode: "none" | "summary_only" | "redacted";
  transcriptRetentionDays: number;
  intelligenceFeedbackConsent: boolean;
}

export interface FamilyGuardSettings {
  schemaVersion: typeof FAMILY_GUARD_SCHEMA_VERSION;
  userId: string;
  enabled: boolean;
  accountHolderPhone: string;
  softLimit: number;
  guardianLimit: number;
  hardLimit: number;
  dailyFrequencyLimit: number;
  dailyMaxAmount: number;
  monthlyMaxAmount: number;
  protectNewRecipients: boolean;
  protectSuspiciousAccounts: boolean;
  reviewUnusualActivity: boolean;
  approvalTtlMinutes: number;
  consent: FamilyGuardConsent;
  privacy: FamilyGuardPrivacy;
  updatedAt: string;
}

export interface FamilyGuardTrustedContact {
  id: string;
  ownerUserId: string;
  name: string;
  relationship: string;
  phone: string;
  role: "primary" | "backup";
  status: "pending" | "active" | "revoked";
  permissions: {
    reviewProtectedTransfers: true;
    viewFullTransactionHistory: false;
  };
  invitedAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}

export interface FamilyGuardContextAnswers {
  contactChannel: FamilyGuardContactChannel;
  urgency: boolean;
  secrecy: boolean;
  promisedReward: boolean;
  remoteAccess: boolean;
  notes: string;
}

export interface FamilyGuardTransferSnapshot {
  userId: string;
  fromAccount: string;
  recipientName: string;
  recipientBank: string;
  accountNumber: string;
  normalizedAccountNumber: string;
  amount: number;
  amountSen: number;
  currency: "MYR";
  reference: string;
  paymentType: string;
}

export interface FamilyGuardRiskSignal {
  code: string;
  title: string;
  explanation: string;
  points: number;
  source: "transaction" | "context" | "suspicious_list" | "limits" | "graph";
}

export interface FamilyGuardRiskAssessment {
  score: number;
  level: FamilyGuardRiskLevel;
  recommendation: FamilyGuardRecommendation;
  signals: FamilyGuardRiskSignal[];
  isNewRecipient: boolean;
  suspiciousAccountMatch: boolean;
  suspiciousEvidenceStatus: FamilyGuardEvidenceStatus | null;
  requirements: {
    aiVerification: boolean;
    guardianApproval: boolean;
    bankReview: boolean;
    hardBlock: boolean;
  };
  explanation: string;
  safeNextSteps: string[];
  evaluatedAt: string;
}

export interface FamilyGuardGuardianDecision {
  action: FamilyGuardGuardianAction;
  contactId: string;
  decidedAt: string;
  authentication: "transaction_bound_demo_code";
  outcome:
    | "transfer_released"
    | "transfer_rejected"
    | "reported_for_review"
    | "sent_to_bank_review";
}

export interface FamilyGuardApprovalRequest {
  id: string;
  transferId: string;
  ownerUserId: string;
  trustedContactIds: string[];
  status: FamilyGuardRequestStatus;
  version: number;
  bindingHash: string;
  transfer: FamilyGuardTransferSnapshot;
  context: FamilyGuardContextAnswers;
  risk: FamilyGuardRiskAssessment;
  verificationSessionId: string | null;
  aiRecommendation: FamilyGuardRecommendation | null;
  aiSummary: string;
  aiWarningSigns: string[];
  guardianDecision: FamilyGuardGuardianDecision | null;
  approvalCodeSalt: string | null;
  approvalCodeHash: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  resolvedAt: string | null;
}

export interface FamilyGuardVerificationSession {
  id: string;
  requestId: string;
  safetyPhrase: string;
  status: "ready" | "active" | "completed" | "failed" | "cancelled";
  providerConversationId: string | null;
  recommendation: FamilyGuardRecommendation | null;
  summary: string;
  warningSigns: string[];
  consentedAt: string;
  createdAt: string;
  completedAt: string | null;
  deleteAfter: string | null;
}

export type FamilyGuardPublicApprovalRequest = Omit<
  FamilyGuardApprovalRequest,
  "approvalCodeSalt" | "approvalCodeHash"
>;

export interface FamilyGuardAuditEvent {
  id: string;
  requestId: string;
  actor: "account_holder" | "guardian" | "ai" | "system" | "bank_reviewer";
  action: string;
  detail: string;
  createdAt: string;
}

export interface FamilyGuardIntelligenceFeedback {
  id: string;
  requestId: string;
  transferId: string;
  outcome:
    | "approved_after_guardian"
    | "guardian_rejected"
    | "guardian_reported"
    | "bank_review_requested"
    | "expired"
    | "blocked";
  evidenceStatus: FamilyGuardEvidenceStatus;
  signalCodes: string[];
  entityFingerprints: string[];
  consented: true;
  status: "queued" | "processed";
  createdAt: string;
  processedAt: string | null;
}

export interface CreateFamilyGuardRequestInput {
  userId: string;
  fromAccount?: string;
  recipientName: string;
  recipientBank: string;
  accountNumber: string;
  amount: number;
  reference?: string;
  paymentType?: string;
  context: FamilyGuardContextAnswers;
}

export interface FamilyGuardSettingsUpdate {
  enabled?: boolean;
  accountHolderPhone?: string;
  softLimit?: number;
  guardianLimit?: number;
  hardLimit?: number;
  dailyFrequencyLimit?: number;
  dailyMaxAmount?: number;
  monthlyMaxAmount?: number;
  protectNewRecipients?: boolean;
  protectSuspiciousAccounts?: boolean;
  reviewUnusualActivity?: boolean;
  approvalTtlMinutes?: number;
  consent?: Partial<FamilyGuardConsent>;
  privacy?: Partial<
    Omit<
      FamilyGuardPrivacy,
      "shareProtectedTransferOnly" | "shareFullTransactionHistory"
    >
  >;
}

export interface FamilyGuardContactInput {
  ownerUserId: string;
  name: string;
  relationship: string;
  phone: string;
  role: "primary" | "backup";
  accepted: boolean;
}

export interface FamilyGuardDecisionInput {
  contactId: string;
  approvalCode: string;
  expectedVersion: number;
  action: FamilyGuardGuardianAction;
}

export interface FamilyGuardVerificationInput {
  expectedVersion: number;
  recommendation: FamilyGuardRecommendation;
  summary: string;
  warningSigns: string[];
  providerConversationId?: string;
}

export interface FamilyGuardRequestResult {
  request: FamilyGuardPublicApprovalRequest;
  verification: FamilyGuardVerificationSession | null;
  demo: {
    guardianApprovalCode: string | null;
    approvalCodeIsNotBankingOtp: true;
  };
}
