import * as json from "./jsonStore";
import * as dbx from "./databricks";
import {
  type User,
  type Transfer,
  type SuspiciousAccount,
  type ParentalControl,
  DEFAULT_PARENTAL,
  newId,
  seedDb,
} from "./types";

export * from "./types";

/**
 * Hybrid store.
 *   • Reads: JSON first; if a collection is empty locally, fall back to Databricks
 *     (and warm the JSON cache with what came back).
 *   • Writes: always write JSON (source of truth for the demo); mirror to Databricks
 *     best-effort so a slow/expired/offline warehouse can never break the demo.
 */

/** Await a Databricks read, swallowing failures (returns undefined when the mirror is off). */
async function tryDb<T>(fn: () => Promise<T>): Promise<T | undefined> {
  if (!dbx.DB_MIRROR) return undefined;
  try {
    return await fn();
  } catch (err) {
    console.warn("[hybrid] databricks skipped:", err instanceof Error ? err.message : err);
    return undefined;
  }
}

/** Fire-and-forget a Databricks write so it never blocks the response (no-op when the mirror is off). */
function mirror(fn: () => Promise<unknown>): void {
  if (!dbx.DB_MIRROR) return;
  void fn().catch((err) => console.warn("[hybrid] databricks mirror failed:", err instanceof Error ? err.message : err));
}

/* ── Users ────────────────────────────────────────────────────────────── */

export async function listUsers(): Promise<User[]> {
  const db = await json.read();
  if (db.users.length) return db.users;

  const remote = await tryDb(() => dbx.dbListUsers());
  if (remote && remote.length) {
    await json.mutate((d) => {
      d.users = remote;
    });
    return remote;
  }
  return db.users;
}

export async function getUser(id: string): Promise<User | undefined> {
  const db = await json.read();
  const local = db.users.find((u) => u.id === id);
  if (local) return local;

  const remote = await tryDb(() => dbx.dbGetUser(id));
  if (remote) {
    await json.mutate((d) => {
      if (!d.users.some((u) => u.id === id)) d.users.push(remote);
    });
    return remote;
  }
  return undefined;
}

export interface CreateUserInput {
  id?: string;
  name: string;
  accountNo: string;
  balance?: number;
  parentalControl?: Partial<ParentalControl>;
  transactions?: User["transactions"];
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const user: User = {
    id: input.id || newId("u"),
    name: input.name,
    accountNo: input.accountNo,
    balance: input.balance ?? 0,
    parentalControl: { ...DEFAULT_PARENTAL, ...input.parentalControl },
    transactions: input.transactions ?? [],
  };
  await json.mutate((d) => {
    d.users.push(user);
  });
  mirror(() => dbx.dbInsertUser(user));
  return user;
}

export async function updateUser(id: string, patch: dbx.UserPatch): Promise<User | undefined> {
  let updated: User | undefined;
  await json.mutate((d) => {
    const u = d.users.find((x) => x.id === id);
    if (!u) return;
    if (patch.name != null) u.name = patch.name;
    if (patch.accountNo != null) u.accountNo = patch.accountNo;
    if (patch.balance != null) u.balance = patch.balance;
    if (patch.parentalControl) u.parentalControl = { ...u.parentalControl, ...patch.parentalControl };
    if (Array.isArray(patch.transactions)) u.transactions = patch.transactions;
    updated = u;
  });
  if (updated) mirror(() => dbx.dbUpdateUser(id, patch));
  return updated;
}

/* ── Transfers ────────────────────────────────────────────────────────── */

export async function listTransfers(userId?: string): Promise<Transfer[]> {
  const db = await json.read();
  const local = userId ? db.transfers.filter((t) => t.userId === userId) : db.transfers;
  if (local.length) return local;

  if (db.transfers.length === 0) {
    const remote = await tryDb(() => dbx.dbListTransfers(userId));
    if (remote && remote.length) return remote;
  }
  return local;
}

export interface CreateTransferInput {
  id?: string;
  userId: string;
  fromAccount?: string;
  recipientName?: string;
  recipientBank?: string;
  accountNumber?: string;
  amount: number;
  reference?: string;
  paymentType?: string;
  status?: string;
}

export async function createTransfer(input: CreateTransferInput): Promise<Transfer> {
  const transfer: Transfer = {
    id: input.id || newId("txf"),
    userId: input.userId,
    fromAccount: input.fromAccount ?? "",
    recipientName: input.recipientName ?? "",
    recipientBank: input.recipientBank ?? "",
    accountNumber: input.accountNumber ?? "",
    amount: input.amount,
    reference: input.reference ?? "",
    paymentType: input.paymentType ?? "",
    status: input.status ?? "completed",
    createdAt: new Date().toISOString(),
  };
  await json.mutate((d) => {
    d.transfers.unshift(transfer);
  });
  mirror(() => dbx.dbInsertTransfer(transfer));
  return transfer;
}

/* ── Suspicious accounts ──────────────────────────────────────────────── */

async function suspiciousList(): Promise<SuspiciousAccount[]> {
  const db = await json.read();
  if (db.suspicious.length) return db.suspicious;
  const remote = await tryDb(() => dbx.dbListSuspicious());
  if (remote && remote.length) {
    await json.mutate((d) => {
      d.suspicious = remote;
    });
    return remote;
  }
  return db.suspicious;
}

export async function listSuspicious(): Promise<SuspiciousAccount[]> {
  return suspiciousList();
}

export async function checkSuspicious(
  account: string
): Promise<{ flagged: boolean; matches: SuspiciousAccount[] }> {
  const norm = account.replace(/\s/g, "");
  const list = await suspiciousList();
  const matches = list.filter((s) => s.accountNumber.replace(/\s/g, "") === norm);
  return { flagged: matches.length > 0, matches };
}

export interface AddSuspiciousInput {
  id?: string;
  accountNumber: string;
  bank?: string;
  name?: string;
  reason?: string;
  riskLevel?: string;
}

export async function addSuspicious(input: AddSuspiciousInput): Promise<SuspiciousAccount> {
  const entry: SuspiciousAccount = {
    id: input.id || newId("sus"),
    accountNumber: input.accountNumber,
    bank: input.bank ?? "",
    name: input.name ?? "",
    reason: input.reason ?? "",
    riskLevel: input.riskLevel ?? "medium",
    reportedAt: new Date().toISOString(),
  };
  await json.mutate((d) => {
    d.suspicious.unshift(entry);
  });
  mirror(() => dbx.dbInsertSuspicious(entry));
  return entry;
}

export async function removeSuspicious(id: string): Promise<void> {
  await json.mutate((d) => {
    d.suspicious = d.suspicious.filter((s) => s.id !== id);
  });
  mirror(() => dbx.dbDeleteSuspicious(id));
}

/* ── Init / reset ─────────────────────────────────────────────────────── */

export async function initStore(reset: boolean): Promise<{
  ok: boolean;
  local: boolean;
  remote: boolean;
  dbEnabled: boolean;
}> {
  // Local JSON
  if (reset) {
    await json.replace(seedDb());
  } else {
    await json.mutate((d) => {
      const s = seedDb();
      if (!d.users.length) d.users = s.users;
      if (!d.suspicious.length) d.suspicious = s.suspicious;
    });
  }

  // Remote Databricks (best effort)
  const remote = await tryDb(() => dbx.dbInit(reset));
  return { ok: true, local: true, remote: remote !== undefined, dbEnabled: dbx.DB_ENABLED };
}
