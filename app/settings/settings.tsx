"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import type {
  FamilyGuardContactInput,
  FamilyGuardSettings,
  FamilyGuardSettingsUpdate,
  FamilyGuardTrustedContact,
} from "@/lib/familyGuard/types";

import { MaybankChrome } from "../components/maybank/MaybankChrome";

const USER_ID = "u_danial";

type SettingsDraft = {
  enabled: boolean;
  accountHolderPhone: string;
  softLimit: string;
  guardianLimit: string;
  hardLimit: string;
  dailyFrequencyLimit: string;
  dailyMaxAmount: string;
  monthlyMaxAmount: string;
  protectNewRecipients: boolean;
  protectSuspiciousAccounts: boolean;
  reviewUnusualActivity: boolean;
  approvalTtlMinutes: string;
  consentAccepted: boolean;
  voiceVerificationConsent: boolean;
  transcriptMode: "none" | "summary_only" | "redacted";
  transcriptRetentionDays: string;
  intelligenceFeedbackConsent: boolean;
};

type ContactDraft = {
  name: string;
  relationship: string;
  phone: string;
  role: "primary" | "backup";
  accepted: boolean;
};

type Notice = { kind: "success" | "error"; text: string } | null;

const EMPTY_CONTACT: ContactDraft = {
  name: "",
  relationship: "",
  phone: "",
  role: "primary",
  accepted: false,
};

const inputClass =
  "w-full rounded-xl border border-[#dfe4e8] bg-white px-3.5 py-3 text-sm text-[#20242c] outline-none transition focus:border-[#168272] focus:ring-2 focus:ring-[#168272]/15 disabled:cursor-not-allowed disabled:bg-[#f1f3f4] disabled:text-[#8b9299]";

function settingsToDraft(settings: FamilyGuardSettings): SettingsDraft {
  return {
    enabled: settings.enabled,
    accountHolderPhone: settings.accountHolderPhone,
    softLimit: String(settings.softLimit),
    guardianLimit: String(settings.guardianLimit),
    hardLimit: String(settings.hardLimit),
    dailyFrequencyLimit: String(settings.dailyFrequencyLimit),
    dailyMaxAmount: String(settings.dailyMaxAmount),
    monthlyMaxAmount: String(settings.monthlyMaxAmount),
    protectNewRecipients: settings.protectNewRecipients,
    protectSuspiciousAccounts: settings.protectSuspiciousAccounts,
    reviewUnusualActivity: settings.reviewUnusualActivity,
    approvalTtlMinutes: String(settings.approvalTtlMinutes),
    consentAccepted: settings.consent.accountHolderAccepted,
    voiceVerificationConsent: settings.privacy.voiceVerificationConsent,
    transcriptMode: settings.privacy.transcriptMode,
    transcriptRetentionDays: String(settings.privacy.transcriptRetentionDays),
    intelligenceFeedbackConsent:
      settings.privacy.intelligenceFeedbackConsent,
  };
}

async function readApiError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

function asPositiveNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<FamilyGuardSettings | null>(null);
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [contacts, setContacts] = useState<FamilyGuardTrustedContact[]>([]);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactDraft, setContactDraft] =
    useState<ContactDraft>(EMPTY_CONTACT);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<Notice>(null);
  const [contactNotice, setContactNotice] = useState<Notice>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [settingsResponse, contactsResponse] = await Promise.all([
          fetch(`/api/family-guard/settings/${USER_ID}`, { cache: "no-store" }),
          fetch(
            `/api/family-guard/contacts?ownerUserId=${encodeURIComponent(USER_ID)}`,
            { cache: "no-store" },
          ),
        ]);
        if (!settingsResponse.ok) {
          throw new Error(
            await readApiError(settingsResponse, "Protection settings could not be loaded."),
          );
        }
        if (!contactsResponse.ok) {
          throw new Error(
            await readApiError(contactsResponse, "Trusted contacts could not be loaded."),
          );
        }
        const nextSettings = (await settingsResponse.json()) as FamilyGuardSettings;
        const nextContacts =
          (await contactsResponse.json()) as FamilyGuardTrustedContact[];
        if (cancelled) return;
        setSettings(nextSettings);
        setDraft(settingsToDraft(nextSettings));
        setContacts(nextContacts);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Family Guard settings could not be loaded.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateDraft = <Key extends keyof SettingsDraft>(
    key: Key,
    value: SettingsDraft[Key],
  ) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
    setSettingsNotice(null);
  };

  const saveSettings = async () => {
    if (!draft) return;
    setSettingsNotice(null);

    const softLimit = asPositiveNumber(draft.softLimit);
    const guardianLimit = asPositiveNumber(draft.guardianLimit);
    const hardLimit = asPositiveNumber(draft.hardLimit);
    const dailyFrequencyLimit = asPositiveNumber(draft.dailyFrequencyLimit);
    const dailyMaxAmount = asPositiveNumber(draft.dailyMaxAmount);
    const monthlyMaxAmount = asPositiveNumber(draft.monthlyMaxAmount);
    const approvalTtlMinutes = asPositiveNumber(draft.approvalTtlMinutes);
    const transcriptRetentionDays = Number(draft.transcriptRetentionDays);

    if (
      softLimit === null ||
      guardianLimit === null ||
      hardLimit === null ||
      dailyFrequencyLimit === null ||
      dailyMaxAmount === null ||
      monthlyMaxAmount === null ||
      approvalTtlMinutes === null
    ) {
      setSettingsNotice({
        kind: "error",
        text: "Enter positive numbers for every protection limit and expiry period.",
      });
      return;
    }
    if (
      !Number.isInteger(dailyFrequencyLimit) ||
      !Number.isInteger(approvalTtlMinutes) ||
      dailyFrequencyLimit > 100 ||
      approvalTtlMinutes > 60
    ) {
      setSettingsNotice({
        kind: "error",
        text: "Daily transfers must be a whole number up to 100, and approval expiry must be a whole number up to 60 minutes.",
      });
      return;
    }
    if (!(softLimit <= guardianLimit && guardianLimit <= hardLimit)) {
      setSettingsNotice({
        kind: "error",
        text: "Keep the limits in order: soft limit, trusted-approval limit, then hard limit.",
      });
      return;
    }
    if (dailyMaxAmount > monthlyMaxAmount) {
      setSettingsNotice({
        kind: "error",
        text: "The daily amount cannot be greater than the monthly amount.",
      });
      return;
    }
    if (draft.enabled && !draft.consentAccepted) {
      setSettingsNotice({
        kind: "error",
        text: "The account holder must consent before Family Guard can be enabled.",
      });
      return;
    }
    if (draft.enabled && draft.accountHolderPhone.replace(/\D/g, "").length < 8) {
      setSettingsNotice({
        kind: "error",
        text: "Add the account holder’s phone number before enabling protection.",
      });
      return;
    }
    if (
      draft.transcriptMode !== "none" &&
      (!Number.isInteger(transcriptRetentionDays) ||
        transcriptRetentionDays < 0 ||
        transcriptRetentionDays > 30)
    ) {
      setSettingsNotice({
        kind: "error",
        text: "Transcript retention must be between 0 and 30 days.",
      });
      return;
    }

    const update: FamilyGuardSettingsUpdate = {
      enabled: draft.enabled,
      accountHolderPhone: draft.accountHolderPhone,
      softLimit,
      guardianLimit,
      hardLimit,
      dailyFrequencyLimit,
      dailyMaxAmount,
      monthlyMaxAmount,
      protectNewRecipients: draft.protectNewRecipients,
      protectSuspiciousAccounts: draft.protectSuspiciousAccounts,
      reviewUnusualActivity: draft.reviewUnusualActivity,
      approvalTtlMinutes,
      consent: { accountHolderAccepted: draft.consentAccepted },
      privacy: {
        voiceVerificationConsent: draft.voiceVerificationConsent,
        transcriptMode: draft.transcriptMode,
        transcriptRetentionDays:
          draft.transcriptMode === "none" ? 0 : transcriptRetentionDays,
        intelligenceFeedbackConsent: draft.intelligenceFeedbackConsent,
      },
    };

    setSavingSettings(true);
    try {
      const response = await fetch(`/api/family-guard/settings/${USER_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Protection settings could not be saved."),
        );
      }
      const saved = (await response.json()) as FamilyGuardSettings;
      setSettings(saved);
      setDraft(settingsToDraft(saved));
      setSettingsNotice({
        kind: "success",
        text: "Family Guard settings saved.",
      });
    } catch (error) {
      setSettingsNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Protection settings could not be saved.",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const beginEditContact = (contact: FamilyGuardTrustedContact) => {
    setEditingContactId(contact.id);
    setContactDraft({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
      role: contact.role,
      accepted: contact.status === "active",
    });
    setContactNotice(null);
  };

  const resetContactForm = () => {
    setEditingContactId(null);
    setContactDraft(EMPTY_CONTACT);
    setContactNotice(null);
  };

  const saveContact = async () => {
    setContactNotice(null);
    if (
      !contactDraft.name.trim() ||
      !contactDraft.relationship.trim() ||
      contactDraft.phone.replace(/\D/g, "").length < 8
    ) {
      setContactNotice({
        kind: "error",
        text: "Enter a name, relationship and valid trusted-contact phone number.",
      });
      return;
    }

    const payload: FamilyGuardContactInput = {
      ownerUserId: USER_ID,
      name: contactDraft.name,
      relationship: contactDraft.relationship,
      phone: contactDraft.phone,
      role: contactDraft.role,
      accepted: contactDraft.accepted,
    };
    const endpoint = editingContactId
      ? `/api/family-guard/contacts/${editingContactId}`
      : "/api/family-guard/contacts";

    setSavingContact(true);
    try {
      const response = await fetch(endpoint, {
        method: editingContactId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "The trusted contact could not be saved."),
        );
      }
      const saved = (await response.json()) as FamilyGuardTrustedContact;
      setContacts((current) => {
        const exists = current.some((contact) => contact.id === saved.id);
        return exists
          ? current.map((contact) => (contact.id === saved.id ? saved : contact))
          : [...current, saved];
      });
      setEditingContactId(saved.id);
      setContactDraft({
        name: saved.name,
        relationship: saved.relationship,
        phone: saved.phone,
        role: saved.role,
        accepted: saved.status === "active",
      });
      setContactNotice({
        kind: "success",
        text:
          saved.status === "active"
            ? `${saved.name} is active as a trusted contact.`
            : `${saved.name} is saved and awaiting acceptance.`,
      });
    } catch (error) {
      setContactNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "The trusted contact could not be saved.",
      });
    } finally {
      setSavingContact(false);
    }
  };

  const revokeContact = async (contact: FamilyGuardTrustedContact) => {
    const confirmed = window.confirm(
      `Remove ${contact.name} from future protected-transfer reviews? Existing audit records remain unchanged.`,
    );
    if (!confirmed) return;
    setContactNotice(null);
    try {
      const response = await fetch(`/api/family-guard/contacts/${contact.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "The trusted contact could not be removed."),
        );
      }
      const saved = (await response.json()) as FamilyGuardTrustedContact;
      setContacts((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
      if (editingContactId === saved.id) resetContactForm();
      setContactNotice({
        kind: "success",
        text: `${saved.name} will not receive future approval requests.`,
      });
    } catch (error) {
      setContactNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "The trusted contact could not be removed.",
      });
    }
  };

  return (
    <MaybankChrome
      hero={
        <div className="py-[clamp(18px,3vh,32px)]">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">
            Account-holder controlled
          </p>
          <h1 className="mb-h1 mt-1 text-white">Family Guard settings</h1>
          <p className="mb-sub mt-2 max-w-3xl text-white/80">
            Choose when a transfer pauses for a calm AI check and review by a
            trusted contact. The account holder remains informed and in control.
          </p>
        </div>
      }
    >
      <div className="mx-auto max-w-6xl py-6 sm:py-8">
        {loading ? (
          <LoadingCard />
        ) : loadError || !draft || !settings ? (
          <div className="rounded-2xl border border-[#f1c7c4] bg-[#fff5f4] p-5" role="alert">
            <h2 className="text-lg font-bold text-[#872f29]">Settings unavailable</h2>
            <p className="mt-2 text-sm leading-6 text-[#75514e]">
              {loadError || "Family Guard settings could not be loaded."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-[#dce6e7] bg-white p-5 shadow-[0_16px_36px_-28px_rgba(11,59,75,0.5)] sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#167164]">
                    Explicit consent
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-[#20242c]">
                    Two-step protection for important transfers
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#626a73]">
                    The account holder chooses the trusted contact, thresholds and
                    privacy options. A trusted contact reviews only transfers that
                    trigger these protections—not the account’s full history.
                  </p>
                </div>
                <Toggle
                  label="Family Guard"
                  checked={draft.enabled}
                  disabled={!draft.consentAccepted}
                  onChange={(enabled) => updateDraft("enabled", enabled)}
                />
              </div>

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[#cfe2df] bg-[#f1faf7] p-4">
                <input
                  type="checkbox"
                  checked={draft.consentAccepted}
                  onChange={(event) => {
                    const accepted = event.target.checked;
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            consentAccepted: accepted,
                            enabled: accepted ? current.enabled : false,
                          }
                        : current,
                    );
                    setSettingsNotice(null);
                  }}
                  className="mt-0.5 size-5 accent-[#168272]"
                />
                <span>
                  <span className="block text-sm font-bold text-[#23443f]">
                    I am the account holder and I consent to Family Guard.
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#5a746f]">
                    I understand that protected transfers may be paused and shared
                    with my chosen trusted contact for review. I can turn the feature
                    off later.
                  </span>
                </span>
              </label>
              {!draft.consentAccepted && (
                <p className="mt-2 text-xs text-[#8a641f]">
                  Consent is required before the protection switch can be enabled.
                </p>
              )}
              {settings.consent.acceptedAt && (
                <p className="mt-2 text-xs text-[#7a828a]">
                  Current consent recorded {formatDate(settings.consent.acceptedAt)}.
                </p>
              )}
            </section>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
              <div className="space-y-6">
                <Section
                  eyebrow="Protection rules"
                  title="Pause at the right moment"
                  description="Each threshold has a different purpose. Values are frozen with the exact recipient and amount when a review begins."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <MoneyField
                      label="Soft limit"
                      hint="Starts an AI safety conversation."
                      value={draft.softLimit}
                      onChange={(value) => updateDraft("softLimit", value)}
                    />
                    <MoneyField
                      label="Trusted-approval limit"
                      hint="Requires a trusted contact’s separate decision."
                      value={draft.guardianLimit}
                      onChange={(value) => updateDraft("guardianLimit", value)}
                    />
                    <MoneyField
                      label="Hard limit"
                      hint="Requires stronger bank review; it cannot be released here."
                      value={draft.hardLimit}
                      onChange={(value) => updateDraft("hardLimit", value)}
                    />
                    <NumberField
                      label="Daily transfer count"
                      hint="Review after this many transfers in one day."
                      value={draft.dailyFrequencyLimit}
                      onChange={(value) =>
                        updateDraft("dailyFrequencyLimit", value)
                      }
                    />
                    <MoneyField
                      label="Daily maximum"
                      hint="Cumulative protected amount per day."
                      value={draft.dailyMaxAmount}
                      onChange={(value) => updateDraft("dailyMaxAmount", value)}
                    />
                    <MoneyField
                      label="Monthly maximum"
                      hint="Cumulative protected amount per month."
                      value={draft.monthlyMaxAmount}
                      onChange={(value) => updateDraft("monthlyMaxAmount", value)}
                    />
                  </div>

                  <div className="mt-5 space-y-3 border-t border-[#edf0f1] pt-5">
                    <RuleToggle
                      title="Protect new recipients"
                      description="Pause when the account holder has not paid this recipient before."
                      checked={draft.protectNewRecipients}
                      onChange={(value) =>
                        updateDraft("protectNewRecipients", value)
                      }
                    />
                    <RuleToggle
                      title="Protect suspicious accounts"
                      description="Apply the evidence-aware suspicious-account policy. A report is not automatically proof of fraud."
                      checked={draft.protectSuspiciousAccounts}
                      onChange={(value) =>
                        updateDraft("protectSuspiciousAccounts", value)
                      }
                    />
                    <RuleToggle
                      title="Review unusual activity"
                      description="Pause when timing, frequency or amount differs from usual behaviour."
                      checked={draft.reviewUnusualActivity}
                      onChange={(value) =>
                        updateDraft("reviewUnusualActivity", value)
                      }
                    />
                  </div>
                </Section>

                <Section
                  eyebrow="Privacy"
                  title="Choose what is kept and learned"
                  description="These demo controls make voice, transcript and intelligence use visible to the account holder."
                >
                  <div className="rounded-xl border border-[#dce7ee] bg-[#f5f9fb] p-4">
                    <p className="text-sm font-bold text-[#274b5d]">
                      Protected-transfer-only disclosure
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#607681]">
                      Trusted contacts can see the exact amount, recipient, masked
                      account, risk explanation and outcome only for requests assigned
                      to them. Full transaction history is never shared.
                    </p>
                  </div>
                  <div className="mt-4 space-y-3">
                    <RuleToggle
                      title="Allow user-requested AI verification calls"
                      description="The call begins only from the protected transfer screen and never asks for a PIN, OTP, TAC or banking approval."
                      checked={draft.voiceVerificationConsent}
                      onChange={(value) =>
                        updateDraft("voiceVerificationConsent", value)
                      }
                    />
                    <RuleToggle
                      title="Contribute confirmed outcome signals"
                      description="Allow confirmed or reviewed case outcomes—not raw banking credentials—to improve the demo scam-intelligence network."
                      checked={draft.intelligenceFeedbackConsent}
                      onChange={(value) =>
                        updateDraft("intelligenceFeedbackConsent", value)
                      }
                    />
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Conversation record">
                      <select
                        value={draft.transcriptMode}
                        onChange={(event) => {
                          const mode = event.target.value as SettingsDraft["transcriptMode"];
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  transcriptMode: mode,
                                  transcriptRetentionDays:
                                    mode === "none"
                                      ? "0"
                                      : current.transcriptRetentionDays === "0"
                                        ? "1"
                                        : current.transcriptRetentionDays,
                                }
                              : current,
                          );
                          setSettingsNotice(null);
                        }}
                        className={inputClass}
                      >
                        <option value="none">Keep no transcript</option>
                        <option value="summary_only">Keep AI summary only</option>
                        <option value="redacted">Keep redacted transcript</option>
                      </select>
                    </Field>
                    <NumberField
                      label="Retention (days)"
                      hint="0–30 days. No transcript always uses 0."
                      value={draft.transcriptRetentionDays}
                      disabled={draft.transcriptMode === "none"}
                      min="0"
                      onChange={(value) =>
                        updateDraft("transcriptRetentionDays", value)
                      }
                    />
                  </div>
                </Section>
              </div>

              <div className="space-y-6">
                <Section
                  eyebrow="Account holder"
                  title="Contact and approval expiry"
                  description="This phone belongs to the account holder. It is separate from every trusted-contact number below."
                >
                  <div className="space-y-4">
                    <Field label="Account-holder phone">
                      <input
                        type="tel"
                        autoComplete="tel"
                        value={draft.accountHolderPhone}
                        onChange={(event) =>
                          updateDraft("accountHolderPhone", event.target.value)
                        }
                        placeholder="+60 12 345 6789"
                        className={inputClass}
                      />
                    </Field>
                    <NumberField
                      label="Approval expires after"
                      hint="1–60 minutes. If nobody decides, no money is sent."
                      value={draft.approvalTtlMinutes}
                      suffix="minutes"
                      onChange={(value) =>
                        updateDraft("approvalTtlMinutes", value)
                      }
                    />
                  </div>
                </Section>

                <Section
                  eyebrow="Trusted contacts"
                  title="People invited to review"
                  description="A primary or backup contact uses their own transaction-bound approval—not the account holder’s bank OTP."
                >
                  <div className="space-y-3">
                    {contacts.filter((contact) => contact.status !== "revoked").length ? (
                      contacts
                        .filter((contact) => contact.status !== "revoked")
                        .map((contact) => (
                          <div
                            key={contact.id}
                            className={`rounded-xl border p-3 ${
                              editingContactId === contact.id
                                ? "border-[#168272] bg-[#f2faf8]"
                                : "border-[#e4e8eb] bg-[#fafbfb]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[#273038]">
                                  {contact.name}
                                </p>
                                <p className="mt-0.5 text-xs text-[#707880]">
                                  {contact.relationship} · {contact.role} · {contact.phone}
                                </p>
                                <StatusPill status={contact.status} />
                              </div>
                              <div className="flex shrink-0 gap-2">
                                <button
                                  type="button"
                                  onClick={() => beginEditContact(contact)}
                                  className="rounded-lg border border-[#cfd7db] px-2.5 py-1.5 text-xs font-bold text-[#38505a] hover:bg-white"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void revokeContact(contact)}
                                  className="rounded-lg border border-[#efcfcc] px-2.5 py-1.5 text-xs font-bold text-[#9b3e37] hover:bg-[#fff5f4]"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="rounded-xl border border-dashed border-[#ced8dc] bg-[#fafbfb] p-4 text-sm leading-6 text-[#6b747b]">
                        No trusted contact is active yet. Add one below; protected
                        transfers cannot use trusted approval until a contact accepts.
                      </p>
                    )}
                  </div>

                  <div className="mt-5 border-t border-[#edf0f1] pt-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-bold text-[#273038]">
                        {editingContactId ? "Edit trusted contact" : "Add trusted contact"}
                      </h3>
                      {editingContactId && (
                        <button
                          type="button"
                          onClick={resetContactForm}
                          className="text-xs font-bold text-[#137266] underline-offset-2 hover:underline"
                        >
                          Add another
                        </button>
                      )}
                    </div>
                    <div className="mt-3 grid gap-3">
                      <Field label="Trusted-contact name">
                        <input
                          value={contactDraft.name}
                          onChange={(event) =>
                            setContactDraft((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                          autoComplete="name"
                          className={inputClass}
                          placeholder="Sarah Tan"
                        />
                      </Field>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                        <Field label="Relationship">
                          <input
                            value={contactDraft.relationship}
                            onChange={(event) =>
                              setContactDraft((current) => ({
                                ...current,
                                relationship: event.target.value,
                              }))
                            }
                            className={inputClass}
                            placeholder="Family member"
                          />
                        </Field>
                        <Field label="Role">
                          <select
                            value={contactDraft.role}
                            onChange={(event) =>
                              setContactDraft((current) => ({
                                ...current,
                                role: event.target.value as "primary" | "backup",
                              }))
                            }
                            className={inputClass}
                          >
                            <option value="primary">Primary</option>
                            <option value="backup">Backup</option>
                          </select>
                        </Field>
                      </div>
                      <Field label="Trusted-contact phone">
                        <input
                          type="tel"
                          autoComplete="tel"
                          value={contactDraft.phone}
                          onChange={(event) =>
                            setContactDraft((current) => ({
                              ...current,
                              phone: event.target.value,
                            }))
                          }
                          className={inputClass}
                          placeholder="+60 11 2345 6789"
                        />
                      </Field>
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e0e7e9] bg-[#fafcfc] p-3">
                        <input
                          type="checkbox"
                          checked={contactDraft.accepted}
                          onChange={(event) =>
                            setContactDraft((current) => ({
                              ...current,
                              accepted: event.target.checked,
                            }))
                          }
                          className="mt-0.5 size-4 accent-[#168272]"
                        />
                        <span>
                          <span className="block text-xs font-bold text-[#33454c]">
                            Invitation accepted
                          </span>
                          <span className="mt-0.5 block text-xs leading-5 text-[#6d787e]">
                            For this hackathon demo, mark this only after the trusted
                            contact has agreed to review protected transfers.
                          </span>
                        </span>
                      </label>
                    </div>
                    {contactNotice && <NoticeBox notice={contactNotice} />}
                    <button
                      type="button"
                      onClick={() => void saveContact()}
                      disabled={savingContact}
                      className="mt-4 w-full rounded-xl bg-[#0f6670] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0b555e] disabled:cursor-wait disabled:opacity-60"
                    >
                      {savingContact
                        ? "Saving…"
                        : editingContactId
                          ? "Save trusted contact"
                          : "Add trusted contact"}
                    </button>
                  </div>
                </Section>
              </div>
            </div>

            <section className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-[#d8e2e4] bg-white/95 p-4 shadow-[0_16px_45px_-20px_rgba(11,59,75,0.65)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[#253038]">
                  Save account-holder protection choices
                </p>
                <p className="mt-0.5 text-xs text-[#6e777e]">
                  Trusted-contact details are saved separately in their card above.
                </p>
                {settingsNotice && <NoticeBox notice={settingsNotice} compact />}
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <Link
                  href="/family-guard"
                  className="rounded-xl border border-[#cad6da] px-5 py-3 text-center text-sm font-bold text-[#34505a] hover:bg-[#f5f8f9]"
                >
                  Open review dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => void saveSettings()}
                  disabled={savingSettings}
                  className="rounded-xl bg-[#e59e24] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#d89016] disabled:cursor-wait disabled:opacity-60"
                >
                  {savingSettings ? "Saving…" : "Save protection settings"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </MaybankChrome>
  );
}

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#e1e6e8] bg-white p-5 shadow-[0_16px_36px_-30px_rgba(11,59,75,0.5)] sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#167164]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-bold text-[#20242c]">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-[#687178]">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-[#435058]">{label}</span>
      {children}
    </label>
  );
}

function MoneyField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-3 text-sm font-bold text-[#768087]">
          RM
        </span>
        <input
          type="number"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputClass} pl-11`}
        />
      </div>
      <span className="mt-1.5 block text-xs leading-5 text-[#7b8389]">{hint}</span>
    </Field>
  );
}

function NumberField({
  label,
  hint,
  value,
  onChange,
  suffix,
  disabled = false,
  min = "1",
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  disabled?: boolean;
  min?: string;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <input
          type="number"
          min={min}
          step="1"
          inputMode="numeric"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputClass} ${suffix ? "pr-20" : ""}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3.5 top-3 text-xs font-semibold text-[#7b8389]">
            {suffix}
          </span>
        )}
      </div>
      <span className="mt-1.5 block text-xs leading-5 text-[#7b8389]">{hint}</span>
    </Field>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-14 shrink-0 rounded-full transition ${
        checked ? "bg-[#168272]" : "bg-[#c9d0d3]"
      } disabled:cursor-not-allowed disabled:opacity-55`}
    >
      <span
        className={`absolute top-1 size-6 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-7" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function RuleToggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-[#e4e8ea] p-3.5">
      <div>
        <p className="text-sm font-bold text-[#354047]">{title}</p>
        <p className="mt-1 text-xs leading-5 text-[#6f787e]">{description}</p>
      </div>
      <Toggle label={title} checked={checked} onChange={onChange} />
    </div>
  );
}

function StatusPill({ status }: { status: FamilyGuardTrustedContact["status"] }) {
  const styles =
    status === "active"
      ? "bg-[#e3f4e9] text-[#237142]"
      : status === "pending"
        ? "bg-[#fff2d6] text-[#8c641b]"
        : "bg-[#edf0f2] text-[#687178]";
  return (
    <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${styles}`}>
      {status}
    </span>
  );
}

function NoticeBox({ notice, compact = false }: { notice: NonNullable<Notice>; compact?: boolean }) {
  return (
    <p
      role={notice.kind === "error" ? "alert" : "status"}
      className={`${compact ? "mt-1" : "mt-3 rounded-lg px-3 py-2"} text-xs font-semibold ${
        notice.kind === "error"
          ? compact
            ? "text-[#a13c34]"
            : "bg-[#fff1ef] text-[#a13c34]"
          : compact
            ? "text-[#227044]"
            : "bg-[#eaf7ee] text-[#227044]"
      }`}
    >
      {notice.text}
    </p>
  );
}

function LoadingCard() {
  return (
    <div className="rounded-2xl border border-[#e0e6e8] bg-white p-6" role="status">
      <div className="h-4 w-32 animate-pulse rounded bg-[#e7ecee]" />
      <div className="mt-3 h-7 w-72 max-w-full animate-pulse rounded bg-[#eef1f2]" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="h-36 animate-pulse rounded-xl bg-[#f1f3f4]" />
        <div className="h-36 animate-pulse rounded-xl bg-[#f1f3f4]" />
      </div>
      <span className="sr-only">Loading Family Guard settings</span>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
