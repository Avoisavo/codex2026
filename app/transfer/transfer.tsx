"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MaybankChrome } from "../components/maybank/MaybankChrome";

const FROM_ACCOUNTS = [
  { id: "savings", label: "Personal Account (Savings)", number: "1622 5471 7348", balance: 89187.9 },
  { id: "current", label: "Current Account", number: "5140 8827 1093", balance: 12640.55 },
];

const FAVOURITES = [
  { name: "Jonathan Lim", bank: "Maybank", account: "1284 5590 2231" },
  { name: "Nadia Rahman", bank: "CIMB Bank", account: "7009 1123 8845" },
  { name: "Wei Sheng Tan", bank: "Public Bank", account: "3188 4471 0092" },
];

const PAYMENT_TYPES = [
  "Instant Transfer (DuitNow)",
  "Credit Card Payment",
  "Utilities",
  "Bill Payment",
];

type Step = "form" | "review" | "done";

const fmt = (n: number) =>
  n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function TransferPage() {
  const [step, setStep] = useState<Step>("form");
  const [fromId, setFromId] = useState(FROM_ACCOUNTS[0].id);
  const [recipient, setRecipient] = useState("");
  const [recipientBank, setRecipientBank] = useState("Maybank");
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [paymentType, setPaymentType] = useState(PAYMENT_TYPES[0]);

  const from = useMemo(() => FROM_ACCOUNTS.find((a) => a.id === fromId)!, [fromId]);
  const amountNum = parseFloat(amount) || 0;

  const canContinue = !!recipient.trim() && !!account.trim() && amountNum > 0 && amountNum <= from.balance;

  const pickFavourite = (f: (typeof FAVOURITES)[number]) => {
    setRecipient(f.name);
    setRecipientBank(f.bank);
    setAccount(f.account);
  };

  const reset = () => {
    setStep("form");
    setRecipient("");
    setAccount("");
    setAmount("");
    setReference("");
    setPaymentType(PAYMENT_TYPES[0]);
  };

  return (
    <MaybankChrome
      hero={
        <div className="pt-[clamp(14px,2.4vh,24px)] pb-[clamp(36px,6.2vh,60px)]">
          <h1 className="mb-h1 text-[#1e2129]">Pay &amp; Transfer</h1>
          <p className="mb-sub mt-[clamp(4px,1vh,8px)] text-[#5a4a1c]">
            Move money instantly with DuitNow, or schedule an interbank transfer.
          </p>
        </div>
      }
    >
      <div className="flex h-full flex-col pt-[clamp(14px,2.4vh,22px)]">
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-[clamp(18px,2vw,26px)]">
          {/* ── Main column ── */}
          <div className="min-h-0 overflow-hidden rounded-[12px] border border-[#edeff2] bg-white p-[clamp(18px,3vh,28px)] shadow-[0_8px_28px_-18px_rgba(20,26,58,0.28)]">
            {step === "form" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (canContinue) setStep("review");
                }}
              >
                <h2 className="mb-title text-[#1e2129]">Transfer details</h2>

                <Field label="From account">
                  <Select value={fromId} onChange={setFromId}>
                    {FROM_ACCOUNTS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label} — RM {fmt(a.balance)}
                      </option>
                    ))}
                  </Select>
                </Field>

                <div className="grid grid-cols-2 gap-[clamp(10px,1.2vw,14px)]">
                  <Field label="Recipient name">
                    <Input value={recipient} onChange={setRecipient} placeholder="e.g. Jonathan Lim" />
                  </Field>
                  <Field label="Recipient bank">
                    <Select value={recipientBank} onChange={setRecipientBank}>
                      {["Maybank", "CIMB Bank", "Public Bank", "RHB Bank", "Hong Leong Bank"].map((b) => (
                        <option key={b}>{b}</option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-[clamp(10px,1.2vw,14px)]">
                  <Field label="Account number">
                    <Input value={account} onChange={setAccount} placeholder="Account no." inputMode="numeric" />
                  </Field>
                  <Field label="Amount">
                    <div className="relative">
                      <span className="mb-body pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 font-semibold text-[#8b9099]">
                        RM
                      </span>
                      <input
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                        placeholder="0.00"
                        inputMode="decimal"
                        className="mb-body w-full rounded-[8px] border border-[#e2e5ea] bg-white py-[clamp(9px,1.6vh,12px)] pl-[44px] pr-[14px] font-semibold text-[#20242c] outline-none transition-colors focus:border-[#efab30]"
                      />
                    </div>
                  </Field>
                </div>
                {amountNum > from.balance && (
                  <p className="mb-small mt-[6px] font-medium text-[#e0393e]">
                    Amount exceeds available balance (RM {fmt(from.balance)}).
                  </p>
                )}

                <Field label="Recipient reference (optional)">
                  <Input value={reference} onChange={setReference} placeholder="e.g. Dinner, Rent" />
                </Field>

                <Field label="Payment Type">
                  <Select value={paymentType} onChange={setPaymentType}>
                    {PAYMENT_TYPES.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </Select>
                </Field>

                <button
                  type="submit"
                  disabled={!canContinue}
                  className="mb-body mt-[clamp(16px,2.6vh,20px)] w-full rounded-[8px] bg-[#efab30] py-[clamp(11px,1.9vh,13px)] font-bold text-white shadow-[0_10px_22px_-10px_rgba(239,171,48,0.95)] transition-colors hover:bg-[#e59f20] disabled:cursor-not-allowed disabled:bg-[#e7e9ed] disabled:text-[#a2a8b0] disabled:shadow-none"
                >
                  Continue
                </button>
              </form>
            )}

            {step === "review" && (
              <div>
                <h2 className="mb-title text-[#1e2129]">Review your transfer</h2>
                <p className="mb-small mt-[3px] text-[#6b7280]">
                  Please confirm the details before you transfer.
                </p>

                <div className="mt-[clamp(12px,2vh,16px)] rounded-[12px] bg-[#f8f9fb] p-[clamp(14px,2.4vh,18px)] text-center">
                  <p className="mb-small text-[#6b7280]">You are transferring</p>
                  <p className="mb-amount mt-[6px] text-[#1e2129]">RM {fmt(amountNum)}</p>
                  <p className="mb-small mt-[8px] text-[#6b7280]">
                    to <span className="font-semibold text-[#20242c]">{recipient}</span>
                  </p>
                </div>

                <dl className="mt-[clamp(10px,1.8vh,14px)] divide-y divide-[#eef0f3]">
                  <ReviewRow label="From" value={from.label} sub={from.number} />
                  <ReviewRow label="Recipient bank" value={recipientBank} />
                  <ReviewRow label="Account number" value={account} />
                  <ReviewRow label="Payment Type" value={paymentType} />
                  <ReviewRow label="Reference" value={reference || "—"} />
                </dl>

                <div className="mt-[clamp(14px,2.4vh,18px)] flex flex-row-reverse gap-[12px]">
                  <button
                    onClick={() => setStep("done")}
                    className="mb-body flex-1 rounded-[8px] bg-[#efab30] py-[clamp(11px,1.9vh,13px)] font-bold text-white shadow-[0_10px_22px_-10px_rgba(239,171,48,0.95)] transition-colors hover:bg-[#e59f20]"
                  >
                    Confirm &amp; Transfer
                  </button>
                  <button
                    onClick={() => setStep("form")}
                    className="mb-body rounded-[8px] border border-[#e2e5ea] bg-white px-[28px] py-[clamp(11px,1.9vh,13px)] font-semibold text-[#3a3f48] transition-colors hover:bg-[#f6f7f9]"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            {step === "done" && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="grid h-[clamp(52px,9vh,68px)] w-[clamp(52px,9vh,68px)] place-items-center rounded-full bg-[#e6f6ea]">
                  <svg viewBox="0 0 24 24" className="h-1/2 w-1/2 text-[#22a03f]" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h2 className="mb-title mt-[clamp(12px,2vh,16px)] text-[#1e2129]">Transfer successful</h2>
                <p className="mb-body mt-[6px] text-[#6b7280]">
                  RM {fmt(amountNum)} sent to <span className="font-semibold text-[#20242c]">{recipient}</span>.
                </p>

                <div className="mt-[clamp(14px,2.4vh,18px)] w-full max-w-[380px] rounded-[12px] bg-[#f8f9fb] p-[clamp(14px,2.4vh,18px)] text-left">
                  <ReviewRow label="Reference no." value="MB2U0918-77213" />
                  <ReviewRow label="Date" value="18 Jul 2026, 11:42 am" />
                  <ReviewRow label="From" value={from.label} />
                </div>

                <div className="mt-[clamp(16px,2.6vh,20px)] flex gap-[12px]">
                  <button
                    onClick={reset}
                    className="mb-body rounded-[8px] bg-[#efab30] px-[24px] py-[clamp(10px,1.7vh,12px)] font-bold text-white transition-colors hover:bg-[#e59f20]"
                  >
                    Make another transfer
                  </button>
                  <Link
                    href="/bank"
                    className="mb-body rounded-[8px] border border-[#e2e5ea] bg-white px-[24px] py-[clamp(10px,1.7vh,12px)] text-center font-semibold text-[#3a3f48] transition-colors hover:bg-[#f6f7f9]"
                  >
                    Back to accounts
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className="flex min-h-0 flex-col gap-[clamp(14px,2vh,18px)]">
            <div className="shrink-0 rounded-[12px] border border-[#edeff2] bg-white p-[clamp(16px,2.4vh,20px)] shadow-[0_8px_28px_-18px_rgba(20,26,58,0.28)]">
              <p className="mb-small text-[#6b7280]">Transferring from</p>
              <p className="mb-body mt-[5px] font-bold text-[#1e2129]">{from.label}</p>
              <p className="mb-small tracking-[0.4px] text-[#a2a8b0]">{from.number}</p>
              <div className="mt-[clamp(10px,1.8vh,14px)] border-t border-[#eef0f3] pt-[clamp(10px,1.8vh,14px)]">
                <p className="mb-small text-[#6b7280]">Available balance</p>
                <p className="mb-balance-sm mt-[3px] text-[#22a03f]">RM {fmt(from.balance)}</p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-[12px] border border-[#edeff2] bg-white p-[clamp(16px,2.4vh,20px)] shadow-[0_8px_28px_-18px_rgba(20,26,58,0.28)]">
              <p className="mb-lg font-bold text-[#1e2129]">Favourites</p>
              <ul className="mt-[clamp(8px,1.4vh,10px)] space-y-[clamp(4px,0.8vh,6px)]">
                {FAVOURITES.map((f) => (
                  <li key={f.account}>
                    <button
                      type="button"
                      onClick={() => pickFavourite(f)}
                      disabled={step !== "form"}
                      className="flex w-full items-center gap-[11px] rounded-[10px] px-[8px] py-[clamp(6px,1.2vh,8px)] text-left transition-colors hover:bg-[#f6f7f9] disabled:opacity-50"
                    >
                      <span className="mb-body grid h-[clamp(32px,5vh,38px)] w-[clamp(32px,5vh,38px)] shrink-0 place-items-center rounded-full bg-[#fef1d6] font-bold text-[#c78a12]">
                        {f.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </span>
                      <span className="min-w-0">
                        <span className="mb-body block truncate font-semibold text-[#20242c]">{f.name}</span>
                        <span className="mb-xs block truncate text-[#8b9099]">
                          {f.bank} · {f.account}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </MaybankChrome>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-[clamp(12px,2vh,16px)] block">
      <span className="mb-small mb-[7px] block font-semibold text-[#3a3f48]">{label}</span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "numeric" | "decimal" | "text";
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      className="mb-body w-full rounded-[8px] border border-[#e2e5ea] bg-white px-[14px] py-[clamp(9px,1.6vh,12px)] text-[#20242c] outline-none transition-colors placeholder:text-[#b4b9c1] focus:border-[#efab30]"
    />
  );
}

function ReviewRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-[16px] py-[clamp(7px,1.3vh,9px)]">
      <dt className="mb-small text-[#6b7280]">{label}</dt>
      <dd className="text-right">
        <span className="mb-body block font-semibold text-[#20242c]">{value}</span>
        {sub && <span className="mb-xs block text-[#8b9099]">{sub}</span>}
      </dd>
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mb-body w-full appearance-none rounded-[8px] border border-[#e2e5ea] bg-white px-[14px] py-[clamp(9px,1.6vh,12px)] pr-[40px] text-[#20242c] outline-none transition-colors focus:border-[#efab30]"
      >
        {children}
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
