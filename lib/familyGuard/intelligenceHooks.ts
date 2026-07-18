import "server-only";

import * as json from "../jsonStore";
import {
  lookupLiveIntelligence,
  recordFamilyGuardOutcome,
} from "../intelligence/liveGraph";
import type {
  FamilyGuardApprovalRequest,
  FamilyGuardContextAnswers,
  FamilyGuardIntelligenceFeedback,
  FamilyGuardRiskSignal,
  FamilyGuardTransferSnapshot,
} from "./types";

export async function lookupLiveGraphSignals(input: {
  transfer: FamilyGuardTransferSnapshot;
  context: FamilyGuardContextAnswers;
}): Promise<FamilyGuardRiskSignal[]> {
  const lookup = await lookupLiveIntelligence({
    account: input.transfer.accountNumber,
    phone: extractPhone(input.context.notes) ?? undefined,
    website: extractWebsite(input.context.notes) ?? undefined,
  });
  if (!lookup.matched) return [];

  const points =
    lookup.status === "corroborated"
      ? 28
      : lookup.status === "user_reported"
        ? 20
        : lookup.status === "potentially_suspicious"
          ? 14
          : 8;
  return [
    {
      code: "graph_connection",
      title: "Connected to previous reports",
      explanation: `${lookup.previousReportCount} previous demo report${lookup.previousReportCount === 1 ? "" : "s"} share a masked account, phone, or website connection. ${lookup.explanation}`,
      points,
      source: "graph",
    },
  ];
}

export async function notifyOutcomeBridge(input: {
  request: FamilyGuardApprovalRequest;
  feedback: FamilyGuardIntelligenceFeedback[];
}): Promise<void> {
  const pending = input.feedback.filter(
    (entry) => entry.consented && entry.status === "queued",
  );

  for (const entry of pending) {
    await recordFamilyGuardOutcome({
      requestId: input.request.id,
      recipientName: input.request.transfer.recipientName,
      accountNumber: input.request.transfer.accountNumber,
      contactPhone: extractPhone(input.request.context.notes),
      website: extractWebsite(input.request.context.notes),
      contactChannel: input.request.context.contactChannel,
      warningSigns: unique([
        ...input.request.aiWarningSigns,
        ...input.request.risk.signals.map((signal) => signal.title),
      ]).slice(0, 12),
      recommendation:
        input.request.aiRecommendation ?? input.request.risk.recommendation,
      outcome: graphOutcome(entry.outcome),
      observedAt: entry.createdAt,
    });

    const processedAt = new Date().toISOString();
    await json.mutate((db) => {
      const stored = db.intelligenceFeedback.find(
        (candidate) => candidate.id === entry.id,
      );
      if (!stored || stored.status === "processed") return;
      stored.status = "processed";
      stored.processedAt = processedAt;
    });
  }
}

function graphOutcome(
  outcome: FamilyGuardIntelligenceFeedback["outcome"],
):
  | "reported_suspicious"
  | "rejected"
  | "approved_after_verification"
  | "bank_review"
  | "expired" {
  if (outcome === "guardian_reported") return "reported_suspicious";
  if (outcome === "approved_after_guardian") {
    return "approved_after_verification";
  }
  if (outcome === "bank_review_requested") return "bank_review";
  if (outcome === "expired") return "expired";
  return "rejected";
}

function extractPhone(value: string): string | null {
  const match = value.match(/(?:\+?60|0)[\d\s-]{8,15}\d/);
  return match?.[0].trim() ?? null;
}

function extractWebsite(value: string): string | null {
  const match = value.match(
    /(?:https?:\/\/)?(?:www\.)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,})+(?:\/[^\s]*)?/i,
  );
  return match?.[0] ?? null;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
