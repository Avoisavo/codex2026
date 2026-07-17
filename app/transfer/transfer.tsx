"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "@/lib/types";
import { MaybankChrome } from "../components/maybank/MaybankChrome";

const USER_ID = "u_danial";

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

// Steps shown in the "AI Scam Guard analyzing…" modal while the precheck runs.
const ANALYZE_STEPS = [
  "Verifying recipient account records",
  "Checking your transaction limit",
  "Screening against flagged & suspicious accounts",
  "Assessing overall transfer risk",
];

type Step = "form" | "review" | "done" | "rejected";
type CallStatus = "idle" | "calling" | "active" | "ended" | "error";
type TranscriptEntry = { role: "user" | "ai"; message: string; time: number };

const fmt = (n: number) =>
  n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const norm = (s: string) => s.replace(/\s/g, "");

// Read the agent's final APPROVED / BLOCKED decision out of its spoken messages.
// The agent is instructed to use the words APPROVED / BLOCKED only in its final
// line, so we scan newest-first and match on those words alone (BLOCKED wins ties).
function deriveVerdict(transcript: TranscriptEntry[]): "approved" | "blocked" | null {
  for (let i = transcript.length - 1; i >= 0; i--) {
    const t = transcript[i];
    if (t.role !== "ai") continue;
    const m = t.message.toLowerCase();
    if (/\bblocked\b/.test(m)) return "blocked";
    if (/\bapproved\b/.test(m)) return "approved";
  }
  return null;
}

export default function TransferPage() {
  const [step, setStep] = useState<Step>("form");
  const [user, setUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [recipient, setRecipient] = useState("");
  const [recipientBank, setRecipientBank] = useState("Maybank");
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [paymentType, setPaymentType] = useState(PAYMENT_TYPES[0]);

  // AI precheck / verification-call state
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [halted, setHalted] = useState(false);
  const [reasons, setReasons] = useState<string[]>([]);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callError, setCallError] = useState("");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const verdictActedRef = useRef(false);
  const savedRef = useRef(false);
  const callVarsRef = useRef<Record<string, string> | null>(null);

  useEffect(() => {
    fetch(`/api/users/${USER_ID}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((u) => {
        if (u && !u.error) setUser(u);
      })
      .catch(() => {});
  }, []);

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };
  useEffect(() => () => stopPoll(), []);

  // Demo shortcut: press Space (when not typing in a field) to autofill a flagged transfer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return; // let space type normally
      if (step !== "form") return;
      e.preventDefault();
      setRecipient("Quick Cash Enterprise");
      setRecipientBank("Maybank");
      setAccount("8842 1190 3321");
      setAmount("10000");
      setReference("Loan release fee");
      setPaymentType(PAYMENT_TYPES[0]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const balance = user?.balance ?? 0;
  const account_no = user?.accountNo ?? "1622 5471 7348";
  const fromLabel = "Personal Account (Savings)";
  const amountNum = parseFloat(amount) || 0;
  const parentalEnabled = !!user?.parentalControl.enabled;
  const guardianPhone = (user?.parentalControl.smsPhone ?? "").trim();

  const canContinue =
    !!user && !!recipient.trim() && !!account.trim() && amountNum > 0 && amountNum <= balance;

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

  /* ── AI precheck (only runs when parental control is enabled) ─────────── */
  const runPrecheck = async (): Promise<{
    flags: string[];
    suspiciousStatus: string;
    suspiciousReason: string;
  }> => {
    const pc = user!.parentalControl;
    const flags: string[] = [];
    let suspiciousStatus = "not on the bank's suspicious-account list";
    let suspiciousReason = "none";

    // Check #2 — amount higher than the preset transaction limit
    if (amountNum > pc.transactionLimit) {
      flags.push(`Amount RM ${fmt(amountNum)} exceeds your transaction limit of RM ${fmt(pc.transactionLimit)}.`);
    }

    // Check #3 — recipient account flagged as suspicious
    try {
      const data = await (await fetch(`/api/suspicious?account=${encodeURIComponent(account)}`, { cache: "no-store" })).json();
      if (data?.flagged) {
        const reason = data.matches?.[0]?.reason ?? "reported account";
        suspiciousStatus = "FLAGGED as a known suspicious account";
        suspiciousReason = reason;
        flags.push(`Recipient account is flagged as suspicious — ${reason}.`);
      }
    } catch {
      // ignore — don't block on a failed check
    }

    // Check #1 — account NOT in my (completed) transfer history → new/unknown payee
    try {
      const list = await (await fetch(`/api/transfers?userId=${USER_ID}`, { cache: "no-store" })).json();
      const known =
        Array.isArray(list) &&
        list.some((t: { accountNumber?: string; status?: string }) => t.status === "completed" && norm(String(t.accountNumber ?? "")) === norm(account));
      if (!known) flags.push("New payee — this account is not in your transfer history.");
    } catch {
      // ignore
    }

    return { flags, suspiciousStatus, suspiciousReason };
  };

  /* ── Actual transfer write ────────────────────────────────────────────── */
  const performWrites = async () => {
    if (!user) return;
    const newBalance = Math.max(0, user.balance - amountNum);
    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const label = paymentType.includes("DuitNow") ? "DuitNow Transfer" : "Transfer";
    const newTxn = {
      id: `t_${crypto.randomUUID().slice(0, 8)}`,
      date: today,
      description: `${label} to ${recipient}`,
      amount: amountNum,
      type: "debit" as const,
    };
    const updatedTxns = [newTxn, ...user.transactions];

    try {
      await fetch(`/api/users/${USER_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balance: newBalance, transactions: updatedTxns }),
      });
      await fetch(`/api/transfers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: USER_ID,
          fromAccount: fromLabel,
          recipientName: recipient,
          recipientBank,
          accountNumber: account,
          amount: amountNum,
          reference,
          paymentType,
          status: "completed",
        }),
      });
      setUser({ ...user, balance: newBalance, transactions: updatedTxns });
    } catch (err) {
      console.error("Transfer write failed:", err);
    }
  };

  const recordBlocked = async () => {
    try {
      await fetch(`/api/transfers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: USER_ID,
          fromAccount: fromLabel,
          recipientName: recipient,
          recipientBank,
          accountNumber: account,
          amount: amountNum,
          reference,
          paymentType,
          status: "blocked",
        }),
      });
    } catch {
      // ignore
    }
  };

  /* ── Confirm handler: precheck → halt + verification call, or complete ── */
  const attemptTransfer = async () => {
    if (!user || submitting) return;

    if (parentalEnabled) {
      // Show the "AI Scam Guard" analyzing modal while the checks run.
      setAnalyzeStep(0);
      setAnalyzing(true);
      const ticker = setInterval(
        () => setAnalyzeStep((s) => Math.min(s + 1, ANALYZE_STEPS.length)),
        700
      );
      const [{ flags, suspiciousStatus, suspiciousReason }] = await Promise.all([
        runPrecheck(),
        new Promise((r) => setTimeout(r, 2900)), // keep the analysis visible
      ]);
      clearInterval(ticker);
      setAnalyzeStep(ANALYZE_STEPS.length);
      await new Promise((r) => setTimeout(r, 450));
      setAnalyzing(false);

      if (flags.length > 0) {
        setReasons(flags);
        setTranscript([]);
        setCallStatus("idle");
        setCallError("");
        verdictActedRef.current = false;
        savedRef.current = false;
        setHalted(true);

        if (guardianPhone) {
          const vars: Record<string, string> = {
            user_name: user.name,
            amount: fmt(amountNum),
            recipient,
            recipient_bank: recipientBank,
            account_number: account,
            payment_type: paymentType,
            suspicious_status: suspiciousStatus,
            suspicious_reason: suspiciousReason,
            flagged_reasons: flags.join("; "),
          };
          callVarsRef.current = vars;
          placeVerificationCall(guardianPhone, vars);
        }
        return;
      }
    }

    setSubmitting(true);
    await performWrites();
    setSubmitting(false);
    setStep("done");
  };

  /* ── Twilio + ElevenLabs verification call ────────────────────────────── */
  const placeVerificationCall = async (phone: string, vars: Record<string, string>) => {
    setCallStatus("calling");
    setCallError("");
    try {
      const res = await fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_number: phone, dynamic_variables: vars }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCallStatus("error");
        setCallError(typeof data.error === "string" ? data.error : "Failed to place call");
        return;
      }
      setCallStatus("active");
      if (data.conversation_id) startPoll(data.conversation_id);
    } catch {
      setCallStatus("error");
      setCallError("Network error placing the verification call.");
    }
  };

  const startPoll = (convId: string) => {
    stopPoll();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/transcript?id=${convId}`);
        if (!res.ok) return;
        const data = await res.json();
        const t: TranscriptEntry[] = Array.isArray(data.transcript) ? data.transcript : [];
        setTranscript(t);

        const v = deriveVerdict(t);
        if (v && !verdictActedRef.current) {
          verdictActedRef.current = true;
          stopPoll();
          if (v === "approved") await handleApproved(t);
          else await handleBlocked(t);
          return;
        }

        if (data.status === "done") {
          setCallStatus("ended");
          stopPoll();
          saveTranscript(t, "ENDED");
        }
      } catch {
        // ignore
      }
    }, 2500);
  };

  // Persist the verification-call transcript to transcript.txt (once per call).
  const saveTranscript = (t: TranscriptEntry[], verdict: string) => {
    if (savedRef.current) return;
    savedRef.current = true;
    fetch("/api/transcripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: t, amount: fmt(amountNum), recipient, verdict }),
    }).catch(() => {});
  };

  const handleApproved = async (t: TranscriptEntry[]) => {
    saveTranscript(t, "APPROVED");
    await performWrites();
    setHalted(false);
    setCallStatus("idle");
    setTranscript([]);
    setStep("done");
  };

  const handleBlocked = async (t: TranscriptEntry[]) => {
    saveTranscript(t, "BLOCKED");
    await recordBlocked();
    stopPoll();
    setHalted(false);
    setCallStatus("idle");
    setTranscript([]);
    setStep("rejected");
  };

  const closeHalt = () => {
    stopPoll();
    if (transcript.length > 0) saveTranscript(transcript, "CANCELLED");
    setHalted(false);
    setCallStatus("idle");
    setTranscript([]);
  };

  return (
    <>
      <MaybankChrome
        hero={
          <div className="pt-[clamp(14px,2.4vh,24px)] pb-[clamp(36px,6.2vh,60px)]">
            <h1 className="mb-h1 text-[#1e2129]">Pay &amp; Transfer</h1>
            <p className="mb-sub mt-[clamp(4px,1vh,8px)] text-[#5a4a1c]">
              {parentalEnabled
                ? "Parental control is on — flagged transfers are verified by an AI scam-guard call before they go through."
                : "Move money instantly with DuitNow, or schedule an interbank transfer."}
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
                    <Select value="savings" onChange={() => {}}>
                      <option value="savings">
                        {fromLabel} — RM {fmt(balance)}
                      </option>
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
                  {amountNum > balance && (
                    <p className="mb-small mt-[6px] font-medium text-[#e0393e]">
                      Amount exceeds available balance (RM {fmt(balance)}).
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
                    {parentalEnabled
                      ? "This transfer will be AI-prechecked before it completes."
                      : "Please confirm the details before you transfer."}
                  </p>

                  <div className="mt-[clamp(12px,2vh,16px)] rounded-[12px] bg-[#f8f9fb] p-[clamp(14px,2.4vh,18px)] text-center">
                    <p className="mb-small text-[#6b7280]">You are transferring</p>
                    <p className="mb-amount mt-[6px] text-[#1e2129]">RM {fmt(amountNum)}</p>
                    <p className="mb-small mt-[8px] text-[#6b7280]">
                      to <span className="font-semibold text-[#20242c]">{recipient}</span>
                    </p>
                  </div>

                  <dl className="mt-[clamp(10px,1.8vh,14px)] divide-y divide-[#eef0f3]">
                    <ReviewRow label="From" value={fromLabel} sub={account_no} />
                    <ReviewRow label="Recipient bank" value={recipientBank} />
                    <ReviewRow label="Account number" value={account} />
                    <ReviewRow label="Payment Type" value={paymentType} />
                    <ReviewRow label="Reference" value={reference || "—"} />
                  </dl>

                  <div className="mt-[clamp(14px,2.4vh,18px)] flex flex-row-reverse gap-[12px]">
                    <button
                      onClick={attemptTransfer}
                      disabled={submitting}
                      className="mb-body flex-1 rounded-[8px] bg-[#efab30] py-[clamp(11px,1.9vh,13px)] font-bold text-white shadow-[0_10px_22px_-10px_rgba(239,171,48,0.95)] transition-colors hover:bg-[#e59f20] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {submitting ? (parentalEnabled ? "Running AI precheck…" : "Processing…") : "Confirm & Transfer"}
                    </button>
                    <button
                      onClick={() => setStep("form")}
                      disabled={submitting}
                      className="mb-body rounded-[8px] border border-[#e2e5ea] bg-white px-[28px] py-[clamp(11px,1.9vh,13px)] font-semibold text-[#3a3f48] transition-colors hover:bg-[#f6f7f9] disabled:opacity-50"
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
                    <ReviewRow label="New balance" value={`RM ${fmt(balance)}`} />
                    <ReviewRow label="Payment Type" value={paymentType} />
                    <ReviewRow label="From" value={fromLabel} />
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

              {step === "rejected" && (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="grid h-[clamp(52px,9vh,68px)] w-[clamp(52px,9vh,68px)] place-items-center rounded-full bg-[#fdeaea]">
                    <svg viewBox="0 0 24 24" className="h-1/2 w-1/2 text-[#e0393e]" fill="none">
                      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h2 className="mb-title mt-[clamp(12px,2vh,16px)] text-[#1e2129]">Transfer rejected</h2>
                  <p className="mb-body mt-[6px] max-w-[440px] text-[#6b7280]">
                    Our AI scam-guard stopped this RM {fmt(amountNum)} transfer to{" "}
                    <span className="font-semibold text-[#20242c]">{recipient}</span>. Your balance is unchanged and no money has left your account.
                  </p>

                  {guardianPhone && (
                    <div className="mt-[clamp(14px,2.4vh,18px)] flex w-full max-w-[440px] items-start gap-[12px] rounded-[12px] border border-[#f6e0bd] bg-[#fff7ea] p-[clamp(12px,2vh,16px)] text-left">
                      <span className="mt-[1px] grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[#efab30] text-white">
                        <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none">
                          <path d="M4 6h16v12H4zM4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <div>
                        <p className="mb-body font-bold text-[#1e2129]">A trusted contact has been notified</p>
                        <p className="mb-small mt-[2px] text-[#7a6a44]">
                          We&apos;ve sent an SMS to your guardian at{" "}
                          <span className="font-semibold text-[#5a4a1c]">{guardianPhone}</span> so a family member can help you check whether this transfer is genuine before you try again.
                        </p>
                      </div>
                    </div>
                  )}

                  <p className="mb-small mt-[clamp(12px,2vh,16px)] max-w-[440px] text-[#8b9099]">
                    Believe this is a mistake? Please contact the Maybank Careline at{" "}
                    <span className="font-semibold text-[#3a3f48]">1-300-88-6688</span> for assistance.
                  </p>

                  <div className="mt-[clamp(16px,2.6vh,20px)] flex gap-[12px]">
                    <Link
                      href="/bank"
                      className="mb-body rounded-[8px] bg-[#1e2129] px-[24px] py-[clamp(10px,1.7vh,12px)] text-center font-bold text-white transition-colors hover:bg-[#2c303a]"
                    >
                      Back to accounts
                    </Link>
                    <button
                      onClick={reset}
                      className="mb-body rounded-[8px] border border-[#e2e5ea] bg-white px-[24px] py-[clamp(10px,1.7vh,12px)] font-semibold text-[#3a3f48] transition-colors hover:bg-[#f6f7f9]"
                    >
                      Try another transfer
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Sidebar ── */}
            <aside className="flex min-h-0 flex-col gap-[clamp(14px,2vh,18px)]">
              <div className="shrink-0 rounded-[12px] border border-[#edeff2] bg-white p-[clamp(16px,2.4vh,20px)] shadow-[0_8px_28px_-18px_rgba(20,26,58,0.28)]">
                <p className="mb-small text-[#6b7280]">Transferring from</p>
                <p className="mb-body mt-[5px] font-bold text-[#1e2129]">{fromLabel}</p>
                <p className="mb-small tracking-[0.4px] text-[#a2a8b0]">{account_no}</p>
                <div className="mt-[clamp(10px,1.8vh,14px)] border-t border-[#eef0f3] pt-[clamp(10px,1.8vh,14px)]">
                  <p className="mb-small text-[#6b7280]">Available balance</p>
                  <p className="mb-balance-sm mt-[3px] text-[#22a03f]">{user ? `RM ${fmt(balance)}` : "RM ——"}</p>
                </div>
                {parentalEnabled && (
                  <div className="mt-[clamp(10px,1.8vh,14px)] flex items-center gap-[8px] rounded-[8px] bg-[#fdf3e2] px-[10px] py-[8px]">
                    <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-[#efab30] text-white">
                      <svg viewBox="0 0 24 24" className="h-[13px] w-[13px]" fill="none">
                        <path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="mb-xs font-semibold text-[#8a6516]">Parental control active — AI scam-guard on</span>
                  </div>
                )}
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

      {analyzing && <AnalyzingModal step={analyzeStep} amount={fmt(amountNum)} recipient={recipient} />}

      {halted && (
        <HaltModal
          reasons={reasons}
          guardianPhone={guardianPhone}
          callStatus={callStatus}
          callError={callError}
          onRetryCall={() => guardianPhone && callVarsRef.current && placeVerificationCall(guardianPhone, callVarsRef.current)}
          onClose={closeHalt}
        />
      )}
    </>
  );
}

/* ── AI analyzing modal ────────────────────────────────────────────────── */

function AnalyzingModal({ step, amount, recipient }: { step: number; amount: string; recipient: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-[20px]">
      <div className="w-full max-w-[440px] overflow-hidden rounded-[16px] border border-[#edeff2] bg-white shadow-[0_30px_80px_-20px_rgba(20,26,58,0.5)]">
        {/* Header */}
        <div className="flex items-center gap-[13px] px-[24px] pt-[24px] pb-[18px]">
          <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[12px] bg-[#fdf3e2] text-[#d1901a]">
            <svg viewBox="0 0 24 24" className="h-[23px] w-[23px]" fill="none">
              <path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
              <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <h3 className="text-[18px] font-extrabold tracking-[-0.2px] text-[#1e2129]">AI Scam Guard</h3>
            <p className="mt-[2px] text-[13px] text-[#6b7280]">
              Analyzing your RM {amount} transfer to {recipient}…
            </p>
          </div>
        </div>

        <ul className="space-y-[4px] border-t border-[#eef0f3] px-[20px] py-[18px]">
          {ANALYZE_STEPS.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li
                key={label}
                className={`flex items-center gap-[12px] rounded-[10px] px-[12px] py-[11px] transition-colors ${
                  active ? "bg-[#fdf6e8]" : "bg-transparent"
                }`}
              >
                <span className="grid h-[24px] w-[24px] shrink-0 place-items-center">
                  {done ? (
                    <span className="grid h-[24px] w-[24px] place-items-center rounded-full bg-[#e4f6e9] text-[#1f9d55]">
                      <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="none">
                        <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  ) : active ? (
                    <span className="h-[18px] w-[18px] animate-spin rounded-full border-[2.5px] border-[#f4e2bd] border-t-[#efab30]" />
                  ) : (
                    <span className="h-[9px] w-[9px] rounded-full bg-[#d4d8de]" />
                  )}
                </span>
                <span
                  className={`text-[14px] ${
                    done ? "font-medium text-[#20242c]" : active ? "font-semibold text-[#b5801a]" : "text-[#9ca3af]"
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ── Halt / verification modal ─────────────────────────────────────────── */

function HaltModal({
  reasons,
  guardianPhone,
  callStatus,
  callError,
  onRetryCall,
  onClose,
}: {
  reasons: string[];
  guardianPhone: string;
  callStatus: CallStatus;
  callError: string;
  onRetryCall: () => void;
  onClose: () => void;
}) {
  const statusText: Record<CallStatus, string> = {
    idle: "Preparing verification call…",
    calling: `Calling ${guardianPhone}…`,
    active: "Scam-guard is verifying with the guardian…",
    ended: "Verification call ended",
    error: "Call failed",
  };
  const dot: Record<CallStatus, string> = {
    idle: "bg-[#9ca3af]",
    calling: "bg-[#eab308]",
    active: "bg-[#22c55e]",
    ended: "bg-[#9ca3af]",
    error: "bg-[#ef4444]",
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-[20px]">
      <div className="w-full max-w-[480px] overflow-hidden rounded-[18px] bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="flex items-start gap-[13px] px-[26px] pt-[24px] pb-[18px]">
          <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[12px] bg-[#fdeaea] text-[#e0393e]">
            <svg viewBox="0 0 24 24" className="h-[24px] w-[24px]" fill="none">
              <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <h3 className="text-[19px] font-extrabold leading-tight text-[#1e2129]">Transaction halted</h3>
            <p className="mt-[3px] text-[13px] text-[#6b7280]">
              An AI scam-guard is verifying this transfer before it can proceed.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="border-t border-[#eef0f3] px-[26px] py-[20px]">
          <p className="text-[12px] font-bold uppercase tracking-[0.6px] text-[#8b9099]">Why this was flagged</p>
          <ul className="mt-[10px] space-y-[8px]">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-[10px]">
                <span className="mt-[2px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[#fdeaea] text-[#e0393e]">
                  <svg viewBox="0 0 24 24" className="h-[12px] w-[12px]" fill="none">
                    <path d="M12 8v5m0 3h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                </span>
                <span className="text-[14px] leading-snug text-[#20242c]">{r}</span>
              </li>
            ))}
          </ul>

          {/* Verification call */}
          <div className="mt-[18px] rounded-[12px] border border-[#eef0f3] bg-[#f8f9fb] p-[16px]">
            {guardianPhone ? (
              <>
                <div className="flex items-center gap-[9px]">
                  <span className={`h-[9px] w-[9px] rounded-full ${dot[callStatus]} ${callStatus === "active" || callStatus === "calling" ? "animate-pulse" : ""}`} />
                  <span className="text-[14px] font-bold text-[#1e2129]">{statusText[callStatus]}</span>
                </div>
                <p className="mt-[4px] text-[12.5px] text-[#8b9099]">
                  Scam Guard AI is calling the guardian to confirm this transfer. The full call
                  transcript is saved to transcript.txt.
                </p>
                {callError && <p className="mt-[6px] text-[12.5px] font-medium text-[#e0393e]">{callError}</p>}
              </>
            ) : (
              <p className="text-[13px] text-[#8a6516]">
                No guardian phone number is set. Add one in{" "}
                <Link href="/settings" className="font-bold underline">
                  Settings → Parental Control
                </Link>{" "}
                to enable verification calls.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-[10px] border-t border-[#eef0f3] px-[26px] py-[16px]">
          {guardianPhone && (callStatus === "error" || callStatus === "ended") && (
            <button
              onClick={onRetryCall}
              className="rounded-[8px] border border-[#e2e5ea] bg-white px-[18px] py-[10px] text-[14px] font-semibold text-[#3a3f48] transition-colors hover:bg-[#f6f7f9]"
            >
              Call again
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-[8px] bg-[#1e2129] px-[22px] py-[10px] text-[14px] font-bold text-white transition-colors hover:bg-[#2c303a]"
          >
            Cancel transfer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Field helpers ──────────────────────────────────────────────────────── */

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
