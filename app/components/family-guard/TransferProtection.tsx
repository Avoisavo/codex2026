"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type {
  FamilyGuardContactChannel,
  FamilyGuardContextAnswers,
  FamilyGuardPublicApprovalRequest,
  FamilyGuardTrustedContact,
} from "@/lib/types";
import type { ScamLinkLookup } from "@/lib/intelligence/liveTypes";

const CHANNELS: Array<{
  value: FamilyGuardContactChannel;
  label: string;
  hint: string;
}> = [
  { value: "whatsapp_or_sms", label: "WhatsApp or SMS", hint: "Message or new number" },
  { value: "phone_call", label: "Phone call", hint: "Caller or recorded message" },
  { value: "social_media", label: "Social media", hint: "Post, ad, group, or direct message" },
  { value: "online_marketplace", label: "Online marketplace", hint: "Buyer or seller conversation" },
  { value: "investment_group", label: "Investment group", hint: "Trading or profit opportunity" },
  { value: "job_or_task", label: "Job or part-time work", hint: "Recruiter, task, or commission" },
  { value: "known_person", label: "Someone I know", hint: "Contact already known personally" },
  { value: "other", label: "Other", hint: "Another source" },
];

const QUESTIONS: Array<{
  key: "urgency" | "secrecy" | "promisedReward" | "remoteAccess";
  title: string;
  detail: string;
}> = [
  {
    key: "urgency",
    title: "Did they tell you to act immediately?",
    detail: "For example, the offer expires today or your account will be frozen.",
  },
  {
    key: "secrecy",
    title: "Did they ask you to keep the payment secret?",
    detail: "Including instructions not to tell family, your bank, or the police.",
  },
  {
    key: "promisedReward",
    title: "Did they promise guaranteed profit, commission, or a reward?",
    detail: "Especially when another payment is needed to unlock it.",
  },
  {
    key: "remoteAccess",
    title: "Did they request an app install, screen sharing, or banking details?",
    detail: "Never share a password, PIN, OTP, TAC, or Secure2u approval.",
  },
];

export function ContextQuestionnaire({
  value,
  onChange,
  onBack,
  onContinue,
}: {
  value: FamilyGuardContextAnswers;
  onChange: (next: FamilyGuardContextAnswers) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <section aria-labelledby="payment-context-title">
      <div className="flex items-start gap-3 rounded-xl border border-[#f2d394] bg-[#fff9ec] p-4">
        <ShieldIcon className="mt-0.5 size-9 shrink-0 text-[#b97908]" />
        <div>
          <h2 id="payment-context-title" className="mb-title text-[#1e2129]">
            Where did this payment request begin?
          </h2>
          <p className="mb-small mt-1 leading-5 text-[#6b5a34]">
            Scams often begin outside the banking app. These answers help explain risk;
            they are not a fraud accusation.
          </p>
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className="mb-small font-bold text-[#3a3f48]">Choose one source</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {CHANNELS.map((channel) => {
            const selected = value.contactChannel === channel.value;
            return (
              <button
                key={channel.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange({ ...value, contactChannel: channel.value })}
                className={`min-h-16 rounded-xl border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#efab30]/50 ${
                  selected
                    ? "border-[#efab30] bg-[#fff6e2] shadow-[0_7px_20px_-14px_rgba(174,111,0,0.65)]"
                    : "border-[#e5e8ed] bg-white hover:border-[#efc56f] hover:bg-[#fffaf1]"
                }`}
              >
                <span className="mb-body block font-bold text-[#20242c]">{channel.label}</span>
                <span className="mb-xs mt-1 block leading-4 text-[#8b9099]">{channel.hint}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="mb-small font-bold text-[#3a3f48]">Four quick safety questions</legend>
        <div className="mt-2 divide-y divide-[#edf0f3] rounded-xl border border-[#e5e8ed] bg-white px-4">
          {QUESTIONS.map((question) => (
            <div
              key={question.key}
              className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 pr-3">
                <p className="mb-body font-semibold text-[#20242c]">{question.title}</p>
                <p className="mb-xs mt-1 leading-4 text-[#8b9099]">{question.detail}</p>
              </div>
              <div className="grid shrink-0 grid-cols-2 rounded-lg border border-[#dfe3e8] p-1">
                {[false, true].map((answer) => {
                  const selected = value[question.key] === answer;
                  return (
                    <button
                      key={String(answer)}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onChange({ ...value, [question.key]: answer })}
                      className={`min-h-9 min-w-16 rounded-md px-3 text-xs font-bold transition ${
                        selected
                          ? answer
                            ? "bg-[#fdeaea] text-[#bd2c32]"
                            : "bg-[#e8f6ec] text-[#187a39]"
                          : "text-[#8b9099] hover:bg-[#f5f6f8]"
                      }`}
                    >
                      {answer ? "Yes" : "No"}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 block">
        <span className="mb-small font-semibold text-[#3a3f48]">
          Anything else that may help? <span className="font-normal text-[#8b9099]">Optional</span>
        </span>
        <textarea
          value={value.notes}
          maxLength={500}
          onChange={(event) => onChange({ ...value, notes: event.target.value })}
          placeholder="For example: they contacted me from a new number and said the offer ends today. Do not enter passwords or authentication codes."
          className="mb-body mt-2 min-h-20 w-full resize-none rounded-xl border border-[#e2e5ea] bg-white px-4 py-3 text-[#20242c] outline-none transition focus:border-[#efab30]"
        />
      </label>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onBack} className={secondaryButton}>
          Back
        </button>
        <button type="button" onClick={onContinue} className={primaryButton}>
          Check warning signs
        </button>
      </div>
    </section>
  );
}

export function WarningSignsCard({
  request,
  graph,
  onContinue,
  onCancel,
}: {
  request: FamilyGuardPublicApprovalRequest;
  graph: ScamLinkLookup | null;
  onContinue: () => void;
  onCancel: () => void;
}) {
  const recommendation = request.risk.recommendation;
  const tone = recommendation === "high_risk" ? "rose" : recommendation === "uncertain" ? "amber" : "green";
  const title = recommendation === "high_risk"
    ? "Multiple warning signs detected"
    : recommendation === "uncertain"
      ? "Pause and verify before continuing"
      : "No major warning signs detected";

  return (
    <section aria-labelledby="warning-signs-title" className="space-y-4">
      <div
        className={`rounded-xl border p-4 ${
          tone === "rose"
            ? "border-[#f3c8cb] bg-[#fff2f2]"
            : tone === "amber"
              ? "border-[#efd69e] bg-[#fff9eb]"
              : "border-[#c9e9d2] bg-[#f1fbf4]"
        }`}
      >
        <p className="mb-xs font-bold uppercase tracking-[0.12em] text-[#8b9099]">
          Family Guard recommendation
        </p>
        <h2 id="warning-signs-title" className="mb-title mt-1 text-[#1e2129]">{title}</h2>
        <p className="mb-small mt-2 leading-5 text-[#5d6470]">
          Your money has not been sent. This assessment identifies risk signals; it does
          not prove that the recipient is fraudulent.
        </p>
      </div>

      <div className="rounded-xl border border-[#e4e7eb] bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="mb-body font-bold text-[#1e2129]">Why we paused this transfer</h3>
          <span className="rounded-full bg-[#f1f3f6] px-2.5 py-1 text-[11px] font-bold text-[#5f6671]">
            {request.risk.score}/100 demo score
          </span>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {request.risk.signals.map((signal) => (
            <li key={signal.code} className="rounded-lg border border-[#edf0f3] bg-[#fafbfc] p-3">
              <p className="mb-small font-bold text-[#292e36]">{signal.title}</p>
              <p className="mb-xs mt-1 leading-4 text-[#727985]">{signal.explanation}</p>
            </li>
          ))}
        </ul>
      </div>

      <SimulatedAgentTrace request={request} graph={graph} />

      <CompactScamLinkMap graph={graph} />

      <div className="rounded-xl border border-[#dbe5f4] bg-[#f4f8fe] p-4">
        <h3 className="mb-body font-bold text-[#20334d]">What to do safely</h3>
        <ul className="mt-2 space-y-1.5">
          {request.risk.safeNextSteps.map((step) => (
            <li key={step} className="mb-small flex gap-2 leading-5 text-[#53657c]">
              <span aria-hidden="true" className="text-[#2671c6]">✓</span>
              {step}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel transfer
        </button>
        <button type="button" onClick={onContinue} className={primaryButton}>
          Continue to verification
        </button>
      </div>
    </section>
  );
}

function SimulatedAgentTrace({
  request,
  graph,
}: {
  request: FamilyGuardPublicApprovalRequest;
  graph: ScamLinkLookup | null;
}) {
  const sourceCount = (sources: Array<FamilyGuardPublicApprovalRequest["risk"]["signals"][number]["source"]>) =>
    request.risk.signals.filter((signal) => sources.includes(signal.source)).length;
  const agents = [
    {
      name: "Transaction Agent",
      finding: `${sourceCount(["transaction", "limits"])} behaviour and limit signal${sourceCount(["transaction", "limits"]) === 1 ? "" : "s"}`,
    },
    {
      name: "Conversation Agent",
      finding: `${sourceCount(["context"])} pressure or contact signal${sourceCount(["context"]) === 1 ? "" : "s"}`,
    },
    {
      name: "Entity Agent",
      finding: "Recipient account and clues extracted with masked display",
    },
    {
      name: "Graph Agent",
      finding: graph?.matched
        ? `${graph.previousReportCount} previous report connection${graph.previousReportCount === 1 ? "" : "s"}`
        : graph
          ? "No matching connection; absence is not a safety guarantee"
          : "Graph lookup in progress",
    },
    {
      name: "Scam Pattern Agent",
      finding: request.context.promisedReward
        ? "Investment or reward pattern indicated"
        : "Context compared with common scam patterns",
    },
    {
      name: "Education Agent",
      finding: `${request.risk.safeNextSteps.length} personalised safe next steps`,
    },
    {
      name: "Orchestrator",
      finding: labelRecommendation(request.risk.recommendation),
    },
  ];

  return (
    <section className="rounded-xl border border-[#d8e8e5] bg-[#f4faf8] p-4" aria-labelledby="agent-trace-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="mb-xs font-bold uppercase tracking-[0.12em] text-[#0f766e]">Simulated agent swarm</p>
          <h3 id="agent-trace-title" className="mb-body mt-1 font-bold text-[#20383b]">Specialists investigate; the orchestrator recommends</h3>
        </div>
        <span className="rounded-full border border-[#bcd9d3] bg-white px-2.5 py-1 text-[10px] font-bold text-[#18766c]">Advisory only</span>
      </div>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent, index) => (
          <li key={agent.name} className="rounded-lg border border-[#dceae7] bg-white p-3">
            <div className="flex items-center gap-2">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#dff2ed] text-[10px] font-extrabold text-[#0f766e]">{index + 1}</span>
              <p className="mb-small font-bold text-[#283a3d]">{agent.name}</p>
            </div>
            <p className="mb-xs mt-1.5 leading-4 text-[#6b797b]">{agent.finding}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[10px] leading-4 text-[#748180]">Hackathon simulation: these roles are deterministic tools and prompts, not seven independent models. None can approve or execute a transfer.</p>
    </section>
  );
}

export function CompactScamLinkMap({ graph }: { graph: ScamLinkLookup | null }) {
  if (!graph) {
    return (
      <div className="rounded-xl border border-dashed border-[#dfe3e8] bg-[#fafbfc] p-4">
        <p className="mb-body font-bold text-[#2c3139]">Scam Link Map</p>
        <p className="mb-small mt-1 text-[#7c838e]">Checking the recipient&apos;s masked connections…</p>
      </div>
    );
  }

  if (!graph.matched) {
    return (
      <div className="rounded-xl border border-[#dfe3e8] bg-[#fafbfc] p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#eef1f5] text-sm text-[#69717c]">?</span>
          <div>
            <p className="mb-body font-bold text-[#2c3139]">No matching graph connection found</p>
            <p className="mb-small mt-1 leading-5 text-[#7c838e]">{graph.explanation}</p>
          </div>
        </div>
      </div>
    );
  }

  const orderedKinds = ["phone", "website", "account", "case"] as const;
  const nodes = orderedKinds.flatMap((kind) => {
    const node = graph.nodes.find((candidate) => candidate.kind === kind);
    return node ? [node] : [];
  });

  return (
    <div className="rounded-xl border border-[#ead9af] bg-[#fffaf0] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-xs font-bold uppercase tracking-[0.12em] text-[#9b7729]">Scam Link Map</p>
          <h3 className="mb-body mt-1 font-bold text-[#2a2925]">{graph.headline}</h3>
        </div>
        <span className="w-fit rounded-full border border-[#e4c97e] bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a6718]">
          {String(graph.status ?? "observed").replaceAll("_", " ")}
        </span>
      </div>
      <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        {nodes.slice(0, 4).map((node, index) => (
          <div key={node.id} className="contents">
            <div className="min-w-0 flex-1 rounded-lg border border-[#eadfbe] bg-white px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#a08a55]">{node.kind}</p>
              <p className="mb-xs mt-1 break-words font-semibold text-[#3c3932]">{node.maskedValue}</p>
            </div>
            {index < Math.min(nodes.length, 4) - 1 ? (
              <span aria-hidden="true" className="self-center text-[#b9984d]">→</span>
            ) : null}
          </div>
        ))}
      </div>
      <p className="mb-xs mt-3 leading-4 text-[#76694a]">
        {graph.explanation} Similar details can have innocent explanations.
      </p>
    </div>
  );
}

export type VerificationPanelStatus =
  | "ready"
  | "calling"
  | "active"
  | "completed"
  | "error";

export function VerificationCallPanel({
  safetyPhrase,
  maskedPhone,
  voiceConsent,
  status,
  error,
  onRequestCall,
  onUseDemo,
  onBack,
}: {
  safetyPhrase: string;
  maskedPhone: string;
  voiceConsent: boolean;
  status: VerificationPanelStatus;
  error: string;
  onRequestCall: () => void;
  onUseDemo: () => void;
  onBack: () => void;
}) {
  const busy = status === "calling" || status === "active";
  return (
    <section aria-labelledby="verification-title" className="space-y-4">
      <div className="rounded-xl border border-[#d8e5f4] bg-[#f4f8fd] p-4">
        <p className="mb-xs font-bold uppercase tracking-[0.12em] text-[#4e739e]">Account-holder verification</p>
        <h2 id="verification-title" className="mb-title mt-1 text-[#1e2129]">Request a safe verification call</h2>
        <p className="mb-small mt-2 leading-5 text-[#5f6f82]">
          The call goes to the account holder—not the trusted contact—and starts only when
          you request it. The AI gives a recommendation; it cannot release money.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[#e2e5ea] bg-white p-4">
          <p className="mb-xs font-bold uppercase tracking-[0.1em] text-[#8b9099]">Temporary safety phrase</p>
          <p className="mt-2 text-xl font-extrabold tracking-[-0.02em] text-[#1e2129]">{safetyPhrase}</p>
          <p className="mb-xs mt-2 leading-4 text-[#7b828d]">The caller must repeat this exact phrase.</p>
        </div>
        <div className="rounded-xl border border-[#e2e5ea] bg-white p-4">
          <p className="mb-xs font-bold uppercase tracking-[0.1em] text-[#8b9099]">Verified account-holder phone</p>
          <p className="mb-body mt-2 font-bold text-[#1e2129]">{maskedPhone || "Not configured"}</p>
          <p className="mb-xs mt-2 leading-4 text-[#7b828d]">Only masked transaction context is shared.</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#f0cf86] bg-[#fff8e7] p-4">
        <p className="mb-body font-extrabold text-[#6d5015]">The call will never ask for:</p>
        <p className="mb-small mt-1 leading-5 text-[#7b6535]">Your password, PIN, OTP, TAC, Secure2u approval, or screen-sharing access.</p>
      </div>

      {!voiceConsent ? (
        <div role="alert" className="rounded-xl border border-[#efc4c7] bg-[#fff2f2] p-4 text-sm text-[#9c3035]">
          Voice-call consent is off. Enable it in Family Guard settings, or use the clearly
          labelled deterministic demo assessment below.
        </div>
      ) : null}

      <div aria-live="polite" className="rounded-xl border border-[#e4e7eb] bg-[#fafbfc] p-4">
        <div className="flex items-center gap-2">
          <span className={`size-2.5 rounded-full ${busy ? "animate-pulse bg-[#21a052]" : status === "error" ? "bg-[#df4147]" : "bg-[#9ca3af]"}`} />
          <p className="mb-body font-bold text-[#2d323a]">
            {status === "ready" && "Ready when you are"}
            {status === "calling" && "Calling the account holder…"}
            {status === "active" && "Verification conversation in progress…"}
            {status === "completed" && "Verification recommendation received"}
            {status === "error" && "The call could not be completed"}
          </p>
        </div>
        {error ? <p className="mb-small mt-2 text-[#b33439]">{error}</p> : null}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onBack} disabled={busy} className={secondaryButton}>
          Back
        </button>
        <button type="button" onClick={onUseDemo} disabled={busy} className={secondaryButton}>
          Use demo assessment
        </button>
        <button
          type="button"
          onClick={onRequestCall}
          disabled={busy || !voiceConsent || !maskedPhone}
          className={primaryButton}
        >
          {busy ? "Verification in progress…" : "Request verification call"}
        </button>
      </div>
    </section>
  );
}

export function ParentPendingPanel({
  request,
  contacts,
  refreshing,
  onRefresh,
  onCancel,
}: {
  request: FamilyGuardPublicApprovalRequest;
  contacts: FamilyGuardTrustedContact[];
  refreshing: boolean;
  onRefresh: () => void;
  onCancel: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  const remaining = Math.max(0, new Date(request.expiresAt).getTime() - now);
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  const names = contacts
    .filter((contact) => request.trustedContactIds.includes(contact.id))
    .map((contact) => contact.name);

  return (
    <section aria-labelledby="pending-title" className="space-y-4 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#fff3d7] text-[#b97808]">
        <ShieldIcon className="size-8" />
      </span>
      <div>
        <p className="mb-xs font-bold uppercase tracking-[0.12em] text-[#9b7729]">Protected transfer pending</p>
        <h2 id="pending-title" className="mb-title mt-1 text-[#1e2129]">Waiting for trusted approval</h2>
        <p className="mb-body mx-auto mt-2 max-w-xl leading-6 text-[#646b75]">
          Your money has not been sent. {names.length ? names.join(" or ") : "Your trusted contact"} can review only this exact recipient and amount.
        </p>
      </div>

      <div className="mx-auto grid max-w-xl gap-3 text-left sm:grid-cols-3">
        <PendingFact label="Amount" value={`RM ${request.transfer.amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`} />
        <PendingFact label="Recipient" value={request.transfer.recipientName} />
        <PendingFact label="Expires in" value={`${minutes}:${String(seconds).padStart(2, "0")}`} />
      </div>

      <div className="mx-auto max-w-xl rounded-xl border border-[#dce6f3] bg-[#f5f8fc] p-4 text-left">
        <p className="mb-small font-bold text-[#253a52]">AI recommendation: {labelRecommendation(request.aiRecommendation ?? request.risk.recommendation)}</p>
        <p className="mb-xs mt-1 leading-4 text-[#65758a]">{request.aiSummary || request.risk.explanation}</p>
      </div>

      <p className="mb-xs text-[#888f99]">Changing the recipient or amount creates a new request and invalidates this approval.</p>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href={`/family-guard?request=${encodeURIComponent(request.id)}`} className={primaryButton}>
          Open guardian review
        </Link>
        <button type="button" onClick={onRefresh} disabled={refreshing} className={secondaryButton}>
          {refreshing ? "Checking…" : "Check status"}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel safely
        </button>
      </div>
    </section>
  );
}

export function LearningSummary({
  title,
  warningSigns,
  outcome,
}: {
  title: string;
  warningSigns: string[];
  outcome: "rejected" | "reported" | "blocked" | "expired" | "bank_review";
}) {
  const [answer, setAnswer] = useState<"verify" | "transfer" | null>(null);
  const protectedCopy = useMemo(() => {
    if (outcome === "expired") return "The approval expired safely, so no money was sent.";
    if (outcome === "bank_review") return "The transfer remains held for stronger bank review.";
    return "The transfer did not proceed and your balance is unchanged.";
  }, [outcome]);

  return (
    <section className="space-y-4">
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#eaf5ee] text-[#208141]">
          <ShieldIcon className="size-8" />
        </span>
        <h2 className="mb-title mt-3 text-[#1e2129]">{title}</h2>
        <p className="mb-body mt-2 text-[#646b75]">{protectedCopy}</p>
      </div>

      <div className="rounded-xl border border-[#e3e7eb] bg-white p-4">
        <h3 className="mb-body font-bold text-[#20242c]">What protected you today</h3>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {warningSigns.slice(0, 6).map((sign) => (
            <li key={sign} className="mb-small flex gap-2 rounded-lg bg-[#f8f9fb] p-2.5 text-[#5e6570]">
              <span aria-hidden="true" className="text-[#d28f14]">●</span>
              {sign}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-[#dbe5f2] bg-[#f4f8fd] p-4">
        <p className="mb-body font-bold text-[#243950]">Quick check: what should you do when someone requests an urgent transfer?</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button type="button" aria-pressed={answer === "verify"} onClick={() => setAnswer("verify")} className={quizButton(answer === "verify", true)}>
            Stop and verify independently
          </button>
          <button type="button" aria-pressed={answer === "transfer"} onClick={() => setAnswer("transfer")} className={quizButton(answer === "transfer", false)}>
            Transfer first, check later
          </button>
        </div>
        <p aria-live="polite" className="mb-small mt-3 min-h-5 text-[#53657b]">
          {answer === "verify" ? "Correct — urgency is a reason to pause and verify through a trusted channel." : answer === "transfer" ? "Safer choice: stop first. Instant transfers may be difficult to recover." : "Choose an answer to reinforce the lesson."}
        </p>
      </div>

      <div className="rounded-xl border border-[#efc5c8] bg-[#fff2f2] p-4">
        <p className="mb-body font-extrabold text-[#9d3036]">Already sent money?</p>
        <p className="mb-small mt-1 leading-5 text-[#82464a]">
          Contact your bank immediately. In Malaysia, call the National Scam Response Centre at <strong>997</strong> (8:00am–8:00pm daily, including public holidays).
        </p>
        <a href="https://nfcc.jpm.gov.my/index.php/en/about-nsrc" target="_blank" rel="noreferrer" className="mb-small mt-2 inline-block font-bold text-[#9d3036] underline">
          Official NSRC guidance
        </a>
      </div>
    </section>
  );
}

function PendingFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#e2e5ea] bg-white p-3">
      <p className="mb-xs text-[#8b9099]">{label}</p>
      <p className="mb-small mt-1 break-words font-bold text-[#20242c]">{value}</p>
    </div>
  );
}

function labelRecommendation(value: string): string {
  if (value === "high_risk") return "High risk — do not proceed";
  if (value === "uncertain") return "Uncertain — pause and verify";
  return "Low risk — continue carefully";
}

function ShieldIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const primaryButton =
  "mb-body inline-flex min-h-11 items-center justify-center rounded-lg bg-[#efab30] px-5 py-2.5 font-bold text-white shadow-[0_10px_22px_-10px_rgba(239,171,48,0.95)] transition hover:bg-[#e59f20] focus:outline-none focus:ring-2 focus:ring-[#efab30]/45 disabled:cursor-not-allowed disabled:opacity-45";
const secondaryButton =
  "mb-body inline-flex min-h-11 items-center justify-center rounded-lg border border-[#dfe3e8] bg-white px-5 py-2.5 font-semibold text-[#3d434c] transition hover:bg-[#f6f7f9] focus:outline-none focus:ring-2 focus:ring-[#efab30]/35 disabled:cursor-not-allowed disabled:opacity-45";

function quizButton(selected: boolean, correct: boolean): string {
  return `min-h-11 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#2c77c8]/35 ${
    selected
      ? correct
        ? "border-[#72ba86] bg-[#eaf7ee] text-[#176b32]"
        : "border-[#e0a1a5] bg-[#fff0f0] text-[#9d3036]"
      : "border-[#dfe4ea] bg-white text-[#4f5966] hover:bg-[#f8fafc]"
  }`;
}
