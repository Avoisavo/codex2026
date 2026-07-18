import { DBSQLClient } from "@databricks/sql";
import {
  type User,
  type Transfer,
  type SuspiciousAccount,
  type ParentalControl,
  type TransferStatus,
  SEED_USERS,
  SEED_SUSPICIOUS,
} from "./types";
import type {
  FamilyGuardApprovalRequest,
  FamilyGuardIntelligenceFeedback,
  FamilyGuardSettings,
  FamilyGuardTrustedContact,
  FamilyGuardVerificationSession,
} from "./familyGuard/types";
import { defaultFamilyGuardSettings } from "./familyGuard/seed";

/* ────────────────────────────────────────────────────────────────────────
   Connection
   ──────────────────────────────────────────────────────────────────────── */

const HOST = process.env.DATABRICKS_SERVER_HOSTNAME ?? "";
const HTTP_PATH = process.env.DATABRICKS_HTTP_PATH ?? "";
const TOKEN = process.env.DATABRICKS_TOKEN ?? "";

export const CATALOG = process.env.DATABRICKS_CATALOG ?? "main";
export const SCHEMA = process.env.DATABRICKS_SCHEMA ?? "banking_app";

/** True only when a token is configured — lets the hybrid store skip DB cleanly. */
export const DB_ENABLED = Boolean(HOST && HTTP_PATH && TOKEN);

/**
 * Whether to actually mirror reads/writes to Databricks. OFF by default so the
 * app runs purely on the fast local JSON store; the Databricks code stays in
 * place and can be re-enabled with DATABRICKS_MIRROR=on in .env.local.
 */
export const DB_MIRROR = DB_ENABLED && process.env.DATABRICKS_MIRROR === "on";

export const TABLE = {
  users: `${CATALOG}.${SCHEMA}.users`,
  transfers: `${CATALOG}.${SCHEMA}.transfers`,
  suspicious: `${CATALOG}.${SCHEMA}.suspicious_accounts`,
  familyGuardSettings: `${CATALOG}.${SCHEMA}.family_guard_settings`,
  trustedContacts: `${CATALOG}.${SCHEMA}.family_guard_trusted_contacts`,
  familyGuardRequests: `${CATALOG}.${SCHEMA}.family_guard_requests`,
  verificationSessions: `${CATALOG}.${SCHEMA}.family_guard_verification_sessions`,
  familyGuardFeedback: `${CATALOG}.${SCHEMA}.family_guard_intelligence_feedback`,
} as const;

type Row = Record<string, unknown>;

export async function query<T = Row>(statement: string): Promise<T[]> {
  if (!DB_ENABLED) throw new Error("Databricks is not configured (.env.local)");

  const client = new DBSQLClient();
  await client.connect({ host: HOST, path: HTTP_PATH, token: TOKEN });
  const session = await client.openSession();
  try {
    const op = await session.executeStatement(statement, { runAsync: true });
    const rows = (await op.fetchAll()) as T[];
    await op.close();
    return rows;
  } finally {
    await session.close();
    await client.close();
  }
}

export async function exec(statements: string[]): Promise<void> {
  for (const s of statements) await query(s);
}

/* ── SQL value helpers ────────────────────────────────────────────────── */

export const sqlStr = (v: string | null | undefined): string =>
  v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
export const sqlNum = (v: number | null | undefined): string =>
  v == null || Number.isNaN(Number(v)) ? "NULL" : String(Number(v));
export const sqlBool = (v: boolean): string => (v ? "true" : "false");

const toIso = (v: unknown): string =>
  v instanceof Date ? v.toISOString() : v == null ? "" : String(v);

/* ── Row → domain mappers ─────────────────────────────────────────────── */

export function mapUser(r: Row): User {
  let transactions: User["transactions"] = [];
  try {
    transactions = r.transactions ? JSON.parse(String(r.transactions)) : [];
  } catch {
    transactions = [];
  }
  return {
    id: String(r.id),
    name: String(r.name),
    accountNo: String(r.account_no),
    balance: Number(r.balance),
    parentalControl: {
      enabled: Boolean(r.parental_enabled),
      transactionLimit: Number(r.parental_txn_limit),
      dailyFrequencyLimit: Number(r.parental_daily_freq),
      monthlyMaxAmount: Number(r.parental_monthly_max),
      smsPhone: r.parental_sms_phone ? String(r.parental_sms_phone) : "",
    },
    transactions,
  };
}

export function mapTransfer(r: Row): Transfer {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    fromAccount: String(r.from_account ?? ""),
    recipientName: String(r.recipient_name ?? ""),
    recipientBank: String(r.recipient_bank ?? ""),
    accountNumber: String(r.account_number ?? ""),
    amount: Number(r.amount),
    reference: r.reference ? String(r.reference) : "",
    paymentType: String(r.payment_type ?? ""),
    status: String(r.status ?? "completed") as TransferStatus,
    createdAt: toIso(r.created_at),
  };
}

export function mapSuspicious(r: Row): SuspiciousAccount {
  return {
    id: String(r.id),
    accountNumber: String(r.account_number),
    bank: String(r.bank ?? ""),
    name: String(r.name ?? ""),
    reason: String(r.reason ?? ""),
    riskLevel: String(r.risk_level ?? ""),
    reportedAt: toIso(r.reported_at),
  };
}

/* ────────────────────────────────────────────────────────────────────────
   High-level data access (used by the hybrid store as the remote mirror)
   ──────────────────────────────────────────────────────────────────────── */

export async function dbListUsers(): Promise<User[]> {
  return (await query(`SELECT * FROM ${TABLE.users} ORDER BY name`)).map(mapUser);
}

export async function dbGetUser(id: string): Promise<User | undefined> {
  const rows = await query(`SELECT * FROM ${TABLE.users} WHERE id = ${sqlStr(id)} LIMIT 1`);
  return rows[0] ? mapUser(rows[0]) : undefined;
}

export async function dbInsertUser(u: User): Promise<void> {
  const pc = u.parentalControl;
  await query(
    `INSERT INTO ${TABLE.users} VALUES (
      ${sqlStr(u.id)}, ${sqlStr(u.name)}, ${sqlStr(u.accountNo)}, ${sqlNum(u.balance)},
      ${sqlBool(pc.enabled)}, ${sqlNum(pc.transactionLimit)}, ${sqlNum(pc.dailyFrequencyLimit)},
      ${sqlNum(pc.monthlyMaxAmount)}, ${sqlStr(pc.smsPhone)},
      ${sqlStr(JSON.stringify(u.transactions))}, current_timestamp()
    )`
  );
}

export interface UserPatch {
  name?: string;
  accountNo?: string;
  balance?: number;
  parentalControl?: Partial<ParentalControl>;
  transactions?: User["transactions"];
}

export async function dbUpdateUser(id: string, patch: UserPatch): Promise<void> {
  const sets: string[] = [];
  if (patch.name != null) sets.push(`name = ${sqlStr(patch.name)}`);
  if (patch.accountNo != null) sets.push(`account_no = ${sqlStr(patch.accountNo)}`);
  if (patch.balance != null) sets.push(`balance = ${sqlNum(patch.balance)}`);
  if (patch.parentalControl) {
    const pc = patch.parentalControl;
    if (pc.enabled != null) sets.push(`parental_enabled = ${sqlBool(pc.enabled)}`);
    if (pc.transactionLimit != null) sets.push(`parental_txn_limit = ${sqlNum(pc.transactionLimit)}`);
    if (pc.dailyFrequencyLimit != null) sets.push(`parental_daily_freq = ${sqlNum(pc.dailyFrequencyLimit)}`);
    if (pc.monthlyMaxAmount != null) sets.push(`parental_monthly_max = ${sqlNum(pc.monthlyMaxAmount)}`);
    if (pc.smsPhone != null) sets.push(`parental_sms_phone = ${sqlStr(pc.smsPhone)}`);
  }
  if (Array.isArray(patch.transactions)) sets.push(`transactions = ${sqlStr(JSON.stringify(patch.transactions))}`);
  if (sets.length === 0) return;
  sets.push("updated_at = current_timestamp()");
  await query(`UPDATE ${TABLE.users} SET ${sets.join(", ")} WHERE id = ${sqlStr(id)}`);
}

export async function dbListTransfers(userId?: string): Promise<Transfer[]> {
  const where = userId ? `WHERE user_id = ${sqlStr(userId)}` : "";
  return (await query(`SELECT * FROM ${TABLE.transfers} ${where} ORDER BY created_at DESC`)).map(mapTransfer);
}

export async function dbInsertTransfer(t: Transfer): Promise<void> {
  await query(
    `INSERT INTO ${TABLE.transfers} VALUES (
      ${sqlStr(t.id)}, ${sqlStr(t.userId)}, ${sqlStr(t.fromAccount)}, ${sqlStr(t.recipientName)},
      ${sqlStr(t.recipientBank)}, ${sqlStr(t.accountNumber)}, ${sqlNum(t.amount)}, ${sqlStr(t.reference)},
      ${sqlStr(t.paymentType)}, ${sqlStr(t.status)}, current_timestamp()
    )`
  );
}

export async function dbUpsertTransfer(t: Transfer): Promise<void> {
  await query(
    `MERGE INTO ${TABLE.transfers} AS target
     USING (SELECT ${sqlStr(t.id)} AS id) AS source
     ON target.id = source.id
     WHEN MATCHED THEN UPDATE SET
       user_id = ${sqlStr(t.userId)}, from_account = ${sqlStr(t.fromAccount)},
       recipient_name = ${sqlStr(t.recipientName)}, recipient_bank = ${sqlStr(t.recipientBank)},
       account_number = ${sqlStr(t.accountNumber)}, amount = ${sqlNum(t.amount)},
       reference = ${sqlStr(t.reference)}, payment_type = ${sqlStr(t.paymentType)},
       status = ${sqlStr(t.status)}
     WHEN NOT MATCHED THEN INSERT
       (id, user_id, from_account, recipient_name, recipient_bank, account_number,
        amount, reference, payment_type, status, created_at)
     VALUES (${sqlStr(t.id)}, ${sqlStr(t.userId)}, ${sqlStr(t.fromAccount)},
       ${sqlStr(t.recipientName)}, ${sqlStr(t.recipientBank)}, ${sqlStr(t.accountNumber)},
       ${sqlNum(t.amount)}, ${sqlStr(t.reference)}, ${sqlStr(t.paymentType)},
       ${sqlStr(t.status)}, ${sqlStr(t.createdAt)})`
  );
}

export async function dbUpsertFamilyGuardSettings(
  settings: FamilyGuardSettings,
): Promise<void> {
  await upsertPayload(
    TABLE.familyGuardSettings,
    "user_id",
    settings.userId,
    JSON.stringify(settings),
    settings.updatedAt,
  );
}

export async function dbUpsertTrustedContact(
  contact: FamilyGuardTrustedContact,
): Promise<void> {
  await query(
    `MERGE INTO ${TABLE.trustedContacts} AS target
     USING (SELECT ${sqlStr(contact.id)} AS id) AS source
     ON target.id = source.id
     WHEN MATCHED THEN UPDATE SET owner_user_id = ${sqlStr(contact.ownerUserId)},
       status = ${sqlStr(contact.status)}, payload = ${sqlStr(JSON.stringify(contact))},
       updated_at = ${sqlStr(contact.revokedAt ?? contact.acceptedAt ?? contact.invitedAt)}
     WHEN NOT MATCHED THEN INSERT (id, owner_user_id, status, payload, updated_at)
     VALUES (${sqlStr(contact.id)}, ${sqlStr(contact.ownerUserId)}, ${sqlStr(contact.status)},
       ${sqlStr(JSON.stringify(contact))}, ${sqlStr(contact.invitedAt)})`
  );
}

export async function dbUpsertFamilyGuardRequest(
  request: FamilyGuardApprovalRequest,
): Promise<void> {
  await query(
    `MERGE INTO ${TABLE.familyGuardRequests} AS target
     USING (SELECT ${sqlStr(request.id)} AS id) AS source
     ON target.id = source.id
     WHEN MATCHED THEN UPDATE SET owner_user_id = ${sqlStr(request.ownerUserId)},
       status = ${sqlStr(request.status)}, expires_at = ${sqlStr(request.expiresAt)},
       payload = ${sqlStr(JSON.stringify(request))}, updated_at = ${sqlStr(request.updatedAt)}
     WHEN NOT MATCHED THEN INSERT (id, owner_user_id, status, expires_at, payload, updated_at)
     VALUES (${sqlStr(request.id)}, ${sqlStr(request.ownerUserId)}, ${sqlStr(request.status)},
       ${sqlStr(request.expiresAt)}, ${sqlStr(JSON.stringify(request))}, ${sqlStr(request.updatedAt)})`
  );
}

export async function dbUpsertVerificationSession(
  session: FamilyGuardVerificationSession,
): Promise<void> {
  await query(
    `MERGE INTO ${TABLE.verificationSessions} AS target
     USING (SELECT ${sqlStr(session.id)} AS id) AS source
     ON target.id = source.id
     WHEN MATCHED THEN UPDATE SET request_id = ${sqlStr(session.requestId)},
       status = ${sqlStr(session.status)}, payload = ${sqlStr(JSON.stringify(session))},
       updated_at = ${sqlStr(session.completedAt ?? session.createdAt)}
     WHEN NOT MATCHED THEN INSERT (id, request_id, status, payload, updated_at)
     VALUES (${sqlStr(session.id)}, ${sqlStr(session.requestId)}, ${sqlStr(session.status)},
       ${sqlStr(JSON.stringify(session))}, ${sqlStr(session.createdAt)})`
  );
}

export async function dbUpsertFamilyGuardFeedback(
  feedback: FamilyGuardIntelligenceFeedback,
): Promise<void> {
  await query(
    `MERGE INTO ${TABLE.familyGuardFeedback} AS target
     USING (SELECT ${sqlStr(feedback.id)} AS id) AS source
     ON target.id = source.id
     WHEN MATCHED THEN UPDATE SET request_id = ${sqlStr(feedback.requestId)},
       status = ${sqlStr(feedback.status)}, payload = ${sqlStr(JSON.stringify(feedback))},
       updated_at = ${sqlStr(feedback.processedAt ?? feedback.createdAt)}
     WHEN NOT MATCHED THEN INSERT (id, request_id, status, payload, updated_at)
     VALUES (${sqlStr(feedback.id)}, ${sqlStr(feedback.requestId)}, ${sqlStr(feedback.status)},
       ${sqlStr(JSON.stringify(feedback))}, ${sqlStr(feedback.createdAt)})`
  );
}

async function upsertPayload(
  table: string,
  keyColumn: string,
  key: string,
  payload: string,
  updatedAt: string,
): Promise<void> {
  await query(
    `MERGE INTO ${table} AS target
     USING (SELECT ${sqlStr(key)} AS record_key) AS source
     ON target.${keyColumn} = source.record_key
     WHEN MATCHED THEN UPDATE SET payload = ${sqlStr(payload)}, updated_at = ${sqlStr(updatedAt)}
     WHEN NOT MATCHED THEN INSERT (${keyColumn}, payload, updated_at)
     VALUES (${sqlStr(key)}, ${sqlStr(payload)}, ${sqlStr(updatedAt)})`
  );
}

export async function dbListSuspicious(): Promise<SuspiciousAccount[]> {
  return (await query(`SELECT * FROM ${TABLE.suspicious} ORDER BY reported_at DESC`)).map(mapSuspicious);
}

export async function dbInsertSuspicious(s: SuspiciousAccount): Promise<void> {
  await query(
    `INSERT INTO ${TABLE.suspicious} VALUES (
      ${sqlStr(s.id)}, ${sqlStr(s.accountNumber)}, ${sqlStr(s.bank)}, ${sqlStr(s.name)},
      ${sqlStr(s.reason)}, ${sqlStr(s.riskLevel)}, current_timestamp()
    )`
  );
}

export async function dbDeleteSuspicious(id: string): Promise<void> {
  await query(`DELETE FROM ${TABLE.suspicious} WHERE id = ${sqlStr(id)}`);
}

/* ── Schema / seed init ───────────────────────────────────────────────── */

export async function dbInit(reset: boolean): Promise<void> {
  await query(`CREATE SCHEMA IF NOT EXISTS ${CATALOG}.${SCHEMA}`);

  await exec([
    `CREATE TABLE IF NOT EXISTS ${TABLE.users} (
        id STRING, name STRING, account_no STRING, balance DOUBLE,
        parental_enabled BOOLEAN, parental_txn_limit DOUBLE, parental_daily_freq INT,
        parental_monthly_max DOUBLE, parental_sms_phone STRING, transactions STRING, updated_at TIMESTAMP )`,
    `CREATE TABLE IF NOT EXISTS ${TABLE.transfers} (
        id STRING, user_id STRING, from_account STRING, recipient_name STRING, recipient_bank STRING,
        account_number STRING, amount DOUBLE, reference STRING, payment_type STRING, status STRING, created_at TIMESTAMP )`,
    `CREATE TABLE IF NOT EXISTS ${TABLE.suspicious} (
        id STRING, account_number STRING, bank STRING, name STRING, reason STRING, risk_level STRING, reported_at TIMESTAMP )`,
    `CREATE TABLE IF NOT EXISTS ${TABLE.familyGuardSettings} (
        user_id STRING, payload STRING, updated_at TIMESTAMP )`,
    `CREATE TABLE IF NOT EXISTS ${TABLE.trustedContacts} (
        id STRING, owner_user_id STRING, status STRING, payload STRING, updated_at TIMESTAMP )`,
    `CREATE TABLE IF NOT EXISTS ${TABLE.familyGuardRequests} (
        id STRING, owner_user_id STRING, status STRING, expires_at TIMESTAMP, payload STRING, updated_at TIMESTAMP )`,
    `CREATE TABLE IF NOT EXISTS ${TABLE.verificationSessions} (
        id STRING, request_id STRING, status STRING, payload STRING, updated_at TIMESTAMP )`,
    `CREATE TABLE IF NOT EXISTS ${TABLE.familyGuardFeedback} (
        id STRING, request_id STRING, status STRING, payload STRING, updated_at TIMESTAMP )`,
  ]);

  if (reset) {
    await exec([
      `DELETE FROM ${TABLE.users}`,
      `DELETE FROM ${TABLE.transfers}`,
      `DELETE FROM ${TABLE.suspicious}`,
      `DELETE FROM ${TABLE.familyGuardSettings}`,
      `DELETE FROM ${TABLE.trustedContacts}`,
      `DELETE FROM ${TABLE.familyGuardRequests}`,
      `DELETE FROM ${TABLE.verificationSessions}`,
      `DELETE FROM ${TABLE.familyGuardFeedback}`,
    ]);
  }

  // Seed demo user (idempotent MERGE)
  const u = SEED_USERS[0];
  const pc = u.parentalControl;
  await query(
    `MERGE INTO ${TABLE.users} AS t
     USING (SELECT ${sqlStr(u.id)} AS id) AS s
     ON t.id = s.id
     WHEN NOT MATCHED THEN INSERT (id, name, account_no, balance, parental_enabled,
        parental_txn_limit, parental_daily_freq, parental_monthly_max, parental_sms_phone, transactions, updated_at)
     VALUES (${sqlStr(u.id)}, ${sqlStr(u.name)}, ${sqlStr(u.accountNo)}, ${sqlNum(u.balance)}, ${sqlBool(pc.enabled)},
        ${sqlNum(pc.transactionLimit)}, ${sqlNum(pc.dailyFrequencyLimit)}, ${sqlNum(pc.monthlyMaxAmount)},
        ${sqlStr(pc.smsPhone)}, ${sqlStr(JSON.stringify(u.transactions))}, current_timestamp())`
  );

  await dbUpsertFamilyGuardSettings(defaultFamilyGuardSettings(u.id));

  // Seed suspicious accounts (idempotent MERGE keyed by id)
  const rows = SEED_SUSPICIOUS.map(
    (s) => `(${sqlStr(s.id)}, ${sqlStr(s.accountNumber)}, ${sqlStr(s.bank)}, ${sqlStr(s.name)}, ${sqlStr(s.reason)}, ${sqlStr(s.riskLevel)})`
  ).join(", ");
  await query(
    `MERGE INTO ${TABLE.suspicious} AS t
     USING (SELECT * FROM (VALUES ${rows}) AS v(id, account_number, bank, name, reason, risk_level)) AS s
     ON t.id = s.id
     WHEN NOT MATCHED THEN INSERT (id, account_number, bank, name, reason, risk_level, reported_at)
     VALUES (s.id, s.account_number, s.bank, s.name, s.reason, s.risk_level, current_timestamp())`
  );
}
