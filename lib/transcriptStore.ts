import "server-only";

import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import type {
  SafeTranscriptEntry,
  VerificationRecommendation,
} from "./voiceSafety";

export interface RetainedTranscript {
  id: string;
  approvalRequestId: string | null;
  createdAt: string;
  expiresAt: string;
  recipientLabel: string;
  amount: number;
  recommendation: VerificationRecommendation;
  entries: SafeTranscriptEntry[];
}
interface TranscriptFile {
  schemaVersion: 1;
  records: RetainedTranscript[];
}

const DEFAULT_FILE = path.join(process.cwd(), "data", "transcripts.json");
const FILE = process.env.SCAM_GUARD_TRANSCRIPT_FILE || DEFAULT_FILE;

let accessChain: Promise<unknown> = Promise.resolve();
let writeSequence = 0;

function withLock<T>(operation: () => Promise<T>): Promise<T> {
  const pending = accessChain.then(operation, operation);
  accessChain = pending.then(
    () => undefined,
    () => undefined,
  );
  return pending;
}

function emptyFile(): TranscriptFile {
  return { schemaVersion: 1, records: [] };
}

async function readRaw(): Promise<TranscriptFile> {
  try {
    const value: unknown = JSON.parse(await fs.readFile(FILE, "utf8"));
    if (!value || typeof value !== "object") return emptyFile();
    const candidate = value as Partial<TranscriptFile>;
    if (candidate.schemaVersion !== 1 || !Array.isArray(candidate.records)) {
      return emptyFile();
    }
    return { schemaVersion: 1, records: candidate.records };
  } catch {
    return emptyFile();
  }
}

async function writeRaw(file: TranscriptFile): Promise<void> {
  const directory = path.dirname(FILE);
  const temporary = `${FILE}.${process.pid}.${++writeSequence}.tmp`;
  await fs.mkdir(directory, { recursive: true });
  try {
    await fs.writeFile(temporary, JSON.stringify(file, null, 2), "utf8");
    await fs.rename(temporary, FILE);
  } catch (error) {
    await fs.unlink(temporary).catch(() => undefined);
    throw error;
  }
}

function purgeExpired(file: TranscriptFile, now = new Date()): boolean {
  const previousLength = file.records.length;
  file.records = file.records.filter(
    (record) => new Date(record.expiresAt).getTime() > now.getTime(),
  );
  return file.records.length !== previousLength;
}

export function retainTranscript(input: {
  approvalRequestId?: string | null;
  recipientLabel: string;
  amount: number;
  recommendation: VerificationRecommendation;
  entries: SafeTranscriptEntry[];
  retentionDays: number;
}): Promise<RetainedTranscript> {
  return withLock(async () => {
    const file = await readRaw();
    purgeExpired(file);
    const createdAt = new Date();
    const expiresAt = new Date(createdAt);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + input.retentionDays);
    const record: RetainedTranscript = {
      id: `transcript_${randomUUID().slice(0, 12)}`,
      approvalRequestId: input.approvalRequestId ?? null,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      recipientLabel: input.recipientLabel.slice(0, 120),
      amount: input.amount,
      recommendation: input.recommendation,
      entries: input.entries,
    };
    file.records.unshift(record);
    await writeRaw(file);
    return record;
  });
}

export function deleteTranscript(id: string): Promise<boolean> {
  return withLock(async () => {
    const file = await readRaw();
    purgeExpired(file);
    const previousLength = file.records.length;
    file.records = file.records.filter((record) => record.id !== id);
    const deleted = previousLength !== file.records.length;
    if (deleted) await writeRaw(file);
    return deleted;
  });
}

export function purgeExpiredTranscripts(): Promise<number> {
  return withLock(async () => {
    const file = await readRaw();
    const previousLength = file.records.length;
    const changed = purgeExpired(file);
    if (changed) await writeRaw(file);
    return previousLength - file.records.length;
  });
}
