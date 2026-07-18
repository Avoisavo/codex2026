import "server-only";

import type {
  FamilyGuardApprovalRequest,
  FamilyGuardContextAnswers,
  FamilyGuardIntelligenceFeedback,
  FamilyGuardRiskSignal,
  FamilyGuardTransferSnapshot,
} from "./types";

/**
 * Deliberate integration seam for a reviewed, live graph lookup.
 *
 * It returns no signals today, so the isolated `/intelligence` simulator keeps
 * its truthful boundary. A future bridge can replace this implementation with
 * a privacy-safe lookup without changing the approval state machine.
 */
export async function lookupLiveGraphSignals(_input: {
  transfer: FamilyGuardTransferSnapshot;
  context: FamilyGuardContextAnswers;
}): Promise<FamilyGuardRiskSignal[]> {
  void _input;
  return [];
}

/**
 * Outbox hook called only after a terminal outcome has been persisted. The
 * durable `intelligenceFeedback` collection remains the source of truth, so a
 * later graph sync can retry idempotently if this hook ever performs I/O.
 */
export async function notifyOutcomeBridge(_input: {
  request: FamilyGuardApprovalRequest;
  feedback: FamilyGuardIntelligenceFeedback[];
}): Promise<void> {
  void _input;
  return;
}
