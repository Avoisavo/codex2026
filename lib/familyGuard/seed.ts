import type {
  FamilyGuardSettings,
  FamilyGuardTrustedContact,
} from "./types";

export const FAMILY_GUARD_CONSENT_VERSION = "family-guard-demo-v1";
export const FAMILY_GUARD_SEED_TIME = "2026-07-18T00:00:00.000Z";

export interface LegacyParentalControlLike {
  enabled?: boolean;
  transactionLimit?: number;
  dailyFrequencyLimit?: number;
  monthlyMaxAmount?: number;
  smsPhone?: string;
}

export function defaultFamilyGuardSettings(
  userId: string,
  updatedAt = FAMILY_GUARD_SEED_TIME,
): FamilyGuardSettings {
  return {
    schemaVersion: 1,
    userId,
    enabled: false,
    accountHolderPhone: "",
    softLimit: 500,
    guardianLimit: 1000,
    hardLimit: 10000,
    dailyFrequencyLimit: 5,
    dailyMaxAmount: 3000,
    monthlyMaxAmount: 10000,
    protectNewRecipients: true,
    protectSuspiciousAccounts: true,
    reviewUnusualActivity: true,
    approvalTtlMinutes: 10,
    consent: {
      accountHolderAccepted: false,
      acceptedAt: null,
      version: FAMILY_GUARD_CONSENT_VERSION,
    },
    privacy: {
      shareProtectedTransferOnly: true,
      shareFullTransactionHistory: false,
      voiceVerificationConsent: false,
      transcriptMode: "summary_only",
      transcriptRetentionDays: 1,
      intelligenceFeedbackConsent: false,
    },
    updatedAt,
  };
}

export function migrateLegacyParentalControl(
  userId: string,
  legacy: LegacyParentalControlLike | undefined,
  updatedAt = FAMILY_GUARD_SEED_TIME,
): FamilyGuardSettings {
  const defaults = defaultFamilyGuardSettings(userId, updatedAt);
  if (!legacy) return defaults;

  const legacyLimit = positive(legacy.transactionLimit, defaults.guardianLimit);
  const monthlyMax = positive(legacy.monthlyMaxAmount, defaults.monthlyMaxAmount);

  return {
    ...defaults,
    // A legacy toggle is not consent to the new co-approval workflow. Keep the
    // migrated limits, but leave Family Guard off until the account holder
    // explicitly accepts the current consent notice.
    enabled: false,
    softLimit: legacyLimit,
    guardianLimit: legacyLimit,
    hardLimit: Math.max(legacyLimit, monthlyMax),
    dailyFrequencyLimit: positiveInteger(
      legacy.dailyFrequencyLimit,
      defaults.dailyFrequencyLimit,
    ),
    dailyMaxAmount: Math.max(legacyLimit, defaults.dailyMaxAmount),
    monthlyMaxAmount: monthlyMax,
    consent: {
      accountHolderAccepted: false,
      acceptedAt: null,
      version: "legacy-parental-control-migration",
    },
  };
}

export function migrateLegacyGuardianContact(
  userId: string,
  legacy: LegacyParentalControlLike | undefined,
  invitedAt = FAMILY_GUARD_SEED_TIME,
): FamilyGuardTrustedContact | null {
  const phone = typeof legacy?.smsPhone === "string" ? legacy.smsPhone.trim() : "";
  if (!phone) return null;

  return {
    id: `fg_contact_legacy_${safeId(userId)}`,
    ownerUserId: userId,
    name: "Migrated trusted contact",
    relationship: "Trusted contact",
    phone,
    role: "primary",
    // A legacy SMS number is not silently treated as an accepted co-approver.
    status: "pending",
    permissions: {
      reviewProtectedTransfers: true,
      viewFullTransactionHistory: false,
    },
    invitedAt,
    acceptedAt: null,
    revokedAt: null,
  };
}

function positive(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : fallback;
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}
