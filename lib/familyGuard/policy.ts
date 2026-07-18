import type { SuspiciousAccount, Transfer, User } from "../types";
import type {
  FamilyGuardContextAnswers,
  FamilyGuardRiskAssessment,
  FamilyGuardRiskSignal,
  FamilyGuardSettings,
  FamilyGuardTransferSnapshot,
} from "./types";

export interface FamilyGuardPolicyInput {
  user: User;
  settings: FamilyGuardSettings;
  transfer: FamilyGuardTransferSnapshot;
  context: FamilyGuardContextAnswers;
  transfers: Transfer[];
  suspicious: SuspiciousAccount[];
  activeTrustedContacts: number;
  graphSignals?: FamilyGuardRiskSignal[];
  now: Date;
}

export function evaluateFamilyGuardRisk(
  input: FamilyGuardPolicyInput,
): FamilyGuardRiskAssessment {
  const { settings, transfer, context, now } = input;
  const signals: FamilyGuardRiskSignal[] = [];
  signals.push(...(input.graphSignals ?? []));
  const completed = input.transfers.filter(
    (candidate) =>
      candidate.userId === transfer.userId && candidate.status === "completed",
  );
  const isNewRecipient = !completed.some(
    (candidate) =>
      normalizeAccount(candidate.accountNumber) === transfer.normalizedAccountNumber,
  );
  const suspiciousMatch = input.suspicious.find(
    (candidate) =>
      normalizeAccount(candidate.accountNumber) === transfer.normalizedAccountNumber,
  );
  const suspiciousEvidenceStatus = suspiciousMatch?.evidenceStatus ??
    (suspiciousMatch ? "user_reported" : null);

  if (isNewRecipient && settings.protectNewRecipients) {
    add(
      signals,
      "new_recipient",
      "New recipient",
      "No completed transfer to this account appears in the account holder's history.",
      12,
      "transaction",
    );
  }
  if (transfer.amount > settings.softLimit) {
    add(
      signals,
      "soft_limit",
      "Protected amount reached",
      `RM ${money(transfer.amount)} is above the RM ${money(settings.softLimit)} verification limit.`,
      10,
      "limits",
    );
  }
  if (transfer.amount > settings.guardianLimit) {
    add(
      signals,
      "guardian_limit",
      "Trusted approval required",
      `RM ${money(transfer.amount)} is above the RM ${money(settings.guardianLimit)} trusted-approval limit.`,
      12,
      "limits",
    );
  }
  if (transfer.amount > settings.hardLimit) {
    add(
      signals,
      "hard_limit",
      "Manual bank review limit reached",
      `RM ${money(transfer.amount)} is above the RM ${money(settings.hardLimit)} hard limit.`,
      35,
      "limits",
    );
  }

  const today = dayKey(now);
  const month = monthKey(now);
  const completedToday = completed.filter(
    (candidate) => dayKey(new Date(candidate.createdAt)) === today,
  );
  const completedThisMonth = completed.filter(
    (candidate) => monthKey(new Date(candidate.createdAt)) === month,
  );
  if (completedToday.length + 1 > settings.dailyFrequencyLimit) {
    add(
      signals,
      "daily_frequency",
      "Daily transfer frequency exceeded",
      `This would be transfer ${completedToday.length + 1} today; the protected limit is ${settings.dailyFrequencyLimit}.`,
      16,
      "limits",
    );
  }
  if (sum(completedToday) + transfer.amount > settings.dailyMaxAmount) {
    add(
      signals,
      "daily_amount",
      "Daily protected amount exceeded",
      "This payment would take today's completed transfers above the configured daily amount.",
      18,
      "limits",
    );
  }
  if (sum(completedThisMonth) + transfer.amount > settings.monthlyMaxAmount) {
    add(
      signals,
      "monthly_amount",
      "Monthly protected amount exceeded",
      "This payment would take this month's completed transfers above the configured monthly amount.",
      20,
      "limits",
    );
  }

  const usualDebitMaximum = Math.max(
    0,
    ...input.user.transactions
      .filter((transaction) => transaction.type === "debit")
      .map((transaction) => transaction.amount),
  );
  if (
    settings.reviewUnusualActivity &&
    usualDebitMaximum > 0 &&
    transfer.amount > usualDebitMaximum * 1.25
  ) {
    add(
      signals,
      "unusual_amount",
      "Amount differs from normal activity",
      `The amount is more than 25% above the largest debit currently shown in this demo account history.`,
      12,
      "transaction",
    );
  }

  if (suspiciousMatch && settings.protectSuspiciousAccounts) {
    add(
      signals,
      suspiciousEvidenceStatus === "bank_verified"
        ? "bank_verified_suspicious"
        : "reported_suspicious",
      suspiciousEvidenceStatus === "bank_verified"
        ? "Bank-verified suspicious account"
        : "Reported account",
      `${suspiciousMatch.reason}. Evidence status: ${String(suspiciousEvidenceStatus).replaceAll("_", " ")}.`,
      suspiciousEvidenceStatus === "bank_verified" ? 100 : 28,
      "suspicious_list",
    );
  }

  if (context.contactChannel !== "known_person") {
    add(
      signals,
      "external_contact_channel",
      "Payment request began outside the banking app",
      channelExplanation(context.contactChannel),
      6,
      "context",
    );
  }
  if (context.urgency) {
    add(signals, "urgency", "Urgency pressure", "The user was asked to act immediately.", 12, "context");
  }
  if (context.secrecy) {
    add(signals, "secrecy", "Secrecy request", "The user was asked not to discuss the payment.", 18, "context");
  }
  if (context.promisedReward) {
    add(signals, "reward", "Guaranteed reward or profit", "The payment is connected to a promised profit, commission, or reward.", 18, "context");
  }
  if (context.remoteAccess) {
    add(signals, "remote_access", "Device or banking access requested", "The user was asked to install an app, share a screen, or reveal banking information.", 25, "context");
  }

  const guardActive = settings.enabled && settings.consent.accountHolderAccepted;
  const hardBlock = suspiciousEvidenceStatus === "bank_verified";
  const exceedsHardLimit = transfer.amount > settings.hardLimit;
  const riskySignal = signals.some((signal) => signal.points >= 12);
  const aiVerification = guardActive && !hardBlock && !exceedsHardLimit && riskySignal;
  const guardianApproval = guardActive && !hardBlock && !exceedsHardLimit && riskySignal;
  const missingGuardian = guardianApproval && input.activeTrustedContacts === 0;
  if (missingGuardian) {
    add(
      signals,
      "no_active_guardian",
      "No active trusted contact",
      "A protected transfer cannot be released until an accepted trusted contact is configured.",
      0,
      "limits",
    );
  }

  const score = Math.min(100, signals.reduce((total, signal) => total + signal.points, 0));
  const level = score >= 75 ? "critical" : score >= 50 ? "high" : score >= 25 ? "medium" : "low";
  const recommendation = score >= 50 ? "high_risk" : score >= 25 ? "uncertain" : "low_risk";
  const bankReview = exceedsHardLimit || missingGuardian;

  return {
    score,
    level,
    recommendation,
    signals,
    isNewRecipient,
    suspiciousAccountMatch: Boolean(suspiciousMatch),
    suspiciousEvidenceStatus,
    requirements: {
      aiVerification,
      guardianApproval,
      bankReview,
      hardBlock,
    },
    explanation: explanationFor(hardBlock, bankReview, signals.length),
    safeNextSteps: [
      "Pause and verify the recipient using contact details found independently.",
      "Never share a banking OTP, PIN, password, or Secure2u approval.",
      "Ask a trusted contact to review only this exact recipient and amount.",
    ],
    evaluatedAt: now.toISOString(),
  };
}

function add(
  signals: FamilyGuardRiskSignal[],
  code: string,
  title: string,
  explanation: string,
  points: number,
  source: FamilyGuardRiskSignal["source"],
): void {
  signals.push({ code, title, explanation, points, source });
}

function sum(transfers: Transfer[]): number {
  return transfers.reduce((total, transfer) => total + transfer.amount, 0);
}

function normalizeAccount(value: string): string {
  return value.replace(/\D/g, "");
}

function money(value: number): string {
  return value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function dayKey(value: Date): string {
  return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
}

function monthKey(value: Date): string {
  return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 7);
}

function channelExplanation(channel: FamilyGuardContextAnswers["contactChannel"]): string {
  const labels: Record<FamilyGuardContextAnswers["contactChannel"], string> = {
    whatsapp_or_sms: "The request began through WhatsApp or SMS.",
    phone_call: "The request began through a phone call.",
    social_media: "The request began on social media.",
    online_marketplace: "The request began on an online marketplace.",
    investment_group: "The request began in an investment group.",
    job_or_task: "The request began with a job or paid-task offer.",
    known_person: "The request came from someone the user knows personally.",
    other: "The request began through another external channel.",
  };
  return labels[channel];
}

function explanationFor(
  hardBlock: boolean,
  bankReview: boolean,
  signalCount: number,
): string {
  if (hardBlock) {
    return "The recipient is bank-verified as suspicious, so no guardian action can release this transfer.";
  }
  if (bankReview) {
    return "The configured protection rules require manual bank review; the money has not been sent.";
  }
  if (signalCount > 0) {
    return `Scam Guard found ${signalCount} warning sign(s). This does not prove fraud; verification and trusted approval are required.`;
  }
  return "No major warning signs were found by the deterministic demo checks.";
}
