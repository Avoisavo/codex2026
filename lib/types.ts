import { randomUUID } from "crypto";

/* ── Domain types ─────────────────────────────────────────────────────── */

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
}

export interface ParentalControl {
  enabled: boolean;
  transactionLimit: number;
  dailyFrequencyLimit: number;
  monthlyMaxAmount: number;
  smsPhone: string;
}

export interface User {
  id: string;
  name: string;
  accountNo: string;
  balance: number;
  parentalControl: ParentalControl;
  transactions: Transaction[];
}

export interface Transfer {
  id: string;
  userId: string;
  fromAccount: string;
  recipientName: string;
  recipientBank: string;
  accountNumber: string;
  amount: number;
  reference: string;
  paymentType: string;
  status: string;
  createdAt: string;
}

export interface SuspiciousAccount {
  id: string;
  accountNumber: string;
  bank: string;
  name: string;
  reason: string;
  riskLevel: string;
  reportedAt: string;
}

/** Shape of the whole local JSON database. */
export interface DbShape {
  users: User[];
  transfers: Transfer[];
  suspicious: SuspiciousAccount[];
}

export const newId = (prefix: string): string => `${prefix}_${randomUUID().slice(0, 8)}`;

export const DEFAULT_PARENTAL: ParentalControl = {
  enabled: false,
  transactionLimit: 1000,
  dailyFrequencyLimit: 5,
  monthlyMaxAmount: 10000,
  smsPhone: "",
};

/* ── Seed data (shared by the JSON store and the Databricks init) ──────── */

export const SEED_TRANSACTIONS: Transaction[] = [
  { id: "t1", date: "16 Jul 2026", description: "Sales Debit Gucci Pavilion", amount: 7500.9, type: "debit" },
  { id: "t2", date: "14 Jul 2026", description: "Sales Tax Refund", amount: 175.9, type: "credit" },
  { id: "t3", date: "10 Jul 2026", description: "Salary Credit — Titan Corp", amount: 12400, type: "credit" },
  { id: "t4", date: "07 Jul 2026", description: "DuitNow Transfer to Jonathan Lim", amount: 1250, type: "debit" },
  { id: "t5", date: "03 Jul 2026", description: "TNB Bill Payment", amount: 264.3, type: "debit" },
  { id: "t6", date: "28 Jun 2026", description: "Dividend Credit — ASNB", amount: 640.15, type: "credit" },
];

export const SEED_USERS: User[] = [
  {
    id: "u_danial",
    name: "Danial Ariff",
    accountNo: "1622 5471 7348",
    balance: 89187.9,
    parentalControl: { ...DEFAULT_PARENTAL },
    transactions: SEED_TRANSACTIONS,
  },
];

export const SEED_SUSPICIOUS: SuspiciousAccount[] = [
  { id: "sus_1", accountNumber: "8842 1190 3321", bank: "Maybank", name: "Quick Cash Enterprise", reason: "Reported mule account — loan scam", riskLevel: "high", reportedAt: "2026-07-17T00:00:00.000Z" },
  { id: "sus_2", accountNumber: "7009 4521 8890", bank: "CIMB Bank", name: "Lucky Draw Winner Dept", reason: "Impersonation / prize scam", riskLevel: "high", reportedAt: "2026-07-17T00:00:00.000Z" },
  { id: "sus_3", accountNumber: "3320 7781 2245", bank: "Public Bank", name: "Fast Invest Holdings", reason: "Investment scam — unlicensed", riskLevel: "medium", reportedAt: "2026-07-17T00:00:00.000Z" },
];

/** A fresh copy of the seed database. */
export function seedDb(): DbShape {
  return {
    users: structuredClone(SEED_USERS),
    transfers: [],
    suspicious: structuredClone(SEED_SUSPICIOUS),
  };
}
