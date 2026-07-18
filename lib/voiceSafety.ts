import "server-only";

import { createHash } from "crypto";

export type VerificationRecommendation =
  | "continue_carefully"
  | "pause_and_verify"
  | "high_risk"
  | "incomplete";

export interface SafeTranscriptEntry {
  role: "user" | "ai";
  message: string;
  time: number;
}
const SAFETY_ADJECTIVES = ["Yellow", "Silver", "Calm", "Green"] as const;
const SAFETY_ANIMALS = ["Tiger", "Hornbill", "Turtle", "Otter"] as const;

export function normalizeMalaysianPhone(raw: string): string | null {
  const compact = raw.trim().replace(/[^\d+]/g, "");
  const normalized = compact.startsWith("+")
    ? compact
    : compact.startsWith("60")
      ? `+${compact}`
      : compact.startsWith("0")
        ? `+60${compact.slice(1)}`
        : compact
          ? `+${compact}`
          : "";

  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

export function maskAccountNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "Not supplied";
  const suffix = digits.slice(-4);
  return `•••• ${suffix}`;
}

export function maskPhoneNumber(value: string): string {
  const normalized = normalizeMalaysianPhone(value);
  if (!normalized) return "Not supplied";
  const digits = normalized.slice(1);
  return `+${digits.slice(0, 2)} ••• ••• ${digits.slice(-4)}`;
}

export function safetyPhraseFor(...parts: string[]): string {
  const digest = createHash("sha256").update(parts.join("|")).digest();
  const adjective = SAFETY_ADJECTIVES[digest[0] % SAFETY_ADJECTIVES.length];
  const animal = SAFETY_ANIMALS[digest[1] % SAFETY_ANIMALS.length];
  return `${adjective} ${animal}`;
}

export function redactSensitiveText(input: unknown): string {
  let text = String(input ?? "").slice(0, 4_000);

  text = text.replace(
    /\b(password|passcode|pin|otp|tac|secure2u(?:\s+approval)?)(\s*(?:is|was|code|number|:|-)?\s*)[\w-]{3,}\b/gi,
    (_match, label: string, separator: string) =>
      `${label}${separator || " "}[REDACTED]`,
  );
  text = text.replace(/\b(?:\d[ -]?){10,16}\b/g, "[REDACTED NUMBER]");
  text = text.replace(/\+?\d[\d ()-]{8,}\d/g, "[REDACTED PHONE]");

  return text.trim();
}

export function sanitizeTranscript(value: unknown): SafeTranscriptEntry[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 250).flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const entry = candidate as { role?: unknown; message?: unknown; time?: unknown };
    if (entry.role !== "user" && entry.role !== "ai") return [];

    return [
      {
        role: entry.role,
        message: redactSensitiveText(entry.message),
        time: Number.isFinite(Number(entry.time))
          ? Math.max(0, Number(entry.time))
          : 0,
      },
    ];
  });
}

export function deriveRecommendation(
  transcript: SafeTranscriptEntry[],
): VerificationRecommendation {
  for (let index = transcript.length - 1; index >= 0; index -= 1) {
    const entry = transcript[index];
    if (entry.role !== "ai") continue;
    const message = entry.message.toLowerCase();

    if (
      /\bhigh[ -]?risk\b|\bdo not transfer\b|\bblocked\b/.test(message)
    ) {
      return "high_risk";
    }
    if (/\bpause\b|\buncertain\b|\bverify independently\b/.test(message)) {
      return "pause_and_verify";
    }
    if (/\bcontinue carefully\b|\blow[ -]?risk\b|\bapproved\b/.test(message)) {
      return "continue_carefully";
    }
  }

  return "incomplete";
}

export function boundedRetentionDays(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 7;
  return Math.min(30, Math.max(1, Math.round(parsed)));
}
