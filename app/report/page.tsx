"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { User, Transfer, Transaction } from "@/lib/types";

const USER_ID = "u_danial";

type CallLine = { time: string; who: string; message: string };
type CallRecord = { timestamp: string; recipient: string; amount: string; verdict: string; lines: CallLine[] };

const rm = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const normAcc = (s: string) => s.replace(/\s/g, "");

export default function ReportPage() {
  const [user, setUser] = useState<User | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [suspicious, setSuspicious] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/users/${USER_ID}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
      fetch(`/api/transfers?userId=${USER_ID}`, { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      fetch(`/api/transcripts`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({ calls: [] })),
      fetch(`/api/suspicious`, { cache: "no-store" }).then((r) => r.json()).catch(() => []),
    ]).then(([u, t, c, s]) => {
      if (u && !u.error) setUser(u);
      if (Array.isArray(t)) setTransfers(t);
      if (c && Array.isArray(c.calls)) setCalls(c.calls);
      if (Array.isArray(s)) setSuspicious(new Set(s.map((x: { accountNumber: string }) => normAcc(x.accountNumber))));
      setLoading(false);
    });
  }, []);

  const now = useMemo(() => new Date(), []);
  const period = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const generatedAt = now.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const txns: Transaction[] = user?.transactions ?? [];
  const moneyIn = txns.filter((t) => t.type === "credit").reduce((a, t) => a + t.amount, 0);
  const moneyOut = txns.filter((t) => t.type === "debit").reduce((a, t) => a + t.amount, 0);

  const blocked = transfers.filter((t) => t.status === "blocked");
  const completed = transfers.filter((t) => t.status === "completed");
  const amountProtected = blocked.reduce((a, t) => a + t.amount, 0);
  const suspiciousHits = transfers.filter((t) => suspicious.has(normAcc(t.accountNumber)));

  const risk = useMemo(() => {
    if (blocked.length > 0)
      return {
        level: "Elevated",
        tone: { bg: "#fdeaea", fg: "#e0393e", bar: "#e0393e" },
        summary: `${blocked.length} scam attempt${blocked.length > 1 ? "s were" : " was"} detected and blocked this month — protecting ${rm(amountProtected)}.`,
      };
    const large = transfers.some((t) => t.amount >= (user?.parentalControl.transactionLimit ?? Infinity));
    if (large || suspiciousHits.length > 0)
      return {
        level: "Moderate",
        tone: { bg: "#fdf3e2", fg: "#c78a12", bar: "#efab30" },
        summary: "Some transfers were flagged for review, but none were confirmed as scams.",
      };
    return {
      level: "Low",
      tone: { bg: "#e4f6e9", fg: "#1f9d55", bar: "#22a03f" },
      summary: "No suspicious transfers were detected this period. Everything looks healthy.",
    };
  }, [blocked.length, amountProtected, transfers, suspiciousHits.length, user]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f0f1f4] text-[#6b7280]">Generating report…</div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eceef1] py-[24px] print:bg-white print:py-0">
      <style>{`@media print { @page { margin: 14mm; } body { background: #fff; } .no-print { display: none !important; } }`}</style>

      {/* Toolbar (hidden in print) */}
      <div className="no-print mx-auto mb-[16px] flex max-w-[820px] items-center justify-between px-[20px]">
        <Link href="/bank" className="flex items-center gap-[7px] text-[14px] font-semibold text-[#3a3f48] hover:text-[#1e2129]">
          <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none">
            <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to accounts
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-[8px] rounded-[8px] bg-[#efab30] px-[18px] py-[10px] text-[14px] font-bold text-white shadow-[0_8px_18px_-8px_rgba(239,171,48,0.9)] transition-colors hover:bg-[#e59f20]"
        >
          <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none">
            <path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v6H8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Download PDF
        </button>
      </div>

      {/* Report sheet */}
      <div className="mx-auto max-w-[820px] bg-white p-[clamp(24px,5vw,48px)] shadow-[0_10px_40px_-16px_rgba(20,26,58,0.3)] print:max-w-full print:p-0 print:shadow-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-[#1e2129] pb-[18px]">
          <div className="flex items-center gap-[12px]">
            <span className="grid h-[44px] w-[44px] place-items-center rounded-[12px] bg-[#1e2129] text-[#efab30]">
              <svg viewBox="0 0 24 24" className="h-[24px] w-[24px]" fill="none">
                <path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
                <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <h1 className="text-[22px] font-extrabold leading-tight text-[#1e2129]">Monthly Account Report</h1>
              <p className="text-[13px] font-semibold text-[#6b7280]">Scam Guard · Maybank2u — prepared for guardian review</p>
            </div>
          </div>
          <div className="text-right text-[12px] text-[#6b7280]">
            <p className="font-bold text-[#1e2129]">{period}</p>
            <p>Generated {generatedAt}</p>
          </div>
        </div>

        {/* Account meta */}
        <div className="mt-[18px] grid grid-cols-2 gap-[12px] sm:grid-cols-4">
          <Meta label="Account holder" value={user?.name ?? "—"} />
          <Meta label="Account number" value={user?.accountNo ?? "—"} />
          <Meta label="Available balance" value={user ? rm(user.balance) : "—"} />
          <Meta label="Parental control" value={user?.parentalControl.enabled ? "Active" : "Off"} />
        </div>

        {/* Risk assessment */}
        <section className="mt-[24px] overflow-hidden rounded-[12px] border border-[#edeff2]">
          <div className="flex items-center justify-between px-[20px] py-[14px]" style={{ background: risk.tone.bg }}>
            <div className="flex items-center gap-[12px]">
              <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-white" style={{ color: risk.tone.fg }}>
                <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none">
                  <path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.6px]" style={{ color: risk.tone.fg }}>Risk assessment</p>
                <p className="text-[20px] font-extrabold text-[#1e2129]">{risk.level} risk</p>
              </div>
            </div>
            <span className="rounded-full bg-white px-[14px] py-[6px] text-[13px] font-bold" style={{ color: risk.tone.fg }}>
              {blocked.length} blocked
            </span>
          </div>
          <p className="px-[20px] py-[14px] text-[14px] leading-relaxed text-[#3a3f48]">{risk.summary}</p>
          <div className="grid grid-cols-3 border-t border-[#edeff2] text-center">
            <Stat label="Transfers screened" value={String(transfers.length)} />
            <Stat label="Scams blocked" value={String(blocked.length)} border />
            <Stat label="Amount protected" value={rm(amountProtected)} />
          </div>
        </section>

        {/* Account summary */}
        <section className="mt-[24px]">
          <SectionTitle>Account summary — {period}</SectionTitle>
          <div className="mt-[10px] grid grid-cols-3 gap-[12px]">
            <SummaryCard label="Money in" value={`+ ${rm(moneyIn)}`} color="#1f9d55" />
            <SummaryCard label="Money out" value={`− ${rm(moneyOut)}`} color="#e0393e" />
            <SummaryCard label="Transfers made" value={`${completed.length} completed`} color="#1e2129" />
          </div>
        </section>

        {/* Transactions */}
        <section className="mt-[24px]">
          <SectionTitle>Transaction history ({txns.length})</SectionTitle>
          <table className="mt-[10px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-[#e6e8ec] text-[12px] uppercase tracking-[0.4px] text-[#8b9099]">
                <th className="pb-[8px] pr-[10px] font-bold">Date</th>
                <th className="pb-[8px] pr-[10px] font-bold">Description</th>
                <th className="pb-[8px] text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id} className="border-b border-[#eef0f3]">
                  <td className="whitespace-nowrap py-[9px] pr-[10px] text-[13px] text-[#5a616b]">{t.date}</td>
                  <td className="py-[9px] pr-[10px] text-[13px] text-[#20242c]">{t.description}</td>
                  <td className={`whitespace-nowrap py-[9px] text-right text-[13px] font-semibold tabular-nums ${t.type === "debit" ? "text-[#e0393e]" : "text-[#22a03f]"}`}>
                    {t.type === "debit" ? "" : "+ "}
                    {rm(t.amount)}
                  </td>
                </tr>
              ))}
              {txns.length === 0 && <tr><td colSpan={3} className="py-[12px] text-[13px] text-[#8b9099]">No transactions.</td></tr>}
            </tbody>
          </table>
        </section>

        {/* Screened transfers */}
        <section className="mt-[24px]">
          <SectionTitle>Screened transfers ({transfers.length})</SectionTitle>
          <table className="mt-[10px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-[#e6e8ec] text-[12px] uppercase tracking-[0.4px] text-[#8b9099]">
                <th className="pb-[8px] pr-[10px] font-bold">Recipient</th>
                <th className="pb-[8px] pr-[10px] font-bold">Account</th>
                <th className="pb-[8px] pr-[10px] text-right font-bold">Amount</th>
                <th className="pb-[8px] text-right font-bold">Result</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => {
                const isBlocked = t.status === "blocked";
                const flagged = suspicious.has(normAcc(t.accountNumber));
                return (
                  <tr key={t.id} className="border-b border-[#eef0f3]">
                    <td className="py-[9px] pr-[10px] text-[13px] text-[#20242c]">
                      {t.recipientName}
                      {flagged && <span className="ml-[6px] rounded-[4px] bg-[#fdeaea] px-[5px] py-[1px] text-[10px] font-bold text-[#e0393e]">FLAGGED</span>}
                    </td>
                    <td className="whitespace-nowrap py-[9px] pr-[10px] text-[13px] text-[#5a616b]">{t.accountNumber} · {t.recipientBank}</td>
                    <td className="whitespace-nowrap py-[9px] pr-[10px] text-right text-[13px] font-semibold tabular-nums text-[#20242c]">{rm(t.amount)}</td>
                    <td className="py-[9px] text-right">
                      <span className={`rounded-full px-[9px] py-[3px] text-[11px] font-bold ${isBlocked ? "bg-[#fdeaea] text-[#e0393e]" : "bg-[#e4f6e9] text-[#1f9d55]"}`}>
                        {isBlocked ? "BLOCKED" : "Completed"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {transfers.length === 0 && <tr><td colSpan={4} className="py-[12px] text-[13px] text-[#8b9099]">No transfers this period.</td></tr>}
            </tbody>
          </table>
        </section>

        {/* Verification call log */}
        <section className="mt-[24px]">
          <SectionTitle>AI verification calls ({calls.length})</SectionTitle>
          <div className="mt-[10px] space-y-[12px]">
            {calls.map((c, i) => {
              const isBlocked = c.verdict.toUpperCase() === "BLOCKED";
              return (
                <div key={i} className="break-inside-avoid rounded-[10px] border border-[#edeff2]">
                  <div className="flex items-center justify-between gap-[10px] border-b border-[#eef0f3] px-[14px] py-[10px]">
                    <div className="min-w-0 text-[13px]">
                      <span className="font-bold text-[#1e2129]">{c.recipient}</span>
                      <span className="text-[#8b9099]"> · RM {c.amount} · {c.timestamp}</span>
                    </div>
                    <span className={`shrink-0 rounded-full px-[9px] py-[3px] text-[11px] font-bold ${isBlocked ? "bg-[#fdeaea] text-[#e0393e]" : "bg-[#e4f6e9] text-[#1f9d55]"}`}>
                      {c.verdict.toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-[4px] px-[14px] py-[10px]">
                    {c.lines.map((l, j) => (
                      <p key={j} className="text-[12.5px] leading-snug">
                        <span className={`font-semibold ${l.who === "Scam Guard" ? "text-[#c78a12]" : "text-[#3a3f48]"}`}>{l.who}:</span>{" "}
                        <span className="text-[#20242c]">{l.message}</span>
                      </p>
                    ))}
                    {c.lines.length === 0 && <p className="text-[12.5px] text-[#8b9099]">No transcript captured.</p>}
                  </div>
                </div>
              );
            })}
            {calls.length === 0 && <p className="text-[13px] text-[#8b9099]">No verification calls this period.</p>}
          </div>
        </section>

        {/* Footer */}
        <div className="mt-[28px] border-t border-[#edeff2] pt-[14px] text-[11px] leading-relaxed text-[#8b9099]">
          Generated by Scam Guard — an AI safety layer for banking apps. This report summarizes account activity and AI
          verification calls for the stated period to help a guardian spot suspicious transfers. It is a monitoring aid, not
          financial advice or a certified fraud determination. If you suspect fraud, contact your bank (Maybank Careline
          1-300-88-6688) immediately.
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.4px] text-[#8b9099]">{label}</p>
      <p className="mt-[2px] text-[14px] font-bold text-[#1e2129]">{value}</p>
    </div>
  );
}

function Stat({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <div className={`px-[14px] py-[14px] ${border ? "border-x border-[#edeff2]" : ""}`}>
      <p className="text-[20px] font-extrabold text-[#1e2129]">{value}</p>
      <p className="mt-[2px] text-[11.5px] text-[#8b9099]">{label}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[15px] font-bold text-[#1e2129]">{children}</h2>;
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[10px] border border-[#edeff2] px-[14px] py-[12px]">
      <p className="text-[11.5px] text-[#8b9099]">{label}</p>
      <p className="mt-[3px] text-[16px] font-bold tabular-nums" style={{ color }}>{value}</p>
    </div>
  );
}
