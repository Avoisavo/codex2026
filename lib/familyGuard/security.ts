import "server-only";

import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";
import type { FamilyGuardTransferSnapshot } from "./types";

const SAFETY_ADJECTIVES = ["Yellow", "Silver", "Calm", "Blue", "Golden"];
const SAFETY_NOUNS = ["Tiger", "Orchid", "River", "Hornbill", "Lantern"];

export function normalizeAccountNumber(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizePhone(value: string): string {
  const cleaned = value.trim().replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("60")) return `+${cleaned}`;
  if (cleaned.startsWith("0")) return `+60${cleaned.slice(1)}`;
  return cleaned ? `+${cleaned}` : "";
}

export function amountToSen(amount: number): number {
  return Math.round(amount * 100);
}

export function transferBindingHash(
  transfer: FamilyGuardTransferSnapshot,
): string {
  const canonical = [
    transfer.userId,
    transfer.fromAccount,
    transfer.recipientName,
    transfer.recipientBank,
    transfer.normalizedAccountNumber,
    transfer.amountSen,
    transfer.currency,
    transfer.reference,
    transfer.paymentType,
  ].join("\u001f");
  return createHash("sha256").update(canonical).digest("hex");
}

export function entityFingerprint(kind: string, normalizedValue: string): string {
  return createHash("sha256")
    .update(`family-guard-demo:${kind}:${normalizedValue}`)
    .digest("hex");
}

export function createApprovalCredential(): {
  code: string;
  salt: string;
  hash: string;
} {
  // This is a clearly labelled hackathon credential, separate from any bank
  // OTP, TAC, PIN, or Secure2u approval. Only its salted hash is persisted.
  const code = process.env.FAMILY_GUARD_DEMO_APPROVAL_CODE ?? "4821";
  const salt = randomBytes(16).toString("hex");
  return { code, salt, hash: hashApprovalCode(code, salt) };
}

export function verifyApprovalCode(
  code: string,
  salt: string,
  expectedHash: string,
): boolean {
  const actual = Buffer.from(hashApprovalCode(code, salt), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function safetyPhrase(requestId: string): string {
  const digest = createHash("sha256").update(requestId).digest();
  return `${SAFETY_ADJECTIVES[digest[0] % SAFETY_ADJECTIVES.length]} ${
    SAFETY_NOUNS[digest[1] % SAFETY_NOUNS.length]
  }`;
}

function hashApprovalCode(code: string, salt: string): string {
  return scryptSync(code, salt, 32).toString("hex");
}
