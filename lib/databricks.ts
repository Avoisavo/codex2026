import { DBSQLClient } from "@databricks/sql";
import {
  type User,
  type Transfer,
  type SuspiciousAccount,
  type ParentalControl,
  SEED_USERS,
  SEED_SUSPICIOUS,
} from "./types";

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

export const TABLE = {
  users: `${CATALOG}.${SCHEMA}.users`,
  transfers: `${CATALOG}.${SCHEMA}.transfers`,
  suspicious: `${CATALOG}.${SCHEMA}.suspicious_accounts`,
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
    status: String(r.status ?? ""),
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
  ]);

  if (reset) {
    await exec([
      `DELETE FROM ${TABLE.users}`,
      `DELETE FROM ${TABLE.transfers}`,
      `DELETE FROM ${TABLE.suspicious}`,
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
