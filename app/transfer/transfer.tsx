"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ContextQuestionnaire,
  LearningSummary,
  ParentPendingPanel,
  VerificationCallPanel,
  WarningSignsCard,
  type VerificationPanelStatus,
} from "../components/family-guard/TransferProtection";
import { MaybankChrome } from "../components/maybank/MaybankChrome";
import type { ScamLinkLookup } from "@/lib/intelligence/liveTypes";
import type {
  FamilyGuardContextAnswers,
  FamilyGuardPublicApprovalRequest,
  FamilyGuardRecommendation,
  FamilyGuardRequestResult,
  FamilyGuardSettings,
  FamilyGuardTrustedContact,
  User,
} from "@/lib/types";

const USER_ID = "u_danial";
const PAYMENT_TYPES = [
  "Instant Transfer (DuitNow)",
  "Credit Card Payment",
  "Utilities",
  "Bill Payment",
];
const BANKS = [
  "NusaSafe Bank",
  "Maybank",
  "CIMB Bank",
  "Public Bank",
  "RHB Bank",
  "Hong Leong Bank",
];
const FAVOURITES = [
  { name: "Jonathan Lim", bank: "Maybank", account: "1284 5590 2231" },
  { name: "Nadia Rahman", bank: "CIMB Bank", account: "7009 1123 8845" },
];

const DEFAULT_CONTEXT: FamilyGuardContextAnswers = {
  contactChannel: "known_person",
  urgency: false,
  secrecy: false,
  promisedReward: false,
  remoteAccess: false,
  notes: "",
};

type FlowStep =
  | "form"
  | "review"
  | "context"
  | "warning"
  | "verification"
  | "pending"
  | "success"
  | "outcome";

type TranscriptEntry = { role: "user" | "ai"; message: string; time: number };

const fmt = (value: number) =>
  value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function TransferPage() {
  const [step, setStep] = useState<FlowStep>("form");
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<FamilyGuardSettings | null>(null);
  const [contacts, setContacts] = useState<FamilyGuardTrustedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [recipient, setRecipient] = useState("");
  const [recipientBank, setRecipientBank] = useState("Maybank");
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [paymentType, setPaymentType] = useState(PAYMENT_TYPES[0]);
  const [context, setContext] = useState<FamilyGuardContextAnswers>(DEFAULT_CONTEXT);

  const [requestResult, setRequestResult] =
    useState<FamilyGuardRequestResult | null>(null);
  const [graph, setGraph] = useState<ScamLinkLookup | null>(null);
  const [callStatus, setCallStatus] =
    useState<VerificationPanelStatus>("ready");
  const [callError, setCallError] = useState("");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const pollRef = useRef<number | null>(null);
  const verificationSubmittedRef = useRef(false);

  const amountNumber = Number(amount) || 0;
  const balance = user?.balance ?? 0;
  const guardActive = Boolean(
    settings?.enabled && settings.consent.accountHolderAccepted,
  );
  const activeContacts = contacts.filter((contact) => contact.status === "active");
  const canContinue = Boolean(
    user &&
      recipient.trim() &&
      account.replace(/\D/g, "").length >= 6 &&
      amountNumber > 0 &&
      amountNumber <= balance,
  );

  const stopTranscriptPoll = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const nextUser = await apiJson<User>(`/api/users/${USER_ID}`);
    setUser(nextUser);
    return nextUser;
  }, []);

  const applyResult = useCallback(
    async (next: FamilyGuardRequestResult) => {
      setRequestResult(next);
      if (next.demo.guardianApprovalCode) {
        window.localStorage.setItem(
          `family-guard-demo-code:${next.request.id}`,
          next.demo.guardianApprovalCode,
        );
        window.localStorage.setItem("family-guard-last-request", next.request.id);
      }

      if (next.request.status === "completed") {
        await refreshUser();
        setStep("success");
      } else if (next.request.status === "awaiting_verification") {
        setStep("warning");
      } else if (next.request.status === "awaiting_guardian") {
        setStep("pending");
      } else {
        setStep("outcome");
      }
    },
    [refreshUser],
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextUser, nextSettings, nextContacts] = await Promise.all([
        apiJson<User>(`/api/users/${USER_ID}`),
        apiJson<FamilyGuardSettings>(`/api/family-guard/settings/${USER_ID}`),
        apiJson<FamilyGuardTrustedContact[]>(
          `/api/family-guard/contacts?ownerUserId=${USER_ID}`,
        ),
      ]);
      setUser(nextUser);
      setSettings(nextSettings);
      setContacts(nextContacts);
    } catch (loadError) {
      setError(messageFor(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadInitial(), 0);
    return () => {
      window.clearTimeout(timer);
      stopTranscriptPoll();
    };
  }, [loadInitial, stopTranscriptPoll]);

  useEffect(() => {
    const fillDemo = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== " ") return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag ?? "")) return;
      if (step !== "form") return;
      event.preventDefault();
      setRecipient("Quick Cash Enterprise");
      setRecipientBank("Maybank");
      setAccount("8842 1190 3321");
      setAmount("10000");
      setReference("Investment deposit");
      setContext({
        contactChannel: "investment_group",
        urgency: true,
        secrecy: true,
        promisedReward: true,
        remoteAccess: false,
        notes:
          "WhatsApp +60 11-9088 4421 promoted quickcash-growth.example and promised a 30% return before the offer expires today.",
      });
    };
    window.addEventListener("keydown", fillDemo);
    return () => window.removeEventListener("keydown", fillDemo);
  }, [step]);

  useEffect(() => {
    if (step !== "pending" || !requestResult) return;
    const requestId = requestResult.request.id;
    const timer = window.setInterval(async () => {
      try {
        const latest = await apiJson<FamilyGuardRequestResult>(
          `/api/family-guard/requests/${requestId}`,
        );
        if (latest.request.status !== "awaiting_guardian") {
          await applyResult(latest);
        } else {
          setRequestResult(latest);
        }
      } catch {
        // Keep the current safe pending screen; manual refresh remains available.
      }
    }, 4_000);
    return () => window.clearInterval(timer);
  }, [applyResult, requestResult, step]);

  const reset = () => {
    stopTranscriptPoll();
    setStep("form");
    setRecipient("");
    setRecipientBank("Maybank");
    setAccount("");
    setAmount("");
    setReference("");
    setPaymentType(PAYMENT_TYPES[0]);
    setContext(DEFAULT_CONTEXT);
    setRequestResult(null);
    setGraph(null);
    setCallStatus("ready");
    setCallError("");
    setTranscript([]);
    setError("");
    verificationSubmittedRef.current = false;
  };

  const createProtectedRequest = async () => {
    if (!canContinue || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const next = await apiJson<FamilyGuardRequestResult>(
        "/api/family-guard/requests",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: USER_ID,
            fromAccount: "Personal Account (Savings)",
            recipientName: recipient.trim(),
            recipientBank,
            accountNumber: account,
            amount: amountNumber,
            reference,
            paymentType,
            context,
          }),
        },
      );

      const lookup = await apiJson<ScamLinkLookup>(
        `/api/intelligence/lookup?account=${encodeURIComponent(account)}`,
      ).catch(() => null);
      setGraph(lookup);
      await applyResult(next);
    } catch (submitError) {
      setError(messageFor(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const refreshRequest = async () => {
    if (!requestResult) return;
    setRefreshing(true);
    setError("");
    try {
      const latest = await apiJson<FamilyGuardRequestResult>(
        `/api/family-guard/requests/${requestResult.request.id}`,
      );
      await applyResult(latest);
    } catch (refreshError) {
      setError(messageFor(refreshError));
    } finally {
      setRefreshing(false);
    }
  };

  const cancelRequest = async () => {
    if (!requestResult) return;
    setSubmitting(true);
    setError("");
    try {
      const cancelled = await apiJson<FamilyGuardPublicApprovalRequest>(
        `/api/family-guard/requests/${requestResult.request.id}?expectedVersion=${requestResult.request.version}`,
        { method: "DELETE" },
      );
      setRequestResult({ ...requestResult, request: cancelled });
      setStep("outcome");
    } catch (cancelError) {
      setError(messageFor(cancelError));
    } finally {
      setSubmitting(false);
    }
  };

  const retainTranscript = async (
    entries: TranscriptEntry[],
    recommendation: FamilyGuardRecommendation,
  ) => {
    if (
      !settings ||
      settings.privacy.transcriptMode !== "redacted" ||
      settings.privacy.transcriptRetentionDays < 1 ||
      !requestResult
    ) {
      return;
    }
    await fetch("/api/transcripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consent: true,
        approvalRequestId: requestResult.request.id,
        transcript: entries,
        amount: requestResult.request.transfer.amount,
        recipient: requestResult.request.transfer.recipientName,
        recommendation,
        retentionDays: settings.privacy.transcriptRetentionDays,
      }),
    }).catch(() => undefined);
  };

  const completeVerification = async (input: {
    recommendation: FamilyGuardRecommendation;
    summary: string;
    warningSigns: string[];
    providerConversationId?: string;
    transcript?: TranscriptEntry[];
  }) => {
    if (!requestResult || verificationSubmittedRef.current) return;
    verificationSubmittedRef.current = true;
    setError("");
    try {
      const next = await apiJson<FamilyGuardRequestResult>(
        `/api/family-guard/requests/${requestResult.request.id}/verification`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedVersion: requestResult.request.version,
            recommendation: input.recommendation,
            summary: input.summary,
            warningSigns: input.warningSigns,
            providerConversationId: input.providerConversationId,
          }),
        },
      );
      if (input.transcript?.length) {
        await retainTranscript(input.transcript, input.recommendation);
      }
      setCallStatus("completed");
      await applyResult(next);
    } catch (verificationError) {
      verificationSubmittedRef.current = false;
      setCallStatus("error");
      setCallError(messageFor(verificationError));
    }
  };

  const runDemoAssessment = async () => {
    if (!requestResult) return;
    setCallStatus("active");
    const signs = requestResult.request.risk.signals.map(
      (signal) => signal.title,
    );
    const recommendation = requestResult.request.risk.recommendation;
    await completeVerification({
      recommendation,
      warningSigns: signs,
      summary: demoSummary(requestResult.request, signs),
    });
  };

  const requestVerificationCall = async () => {
    if (!requestResult || !settings) return;
    setCallStatus("calling");
    setCallError("");
    setTranscript([]);
    verificationSubmittedRef.current = false;
    try {
      const response = await apiJson<Record<string, unknown>>("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consent: settings.privacy.voiceVerificationConsent,
          to_number: settings.accountHolderPhone,
          account_number: requestResult.request.transfer.accountNumber,
          dynamic_variables: {
            user_name: user?.name ?? "Account holder",
            amount: fmt(requestResult.request.transfer.amount),
            recipient: requestResult.request.transfer.recipientName,
            recipient_bank: requestResult.request.transfer.recipientBank,
            payment_type: requestResult.request.transfer.paymentType,
            contact_channel: context.contactChannel,
            context_summary: contextSummary(context),
            flagged_reasons: requestResult.request.risk.signals
              .map((signal) => signal.title)
              .join("; "),
            knowledge_graph_summary: graph?.matched
              ? `${graph.previousReportCount} previous demo reports share a connection.`
              : "No matching demo graph connection found.",
            safety_phrase:
              requestResult.verification?.safetyPhrase ?? "Yellow Tiger",
          },
        }),
      });
      const conversationId = String(
        response.conversation_id ?? response.conversationId ?? "",
      );
      if (!conversationId) throw new Error("The call provider did not return a conversation id.");
      setCallStatus("active");
      startTranscriptPoll(conversationId);
    } catch (callFailure) {
      setCallStatus("error");
      setCallError(messageFor(callFailure));
    }
  };

  const startTranscriptPoll = (conversationId: string) => {
    stopTranscriptPoll();
    pollRef.current = window.setInterval(async () => {
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
          stopPoll();
          // Call ended — always resolve to success/rejected. If no explicit
          // APPROVED/BLOCKED was spoken, default to blocked (safety first).
          if (!verdictActedRef.current) {
            verdictActedRef.current = true;
            const decided = deriveVerdict(t) ?? "blocked";
            if (decided === "approved") await handleApproved(t);
            else await handleBlocked(t);
          }
        }
        const response = await fetch(
          `/api/transcript?id=${encodeURIComponent(conversationId)}`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const payload = (await response.json()) as {
          status?: string;
          transcript?: TranscriptEntry[];
          recommendation?: string;
        };
        const entries = Array.isArray(payload.transcript)
          ? payload.transcript
          : [];
        setTranscript(entries);
        if (payload.status !== "done") return;

        stopTranscriptPoll();
        const recommendation = mapVoiceRecommendation(payload.recommendation);
        await completeVerification({
          recommendation,
          summary: callSummary(entries, recommendation),
          warningSigns:
            requestResult?.request.risk.signals.map((signal) => signal.title) ?? [],
          providerConversationId: conversationId,
          transcript: entries,
        });
      } catch {
        // A temporary poll failure does not change or release the pending transfer.
      }
    }, 2_500);
  };

  const goFromReview = () => {
    if (guardActive) setStep("context");
    else void createProtectedRequest();
  };

  const request = requestResult?.request ?? null;
  const outcome = request ? learningOutcome(request.status) : "cancelled";

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

                  <FeedbackBox verdict="APPROVED" recipient={recipient} amount={fmt(amountNum)} />
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

                  <FeedbackBox verdict="BLOCKED" recipient={recipient} amount={fmt(amountNum)} />
                </div>
              )}
    <MaybankChrome
      hero={
        <div className="pb-[clamp(22px,4vh,38px)] pt-[clamp(14px,2.4vh,24px)]">
          <p className="mb-xs font-bold uppercase tracking-[0.14em]">
            Pause · Understand · Verify
          </p>
          <h1 className="mb-h1 mt-[5px]">Pay &amp; Transfer</h1>
          <p className="mb-sub mt-[6px]">
            {guardActive
              ? "Family Guard is active. Protected payments require context, an AI recommendation, and trusted approval."
              : "Transfer normally, or enable Family Guard for two-step protection."}
          </p>
        </div>
      }
    >
      <div className="mx-auto grid w-full max-w-[1500px] gap-[clamp(14px,2vw,22px)] py-[clamp(14px,2.4vh,24px)] xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.65fr)]">
        <main className="min-w-0 rounded-[16px] border border-[#e3e8e8] bg-white p-[clamp(16px,2.7vw,28px)] shadow-[0_16px_40px_-30px_rgba(13,58,67,0.5)]">
          {error ? (
            <div role="alert" className="mb-4 rounded-xl border border-[#efc4c7] bg-[#fff2f2] p-3 text-sm font-medium text-[#9c3035]">
              {error}
            </div>
          ) : null}

          {loading ? <LoadingState /> : null}
          {!loading && step === "form" ? (
            <TransferForm
              balance={balance}
              recipient={recipient}
              recipientBank={recipientBank}
              account={account}
              amount={amount}
              reference={reference}
              paymentType={paymentType}
              canContinue={canContinue}
              onRecipient={setRecipient}
              onBank={setRecipientBank}
              onAccount={setAccount}
              onAmount={setAmount}
              onReference={setReference}
              onPaymentType={setPaymentType}
              onContinue={() => setStep("review")}
            />
          ) : null}
          {!loading && step === "review" ? (
            <ReviewTransfer
              user={user!}
              recipient={recipient}
              recipientBank={recipientBank}
              account={account}
              amount={amountNumber}
              reference={reference}
              paymentType={paymentType}
              guardActive={guardActive}
              submitting={submitting}
              onBack={() => setStep("form")}
              onConfirm={goFromReview}
            />
          ) : null}
          {!loading && step === "context" ? (
            <ContextQuestionnaire
              value={context}
              onChange={setContext}
              onBack={() => setStep("review")}
              onContinue={() => void createProtectedRequest()}
            />
          ) : null}
          {step === "warning" && request ? (
            <WarningSignsCard
              request={request}
              graph={graph}
              onContinue={() => setStep("verification")}
              onCancel={() => void cancelRequest()}
            />
          ) : null}
          {step === "verification" && requestResult?.verification && settings ? (
            <VerificationCallPanel
              safetyPhrase={requestResult.verification.safetyPhrase}
              maskedPhone={maskPhone(settings.accountHolderPhone)}
              voiceConsent={settings.privacy.voiceVerificationConsent}
              status={callStatus}
              error={callError}
              onRequestCall={() => void requestVerificationCall()}
              onUseDemo={() => void runDemoAssessment()}
              onBack={() => setStep("warning")}
            />
          ) : null}
          {step === "pending" && request ? (
            <ParentPendingPanel
              request={request}
              contacts={contacts}
              refreshing={refreshing}
              onRefresh={() => void refreshRequest()}
              onCancel={() => void cancelRequest()}
            />
          ) : null}
          {step === "success" ? (
            <SuccessState
              amount={amountNumber}
              recipient={recipient}
              balance={user?.balance ?? balance}
              protectedTransfer={Boolean(request?.guardianDecision)}
              onAnother={reset}
            />
          ) : null}
          {step === "outcome" && request && outcome !== "cancelled" ? (
            <div>
              <LearningSummary
                title={outcomeTitle(request.status)}
                warningSigns={
                  request.aiWarningSigns.length
                    ? request.aiWarningSigns
                    : request.risk.signals.map((signal) => signal.title)
                }
                outcome={outcome}
              />
              <div className="mt-4 flex justify-center">
                <button type="button" onClick={reset} className={primaryButton}>
                  Make another transfer
                </button>
              </div>
            </div>
          ) : null}
          {step === "outcome" && request?.status === "cancelled" ? (
            <CancelledState onReset={reset} />
          ) : null}
        </main>

        <aside className="space-y-[14px]">
          <ProtectionCard
            guardActive={guardActive}
            settings={settings}
            activeContacts={activeContacts}
          />
          <DemoCard
            onFill={() => {
              setRecipient("Quick Cash Enterprise");
              setRecipientBank("Maybank");
              setAccount("8842 1190 3321");
              setAmount("10000");
              setReference("Investment deposit");
              setContext({
                contactChannel: "investment_group",
                urgency: true,
                secrecy: true,
                promisedReward: true,
                remoteAccess: false,
                notes:
                  "WhatsApp +60 11-9088 4421 promoted quickcash-growth.example and promised a 30% return before the offer expires today.",
              });
              setStep("form");
            }}
          />
          {step === "form" ? (
            <FavouriteCard
              onPick={(favourite) => {
                setRecipient(favourite.name);
                setRecipientBank(favourite.bank);
                setAccount(favourite.account);
              }}
            />
          ) : null}
          {transcript.length ? <TranscriptPreview entries={transcript} /> : null}
        </aside>
      </div>
    </MaybankChrome>
  );
}

function TransferForm(props: {
  balance: number;
  recipient: string;
  recipientBank: string;
  account: string;
  amount: string;
  reference: string;
  paymentType: string;
  canContinue: boolean;
  onRecipient: (value: string) => void;
  onBank: (value: string) => void;
  onAccount: (value: string) => void;
  onAmount: (value: string) => void;
  onReference: (value: string) => void;
  onPaymentType: (value: string) => void;
  onContinue: () => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (props.canContinue) props.onContinue();
      }}
    >
      <p className="mb-xs font-bold uppercase tracking-[0.12em] text-[#0f766e]">Step 1 of 4</p>
      <h2 className="mb-title mt-1 text-[#1e2129]">Transfer details</h2>
      <p className="mb-small mt-1 text-[#778087]">Available balance: RM {fmt(props.balance)}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Recipient name">
          <TextInput value={props.recipient} onChange={props.onRecipient} placeholder="e.g. Jonathan Lim" />
        </Field>
        <Field label="Recipient bank">
          <SelectInput value={props.recipientBank} onChange={props.onBank} options={BANKS} />
        </Field>
        <Field label="Account number">
          <TextInput value={props.account} onChange={props.onAccount} placeholder="Account number" inputMode="numeric" />
        </Field>
        <Field label="Amount">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#7c858c]">RM</span>
            <input
              value={props.amount}
              onChange={(event) => props.onAmount(event.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder="0.00"
              className={`${inputClass} pl-11 font-bold`}
            />
          </div>
        </Field>
        <Field label="Recipient reference (optional)">
          <TextInput value={props.reference} onChange={props.onReference} placeholder="e.g. Dinner, rent" />
        </Field>
        <Field label="Payment type">
          <SelectInput value={props.paymentType} onChange={props.onPaymentType} options={PAYMENT_TYPES} />
        </Field>
      </div>

      {Number(props.amount) > props.balance ? (
        <p className="mt-3 text-sm font-semibold text-[#b33439]">Amount exceeds the available balance.</p>
      ) : null}
      <button type="submit" disabled={!props.canContinue} className={`${primaryButton} mt-5 w-full`}>
        Continue
      </button>
    </form>
  );
}

function ReviewTransfer(props: {
  user: User;
  recipient: string;
  recipientBank: string;
  account: string;
  amount: number;
  reference: string;
  paymentType: string;
  guardActive: boolean;
  submitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <section aria-labelledby="review-title">
      <p className="mb-xs font-bold uppercase tracking-[0.12em] text-[#0f766e]">Step 2 of 4</p>
      <h2 id="review-title" className="mb-title mt-1 text-[#1e2129]">Review your transfer</h2>
      <div className="mt-4 rounded-2xl bg-[#f4f8f7] p-5 text-center">
        <p className="mb-small text-[#6d797c]">You are transferring</p>
        <p className="mt-1 text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-0.04em] text-[#153e47]">RM {fmt(props.amount)}</p>
        <p className="mb-body mt-1 text-[#566368]">to <strong>{props.recipient}</strong></p>
      </div>
      <dl className="mt-4 divide-y divide-[#edf0f1]">
        <ReviewRow label="From" value="Personal Account (Savings)" sub={maskAccount(props.user.accountNo)} />
        <ReviewRow label="Recipient bank" value={props.recipientBank} />
        <ReviewRow label="Account" value={maskAccount(props.account)} />
        <ReviewRow label="Payment type" value={props.paymentType} />
        <ReviewRow label="Reference" value={props.reference || "—"} />
      </dl>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={props.onBack} disabled={props.submitting} className={secondaryButton}>Back</button>
        <button type="button" onClick={props.onConfirm} disabled={props.submitting} className={primaryButton}>
          {props.submitting
            ? "Creating protected request…"
            : props.guardActive
              ? "Continue to safety questions"
              : "Confirm transfer"}
        </button>
      </div>
    </section>
  );
}

function ProtectionCard(props: {
  guardActive: boolean;
  settings: FamilyGuardSettings | null;
  activeContacts: FamilyGuardTrustedContact[];
}) {
  return (
    <section className="rounded-[16px] border border-[#d9e7e4] bg-[#f4faf8] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="mb-xs font-bold uppercase tracking-[0.1em] text-[#0f766e]">Family Guard</p>
          <p className="mb-body mt-1 font-extrabold text-[#18383e]">{props.guardActive ? "Two-step protection on" : "Protection not enabled"}</p>
        </div>
        <span className={`size-3 rounded-full ${props.guardActive ? "bg-[#23a36a]" : "bg-[#b6bec1]"}`} />
      </div>
      <p className="mb-small mt-2 leading-5 text-[#657277]">
        {props.guardActive
          ? `${props.activeContacts.length} active trusted contact${props.activeContacts.length === 1 ? "" : "s"}. Guardian approval from RM ${fmt(props.settings?.guardianLimit ?? 0)}.`
          : "The account holder can enable consent-based limits and trusted approval in Settings."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/settings" className={smallLink}>Manage settings</Link>
        <Link href="/family-guard" className={smallLink}>Guardian review</Link>
      </div>
    </section>
  );
}

function DemoCard({ onFill }: { onFill: () => void }) {
  return (
    <section className="rounded-[16px] border border-[#eed8a8] bg-[#fffaf0] p-4">
      <p className="mb-xs font-bold uppercase tracking-[0.1em] text-[#936a19]">Judge demo</p>
      <h3 className="mb-body mt-1 font-extrabold text-[#372f1f]">Quick Cash investment scenario</h3>
      <p className="mb-small mt-2 leading-5 text-[#76694c]">Loads RM10,000, WhatsApp investment pressure, guaranteed returns, and a recipient connected to two synthetic prior reports.</p>
      <button type="button" onClick={onFill} className="mt-3 min-h-10 w-full rounded-lg bg-[#946b1d] px-3 py-2 text-sm font-bold text-white hover:bg-[#7e5915]">Fill demo transfer</button>
      <p className="mt-2 text-[10px] leading-4 text-[#9a8965]">Tip: Space also fills this scenario when no field is focused.</p>
    </section>
  );
}

function FavouriteCard({ onPick }: { onPick: (value: (typeof FAVOURITES)[number]) => void }) {
  return (
    <section className="rounded-[16px] border border-[#e2e7e8] bg-white p-4">
      <h3 className="mb-body font-extrabold text-[#283337]">Saved recipients</h3>
      <div className="mt-2 space-y-2">
        {FAVOURITES.map((favourite) => (
          <button key={favourite.account} type="button" onClick={() => onPick(favourite)} className="flex w-full items-center justify-between rounded-lg border border-[#edf0f1] px-3 py-2 text-left hover:bg-[#f7faf9]">
            <span>
              <span className="mb-small block font-bold text-[#354045]">{favourite.name}</span>
              <span className="text-[10px] text-[#8a9397]">{favourite.bank} · {maskAccount(favourite.account)}</span>
            </span>
            <span aria-hidden="true" className="text-[#0f766e]">→</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function TranscriptPreview({ entries }: { entries: TranscriptEntry[] }) {
  return (
    <section className="rounded-[16px] border border-[#dce5ef] bg-[#f7f9fc] p-4">
      <h3 className="mb-body font-extrabold text-[#2e3d4c]">Redacted live transcript</h3>
      <div className="mt-2 max-h-52 space-y-2 overflow-y-auto" aria-live="polite">
        {entries.slice(-5).map((entry, index) => (
          <p key={`${entry.time}-${index}`} className="rounded-lg bg-white p-2 text-[11px] leading-4 text-[#657181]">
            <strong className="text-[#34485d]">{entry.role === "ai" ? "Scam Guard" : "Account holder"}:</strong> {entry.message}
          </p>
        ))}
      </div>
    </section>
  );
}

function SuccessState(props: {
  amount: number;
  recipient: string;
  balance: number;
  protectedTransfer: boolean;
  onAnother: () => void;
}) {
  return (
    <section className="py-6 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#e7f7ed] text-3xl font-bold text-[#24864a]">✓</span>
      <h2 className="mb-title mt-4 text-[#1e292d]">Transfer successful</h2>
      <p className="mb-body mt-2 text-[#667277]">RM {fmt(props.amount)} was sent to <strong>{props.recipient}</strong>.</p>
      {props.protectedTransfer ? <p className="mb-small mx-auto mt-2 max-w-lg text-[#557069]">The account holder confirmed the story, Scam Guard explained the risk, and a trusted contact confirmed the decision.</p> : null}
      <div className="mx-auto mt-5 max-w-sm rounded-xl bg-[#f5f8f8] p-4">
        <p className="mb-small text-[#758084]">New available balance</p>
        <p className="mt-1 text-2xl font-extrabold text-[#153e47]">RM {fmt(props.balance)}</p>
      </div>
      <button type="button" onClick={props.onAnother} className={`${primaryButton} mt-5`}>Make another transfer</button>
    </section>
  );
}

function CancelledState({ onReset }: { onReset: () => void }) {
  return (
    <section className="py-8 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#edf2f3] text-2xl text-[#607075]">✓</span>
      <h2 className="mb-title mt-4 text-[#202b2f]">Transfer cancelled safely</h2>
      <p className="mb-body mt-2 text-[#69757a]">No money was sent and the transaction-bound approval code is no longer valid.</p>
      <button type="button" onClick={onReset} className={`${primaryButton} mt-5`}>Return to transfer</button>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="grid min-h-72 place-items-center" aria-live="polite">
      <div className="text-center">
        <span className="mx-auto block size-9 animate-spin rounded-full border-4 border-[#dbe6e4] border-t-[#0f766e]" />
        <p className="mb-small mt-3 font-semibold text-[#697579]">Loading protected-transfer settings…</p>
      </div>
    </div>
  );
}

/* ── Field helpers ──────────────────────────────────────────────────────── */

// Optional feedback on the call outcome — logged and used to improve the AI.
function FeedbackBox({ verdict, recipient, amount }: { verdict: string; recipient: string; amount: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdict, recipient, amount, feedback: text.trim() }),
      });
    } catch {
      // ignore — don't block the demo
    }
    setSent(true);
  };

  if (sent) {
    return (
      <p className="mb-small mt-[clamp(12px,2vh,16px)] font-semibold text-[#22a03f]">
        Thanks — your feedback was sent to Scam Guard AI to improve future checks.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-small mt-[clamp(12px,2vh,16px)] font-semibold text-[#8b9099] underline underline-offset-2 transition-colors hover:text-[#3a3f48]"
      >
        Was this decision right? Give feedback on the call (optional)
      </button>
    );
  }

  return (
    <div className="mt-[clamp(12px,2vh,16px)] w-full max-w-[440px] text-left">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="e.g. This was actually my son, the AI was too strict — or, good catch, it was a scam."
        className="mb-small w-full resize-none rounded-[10px] border border-[#e2e5ea] bg-white px-[12px] py-[10px] text-[#20242c] outline-none transition-colors placeholder:text-[#b4b9c1] focus:border-[#efab30]"
      />
      <div className="mt-[8px] flex justify-end gap-[10px]">
        <button
          onClick={() => setOpen(false)}
          className="mb-small rounded-[8px] border border-[#e2e5ea] bg-white px-[16px] py-[8px] font-semibold text-[#3a3f48] transition-colors hover:bg-[#f6f7f9]"
        >
          Cancel
        </button>
        <button
          onClick={send}
          disabled={!text.trim()}
          className="mb-small rounded-[8px] bg-[#efab30] px-[16px] py-[8px] font-bold text-white transition-colors hover:bg-[#e59f20] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send to AI
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-small mb-1.5 block font-bold text-[#3f4b50]">{label}</span>
      {children}
    </label>
  );
}

function TextInput(props: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputMode?: "text" | "numeric";
}) {
  return <input value={props.value} onChange={(event) => props.onChange(event.target.value)} placeholder={props.placeholder} inputMode={props.inputMode} className={inputClass} />;
}

function SelectInput(props: { value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <select value={props.value} onChange={(event) => props.onChange(event.target.value)} className={inputClass}>
      {props.options.map((option) => <option key={option}>{option}</option>)}
    </select>
  );
}

function ReviewRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="mb-small text-[#7c858a]">{label}</dt>
      <dd className="mb-small text-right font-bold text-[#303b3f]">{value}{sub ? <span className="mt-0.5 block text-[10px] font-normal text-[#929a9e]">{sub}</span> : null}</dd>
    </div>
  );
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const candidate = payload as { error?: unknown };
    throw new Error(typeof candidate.error === "string" ? candidate.error : `Request failed (${response.status}).`);
  }
  return payload as T;
}

function messageFor(value: unknown): string {
  return value instanceof Error ? value.message : String(value);
}

function maskAccount(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits ? `•••• ${digits.slice(-4)}` : "Not supplied";
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "Not configured";
  return `+${digits.slice(0, 2)} ••• ••• ${digits.slice(-4)}`;
}

function contextSummary(value: FamilyGuardContextAnswers): string {
  const signals = [
    value.urgency ? "urgency" : "",
    value.secrecy ? "secrecy" : "",
    value.promisedReward ? "guaranteed reward or profit" : "",
    value.remoteAccess ? "device or banking access request" : "",
  ].filter(Boolean);
  return `Request began through ${value.contactChannel.replaceAll("_", " ")}. ${signals.length ? `Reported signals: ${signals.join(", ")}.` : "No pressure signals were reported."}`;
}

function mapVoiceRecommendation(value: string | undefined): FamilyGuardRecommendation {
  if (value === "high_risk") return "high_risk";
  if (value === "continue_carefully") return "low_risk";
  return "uncertain";
}

function callSummary(entries: TranscriptEntry[], recommendation: FamilyGuardRecommendation): string {
  const accountHolderMessages = entries.filter((entry) => entry.role === "user").map((entry) => entry.message).slice(-2);
  const detail = accountHolderMessages.length ? ` The account holder said: ${accountHolderMessages.join(" ")}` : "";
  return `The verification call produced a ${recommendation.replaceAll("_", " ")} recommendation.${detail}`.slice(0, 1200);
}

function demoSummary(request: FamilyGuardPublicApprovalRequest, signs: string[]): string {
  const intro = request.risk.recommendation === "high_risk"
    ? "The simulated specialist agents found multiple scam indicators."
    : request.risk.recommendation === "uncertain"
      ? "The simulated specialist agents recommend pausing for independent verification."
      : "The simulated specialist agents found no major warning signs, but careful verification is still recommended.";
  return `${intro} Key evidence: ${signs.slice(0, 5).join("; ")}. This is an advisory recommendation and cannot release money.`;
}

function learningOutcome(status: FamilyGuardPublicApprovalRequest["status"]): "rejected" | "reported" | "blocked" | "expired" | "bank_review" | "cancelled" {
  if (status === "rejected") return "rejected";
  if (status === "reported") return "reported";
  if (status === "blocked") return "blocked";
  if (status === "expired") return "expired";
  if (status === "bank_review") return "bank_review";
  return "cancelled";
}

function outcomeTitle(status: FamilyGuardPublicApprovalRequest["status"]): string {
  if (status === "bank_review") return "Transfer held for bank review";
  if (status === "reported") return "Transfer stopped and reported for review";
  if (status === "blocked") return "Transfer blocked by verified evidence";
  if (status === "expired") return "Trusted approval expired safely";
  return "Transfer rejected safely";
}

const inputClass = "mb-body min-h-11 w-full rounded-[10px] border border-[#dfe5e6] bg-white px-3 py-2.5 text-[#263236] outline-none transition placeholder:text-[#a2aaae] focus:border-[#159080] focus:ring-2 focus:ring-[#159080]/15";
const primaryButton = "mb-body inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#0f766e] px-5 py-2.5 font-bold text-white transition hover:bg-[#0b625b] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/35 disabled:cursor-not-allowed disabled:opacity-45";
const secondaryButton = "mb-body inline-flex min-h-11 items-center justify-center rounded-[10px] border border-[#dce2e3] bg-white px-5 py-2.5 font-semibold text-[#445055] transition hover:bg-[#f5f8f8] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/25 disabled:cursor-not-allowed disabled:opacity-45";
const smallLink = "inline-flex min-h-9 items-center rounded-lg border border-[#cddfdb] bg-white px-3 py-1.5 text-xs font-bold text-[#0f6c64] hover:bg-[#ecf6f3]";
