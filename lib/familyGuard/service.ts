import "server-only";

import * as json from "../jsonStore";
import * as dbx from "../databricks";
import {
  newId,
  type DbShape,
  type Transaction,
  type Transfer,
  type User,
} from "../types";
import {
  defaultFamilyGuardSettings,
  FAMILY_GUARD_CONSENT_VERSION,
} from "./seed";
import { assertFamilyGuard, FamilyGuardError } from "./errors";
import { evaluateFamilyGuardRisk } from "./policy";
import {
  lookupLiveGraphSignals,
  notifyOutcomeBridge,
} from "./intelligenceHooks";
import {
  amountToSen,
  createApprovalCredential,
  entityFingerprint,
  normalizeAccountNumber,
  normalizePhone,
  safetyPhrase,
  transferBindingHash,
  verifyApprovalCode,
} from "./security";
import type {
  CreateFamilyGuardRequestInput,
  FamilyGuardApprovalRequest,
  FamilyGuardAuditEvent,
  FamilyGuardContactInput,
  FamilyGuardDecisionInput,
  FamilyGuardGuardianDecision,
  FamilyGuardIntelligenceFeedback,
  FamilyGuardPublicApprovalRequest,
  FamilyGuardRequestResult,
  FamilyGuardRequestStatus,
  FamilyGuardSettings,
  FamilyGuardSettingsUpdate,
  FamilyGuardTrustedContact,
  FamilyGuardVerificationInput,
  FamilyGuardVerificationSession,
} from "./types";

const PENDING_STATUSES: FamilyGuardRequestStatus[] = [
  "awaiting_verification",
  "awaiting_guardian",
];

export async function getFamilyGuardSettings(
  userId: string,
): Promise<FamilyGuardSettings> {
  let result: FamilyGuardSettings | undefined;
  await json.mutate((db) => {
    assertUser(db, userId);
    result = ensureSettings(db, userId);
    expirePendingRequests(db, new Date());
  });
  return structuredClone(result!);
}

export async function updateFamilyGuardSettings(
  userId: string,
  patch: FamilyGuardSettingsUpdate,
): Promise<FamilyGuardSettings> {
  let result: FamilyGuardSettings | undefined;
  const now = new Date().toISOString();
  await json.mutate((db) => {
    assertUser(db, userId);
    const current = ensureSettings(db, userId);
    const consentAccepted =
      patch.consent?.accountHolderAccepted ?? current.consent.accountHolderAccepted;
    const consent = {
      ...current.consent,
      ...patch.consent,
      accountHolderAccepted: consentAccepted,
      acceptedAt:
        patch.consent?.accountHolderAccepted === true
          ? now
          : patch.consent?.accountHolderAccepted === false
            ? null
            : current.consent.acceptedAt,
      version:
        patch.consent?.accountHolderAccepted === true
          ? patch.consent.version ?? FAMILY_GUARD_CONSENT_VERSION
          : patch.consent?.version ?? current.consent.version,
    };
    const next: FamilyGuardSettings = {
      ...current,
      ...patch,
      schemaVersion: 1,
      userId,
      accountHolderPhone:
        patch.accountHolderPhone === undefined
          ? current.accountHolderPhone
          : normalizePhone(patch.accountHolderPhone),
      consent,
      privacy: {
        ...current.privacy,
        ...patch.privacy,
        shareProtectedTransferOnly: true,
        shareFullTransactionHistory: false,
      },
      updatedAt: now,
    };
    assertFamilyGuard(
      !(next.enabled && !next.consent.accountHolderAccepted),
      "The account holder must consent before Family Guard can be enabled.",
      409,
      "account_holder_consent_required",
    );
    assertLimitOrder(next);
    if (next.privacy.transcriptMode === "none") {
      next.privacy.transcriptRetentionDays = 0;
    }
    const index = db.familyGuardSettings.findIndex((item) => item.userId === userId);
    if (index >= 0) db.familyGuardSettings[index] = next;
    else db.familyGuardSettings.push(next);
    result = next;
    audit(db, "settings", "account_holder", "settings_updated", "Family Guard settings were updated.", now);
  });
  mirror(() => dbx.dbUpsertFamilyGuardSettings(result!));
  return structuredClone(result!);
}

export async function listTrustedContacts(
  ownerUserId: string,
): Promise<FamilyGuardTrustedContact[]> {
  const db = await json.read();
  assertUser(db, ownerUserId);
  return structuredClone(
    db.trustedContacts.filter((contact) => contact.ownerUserId === ownerUserId),
  );
}

export async function createTrustedContact(
  input: FamilyGuardContactInput,
): Promise<FamilyGuardTrustedContact> {
  let result: FamilyGuardTrustedContact | undefined;
  const now = new Date().toISOString();
  await json.mutate((db) => {
    assertUser(db, input.ownerUserId);
    const normalizedPhone = normalizePhone(input.phone);
    assertFamilyGuard(
      !db.trustedContacts.some(
        (contact) =>
          contact.ownerUserId === input.ownerUserId &&
          contact.status !== "revoked" &&
          normalizePhone(contact.phone) === normalizedPhone,
      ),
      "This trusted contact phone is already configured.",
      409,
      "duplicate_trusted_contact",
    );
    result = {
      id: newId("fgc"),
      ownerUserId: input.ownerUserId,
      name: input.name,
      relationship: input.relationship,
      phone: normalizedPhone,
      role: input.role,
      status: input.accepted ? "active" : "pending",
      permissions: {
        reviewProtectedTransfers: true,
        viewFullTransactionHistory: false,
      },
      invitedAt: now,
      acceptedAt: input.accepted ? now : null,
      revokedAt: null,
    };
    db.trustedContacts.push(result);
    audit(db, result.id, "account_holder", "trusted_contact_added", `${result.name} was added as a trusted contact.`, now);
  });
  mirror(() => dbx.dbUpsertTrustedContact(result!));
  return structuredClone(result!);
}

export async function replaceTrustedContact(
  id: string,
  input: FamilyGuardContactInput,
): Promise<FamilyGuardTrustedContact> {
  let result: FamilyGuardTrustedContact | undefined;
  const now = new Date().toISOString();
  await json.mutate((db) => {
    const index = db.trustedContacts.findIndex((contact) => contact.id === id);
    assertFamilyGuard(index >= 0, "Trusted contact not found.", 404, "not_found");
    const current = db.trustedContacts[index];
    assertFamilyGuard(
      current.ownerUserId === input.ownerUserId,
      "Trusted contact owner cannot be changed.",
      409,
      "owner_mismatch",
    );
    const acceptedAt = input.accepted ? current.acceptedAt ?? now : null;
    result = {
      ...current,
      name: input.name,
      relationship: input.relationship,
      phone: normalizePhone(input.phone),
      role: input.role,
      status: input.accepted ? "active" : "pending",
      acceptedAt,
      revokedAt: null,
      permissions: {
        reviewProtectedTransfers: true,
        viewFullTransactionHistory: false,
      },
    };
    db.trustedContacts[index] = result;
    audit(db, id, "account_holder", "trusted_contact_updated", `${result.name} was updated.`, now);
  });
  mirror(() => dbx.dbUpsertTrustedContact(result!));
  return structuredClone(result!);
}

export async function revokeTrustedContact(
  id: string,
): Promise<FamilyGuardTrustedContact> {
  let result: FamilyGuardTrustedContact | undefined;
  const now = new Date().toISOString();
  await json.mutate((db) => {
    const contact = db.trustedContacts.find((candidate) => candidate.id === id);
    assertFamilyGuard(contact, "Trusted contact not found.", 404, "not_found");
    contact.status = "revoked";
    contact.revokedAt = now;
    result = contact;
    audit(db, id, "account_holder", "trusted_contact_revoked", `${contact.name} was revoked.`, now);
  });
  mirror(() => dbx.dbUpsertTrustedContact(result!));
  return structuredClone(result!);
}

export async function createFamilyGuardRequest(
  input: CreateFamilyGuardRequestInput,
): Promise<FamilyGuardRequestResult> {
  const requestId = newId("fgr");
  const transferId = newId("txf");
  const verificationId = newId("fgv");
  const credential = createApprovalCredential();
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const graphTransfer = {
    userId: input.userId,
    fromAccount: input.fromAccount ?? "Personal Account (Savings)",
    recipientName: input.recipientName,
    recipientBank: input.recipientBank,
    accountNumber: input.accountNumber,
    normalizedAccountNumber: normalizeAccountNumber(input.accountNumber),
    amount: input.amount,
    amountSen: amountToSen(input.amount),
    currency: "MYR" as const,
    reference: input.reference ?? "",
    paymentType: input.paymentType ?? "Instant Transfer (DuitNow)",
  };
  const graphSignals = await lookupLiveGraphSignals({
    transfer: graphTransfer,
    context: input.context,
  });
  let request: FamilyGuardApprovalRequest | undefined;
  let verification: FamilyGuardVerificationSession | null = null;
  let changedUser: User | undefined;
  let changedTransfer: Transfer | undefined;
  let settings: FamilyGuardSettings | undefined;
  let feedback: FamilyGuardIntelligenceFeedback[] = [];

  await json.mutate((db) => {
    expirePendingRequests(db, nowDate);
    const user = assertUser(db, input.userId);
    settings = ensureSettings(db, input.userId);
    const amountSen = amountToSen(input.amount);
    assertFamilyGuard(
      amountSen > 0 && amountSen <= amountToSen(user.balance),
      "The transfer amount exceeds the available balance.",
      409,
      "insufficient_balance",
    );
    const transferSnapshot = graphTransfer;
    const activeContacts = db.trustedContacts.filter(
      (contact) =>
        contact.ownerUserId === input.userId && contact.status === "active",
    );
    const risk = evaluateFamilyGuardRisk({
      user,
      settings,
      transfer: transferSnapshot,
      context: input.context,
      transfers: db.transfers,
      suspicious: db.suspicious,
      activeTrustedContacts: activeContacts.length,
      graphSignals,
      now: nowDate,
    });
    const status = initialStatus(risk.requirements);
    const expiresAt = new Date(
      nowDate.getTime() + settings.approvalTtlMinutes * 60_000,
    ).toISOString();
    const pending = PENDING_STATUSES.includes(status);
    request = {
      id: requestId,
      transferId,
      ownerUserId: input.userId,
      trustedContactIds: activeContacts.map((contact) => contact.id),
      status,
      version: 1,
      bindingHash: transferBindingHash(transferSnapshot),
      transfer: transferSnapshot,
      context: input.context,
      risk,
      verificationSessionId:
        status === "awaiting_verification" ? verificationId : null,
      aiRecommendation: null,
      aiSummary: "",
      aiWarningSigns: [],
      guardianDecision: null,
      approvalCodeSalt: pending ? credential.salt : null,
      approvalCodeHash: pending ? credential.hash : null,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      resolvedAt: pending || status === "bank_review" ? null : now,
    };
    const transfer: Transfer = {
      id: transferId,
      userId: input.userId,
      fromAccount: transferSnapshot.fromAccount,
      recipientName: transferSnapshot.recipientName,
      recipientBank: transferSnapshot.recipientBank,
      accountNumber: transferSnapshot.accountNumber,
      amount: transferSnapshot.amount,
      reference: transferSnapshot.reference,
      paymentType: transferSnapshot.paymentType,
      status: transferStatus(status),
      createdAt: now,
    };
    db.approvalRequests.unshift(request);
    db.transfers.unshift(transfer);
    if (status === "awaiting_verification") {
      verification = {
        id: verificationId,
        requestId,
        safetyPhrase: safetyPhrase(requestId),
        status: "ready",
        providerConversationId: null,
        recommendation: null,
        summary: "",
        warningSigns: [],
        consentedAt: settings.privacy.voiceVerificationConsent ? now : "",
        createdAt: now,
        completedAt: null,
        deleteAfter: null,
      };
      db.verificationSessions.unshift(verification);
    }
    audit(db, requestId, "system", "request_created", risk.explanation, now);
    if (status === "completed") {
      applyBoundTransfer(db, request, now);
    } else if (status === "blocked") {
      queueFeedback(db, request, "blocked", "bank_verified", now);
    }
    changedUser = db.users.find((candidate) => candidate.id === input.userId);
    changedTransfer = db.transfers.find((candidate) => candidate.id === transferId);
    feedback = db.intelligenceFeedback.filter((entry) => entry.requestId === requestId);
  });

  mirrorFamilyGuardState({ request: request!, verification, user: changedUser!, transfer: changedTransfer! });
  for (const entry of feedback) mirror(() => dbx.dbUpsertFamilyGuardFeedback(entry));
  await notifyOutcomeBridge({ request: request!, feedback });
  return {
    request: publicRequest(request!),
    verification: publicVerification(verification),
    demo: {
      guardianApprovalCode: PENDING_STATUSES.includes(request!.status)
        ? credential.code
        : null,
      approvalCodeIsNotBankingOtp: true,
    },
  };
}

export async function listFamilyGuardRequests(filters: {
  ownerUserId?: string;
  contactId?: string;
  status?: FamilyGuardRequestStatus;
}): Promise<FamilyGuardPublicApprovalRequest[]> {
  let result: FamilyGuardApprovalRequest[] = [];
  await json.mutate((db) => {
    expirePendingRequests(db, new Date());
    result = db.approvalRequests.filter((request) => {
      if (filters.ownerUserId && request.ownerUserId !== filters.ownerUserId) return false;
      if (filters.contactId && !request.trustedContactIds.includes(filters.contactId)) return false;
      if (filters.status && request.status !== filters.status) return false;
      return true;
    });
  });
  return result.map(publicRequest);
}

export async function getFamilyGuardRequest(
  id: string,
): Promise<FamilyGuardRequestResult> {
  let request: FamilyGuardApprovalRequest | undefined;
  let verification: FamilyGuardVerificationSession | null = null;
  await json.mutate((db) => {
    expirePendingRequests(db, new Date());
    request = db.approvalRequests.find((candidate) => candidate.id === id);
    assertFamilyGuard(request, "Approval request not found.", 404, "not_found");
    verification = request.verificationSessionId
      ? db.verificationSessions.find(
          (candidate) => candidate.id === request!.verificationSessionId,
        ) ?? null
      : null;
  });
  return {
    request: publicRequest(request!),
    verification: publicVerification(verification),
    demo: { guardianApprovalCode: null, approvalCodeIsNotBankingOtp: true },
  };
}

export async function recordFamilyGuardVerification(
  requestId: string,
  input: FamilyGuardVerificationInput,
): Promise<FamilyGuardRequestResult> {
  let request: FamilyGuardApprovalRequest | undefined;
  let verification: FamilyGuardVerificationSession | null = null;
  const now = new Date().toISOString();
  await json.mutate((db) => {
    expirePendingRequests(db, new Date(now));
    request = db.approvalRequests.find((candidate) => candidate.id === requestId);
    assertFamilyGuard(request, "Approval request not found.", 404, "not_found");
    assertVersion(request, input.expectedVersion);
    assertFamilyGuard(
      request.status === "awaiting_verification",
      "This request is not awaiting verification.",
      409,
      "invalid_transition",
    );
    verification = db.verificationSessions.find(
      (candidate) => candidate.id === request!.verificationSessionId,
    ) ?? null;
    assertFamilyGuard(verification, "Verification session not found.", 409, "missing_verification");
    const settings = ensureSettings(db, request.ownerUserId);
    assertFamilyGuard(
      settings.privacy.voiceVerificationConsent,
      "The account holder must consent before a verification call result can be recorded.",
      409,
      "voice_consent_required",
    );
    verification.status = "completed";
    verification.recommendation = input.recommendation;
    verification.summary = input.summary;
    verification.warningSigns = [...input.warningSigns];
    verification.providerConversationId = input.providerConversationId ?? null;
    verification.completedAt = now;
    verification.deleteAfter = retentionDate(settings, now);
    request.aiRecommendation = input.recommendation;
    request.aiSummary = input.summary;
    request.aiWarningSigns = [...input.warningSigns];
    // An AI result can only hand the frozen request to a trusted person. It
    // can never complete or debit the transfer by itself.
    request.status = "awaiting_guardian";
    request.version += 1;
    request.updatedAt = now;
    const transfer = findTransfer(db, request.transferId);
    transfer.status = "pending_guardian";
    audit(db, request.id, "ai", "verification_recorded", `${input.recommendation}: ${input.summary}`, now);
  });
  mirror(() => dbx.dbUpsertFamilyGuardRequest(request!));
  if (verification) mirror(() => dbx.dbUpsertVerificationSession(verification!));
  return {
    request: publicRequest(request!),
    verification: publicVerification(verification),
    demo: { guardianApprovalCode: null, approvalCodeIsNotBankingOtp: true },
  };
}

export async function decideFamilyGuardRequest(
  requestId: string,
  input: FamilyGuardDecisionInput,
): Promise<FamilyGuardRequestResult> {
  let request: FamilyGuardApprovalRequest | undefined;
  let verification: FamilyGuardVerificationSession | null = null;
  let changedUser: User | undefined;
  let changedTransfer: Transfer | undefined;
  let feedback: FamilyGuardIntelligenceFeedback[] = [];
  const now = new Date().toISOString();
  await json.mutate((db) => {
    expirePendingRequests(db, new Date(now));
    request = db.approvalRequests.find((candidate) => candidate.id === requestId);
    assertFamilyGuard(request, "Approval request not found.", 404, "not_found");
    assertVersion(request, input.expectedVersion);
    assertFamilyGuard(
      request.status === "awaiting_guardian",
      "This request is not awaiting trusted approval.",
      409,
      "invalid_transition",
    );
    const contact = db.trustedContacts.find(
      (candidate) =>
        candidate.id === input.contactId &&
        candidate.status === "active" &&
        request!.trustedContactIds.includes(candidate.id),
    );
    assertFamilyGuard(
      contact,
      "This trusted contact cannot decide this request.",
      403,
      "contact_not_authorized",
    );
    assertFamilyGuard(
      request.approvalCodeSalt && request.approvalCodeHash,
      "This approval credential is no longer active.",
      409,
      "credential_inactive",
    );
    assertFamilyGuard(
      verifyApprovalCode(
        input.approvalCode,
        request.approvalCodeSalt,
        request.approvalCodeHash,
      ),
      "The transaction-bound approval code is invalid.",
      403,
      "invalid_approval_code",
    );

    const effectiveRecommendation =
      request.aiRecommendation ?? request.risk.recommendation;
    let outcome: FamilyGuardGuardianDecision["outcome"];
    if (input.action === "approve") {
      if (effectiveRecommendation === "high_risk") {
        request.status = "bank_review";
        findTransfer(db, request.transferId).status = "bank_review";
        outcome = "sent_to_bank_review";
        queueFeedback(db, request, "bank_review_requested", "observed", now);
      } else {
        applyBoundTransfer(db, request, now);
        outcome = "transfer_released";
        queueFeedback(db, request, "approved_after_guardian", "observed", now);
      }
    } else if (input.action === "reject") {
      request.status = "rejected";
      findTransfer(db, request.transferId).status = "rejected";
      outcome = "transfer_rejected";
      queueFeedback(db, request, "guardian_rejected", "observed", now);
    } else if (input.action === "report") {
      request.status = "reported";
      findTransfer(db, request.transferId).status = "reported";
      outcome = "reported_for_review";
      queueFeedback(db, request, "guardian_reported", "user_reported", now);
    } else {
      request.status = "bank_review";
      findTransfer(db, request.transferId).status = "bank_review";
      outcome = "sent_to_bank_review";
      queueFeedback(db, request, "bank_review_requested", "observed", now);
    }
    request.guardianDecision = {
      action: input.action,
      contactId: contact.id,
      decidedAt: now,
      authentication: "transaction_bound_demo_code",
      outcome,
    };
    request.approvalCodeSalt = null;
    request.approvalCodeHash = null;
    request.version += 1;
    request.updatedAt = now;
    request.resolvedAt = request.status === "bank_review" ? null : now;
    verification = request.verificationSessionId
      ? db.verificationSessions.find(
          (candidate) => candidate.id === request!.verificationSessionId,
        ) ?? null
      : null;
    changedUser = db.users.find((candidate) => candidate.id === request!.ownerUserId);
    changedTransfer = findTransfer(db, request.transferId);
    feedback = db.intelligenceFeedback.filter((entry) => entry.requestId === request!.id);
    audit(db, request.id, "guardian", `guardian_${input.action}`, `Trusted contact ${contact.name} selected ${input.action}.`, now);
  });
  mirrorFamilyGuardState({ request: request!, verification, user: changedUser!, transfer: changedTransfer! });
  for (const entry of feedback) mirror(() => dbx.dbUpsertFamilyGuardFeedback(entry));
  await notifyOutcomeBridge({ request: request!, feedback });
  return {
    request: publicRequest(request!),
    verification: publicVerification(verification),
    demo: { guardianApprovalCode: null, approvalCodeIsNotBankingOtp: true },
  };
}

export async function cancelFamilyGuardRequest(
  requestId: string,
  expectedVersion: number,
): Promise<FamilyGuardPublicApprovalRequest> {
  let request: FamilyGuardApprovalRequest | undefined;
  const now = new Date().toISOString();
  await json.mutate((db) => {
    expirePendingRequests(db, new Date(now));
    request = db.approvalRequests.find((candidate) => candidate.id === requestId);
    assertFamilyGuard(request, "Approval request not found.", 404, "not_found");
    assertVersion(request, expectedVersion);
    assertFamilyGuard(
      PENDING_STATUSES.includes(request.status),
      "Only a pending request can be cancelled.",
      409,
      "invalid_transition",
    );
    request.status = "cancelled";
    request.version += 1;
    request.updatedAt = now;
    request.resolvedAt = now;
    request.approvalCodeHash = null;
    request.approvalCodeSalt = null;
    findTransfer(db, request.transferId).status = "cancelled";
    audit(db, request.id, "account_holder", "request_cancelled", "The account holder cancelled the transfer.", now);
  });
  mirror(() => dbx.dbUpsertFamilyGuardRequest(request!));
  return publicRequest(request!);
}

export async function listFamilyGuardFeedback(): Promise<
  FamilyGuardIntelligenceFeedback[]
> {
  const db = await json.read();
  return structuredClone(db.intelligenceFeedback);
}

function ensureSettings(db: DbShape, userId: string): FamilyGuardSettings {
  let settings = db.familyGuardSettings.find((candidate) => candidate.userId === userId);
  if (!settings) {
    settings = defaultFamilyGuardSettings(userId, new Date().toISOString());
    db.familyGuardSettings.push(settings);
  }
  return settings;
}

function assertUser(db: DbShape, userId: string): User {
  const user = db.users.find((candidate) => candidate.id === userId);
  assertFamilyGuard(user, "User not found.", 404, "user_not_found");
  return user;
}

function assertLimitOrder(settings: FamilyGuardSettings): void {
  assertFamilyGuard(
    settings.softLimit <= settings.guardianLimit &&
      settings.guardianLimit <= settings.hardLimit,
    "Limits must follow soft limit ≤ guardian limit ≤ hard limit.",
    400,
    "invalid_limit_order",
  );
  assertFamilyGuard(
    settings.dailyMaxAmount <= settings.monthlyMaxAmount,
    "Daily maximum must not exceed the monthly maximum.",
    400,
    "invalid_limit_order",
  );
}

function initialStatus(
  requirements: FamilyGuardApprovalRequest["risk"]["requirements"],
): FamilyGuardRequestStatus {
  if (requirements.hardBlock) return "blocked";
  if (requirements.bankReview) return "bank_review";
  if (requirements.aiVerification) return "awaiting_verification";
  if (requirements.guardianApproval) return "awaiting_guardian";
  return "completed";
}

function transferStatus(status: FamilyGuardRequestStatus): Transfer["status"] {
  if (status === "awaiting_verification") return "pending_verification";
  if (status === "awaiting_guardian") return "pending_guardian";
  return status;
}

function findTransfer(db: DbShape, id: string): Transfer {
  const transfer = db.transfers.find((candidate) => candidate.id === id);
  assertFamilyGuard(transfer, "Bound transfer not found.", 409, "missing_transfer");
  return transfer;
}

function applyBoundTransfer(
  db: DbShape,
  request: FamilyGuardApprovalRequest,
  now: string,
): void {
  assertFamilyGuard(
    transferBindingHash(request.transfer) === request.bindingHash,
    "The protected transfer binding failed its integrity check.",
    409,
    "binding_mismatch",
  );
  const user = assertUser(db, request.ownerUserId);
  const currentBalanceSen = amountToSen(user.balance);
  assertFamilyGuard(
    currentBalanceSen >= request.transfer.amountSen,
    "The available balance changed before approval. No money was sent.",
    409,
    "insufficient_balance",
  );
  user.balance = (currentBalanceSen - request.transfer.amountSen) / 100;
  const transaction: Transaction = {
    id: newId("t"),
    date: new Date(now).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    description: `DuitNow Transfer to ${request.transfer.recipientName}`,
    amount: request.transfer.amount,
    type: "debit",
  };
  user.transactions.unshift(transaction);
  findTransfer(db, request.transferId).status = "completed";
  request.status = "completed";
  request.resolvedAt = now;
}

function assertVersion(
  request: FamilyGuardApprovalRequest,
  expectedVersion: number,
): void {
  assertFamilyGuard(
    request.version === expectedVersion,
    "This request changed. Refresh before trying again.",
    409,
    "version_conflict",
  );
}

function expirePendingRequests(db: DbShape, now: Date): void {
  const nowIso = now.toISOString();
  for (const request of db.approvalRequests) {
    if (!PENDING_STATUSES.includes(request.status)) continue;
    if (new Date(request.expiresAt).getTime() > now.getTime()) continue;
    request.status = "expired";
    request.version += 1;
    request.updatedAt = nowIso;
    request.resolvedAt = nowIso;
    request.approvalCodeHash = null;
    request.approvalCodeSalt = null;
    const transfer = db.transfers.find(
      (candidate) => candidate.id === request.transferId,
    );
    if (transfer) transfer.status = "expired";
    queueFeedback(db, request, "expired", "observed", nowIso);
    audit(db, request.id, "system", "request_expired", "The trusted approval window expired without sending money.", nowIso);
  }
}

function retentionDate(settings: FamilyGuardSettings, completedAt: string): string | null {
  if (
    settings.privacy.transcriptMode === "none" ||
    settings.privacy.transcriptRetentionDays === 0
  ) {
    return completedAt;
  }
  return new Date(
    new Date(completedAt).getTime() +
      settings.privacy.transcriptRetentionDays * 24 * 60 * 60 * 1000,
  ).toISOString();
}

function queueFeedback(
  db: DbShape,
  request: FamilyGuardApprovalRequest,
  outcome: FamilyGuardIntelligenceFeedback["outcome"],
  evidenceStatus: FamilyGuardIntelligenceFeedback["evidenceStatus"],
  now: string,
): void {
  const settings = ensureSettings(db, request.ownerUserId);
  if (!settings.privacy.intelligenceFeedbackConsent) return;
  if (db.intelligenceFeedback.some((entry) => entry.requestId === request.id && entry.outcome === outcome)) return;
  db.intelligenceFeedback.unshift({
    id: newId("fgf"),
    requestId: request.id,
    transferId: request.transferId,
    outcome,
    evidenceStatus,
    signalCodes: request.risk.signals.map((signal) => signal.code),
    entityFingerprints: [
      entityFingerprint("account", request.transfer.normalizedAccountNumber),
    ],
    consented: true,
    status: "queued",
    createdAt: now,
    processedAt: null,
  });
}

function audit(
  db: DbShape,
  requestId: string,
  actor: FamilyGuardAuditEvent["actor"],
  action: string,
  detail: string,
  createdAt: string,
): void {
  db.familyGuardAudit.unshift({
    id: newId("fga"),
    requestId,
    actor,
    action,
    detail,
    createdAt,
  });
}

function publicRequest(
  request: FamilyGuardApprovalRequest,
): FamilyGuardPublicApprovalRequest {
  const { approvalCodeSalt: _salt, approvalCodeHash: _hash, ...publicFields } =
    request;
  void _salt;
  void _hash;
  return structuredClone(publicFields);
}

function publicVerification(
  verification: FamilyGuardVerificationSession | null,
): FamilyGuardVerificationSession | null {
  if (!verification) return null;
  return structuredClone({ ...verification, providerConversationId: null });
}

function mirror(operation: () => Promise<unknown>): void {
  if (!dbx.DB_MIRROR) return;
  void operation().catch((error) =>
    console.warn(
      "[family-guard] Databricks mirror failed:",
      error instanceof Error ? error.message : error,
    ),
  );
}

function mirrorFamilyGuardState(input: {
  request: FamilyGuardApprovalRequest;
  verification: FamilyGuardVerificationSession | null;
  user: User;
  transfer: Transfer;
}): void {
  mirror(() => dbx.dbUpsertFamilyGuardRequest(input.request));
  if (input.verification) {
    mirror(() => dbx.dbUpsertVerificationSession(input.verification!));
  }
  mirror(() => dbx.dbUpdateUser(input.user.id, {
    balance: input.user.balance,
    transactions: input.user.transactions,
  }));
  mirror(() => dbx.dbUpsertTransfer(input.transfer));
}

export { FamilyGuardError };
