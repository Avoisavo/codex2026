"use client";

import { useEffect, useState } from "react";
import type { User } from "@/lib/types";
import { MaybankChrome } from "../components/maybank/MaybankChrome";
import { AdCarousel } from "../components/maybank/AdCarousel";
import { QuickActions, CardVisual, SpendingInsights } from "../components/maybank/BankModules";

const USER_ID = "u_danial";

const rm = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function BankPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch(`/api/users/${USER_ID}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((u) => {
        if (u && !u.error) setUser(u);
      })
      .catch(() => {});
  }, []);

  const txns = user?.transactions ?? [];
  const moneyIn = txns.filter((t) => t.type === "credit").reduce((a, t) => a + t.amount, 0);
  const moneyOut = txns.filter((t) => t.type === "debit").reduce((a, t) => a + t.amount, 0);

  return (
    <MaybankChrome
      hero={
        <div className="pt-[clamp(14px,2.4vh,24px)] pb-[clamp(18px,2.8vh,30px)]">
          <h1 className="mb-h1 text-[#1e2129]">Hello {user?.name ?? "Danial Ariff"}</h1>
          <p className="mb-sub mt-[clamp(4px,1vh,8px)] text-[#5a4a1c]">
            Your last login was on Friday, 17 Jul 2026 at 11:28 pm
          </p>
        </div>
      }
    >
      <div className="flex min-h-full flex-col pt-[clamp(14px,2.4vh,22px)]">
        {/* Dashboard grid */}
        <div className="grid flex-1 grid-cols-1 gap-[clamp(16px,2.2vw,26px)] xl:min-h-0 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
          {/* ── Left column ── */}
          <div className="flex flex-col gap-[clamp(12px,2vh,18px)] xl:min-h-0">
            {/* Balance */}
            <div className="rounded-[12px] border border-[#edeff2] bg-white p-[clamp(16px,2.6vh,24px)] shadow-[0_8px_28px_-18px_rgba(20,26,58,0.28)]">
              <div className="flex items-start justify-between">
                <p className="mb-body text-[#6b7280]">Available Balance</p>
                <p className="mb-small tracking-[0.5px] text-[#a2a8b0]">Savings · 7348</p>
              </div>
              <p className="mb-balance mt-[clamp(6px,1.2vh,10px)] text-[#22a03f]">
                {user ? rm(user.balance) : "RM ——"}
              </p>

              <div className="mt-[clamp(12px,2vh,16px)] grid grid-cols-2 gap-[clamp(10px,1.5vw,16px)] border-t border-[#eef0f3] pt-[clamp(12px,2vh,16px)]">
                <MoneyStat direction="in" label="Money in · 30d" amount={`+ ${rm(moneyIn)}`} />
                <MoneyStat direction="out" label="Money out · 30d" amount={`− ${rm(moneyOut)}`} />
              </div>
            </div>

            {/* Quick actions */}
            <QuickActions />

            {/* Card visual fills remaining height */}
            <CardVisual />
          </div>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-[clamp(12px,2vh,18px)] xl:min-h-0">
            {/* Transactions */}
            <div className="flex min-h-[320px] flex-1 flex-col rounded-[12px] border border-[#edeff2] bg-white p-[clamp(16px,2.4vh,22px)] shadow-[0_8px_28px_-18px_rgba(20,26,58,0.28)] xl:min-h-0">
              <div className="flex flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between">
                <h2 className="mb-title text-[#1e2129]">Transactions History</h2>
                <div className="grid grid-cols-1 gap-[clamp(8px,1vw,12px)] sm:grid-cols-2">
                  <FilterSelect defaultValue="All transactions" options={["All transactions", "Money in", "Money out"]} />
                  <FilterSelect defaultValue="Last 90 days" options={["Last 90 days", "Last 30 days", "Last 7 days"]} />
                </div>
              </div>

              <div className="mt-[clamp(10px,1.8vh,16px)] min-h-0 flex-1 overflow-x-auto xl:overflow-hidden">
                <table className="w-full min-w-[520px] border-collapse text-left xl:min-w-0">
                  <thead>
                    <tr className="border-b-2 border-[#e6e8ec]">
                      <th className="mb-small pb-[clamp(8px,1.4vh,11px)] pr-[12px] font-bold text-[#1e2129]">Date</th>
                      <th className="mb-small pb-[clamp(8px,1.4vh,11px)] pr-[12px] font-bold text-[#1e2129]">Description</th>
                      <th className="mb-small pb-[clamp(8px,1.4vh,11px)] text-right font-bold text-[#1e2129]">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txns.map((txn) => (
                      <tr key={txn.id} className="border-b border-[#eef0f3]">
                        <td className="mb-small whitespace-nowrap py-[clamp(8px,1.5vh,13px)] pr-[12px] text-[#5a616b]">{txn.date}</td>
                        <td className="mb-small py-[clamp(8px,1.5vh,13px)] pr-[12px] text-[#20242c]">{txn.description}</td>
                        <td
                          className={`mb-small whitespace-nowrap py-[clamp(8px,1.5vh,13px)] text-right font-semibold tabular-nums ${
                            txn.type === "debit" ? "text-[#e0393e]" : "text-[#22a03f]"
                          }`}
                        >
                          {txn.type === "debit" ? "" : "+ "}
                          {rm(txn.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Spending insights */}
            <SpendingInsights />

            {/* Promotions carousel, below the spending section */}
            <div className="h-[clamp(132px,16vh,164px)] shrink-0 xl:h-[clamp(96px,13vh,132px)]">
              <AdCarousel />
            </div>
          </div>
        </div>
      </div>
    </MaybankChrome>
  );
}

function MoneyStat({ direction, label, amount }: { direction: "in" | "out"; label: string; amount: string }) {
  const isIn = direction === "in";
  return (
    <div className="flex items-center gap-[10px]">
      <span
        className={`grid h-[clamp(28px,4vh,36px)] w-[clamp(28px,4vh,36px)] shrink-0 place-items-center rounded-full ${
          isIn ? "bg-[#e4f6e9] text-[#1f9d55]" : "bg-[#fdeaea] text-[#e0393e]"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none">
          {isIn ? (
            <path d="M12 19V5m0 0-6 6m6-6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M12 5v14m0 0 6-6m-6 6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </span>
      <div className="min-w-0">
        <p className="mb-xs text-[#8b9099]">{label}</p>
        <p className={`mb-small font-bold tabular-nums ${isIn ? "text-[#1f9d55]" : "text-[#e0393e]"}`}>{amount}</p>
      </div>
    </div>
  );
}

function FilterSelect({ defaultValue, options }: { defaultValue: string; options: string[] }) {
  return (
    <div className="relative">
      <select
        defaultValue={defaultValue}
        className="mb-body w-full appearance-none rounded-[8px] border border-[#e2e5ea] bg-white px-[clamp(12px,1.2vw,16px)] py-[clamp(9px,1.6vh,12px)] font-medium text-[#20242c] outline-none transition-colors focus:border-[#efab30]"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute right-[14px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-[#20242c]"
        fill="none"
      >
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
