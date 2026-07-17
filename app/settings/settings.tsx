"use client";

import { useState } from "react";
import { MaybankChrome } from "../components/maybank/MaybankChrome";

export default function SettingsPage() {
  // Basic banking settings
  const [biometric, setBiometric] = useState(true);
  const [twoFA, setTwoFA] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [emailStatements, setEmailStatements] = useState(true);
  const [promos, setPromos] = useState(false);
  const [language, setLanguage] = useState("English");
  const [defaultAccount, setDefaultAccount] = useState("Personal Account (Savings)");

  // Parental control
  const [parentalOn, setParentalOn] = useState(false);
  const [txnLimit, setTxnLimit] = useState("1,000.00");
  const [dailyFreq, setDailyFreq] = useState("5");
  const [monthlyMax, setMonthlyMax] = useState("10,000.00");
  const [smsPhone, setSmsPhone] = useState("");
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <MaybankChrome
      hero={
        <div className="pt-[clamp(14px,2.4vh,24px)] pb-[clamp(18px,2.8vh,30px)]">
          <h1 className="mb-h1 text-[#1e2129]">Settings</h1>
          <p className="mb-sub mt-[clamp(4px,1vh,8px)] text-[#5a4a1c]">
            Manage your security, notifications and account controls.
          </p>
        </div>
      }
    >
      <div className="flex h-full flex-col pt-[clamp(14px,2.4vh,22px)]">
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-[clamp(16px,2.2vw,26px)]">
          {/* ── Left column ── */}
          <div className="flex min-h-0 flex-col gap-[clamp(14px,2.2vh,20px)] overflow-hidden">
            <Card
              title="Security & Login"
              tint="bg-[#e7f0fd]"
              color="#1d6fe0"
              icon={
                <path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6l-7-3Z" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinejoin="round" />
              }
            >
              <div className="divide-y divide-[#eef0f3]">
                <ToggleRow title="Biometric login" desc="Use Face ID or fingerprint to sign in" on={biometric} onChange={setBiometric} />
                <ToggleRow title="Two-factor authentication" desc="Secure logins with a one-time TAC" on={twoFA} onChange={setTwoFA} />
                <ToggleRow title="Login alerts" desc="Notify me of new device sign-ins" on={loginAlerts} onChange={setLoginAlerts} />
              </div>
            </Card>

            <Card
              title="Preferences"
              tint="bg-[#efe9fe]"
              color="#6d3fd4"
              icon={
                <>
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round" />
                  <circle cx="9" cy="7" r="2.2" fill="currentColor" />
                  <circle cx="15" cy="12" r="2.2" fill="currentColor" />
                  <circle cx="8" cy="17" r="2.2" fill="currentColor" />
                </>
              }
            >
              <div className="space-y-[clamp(10px,1.8vh,14px)]">
                <FieldRow label="Language">
                  <Select value={language} onChange={setLanguage} options={["English", "Bahasa Malaysia", "中文"]} />
                </FieldRow>
                <FieldRow label="Default account">
                  <Select
                    value={defaultAccount}
                    onChange={setDefaultAccount}
                    options={["Personal Account (Savings)", "Current Account"]}
                  />
                </FieldRow>
              </div>
            </Card>
          </div>

          {/* ── Right column ── */}
          <div className="flex min-h-0 flex-col gap-[clamp(14px,2.2vh,20px)] overflow-hidden">
            <Card
              title="Notifications"
              tint="bg-[#e4f6e9]"
              color="#1f9d55"
              icon={
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10.5 20a2 2 0 0 0 3 0" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              }
            >
              <div className="divide-y divide-[#eef0f3]">
                <ToggleRow title="Transaction alerts" desc="Push notification for every transaction" on={pushAlerts} onChange={setPushAlerts} />
                <ToggleRow title="e-Statements" desc="Email me monthly account statements" on={emailStatements} onChange={setEmailStatements} />
                <ToggleRow title="Promotional offers" desc="Deals, rewards and product news" on={promos} onChange={setPromos} />
              </div>
            </Card>

            {/* Parental control */}
            <Card
              title="Parental Control"
              tint="bg-[#fdeee0]"
              color="#d9730d"
              icon={
                <>
                  <path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6l-7-3Z" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="m9 12 2 2 4-4" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </>
              }
              action={<Switch on={parentalOn} onChange={setParentalOn} />}
            >
              {parentalOn ? (
                <div>
                  <p className="mb-small text-[#8b9099]">
                    Limits apply to this account. Alerts are sent to the guardian&apos;s number below.
                  </p>

                  <div className="mt-[clamp(12px,2vh,16px)] grid grid-cols-2 gap-[clamp(12px,1.5vw,16px)]">
                    <FieldRow label="Transaction limit">
                      <AmountInput value={txnLimit} onChange={setTxnLimit} placeholder="1,000.00" />
                    </FieldRow>
                    <FieldRow label="Daily frequency limit">
                      <SuffixInput value={dailyFreq} onChange={setDailyFreq} suffix="/ day" placeholder="5" numeric />
                    </FieldRow>
                    <FieldRow label="Monthly max amount">
                      <AmountInput value={monthlyMax} onChange={setMonthlyMax} placeholder="10,000.00" />
                    </FieldRow>
                    <FieldRow label="SMS notification (phone)">
                      <PlainInput value={smsPhone} onChange={setSmsPhone} placeholder="+60 12-345 6789" />
                    </FieldRow>
                  </div>

                  <div className="mt-[clamp(14px,2.2vh,18px)] flex items-center justify-end gap-[14px]">
                    {saved && <span className="mb-small font-semibold text-[#22a03f]">Saved ✓</span>}
                    <button
                      onClick={save}
                      className="mb-body rounded-[8px] bg-[#efab30] px-[clamp(20px,2.4vw,28px)] py-[clamp(9px,1.6vh,12px)] font-bold text-white shadow-[0_10px_22px_-10px_rgba(239,171,48,0.95)] transition-colors hover:bg-[#e59f20]"
                    >
                      Save limits
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mb-small text-[#8b9099]">
                  Turn on parental control to set spending limits and guardian SMS alerts for this account.
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </MaybankChrome>
  );
}

/* ── Building blocks ─────────────────────────────────────────────────── */

function Card({
  title,
  icon,
  tint,
  color,
  action,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  tint: string;
  color: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-[#edeff2] bg-white p-[clamp(16px,2.4vh,22px)] shadow-[0_8px_28px_-18px_rgba(20,26,58,0.28)]">
      <div className="flex items-center justify-between gap-[12px]">
        <div className="flex items-center gap-[10px]">
          <span className={`grid h-[clamp(30px,4.2vh,36px)] w-[clamp(30px,4.2vh,36px)] place-items-center rounded-[10px] ${tint}`} style={{ color }}>
            <svg viewBox="0 0 24 24" className="h-[clamp(17px,2.5vh,20px)] w-[clamp(17px,2.5vh,20px)]">
              {icon}
            </svg>
          </span>
          <p className="mb-title text-[#1e2129]">{title}</p>
        </div>
        {action}
      </div>
      <div className="mt-[clamp(8px,1.4vh,12px)]">{children}</div>
    </div>
  );
}

function ToggleRow({
  title,
  desc,
  on,
  onChange,
}: {
  title: string;
  desc: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-[16px] py-[clamp(8px,1.5vh,12px)]">
      <div className="min-w-0">
        <p className="mb-body font-semibold text-[#1e2129]">{title}</p>
        <p className="mb-small text-[#8b9099]">{desc}</p>
      </div>
      <Switch on={on} onChange={onChange} />
    </div>
  );
}

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors ${on ? "bg-[#22a03f]" : "bg-[#d4d8de]"}`}
    >
      <span
        className={`absolute top-[3px] h-[20px] w-[20px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-all duration-200 ${
          on ? "left-[23px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-small mb-[6px] block font-semibold text-[#3a3f48]">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "mb-body w-full rounded-[8px] border border-[#e2e5ea] bg-white px-[14px] py-[clamp(9px,1.6vh,12px)] text-[#20242c] outline-none transition-colors placeholder:text-[#b4b9c1] focus:border-[#efab30]";

function PlainInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />;
}

function AmountInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="mb-body pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 font-semibold text-[#8b9099]">RM</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode="decimal"
        className={`${inputCls} pl-[44px] font-semibold`}
      />
    </div>
  );
}

function SuffixInput({
  value,
  onChange,
  suffix,
  placeholder,
  numeric,
}: {
  value: string;
  onChange: (v: string) => void;
  suffix: string;
  placeholder?: string;
  numeric?: boolean;
}) {
  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(numeric ? e.target.value.replace(/[^0-9]/g, "") : e.target.value)}
        placeholder={placeholder}
        inputMode={numeric ? "numeric" : "text"}
        className={`${inputCls} pr-[54px] font-semibold`}
      />
      <span className="mb-small pointer-events-none absolute right-[14px] top-1/2 -translate-y-1/2 font-medium text-[#8b9099]">{suffix}</span>
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} appearance-none pr-[40px]`}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-[14px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-[#20242c]" fill="none">
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
