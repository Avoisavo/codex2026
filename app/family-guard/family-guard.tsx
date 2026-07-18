"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import type {
  FamilyGuardEvidenceStatus,
  FamilyGuardGuardianAction,
  FamilyGuardPublicApprovalRequest,
  FamilyGuardRequestResult,
  FamilyGuardRequestStatus,
  FamilyGuardSettings,
  FamilyGuardTrustedContact,
} from "@/lib/familyGuard/types";

import { MaybankChrome } from "../components/maybank/MaybankChrome";

const USER_ID = "u_danial";
const PENDING_STATUSES: FamilyGuardRequestStatus[] = [
  "awaiting_verification",
  "awaiting_guardian",
];

type View = "pending" | "history";
type Notice = { kind: "success" | "error"; text: string } | null;

type StatusPresentation = {
  label: string;
  className: string;
  education: string;
};

const STATUS: Record<FamilyGuardRequestStatus, StatusPresentation> = {
  awaiting_verification: {
    label: "AI check in progress",
    className: "bg-[#e8f0fb] text-[#315f9b]",
    education:
      "The transfer is frozen while the account holder completes verification. No decision is available yet.",
  },
  awaiting_guardian: {
    label: "Awaiting trusted review",
    className: "bg-[#fff0cf] text-[#8a5d12]",
    education:
      "The exact recipient and amount remain frozen until an assigned trusted contact decides or the request expires.",
  },
  bank_review: {
    label: "Bank review",
    className: "bg-[#ede8fb] text-[#634b9d]",
    education:
      "The transfer remains held for stronger bank review. Trusted approval did not release the money.",
  },
  completed: {
    label: "Approved and completed",
    className: "bg-[#e3f4e8] text-[#267044]",
    education:
      "This exact transfer was released after a valid trusted-contact decision.",
  },
  rejected: {
    label: "Rejected",
    className: "bg-[#f8e7e5] text-[#923d36]",
    education: "The trusted contact rejected the request. No money was sent.",
  },
  reported: {
    label: "Reported for review",
    className: "bg-[#fbe9e3] text-[#9b4934]",
    education:
      "The request was reported as suspicious for review. A report is evidence, not proof of fraud, and no money was sent.",
  },
  blocked: {
    label: "Blocked",
    className: "bg-[#f7dddd] text-[#962f36]",
    education:
      "A hard safety condition blocked the transfer. No trusted-contact action could release it.",
  },
  expired: {
    label: "Expired safely",
    className: "bg-[#edf0f2] text-[#606a72]",
    education:
      "The approval window ended without a valid decision, so no money was sent.",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-[#edf0f2] text-[#606a72]",
    education: "The account holder cancelled the request. No money was sent.",
  },
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp_or_sms: "WhatsApp or SMS",
  phone_call: "Phone call",
  social_media: "Social media",
  online_marketplace: "Online marketplace",
  investment_group: "Investment group",
  job_or_task: "Job or task offer",
  known_person: "Someone known personally",
  other: "Other channel",
};

async function readApiError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

async function loadScopedRequestData(contactId: string) {
  const response = await fetch(
    `/api/family-guard/requests?contactId=${encodeURIComponent(contactId)}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(
      await readApiError(response, "Protected transfers could not be loaded."),
    );
  }
  const next = (await response.json()) as FamilyGuardPublicApprovalRequest[];
  return [...next].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export default function FamilyGuardDashboard({
  initialRequestId,
}: {
  initialRequestId: string | null;
}) {
  const [settings, setSettings] = useState<FamilyGuardSettings | null>(null);
  const [contacts, setContacts] = useState<FamilyGuardTrustedContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [requests, setRequests] = useState<FamilyGuardPublicApprovalRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [view, setView] = useState<View>("pending");
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestError, setRequestError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadConfiguration() {
      try {
        const [contactsResponse, settingsResponse] = await Promise.all([
          fetch(
            `/api/family-guard/contacts?ownerUserId=${encodeURIComponent(USER_ID)}`,
            { cache: "no-store" },
          ),
          fetch(`/api/family-guard/settings/${USER_ID}`, { cache: "no-store" }),
        ]);
        if (!contactsResponse.ok) {
          throw new Error(
            await readApiError(contactsResponse, "Trusted contacts could not be loaded."),
          );
        }
        if (!settingsResponse.ok) {
          throw new Error(
            await readApiError(settingsResponse, "Protection settings could not be loaded."),
          );
        }
        const allContacts =
          (await contactsResponse.json()) as FamilyGuardTrustedContact[];
        const nextSettings = (await settingsResponse.json()) as FamilyGuardSettings;
        if (cancelled) return;
        const activeContacts = allContacts.filter(
          (contact) => contact.status === "active",
        );
        setContacts(allContacts);
        setSettings(nextSettings);
        setSelectedContactId(activeContacts[0]?.id ?? "");
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "The Family Guard dashboard could not be loaded.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadConfiguration();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedContactId) return;
    let cancelled = false;

    async function loadRequests() {
      try {
        const sorted = await loadScopedRequestData(selectedContactId);
        if (cancelled) return;
        setRequests(sorted);
        setRequestError("");
        const requested = initialRequestId
          ? sorted.find((request) => request.id === initialRequestId)
          : undefined;
        const preferred =
          requested ??
          sorted.find((request) => PENDING_STATUSES.includes(request.status)) ??
          sorted[0];
        setSelectedRequestId(preferred?.id ?? null);
        setView(
          preferred && !PENDING_STATUSES.includes(preferred.status)
            ? "history"
            : "pending",
        );
      } catch (loadError) {
        if (!cancelled) {
          setRequestError(
            loadError instanceof Error
              ? loadError.message
              : "Protected transfers could not be loaded.",
          );
        }
      } finally {
        if (!cancelled) setRequestsLoading(false);
      }
    }

    void loadRequests();
    return () => {
      cancelled = true;
    };
  }, [initialRequestId, selectedContactId]);

  const refreshScopedRequests = async () => {
    if (!selectedContactId) return;
    setRequestsLoading(true);
    setRequestError("");
    try {
      const sorted = await loadScopedRequestData(selectedContactId);
      setRequests(sorted);
      setSelectedRequestId((current) =>
        current && sorted.some((request) => request.id === current)
          ? current
          : sorted[0]?.id ?? null,
      );
    } catch (loadError) {
      setRequestError(
        loadError instanceof Error
          ? loadError.message
          : "Protected transfers could not be loaded.",
      );
    } finally {
      setRequestsLoading(false);
    }
  };

  const activeContacts = useMemo(
    () => contacts.filter((contact) => contact.status === "active"),
    [contacts],
  );
  const selectedContact = activeContacts.find(
    (contact) => contact.id === selectedContactId,
  );
  const selectedRequest = requests.find(
    (request) => request.id === selectedRequestId,
  );
  const pending = requests.filter((request) =>
    PENDING_STATUSES.includes(request.status),
  );
  const history = requests.filter(
    (request) => !PENDING_STATUSES.includes(request.status),
  );
  const visibleRequests = view === "pending" ? pending : history;

  const chooseRequest = (request: FamilyGuardPublicApprovalRequest) => {
    setSelectedRequestId(request.id);
    setView(PENDING_STATUSES.includes(request.status) ? "pending" : "history");
  };

  const updateRequest = (request: FamilyGuardPublicApprovalRequest) => {
    setRequests((current) =>
      current
        .map((item) => (item.id === request.id ? request : item))
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        ),
    );
    setSelectedRequestId(request.id);
    if (!PENDING_STATUSES.includes(request.status)) setView("history");
  };

  return (
    <MaybankChrome
      hero={
        <div className="py-[clamp(18px,3vh,32px)]">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">
            Protected-transfer review
          </p>
          <h1 className="mb-h1 mt-1 text-white">Family Guard</h1>
          <p className="mb-sub mt-2 max-w-3xl text-white/80">
            Review only the exact transfers assigned to you. The account holder
            confirms the story, the AI explains the risk, and a trusted contact
            confirms the next step.
          </p>
        </div>
      }
    >
      <div className="mx-auto max-w-7xl py-6 sm:py-8">
        {loading ? (
          <DashboardLoading />
        ) : error ? (
          <ErrorCard message={error} />
        ) : activeContacts.length === 0 ? (
          <NoActiveContact contacts={contacts} />
        ) : (
          <div className="space-y-5">
            <section className="flex flex-col gap-4 rounded-2xl border border-[#dbe5e7] bg-white p-5 shadow-[0_18px_40px_-32px_rgba(11,59,75,0.55)] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#167164]">
                  Signed-in demo role
                </p>
                <h2 className="mt-1 text-lg font-bold text-[#20242c]">
                  Trusted-contact review
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#697178]">
                  You can see protected requests assigned to this contact, not the
                  account holder’s full transaction history.
                </p>
              </div>
              <label className="block sm:min-w-64">
                <span className="mb-1.5 block text-xs font-bold text-[#48545b]">
                  Reviewing as
                </span>
                <select
                  value={selectedContactId}
                  onChange={(event) => {
                    setSelectedContactId(event.target.value);
                    setSelectedRequestId(null);
                    setRequests([]);
                    setRequestsLoading(true);
                    setRequestError("");
                    setView("pending");
                  }}
                  className="w-full rounded-xl border border-[#d6dee1] bg-white px-3.5 py-3 text-sm font-bold text-[#273238] outline-none focus:border-[#168272] focus:ring-2 focus:ring-[#168272]/15"
                >
                  {activeContacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} · {contact.role}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="overflow-hidden rounded-2xl border border-[#dfe5e7] bg-white shadow-[0_18px_40px_-34px_rgba(11,59,75,0.55)]">
                <div className="grid grid-cols-2 border-b border-[#e5e9eb] p-2" role="tablist" aria-label="Request lists">
                  <TabButton
                    active={view === "pending"}
                    onClick={() => setView("pending")}
                    label={`Pending (${pending.length})`}
                  />
                  <TabButton
                    active={view === "history"}
                    onClick={() => setView("history")}
                    label={`History (${history.length})`}
                  />
                </div>
                <div className="max-h-[630px] overflow-y-auto p-3">
                  {requestsLoading ? (
                    <p className="p-4 text-center text-sm text-[#727b82]" role="status">
                      Loading assigned requests…
                    </p>
                  ) : requestError ? (
                    <div className="rounded-xl bg-[#fff2f0] p-3" role="alert">
                      <p className="text-xs leading-5 text-[#9b4038]">{requestError}</p>
                      <button
                        type="button"
                        onClick={() => void refreshScopedRequests()}
                        className="mt-2 text-xs font-bold text-[#8f3731] underline"
                      >
                        Try again
                      </button>
                    </div>
                  ) : visibleRequests.length ? (
                    <div className="space-y-2">
                      {visibleRequests.map((request) => (
                        <RequestListItem
                          key={request.id}
                          request={request}
                          selected={request.id === selectedRequestId}
                          onClick={() => chooseRequest(request)}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyList view={view} />
                  )}
                </div>
              </aside>

              <main className="min-w-0">
                {selectedRequest ? (
                  <ReviewPanel
                    key={selectedRequest.id}
                    request={selectedRequest}
                    contact={selectedContact!}
                    accountHolderPhone={settings?.accountHolderPhone ?? ""}
                    onUpdated={updateRequest}
                    onRefresh={() => void refreshScopedRequests()}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#ced9dc] bg-[#fafcfc] p-8 text-center">
                    <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#e5f4f0] text-2xl" aria-hidden="true">
                      ✓
                    </span>
                    <h2 className="mt-4 text-lg font-bold text-[#273238]">
                      Choose a protected transfer
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6e777e]">
                      Select a request to review the frozen amount, recipient, AI
                      explanation and available safe actions.
                    </p>
                  </div>
                )}
              </main>
            </div>
          </div>
        )}
      </div>
    </MaybankChrome>
  );
}

function ReviewPanel({
  request,
  contact,
  accountHolderPhone,
  onUpdated,
  onRefresh,
}: {
  request: FamilyGuardPublicApprovalRequest;
  contact: FamilyGuardTrustedContact;
  accountHolderPhone: string;
  onUpdated: (request: FamilyGuardPublicApprovalRequest) => void;
  onRefresh: () => void;
}) {
  const [approvalCode, setApprovalCode] = useState("");
  const [busyAction, setBusyAction] = useState<FamilyGuardGuardianAction | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const status = STATUS[request.status];
  const recommendation = request.aiRecommendation ?? request.risk.recommendation;
  const highRisk =
    recommendation === "high_risk" ||
    request.risk.requirements.bankReview ||
    request.risk.requirements.hardBlock;
  const warningSigns = Array.from(
    new Set([
      ...request.aiWarningSigns,
      ...request.risk.signals.map((signal) => signal.title),
    ]),
  );
  const phoneHref = telephoneHref(accountHolderPhone);

  const decide = async (action: FamilyGuardGuardianAction) => {
    setNotice(null);
    if (!/^\d{4,8}$/.test(approvalCode)) {
      setNotice({
        kind: "error",
        text: "Enter the 4–8 digit transaction-bound Family Guard code.",
      });
      return;
    }
    setBusyAction(action);
    try {
      const response = await fetch(
        `/api/family-guard/requests/${encodeURIComponent(request.id)}/decision`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactId: contact.id,
            approvalCode,
            expectedVersion: request.version,
            action,
          }),
        },
      );
      if (!response.ok) {
        const message = await readApiError(
          response,
          "The decision could not be recorded.",
        );
        if (response.status === 409) {
          throw new Error(`${message} Refresh this request before trying again.`);
        }
        throw new Error(message);
      }
      const result = (await response.json()) as FamilyGuardRequestResult;
      onUpdated(result.request);
      setApprovalCode("");
      setNotice({
        kind: "success",
        text: decisionSuccess(result.request.status),
      });
    } catch (decisionError) {
      setNotice({
        kind: "error",
        text:
          decisionError instanceof Error
            ? decisionError.message
            : "The decision could not be recorded.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <article className="space-y-5">
      <section className="rounded-2xl border border-[#dfe5e7] bg-white p-5 shadow-[0_18px_40px_-34px_rgba(11,59,75,0.55)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <StatusBadge status={request.status} />
            <h2 className="mt-3 text-2xl font-bold text-[#20242c]">
              {formatMoney(request.transfer.amount)} to {request.transfer.recipientName}
            </h2>
            <p className="mt-1 text-sm text-[#6d767d]">
              Request {request.id} · created {formatDate(request.createdAt)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            {phoneHref ? (
              <a
                href={phoneHref}
                className="rounded-xl border border-[#bcd6d2] bg-[#f2faf8] px-4 py-2.5 text-center text-sm font-bold text-[#12675d] hover:bg-[#e7f5f1]"
              >
                Call account holder
              </a>
            ) : (
              <button
                type="button"
                disabled
                title="Add the account-holder phone in Settings"
                className="cursor-not-allowed rounded-xl border border-[#d8dddf] bg-[#f2f3f4] px-4 py-2.5 text-sm font-bold text-[#90979c]"
              >
                Account-holder phone unavailable
              </button>
            )}
            <button
              type="button"
              onClick={onRefresh}
              className="text-xs font-bold text-[#537079] underline-offset-2 hover:underline"
            >
              Refresh request
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-[#ecd492] bg-[#fff9e9] p-4">
          <p className="text-sm font-bold text-[#73531b]">
            This exact transfer is frozen
          </p>
          <p className="mt-1 text-xs leading-5 text-[#816d47]">
            Changing the amount or recipient invalidates this approval. Your decision
            applies only to the details below; it does not grant access to the account.
          </p>
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Fact label="Frozen amount" value={formatMoney(request.transfer.amount)} />
          <Fact label="Recipient" value={request.transfer.recipientName} />
          <Fact
            label="Recipient account"
            value={`${request.transfer.recipientBank} · ${maskAccount(request.transfer.accountNumber)}`}
          />
          <Fact label="Reference" value={request.transfer.reference || "Not provided"} />
        </dl>

        <div className="mt-4 rounded-xl bg-[#f4f7f8] p-4">
          <p className="text-sm font-bold text-[#3a474e]">What this status means</p>
          <p className="mt-1 text-xs leading-5 text-[#68757b]">{status.education}</p>
          <p className="mt-2 text-xs font-semibold text-[#596970]">
            Approval window: {formatDate(request.expiresAt)}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-[#dfe5e7] bg-white p-5 shadow-[0_18px_40px_-34px_rgba(11,59,75,0.55)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#167164]">
              AI safety summary
            </p>
            <h2 className="mt-1 text-lg font-bold text-[#20242c]">
              {recommendationLabel(recommendation)}
            </h2>
          </div>
          <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${riskStyle(request.risk.level)}`}>
            {request.risk.level} risk · {request.risk.score}/100
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#59636b]">
          {request.aiSummary || request.risk.explanation}
        </p>
        <p className="mt-2 text-xs leading-5 text-[#7a6b54]">
          This is an AI recommendation based on warning signs. It is not a final fraud
          accusation and cannot release money by itself.
        </p>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold text-[#354047]">Warning signs</h3>
            {warningSigns.length ? (
              <ul className="mt-2 space-y-2">
                {warningSigns.map((warning) => (
                  <li
                    key={warning}
                    className="flex gap-2 rounded-lg border border-[#f0dfd0] bg-[#fff9f4] p-3 text-xs leading-5 text-[#765f4b]"
                  >
                    <span aria-hidden="true" className="font-bold text-[#c0672b]">!</span>
                    {warning}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs leading-5 text-[#727b82]">
                No conversation warning signs were recorded. Review the transaction
                details independently before approving.
              </p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#354047]">Safe next steps</h3>
            <ul className="mt-2 space-y-2">
              {request.risk.safeNextSteps.map((step) => (
                <li
                  key={step}
                  className="flex gap-2 rounded-lg border border-[#dbe9e6] bg-[#f4faf8] p-3 text-xs leading-5 text-[#536b65]"
                >
                  <span aria-hidden="true" className="font-bold text-[#168272]">✓</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <EvidencePanel request={request} />

      {request.status === "awaiting_guardian" ? (
        <section className="rounded-2xl border border-[#d5e1e3] bg-white p-5 shadow-[0_18px_40px_-30px_rgba(11,59,75,0.62)] sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#167164]">
            Independent trusted decision
          </p>
          <h2 className="mt-1 text-lg font-bold text-[#20242c]">
            Decide after checking with the account holder
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#687178]">
            You are reviewing as {contact.name}. For high-risk cases, the safe approval
            path is bank review—not release.
          </p>

          <label className="mt-5 block max-w-md">
            <span className="block text-sm font-bold text-[#354047]">
              Transaction-bound Family Guard code
            </span>
            <span className="mt-1 block text-xs leading-5 text-[#9a4038]">
              This is not a bank OTP, TAC, PIN or Secure2u approval. Never ask the
              account holder to share those banking credentials.
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={8}
              value={approvalCode}
              onChange={(event) =>
                setApprovalCode(event.target.value.replace(/\D/g, "").slice(0, 8))
              }
              placeholder="4–8 digit demo code"
              className="mt-2 w-full rounded-xl border border-[#d7dfe2] px-4 py-3 font-mono text-lg tracking-[0.24em] outline-none focus:border-[#168272] focus:ring-2 focus:ring-[#168272]/15"
            />
            <span className="mt-1.5 block text-xs text-[#768087]">
              Use the separate demo code issued for this exact transfer.
            </span>
          </label>

          {notice && <DecisionNotice notice={notice} />}

          <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {highRisk ? (
              <ActionButton
                tone="review"
                disabled={busyAction !== null}
                busy={busyAction === "escalate"}
                onClick={() => void decide("escalate")}
              >
                Request bank review
              </ActionButton>
            ) : (
              <ActionButton
                tone="approve"
                disabled={busyAction !== null}
                busy={busyAction === "approve"}
                onClick={() => void decide("approve")}
              >
                Approve exact transfer
              </ActionButton>
            )}
            <ActionButton
              tone="reject"
              disabled={busyAction !== null}
              busy={busyAction === "reject"}
              onClick={() => void decide("reject")}
            >
              Reject transfer
            </ActionButton>
            <ActionButton
              tone="report"
              disabled={busyAction !== null}
              busy={busyAction === "report"}
              onClick={() => void decide("report")}
            >
              Report as suspicious
            </ActionButton>
            {!highRisk && (
              <ActionButton
                tone="review"
                disabled={busyAction !== null}
                busy={busyAction === "escalate"}
                onClick={() => void decide("escalate")}
              >
                Ask bank to review
              </ActionButton>
            )}
          </div>
          {highRisk && (
            <p className="mt-3 rounded-lg bg-[#f4effd] p-3 text-xs leading-5 text-[#665287]">
              Because this case is high risk, there is no one-tap release option. A
              positive decision sends the held transfer to stronger bank review.
            </p>
          )}
        </section>
      ) : request.status === "awaiting_verification" ? (
        <section className="rounded-2xl border border-[#d9e3ed] bg-[#f5f9fd] p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[#294b70]">Verification comes first</h2>
          <p className="mt-2 text-sm leading-6 text-[#60778f]">
            The account holder is still completing the AI safety conversation. The
            money remains frozen, and trusted-contact actions unlock only after the
            structured summary is ready.
          </p>
        </section>
      ) : notice ? (
        <DecisionNotice notice={notice} />
      ) : null}
    </article>
  );
}

function EvidencePanel({ request }: { request: FamilyGuardPublicApprovalRequest }) {
  const evidence = request.risk.suspiciousEvidenceStatus;
  return (
    <section className="rounded-2xl border border-[#e7d9b9] bg-[#fffbf2] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8d6a25]">
            Scam Link evidence
          </p>
          <h2 className="mt-1 text-lg font-bold text-[#332f27]">
            What this payment is connected to
          </h2>
        </div>
        <EvidenceBadge status={evidence} />
      </div>

      <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <MapNode
          label="Request began through"
          value={CHANNEL_LABELS[request.context.contactChannel] ?? "Other channel"}
        />
        <span aria-hidden="true" className="self-center text-[#b28c43]">→</span>
        <MapNode label="Payment recipient" value={request.transfer.recipientName} />
        <span aria-hidden="true" className="self-center text-[#b28c43]">→</span>
        <MapNode
          label="Shared evidence"
          value={evidence ? evidenceLabel(evidence) : "No matching status recorded"}
        />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {request.risk.signals.map((signal) => (
          <div key={signal.code} className="rounded-lg border border-[#eadfca] bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-bold text-[#4d4435]">{signal.title}</p>
              <span className="rounded-full bg-[#f2ede3] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#786b53]">
                {signal.source.replaceAll("_", " ")}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-[#756b5b]">{signal.explanation}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-[#766c5c]">
        Connections are supporting evidence. “Observed” or “user-reported” does not
        mean bank-confirmed fraud; corroboration and independent verification matter.
      </p>
    </section>
  );
}

function RequestListItem({
  request,
  selected,
  onClick,
}: {
  request: FamilyGuardPublicApprovalRequest;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-xl border p-3 text-left transition ${
        selected
          ? "border-[#168272] bg-[#f0faf7] shadow-[0_8px_22px_-18px_rgba(22,130,114,0.8)]"
          : "border-[#e4e8ea] bg-white hover:border-[#b9d3ce] hover:bg-[#fafcfc]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-bold text-[#2c363c]">
          {request.transfer.recipientName}
        </p>
        <p className="shrink-0 text-sm font-bold text-[#2c363c]">
          {formatMoney(request.transfer.amount)}
        </p>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <StatusBadge status={request.status} small />
        <span className="text-[10px] text-[#838b91]">{shortDate(request.createdAt)}</span>
      </div>
    </button>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-lg px-3 py-2.5 text-xs font-bold transition ${
        active ? "bg-[#0f6670] text-white" : "text-[#667178] hover:bg-[#f0f4f5]"
      }`}
    >
      {label}
    </button>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#e5e9eb] bg-[#fafbfb] p-3.5">
      <dt className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#7c858b]">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-bold text-[#303a40]">{value}</dd>
    </div>
  );
}

function MapNode({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-[#eadfc8] bg-white p-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9b865e]">{label}</p>
      <p className="mt-1 break-words text-xs font-bold text-[#4a4235]">{value}</p>
    </div>
  );
}

function EvidenceBadge({ status }: { status: FamilyGuardEvidenceStatus | null }) {
  return (
    <span className="w-fit rounded-full border border-[#e0c987] bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#7f631f]">
      Evidence: {status ? evidenceLabel(status) : "none recorded"}
    </span>
  );
}

function StatusBadge({
  status,
  small = false,
}: {
  status: FamilyGuardRequestStatus;
  small?: boolean;
}) {
  const presentation = STATUS[status];
  return (
    <span
      className={`inline-flex w-fit rounded-full font-bold ${presentation.className} ${
        small
          ? "px-2 py-1 text-[9px] uppercase tracking-[0.07em]"
          : "px-3 py-1.5 text-xs"
      }`}
    >
      {presentation.label}
    </span>
  );
}

function ActionButton({
  tone,
  busy,
  disabled,
  onClick,
  children,
}: {
  tone: "approve" | "reject" | "report" | "review";
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const style = {
    approve: "bg-[#198054] text-white hover:bg-[#126c46]",
    reject: "bg-[#a33f3a] text-white hover:bg-[#8e342f]",
    report: "border border-[#d68b68] bg-[#fff6f1] text-[#93442c] hover:bg-[#feece2]",
    review: "bg-[#67509b] text-white hover:bg-[#574287]",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-12 rounded-xl px-4 py-3 text-sm font-bold transition disabled:cursor-wait disabled:opacity-60 ${style}`}
    >
      {busy ? "Recording…" : children}
    </button>
  );
}

function DecisionNotice({ notice }: { notice: NonNullable<Notice> }) {
  return (
    <p
      role={notice.kind === "error" ? "alert" : "status"}
      className={`mt-4 rounded-xl p-3 text-sm font-semibold leading-5 ${
        notice.kind === "error"
          ? "border border-[#f0c5c1] bg-[#fff2f0] text-[#9a3b34]"
          : "border border-[#c9e6d2] bg-[#effaf2] text-[#267044]"
      }`}
    >
      {notice.text}
    </p>
  );
}

function EmptyList({ view }: { view: View }) {
  return (
    <div className="rounded-xl border border-dashed border-[#d4dde0] bg-[#fafcfc] p-5 text-center">
      <p className="text-sm font-bold text-[#536168]">
        {view === "pending" ? "No requests need a decision" : "No review history yet"}
      </p>
      <p className="mt-1 text-xs leading-5 text-[#7b858b]">
        {view === "pending"
          ? "New assigned protected transfers will appear here."
          : "Completed, rejected, reported, blocked and expired requests will appear here."}
      </p>
    </div>
  );
}

function NoActiveContact({ contacts }: { contacts: FamilyGuardTrustedContact[] }) {
  const pending = contacts.filter((contact) => contact.status === "pending");
  return (
    <section className="rounded-2xl border border-[#e1e6e8] bg-white p-7 text-center shadow-[0_18px_45px_-34px_rgba(11,59,75,0.55)]">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#e8f4f1] text-2xl" aria-hidden="true">
        ♢
      </span>
      <h2 className="mt-4 text-xl font-bold text-[#273238]">No active trusted contact</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#687178]">
        {pending.length
          ? `${pending.length} invitation${pending.length === 1 ? " is" : "s are"} still awaiting acceptance. An active contact is required before assigned requests can be reviewed.`
          : "The account holder can invite a trusted person and record their acceptance in Family Guard settings."}
      </p>
      <Link
        href="/settings"
        className="mt-5 inline-flex rounded-xl bg-[#0f6670] px-5 py-3 text-sm font-bold text-white hover:bg-[#0b555e]"
      >
        Configure trusted contacts
      </Link>
    </section>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <section className="rounded-2xl border border-[#efcac6] bg-[#fff5f4] p-6" role="alert">
      <h2 className="text-lg font-bold text-[#8f3630]">Dashboard unavailable</h2>
      <p className="mt-2 text-sm leading-6 text-[#76514e]">{message}</p>
    </section>
  );
}

function DashboardLoading() {
  return (
    <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]" role="status">
      <div className="h-80 animate-pulse rounded-2xl bg-[#edf1f2]" />
      <div className="h-[520px] animate-pulse rounded-2xl bg-[#f1f3f4]" />
      <span className="sr-only">Loading assigned Family Guard requests</span>
    </div>
  );
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function maskAccount(accountNumber: string) {
  const digits = accountNumber.replace(/\D/g, "");
  return digits ? `•••• ${digits.slice(-4)}` : "Masked";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function telephoneHref(phone: string) {
  const normalized = phone.trim().replace(/[^\d+]/g, "");
  return normalized.replace(/\D/g, "").length >= 8 ? `tel:${normalized}` : null;
}

function recommendationLabel(value: "low_risk" | "uncertain" | "high_risk") {
  if (value === "low_risk") return "No major warning signs detected—continue carefully";
  if (value === "uncertain") return "Uncertain—pause and verify independently";
  return "High risk—do not release without stronger review";
}

function evidenceLabel(status: FamilyGuardEvidenceStatus) {
  return status.replaceAll("_", " ");
}

function riskStyle(level: "low" | "medium" | "high" | "critical") {
  if (level === "low") return "bg-[#e3f4e8] text-[#267044]";
  if (level === "medium") return "bg-[#fff0cf] text-[#895d13]";
  return "bg-[#f8e2e1] text-[#943c38]";
}

function decisionSuccess(status: FamilyGuardRequestStatus) {
  if (status === "completed") return "The exact transfer was approved and released.";
  if (status === "rejected") return "The transfer was rejected. No money was sent.";
  if (status === "reported") {
    return "The request was reported for review. No money was sent.";
  }
  if (status === "bank_review") {
    return "The transfer remains held and has been sent for stronger bank review.";
  }
  return STATUS[status].education;
}
