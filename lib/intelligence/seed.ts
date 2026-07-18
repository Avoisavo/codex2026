import type { PersistedIntelligenceState } from "./state";
import type {
  IntelligenceAgentProfile,
  IntelligenceConversationContext,
  IntelligenceEvidenceGovernance,
  IntelligenceEvidenceSource,
  IntelligenceIndicatorKind,
  IntelligenceReport,
  IntelligenceReportIndicator,
  IntelligenceTransactionContext,
} from "./types";

const SEED_TIME = "2026-07-18T00:00:00.000Z";

const AGENTS: IntelligenceAgentProfile[] = [
  {
    name: "Transaction Agent",
    role: "Evaluates synthetic transaction context for amount, velocity, and beneficiary anomalies.",
    deterministic: true,
    externalCalls: false,
  },
  {
    name: "Conversation Agent",
    role: "Detects urgency, secrecy, authority, and reward manipulation in supplied excerpts.",
    deterministic: true,
    externalCalls: false,
  },
  {
    name: "Entity Agent",
    role: "Normalizes reported accounts, phone numbers, phrases, and URLs into evidence entities.",
    deterministic: true,
    externalCalls: false,
  },
  {
    name: "Graph Agent",
    role: "Links independent synthetic cases and applies evidence-governance status rules.",
    deterministic: true,
    externalCalls: false,
  },
  {
    name: "Scam Pattern Agent",
    role: "Matches explainable scam types and proposes non-deployed shadow candidates.",
    deterministic: true,
    externalCalls: false,
  },
  {
    name: "Education Agent",
    role: "Translates detected warning signs into plain-language safety guidance.",
    deterministic: true,
    externalCalls: false,
  },
  {
    name: "Orchestrator",
    role: "Combines agent findings into an advisory shadow recommendation that is never enforced.",
    deterministic: true,
    externalCalls: false,
  },
];

interface SeedReportInput {
  id: string;
  receivedAt: string;
  title: string;
  narrative: string;
  channel: string;
  location: string;
  scamType: string;
  indicators: IntelligenceReportIndicator[];
  transactionContext: IntelligenceTransactionContext;
  conversationContext: IntelligenceConversationContext;
}

function dateAfter(value: string, days: number): string {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function normalize(kind: IntelligenceIndicatorKind, value: string): string {
  if (kind === "account" || kind === "phone") {
    return value.replace(/\D/g, "");
  }

  if (kind === "url") {
    return value.trim().toLowerCase().replace(/\/$/, "");
  }

  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function indicator(
  kind: IntelligenceIndicatorKind,
  value: string,
  label: string,
): IntelligenceReportIndicator {
  return { kind, value, normalizedValue: normalize(kind, value), label };
}

function evidenceSources(
  caseId: string,
  observedAt: string,
): IntelligenceEvidenceSource[] {
  return [
    {
      id: `${caseId}_source_report`,
      kind: "synthetic_user_report",
      label: "Synthetic victim report submitted to the intelligence lab",
      caseId,
      observedAt,
      synthetic: true,
    },
    {
      id: `${caseId}_source_transaction`,
      kind: "synthetic_transaction_context",
      label: "Synthetic transaction context generated for the hackathon demo",
      caseId,
      observedAt,
      synthetic: true,
    },
    {
      id: `${caseId}_source_conversation`,
      kind: "synthetic_conversation_excerpt",
      label: "Synthetic conversation excerpt supplied with the case",
      caseId,
      observedAt,
      synthetic: true,
    },
  ];
}

function reportGovernance(
  sources: IntelligenceEvidenceSource[],
  observedAt: string,
): IntelligenceEvidenceGovernance {
  return {
    status: "user_reported",
    confidence: 0.7,
    evidenceSources: sources,
    firstObservedAt: observedAt,
    lastObservedAt: observedAt,
    reason:
      "This is a synthetic user-reported case. It has not been verified by a bank or external authority.",
    reviewDate: dateAfter(observedAt, 14),
    expiryDate: dateAfter(observedAt, 90),
  };
}

function report(input: SeedReportInput): IntelligenceReport {
  const sources = evidenceSources(input.id, input.receivedAt);
  return {
    ...input,
    status: "queued",
    evidenceSources: sources,
    governance: reportGovernance(sources, input.receivedAt),
    agentFindings: [],
    linkedReportIds: [],
    processedAt: null,
    riskScore: null,
    riskLevel: null,
  };
}

function seedReports(): IntelligenceReport[] {
  const sharedPhone = "+60 11-2088 4412";
  const sharedAccount = "5620 3499 1208";
  const sharedPhrase = "complete the task to unlock commission";

  return [
    report({
      id: "report_task_001",
      receivedAt: "2026-07-14T02:10:00.000Z",
      title: "Product-rating task escalated to a prepaid commission",
      narrative:
        "A WhatsApp recruiter offered RM15 for each product rating, then demanded RM450 to complete the task to unlock commission through a reward dashboard.",
      channel: "WhatsApp",
      location: "Kuala Lumpur",
      scamType: "task scam",
      indicators: [
        indicator("phone", sharedPhone, "Recruiter WhatsApp number"),
        indicator("phrase", sharedPhrase, "Commission-unlock script"),
        indicator("url", "https://my-task-reward.example", "Task dashboard"),
      ],
      transactionContext: {
        amount: 450,
        currency: "MYR",
        isNewBeneficiary: true,
        previousTransfersToBeneficiary: 0,
        transfersLastHour: 2,
        usualAmountMaximum: 180,
        minutesSinceBeneficiaryAdded: 11,
      },
      conversationContext: {
        excerpt:
          "You already earned RM45. Pay now to complete the task to unlock commission. Do not leave the group or your reward will expire.",
        language: "English",
        messageCount: 18,
        initiatedByUnknownContact: true,
      },
    }),
    report({
      id: "report_task_002",
      receivedAt: "2026-07-15T05:35:00.000Z",
      title: "Telegram job group requested a top-up for the next task tier",
      narrative:
        "A Telegram group moved the victim to WhatsApp and requested RM1,200 to complete the task to unlock commission, paid into a personal bank account.",
      channel: "Telegram to WhatsApp",
      location: "Petaling Jaya, Selangor",
      scamType: "task scam",
      indicators: [
        indicator("phone", sharedPhone, "Task coordinator number"),
        indicator("account", sharedAccount, "Top-up beneficiary account"),
        indicator("phrase", sharedPhrase, "Commission-unlock script"),
      ],
      transactionContext: {
        amount: 1200,
        currency: "MYR",
        isNewBeneficiary: true,
        previousTransfersToBeneficiary: 0,
        transfersLastHour: 3,
        usualAmountMaximum: 350,
        minutesSinceBeneficiaryAdded: 6,
      },
      conversationContext: {
        excerpt:
          "This is the final top-up. Complete the task to unlock commission immediately and do not tell anyone until the merchant releases it.",
        language: "English",
        messageCount: 31,
        initiatedByUnknownContact: true,
      },
    }),
    report({
      id: "report_task_003",
      receivedAt: "2026-07-16T09:20:00.000Z",
      title: "Social-media review work led to a withdrawal fee demand",
      narrative:
        "A social-media contact promised paid review work. After several small rewards, the portal demanded another transfer to complete the task to unlock commission immediately.",
      channel: "Instagram direct message",
      location: "Johor Bahru, Johor",
      scamType: "task scam",
      indicators: [
        indicator("account", sharedAccount, "Withdrawal-fee beneficiary account"),
        indicator("phone", "+60 11-7721 9056", "Portal support number"),
        indicator("phrase", sharedPhrase, "Commission-unlock script"),
        indicator("url", "https://merchant-review-hub.example", "Review-work portal"),
      ],
      transactionContext: {
        amount: 2850,
        currency: "MYR",
        isNewBeneficiary: true,
        previousTransfersToBeneficiary: 0,
        transfersLastHour: 4,
        usualAmountMaximum: 500,
        minutesSinceBeneficiaryAdded: 4,
      },
      conversationContext: {
        excerpt:
          "Last slot only. Transfer immediately to complete the task to unlock commission, otherwise the platform will freeze all previous rewards.",
        language: "English",
        messageCount: 27,
        initiatedByUnknownContact: true,
      },
    }),
    report({
      id: "report_impersonation_004",
      receivedAt: "2026-07-17T03:45:00.000Z",
      title: "Bank Negara impersonator claimed the account was under investigation",
      narrative:
        "A caller claiming to represent Bank Negara and the police said the victim's account was under investigation and ordered an immediate transfer to a so-called safe account.",
      channel: "Phone call",
      location: "George Town, Penang",
      scamType: "authority impersonation",
      indicators: [
        indicator("phone", "+60 3-8899 0417", "Spoofed authority line"),
        indicator("account", "8000 0111 2233", "Purported safe account"),
        indicator(
          "phrase",
          "your account is under investigation",
          "Authority-pressure script",
        ),
      ],
      transactionContext: {
        amount: 9800,
        currency: "MYR",
        isNewBeneficiary: true,
        previousTransfersToBeneficiary: 0,
        transfersLastHour: 1,
        usualAmountMaximum: 900,
        minutesSinceBeneficiaryAdded: 9,
      },
      conversationContext: {
        excerpt:
          "I am calling from Bank Negara with the police. Your account is under investigation. Transfer to the safe account now and do not call your bank.",
        language: "English",
        messageCount: 12,
        initiatedByUnknownContact: true,
      },
    }),
  ];
}

export function createSeedState(): PersistedIntelligenceState {
  return {
    schemaVersion: 2,
    updatedAt: SEED_TIME,
    runSequence: 0,
    boundary: {
      mode: "shadow",
      mainFlowConnected: false,
      shadowOnly: true,
      enforced: false,
      deployedRules: 0,
      store: "data/intelligence.json",
      syntheticDataOnly: true,
      externalCalls: false,
    },
    agents: AGENTS.map((agent) => ({ ...agent })),
    reports: seedReports(),
    graph: { nodes: [], edges: [] },
    patterns: [],
    shadowRules: [],
    riskAssessments: [],
    shadowOutput: {
      shadowOnly: true,
      enforced: false,
      mainFlowConnected: false,
      generatedBy: "Orchestrator",
      recommendation: "insufficient_evidence",
      confidence: 0,
      headline: "Waiting for synthetic cases to be processed",
      rationale: [
        "The isolated queue contains mock evidence, but no agent run has evaluated it yet.",
      ],
      basedOnReportIds: [],
      education: {
        title: "Pause before paying an unfamiliar beneficiary",
        summary:
          "Unexpected job offers and official-sounding calls should be verified through a trusted channel before any transfer.",
        warningSigns: [
          "A stranger promises easy commission after an upfront payment.",
          "A caller creates urgency or asks you to keep the transfer secret.",
        ],
        safeNextSteps: [
          "Stop communicating and independently verify the organisation.",
          "Do not share OTPs, passwords, or banking credentials.",
        ],
      },
      limitations: [
        "All cases and transaction details are synthetic.",
        "The simulator has no connection to banking APIs or the main transfer flow.",
        "Recommendations are educational and are never enforced.",
      ],
      generatedAt: null,
    },
    agentRuns: [],
  };
}

