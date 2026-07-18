import { assertFamilyGuard } from "./errors";
import type {
  CreateFamilyGuardRequestInput,
  FamilyGuardContactChannel,
  FamilyGuardContactInput,
  FamilyGuardContextAnswers,
  FamilyGuardDecisionInput,
  FamilyGuardGuardianAction,
  FamilyGuardRecommendation,
  FamilyGuardSettingsUpdate,
  FamilyGuardVerificationInput,
} from "./types";

const CHANNELS: FamilyGuardContactChannel[] = [
  "whatsapp_or_sms",
  "phone_call",
  "social_media",
  "online_marketplace",
  "investment_group",
  "job_or_task",
  "known_person",
  "other",
];
const RECOMMENDATIONS: FamilyGuardRecommendation[] = [
  "low_risk",
  "uncertain",
  "high_risk",
];
const ACTIONS: FamilyGuardGuardianAction[] = [
  "approve",
  "reject",
  "report",
  "escalate",
];

export function parseCreateRequest(value: unknown): CreateFamilyGuardRequestInput {
  const body = object(value);
  const context = object(body.context);
  const contactChannel = stringValue(context.contactChannel, "context.contactChannel", 40);
  assertFamilyGuard(
    CHANNELS.includes(contactChannel as FamilyGuardContactChannel),
    "context.contactChannel is not supported.",
  );

  const amount = numberValue(body.amount, "amount");
  assertFamilyGuard(amount > 0 && amount <= 100_000_000, "amount must be positive.");
  assertFamilyGuard(
    Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001,
    "amount must have no more than two decimal places.",
  );
  const accountNumber = stringValue(body.accountNumber, "accountNumber", 40);
  const digits = accountNumber.replace(/\D/g, "");
  assertFamilyGuard(
    digits.length >= 6 && digits.length <= 24,
    "accountNumber must contain 6 to 24 digits.",
  );

  return {
    userId: stringValue(body.userId, "userId", 80),
    fromAccount: optionalString(body.fromAccount, "fromAccount", 120),
    recipientName: stringValue(body.recipientName, "recipientName", 120),
    recipientBank: stringValue(body.recipientBank, "recipientBank", 120),
    accountNumber,
    amount,
    reference: optionalString(body.reference, "reference", 160),
    paymentType: optionalString(body.paymentType, "paymentType", 120),
    context: {
      contactChannel: contactChannel as FamilyGuardContactChannel,
      urgency: booleanValue(context.urgency, "context.urgency"),
      secrecy: booleanValue(context.secrecy, "context.secrecy"),
      promisedReward: booleanValue(
        context.promisedReward,
        "context.promisedReward",
      ),
      remoteAccess: booleanValue(context.remoteAccess, "context.remoteAccess"),
      notes: optionalString(context.notes, "context.notes", 500),
    },
  };
}

export function parseDecision(value: unknown): FamilyGuardDecisionInput {
  const body = object(value);
  const action = stringValue(body.action, "action", 20);
  assertFamilyGuard(
    ACTIONS.includes(action as FamilyGuardGuardianAction),
    "action must be approve, reject, report, or escalate.",
  );
  const approvalCode = stringValue(body.approvalCode, "approvalCode", 32);
  assertFamilyGuard(
    /^\d{4,8}$/.test(approvalCode),
    "approvalCode must contain 4 to 8 digits.",
  );
  return {
    action: action as FamilyGuardGuardianAction,
    contactId: stringValue(body.contactId, "contactId", 100),
    approvalCode,
    expectedVersion: nonNegativeInteger(body.expectedVersion, "expectedVersion"),
  };
}

export function parseVerification(value: unknown): FamilyGuardVerificationInput {
  const body = object(value);
  const recommendation = stringValue(body.recommendation, "recommendation", 30);
  assertFamilyGuard(
    RECOMMENDATIONS.includes(recommendation as FamilyGuardRecommendation),
    "recommendation must be low_risk, uncertain, or high_risk.",
  );
  assertFamilyGuard(
    Array.isArray(body.warningSigns),
    "warningSigns must be an array.",
  );
  const warningSigns = body.warningSigns.map((entry, index) =>
    stringValue(entry, `warningSigns[${index}]`, 240),
  );
  assertFamilyGuard(
    warningSigns.length <= 12,
    "warningSigns may contain at most 12 entries.",
  );
  return {
    expectedVersion: nonNegativeInteger(body.expectedVersion, "expectedVersion"),
    recommendation: recommendation as FamilyGuardRecommendation,
    summary: stringValue(body.summary, "summary", 1200),
    warningSigns,
    providerConversationId: optionalString(
      body.providerConversationId,
      "providerConversationId",
      200,
    ) || undefined,
  };
}

export function parseSettingsUpdate(value: unknown): FamilyGuardSettingsUpdate {
  const body = object(value);
  const result: FamilyGuardSettingsUpdate = {};
  assignBoolean(body, result, "enabled");
  assignString(body, result, "accountHolderPhone", 40);
  assignPositiveNumber(body, result, "softLimit");
  assignPositiveNumber(body, result, "guardianLimit");
  assignPositiveNumber(body, result, "hardLimit");
  assignPositiveInteger(body, result, "dailyFrequencyLimit", 100);
  assignPositiveNumber(body, result, "dailyMaxAmount");
  assignPositiveNumber(body, result, "monthlyMaxAmount");
  assignBoolean(body, result, "protectNewRecipients");
  assignBoolean(body, result, "protectSuspiciousAccounts");
  assignBoolean(body, result, "reviewUnusualActivity");
  assignPositiveInteger(body, result, "approvalTtlMinutes", 60);

  if (body.consent !== undefined) {
    const consent = object(body.consent);
    result.consent = {};
    if (consent.accountHolderAccepted !== undefined) {
      result.consent.accountHolderAccepted = booleanValue(
        consent.accountHolderAccepted,
        "consent.accountHolderAccepted",
      );
    }
    if (consent.version !== undefined) {
      result.consent.version = stringValue(consent.version, "consent.version", 80);
    }
  }

  if (body.privacy !== undefined) {
    const privacy = object(body.privacy);
    result.privacy = {};
    if (privacy.voiceVerificationConsent !== undefined) {
      result.privacy.voiceVerificationConsent = booleanValue(
        privacy.voiceVerificationConsent,
        "privacy.voiceVerificationConsent",
      );
    }
    if (privacy.transcriptMode !== undefined) {
      const mode = stringValue(privacy.transcriptMode, "privacy.transcriptMode", 20);
      assertFamilyGuard(
        mode === "none" || mode === "summary_only" || mode === "redacted",
        "privacy.transcriptMode is not supported.",
      );
      result.privacy.transcriptMode = mode;
    }
    if (privacy.transcriptRetentionDays !== undefined) {
      const days = nonNegativeInteger(
        privacy.transcriptRetentionDays,
        "privacy.transcriptRetentionDays",
      );
      assertFamilyGuard(days <= 30, "transcript retention may not exceed 30 days.");
      result.privacy.transcriptRetentionDays = days;
    }
    if (privacy.intelligenceFeedbackConsent !== undefined) {
      result.privacy.intelligenceFeedbackConsent = booleanValue(
        privacy.intelligenceFeedbackConsent,
        "privacy.intelligenceFeedbackConsent",
      );
    }
  }
  return result;
}

export function parseContact(value: unknown): FamilyGuardContactInput {
  const body = object(value);
  const role = stringValue(body.role ?? "primary", "role", 20);
  assertFamilyGuard(role === "primary" || role === "backup", "role is not supported.");
  const phone = stringValue(body.phone, "phone", 40);
  assertFamilyGuard(phone.replace(/\D/g, "").length >= 8, "phone is invalid.");
  return {
    ownerUserId: stringValue(body.ownerUserId, "ownerUserId", 80),
    name: stringValue(body.name, "name", 100),
    relationship: stringValue(body.relationship, "relationship", 80),
    phone,
    role,
    accepted: booleanValue(body.accepted ?? false, "accepted"),
  };
}

export function parseContext(value: unknown): FamilyGuardContextAnswers {
  return parseCreateRequest({
    userId: "context_validation",
    recipientName: "context_validation",
    recipientBank: "context_validation",
    accountNumber: "123456",
    amount: 1,
    context: value,
  }).context;
}

function object(value: unknown): Record<string, unknown> {
  assertFamilyGuard(
    Boolean(value) && typeof value === "object" && !Array.isArray(value),
    "Request body must be a JSON object.",
  );
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, name: string, maximum: number): string {
  assertFamilyGuard(typeof value === "string", `${name} must be a string.`);
  const result = value.trim();
  assertFamilyGuard(result.length > 0, `${name} is required.`);
  assertFamilyGuard(result.length <= maximum, `${name} is too long.`);
  return result;
}

function optionalString(value: unknown, name: string, maximum: number): string {
  if (value === undefined || value === null || value === "") return "";
  assertFamilyGuard(typeof value === "string", `${name} must be a string.`);
  const result = value.trim();
  assertFamilyGuard(result.length <= maximum, `${name} is too long.`);
  return result;
}

function booleanValue(value: unknown, name: string): boolean {
  assertFamilyGuard(typeof value === "boolean", `${name} must be boolean.`);
  return value;
}

function numberValue(value: unknown, name: string): number {
  assertFamilyGuard(
    typeof value === "number" && Number.isFinite(value),
    `${name} must be a finite number.`,
  );
  return value;
}

function nonNegativeInteger(value: unknown, name: string): number {
  assertFamilyGuard(
    typeof value === "number" && Number.isInteger(value) && value >= 0,
    `${name} must be a non-negative integer.`,
  );
  return value;
}

function assignBoolean<K extends keyof FamilyGuardSettingsUpdate>(
  source: Record<string, unknown>,
  target: FamilyGuardSettingsUpdate,
  key: K,
): void {
  if (source[key as string] !== undefined) {
    (target[key] as boolean | undefined) = booleanValue(
      source[key as string],
      String(key),
    );
  }
}

function assignString<K extends keyof FamilyGuardSettingsUpdate>(
  source: Record<string, unknown>,
  target: FamilyGuardSettingsUpdate,
  key: K,
  maximum: number,
): void {
  if (source[key as string] !== undefined) {
    (target[key] as string | undefined) = optionalString(
      source[key as string],
      String(key),
      maximum,
    );
  }
}

function assignPositiveNumber<K extends keyof FamilyGuardSettingsUpdate>(
  source: Record<string, unknown>,
  target: FamilyGuardSettingsUpdate,
  key: K,
): void {
  if (source[key as string] === undefined) return;
  const value = numberValue(source[key as string], String(key));
  assertFamilyGuard(value > 0, `${String(key)} must be positive.`);
  (target[key] as number | undefined) = value;
}

function assignPositiveInteger<K extends keyof FamilyGuardSettingsUpdate>(
  source: Record<string, unknown>,
  target: FamilyGuardSettingsUpdate,
  key: K,
  maximum: number,
): void {
  if (source[key as string] === undefined) return;
  const value = nonNegativeInteger(source[key as string], String(key));
  assertFamilyGuard(value > 0 && value <= maximum, `${String(key)} is out of range.`);
  (target[key] as number | undefined) = value;
}
