import { promises as fs } from "fs";
import path from "path";
import {
  DEFAULT_PARENTAL,
  type DbShape,
  type User,
  seedDb,
} from "./types";
import {
  defaultFamilyGuardSettings,
  migrateLegacyGuardianContact,
  migrateLegacyParentalControl,
} from "./familyGuard/seed";
import type {
  FamilyGuardSettings,
  FamilyGuardTrustedContact,
} from "./familyGuard/types";

const FILE = process.env.SCAM_GUARD_DB_FILE
  ? path.resolve(process.env.SCAM_GUARD_DB_FILE)
  : path.join(process.cwd(), "data", "db.json");
let writeSequence = 0;

// Serialise all access so concurrent requests can't clobber the file.
let chain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function readRaw(): Promise<DbShape> {
  try {
    const txt = await fs.readFile(FILE, "utf-8");
    const parsed: unknown = JSON.parse(txt);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("The local database must contain a JSON object.");
    }
    const migrated = migrateDb(parsed as Partial<DbShape>);
    if (JSON.stringify(parsed) !== JSON.stringify(migrated)) {
      await writeRaw(migrated);
    }
    return migrated;
  } catch (error) {
    if (!isMissingFile(error)) throw error;
    // A missing file is safe to seed. Corrupt files are deliberately not
    // overwritten, so an operator can inspect and recover them.
    const seeded = seedDb();
    await writeRaw(seeded);
    return seeded;
  }
}

async function writeRaw(db: DbShape): Promise<void> {
  const directory = path.dirname(FILE);
  const temp = `${FILE}.${process.pid}.${++writeSequence}.tmp`;
  await fs.mkdir(directory, { recursive: true });
  try {
    await fs.writeFile(temp, JSON.stringify(db, null, 2), "utf-8");
    await fs.rename(temp, FILE);
  } catch (error) {
    await fs.unlink(temp).catch(() => undefined);
    throw error;
  }
}

function migrateDb(parsed: Partial<DbShape>): DbShape {
  const users = asArray<User>(parsed.users).map((user) => ({
    ...user,
    parentalControl: {
      ...DEFAULT_PARENTAL,
      ...(user.parentalControl ?? {}),
    },
    transactions: Array.isArray(user.transactions) ? user.transactions : [],
  }));

  const existingSettings = asArray<FamilyGuardSettings>(
    parsed.familyGuardSettings,
  );
  const settings = users.map((user) => {
    const existing = existingSettings.find((entry) => entry.userId === user.id);
    if (!existing) {
      return migrateLegacyParentalControl(user.id, user.parentalControl);
    }
    const defaults = defaultFamilyGuardSettings(user.id, existing.updatedAt);
    return {
      ...defaults,
      ...existing,
      schemaVersion: 1 as const,
      consent: { ...defaults.consent, ...existing.consent },
      privacy: {
        ...defaults.privacy,
        ...existing.privacy,
        shareProtectedTransferOnly: true as const,
        shareFullTransactionHistory: false as const,
      },
    };
  });

  // Keep settings for users that may currently be supplied only by a remote
  // mirror, while avoiding duplicate rows for local users.
  for (const existing of existingSettings) {
    if (!settings.some((entry) => entry.userId === existing.userId)) {
      settings.push(existing);
    }
  }

  const trustedContacts = asArray<FamilyGuardTrustedContact>(
    parsed.trustedContacts,
  );
  for (const user of users) {
    const migratedContact = migrateLegacyGuardianContact(
      user.id,
      user.parentalControl,
    );
    if (
      migratedContact &&
      !trustedContacts.some(
        (contact) =>
          contact.ownerUserId === user.id &&
          normalizePhone(contact.phone) === normalizePhone(migratedContact.phone),
      )
    ) {
      trustedContacts.push(migratedContact);
    }
  }

  return {
    schemaVersion: 2,
    users,
    transfers: asArray(parsed.transfers),
    suspicious: asArray(parsed.suspicious),
    familyGuardSettings: settings,
    trustedContacts,
    approvalRequests: asArray(parsed.approvalRequests),
    verificationSessions: asArray(parsed.verificationSessions),
    familyGuardAudit: asArray(parsed.familyGuardAudit),
    intelligenceFeedback: asArray(parsed.intelligenceFeedback),
  };
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function isMissingFile(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

/** Read the whole local DB (seeds on first use). */
export function read(): Promise<DbShape> {
  return withLock(readRaw);
}

/** Atomically read-modify-write the local DB within this Node.js process. */
export function mutate(fn: (db: DbShape) => void): Promise<DbShape> {
  return withLock(async () => {
    const db = await readRaw();
    fn(db);
    await writeRaw(db);
    return db;
  });
}

/** Replace the entire local DB (used by reset). */
export function replace(db: DbShape): Promise<DbShape> {
  return withLock(async () => {
    await writeRaw(db);
    return db;
  });
}
