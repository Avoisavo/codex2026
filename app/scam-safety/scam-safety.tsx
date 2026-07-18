"use client";

import { useState } from "react";

import { MaybankChrome } from "../components/maybank/MaybankChrome";

type TopicId =
  | "messages"
  | "calls"
  | "social"
  | "marketplaces"
  | "jobs"
  | "apps";

type QuizOption = {
  id: string;
  label: string;
};

type SafetyTopic = {
  id: TopicId;
  title: string;
  example: string;
  warnings: readonly [string, string, string];
  safeAction: string;
  question: string;
  options: readonly [QuizOption, QuizOption];
  correctOption: string;
  explanation: string;
};

const TOPICS: readonly SafetyTopic[] = [
  {
    id: "messages",
    title: "WhatsApp and SMS",
    example:
      "A relative messages from a new number and says they urgently need RM800.",
    warnings: [
      "A new or unfamiliar number",
      "Pressure to transfer before you can call back",
      "Requests for money, codes or banking details",
    ],
    safeAction:
      "Call the person using a number already saved in your contacts. Do not rely on the number in the new message.",
    question:
      "A “relative” on a new number asks for money now. What should you do first?",
    options: [
      { id: "verify", label: "Call their saved number" },
      { id: "send", label: "Send a smaller amount first" },
    ],
    correctOption: "verify",
    explanation:
      "Verify through a contact method you already trust before making any payment.",
  },
  {
    id: "calls",
    title: "Phone calls",
    example:
      "A caller claims to be an official and demands an immediate transfer to keep your account safe.",
    warnings: [
      "Threats, fear or authority pressure",
      "Instructions not to end the call or speak to anyone",
      "Requests for a password, PIN, TAC or OTP",
    ],
    safeAction:
      "End the call. Contact the organisation using the number in its official app, website or on the back of your bank card.",
    question:
      "The caller says you must stay on the line while transferring. What is the safer response?",
    options: [
      { id: "hang-up", label: "End the call and verify independently" },
      { id: "comply", label: "Stay connected so the case is not delayed" },
    ],
    correctOption: "hang-up",
    explanation:
      "Ending the incoming call lets you choose an official contact channel yourself.",
  },
  {
    id: "social",
    title: "Social media",
    example:
      "A sponsored post promises guaranteed investment profits, but only if you join a private chat today.",
    warnings: [
      "Guaranteed or unusually fast returns",
      "A limited-time opportunity designed to rush you",
      "A request to move into a private chat and pay a deposit",
    ],
    safeAction:
      "Pause and verify the person, company and investment through official sources you find independently.",
    question:
      "Which phrase is the clearest reason to pause before investing?",
    options: [
      { id: "guaranteed", label: "“Guaranteed profit by Friday”" },
      { id: "risk", label: "“Returns can rise or fall”" },
    ],
    correctOption: "guaranteed",
    explanation:
      "Guaranteed-profit language and urgency are strong warning signs, not proof of a legitimate opportunity.",
  },
  {
    id: "marketplaces",
    title: "Online marketplaces",
    example:
      "A seller asks you to leave the platform, pay a personal account and install a courier app from a link.",
    warnings: [
      "Payment is moved outside the marketplace",
      "The recipient name does not match the seller",
      "An unexpected link or APK must be installed",
    ],
    safeAction:
      "Keep messages and payment inside the platform. Verify the seller and never install an app sent through chat.",
    question:
      "The seller offers a discount for direct bank transfer. Which option is safer?",
    options: [
      { id: "platform", label: "Use the platform’s protected checkout" },
      { id: "direct", label: "Transfer directly to secure the discount" },
    ],
    correctOption: "platform",
    explanation:
      "Keeping the request inside the platform gives you one place to review the seller, messages and payment route.",
  },
  {
    id: "jobs",
    title: "Job offers",
    example:
      "An unsolicited WhatsApp job offers high commission for simple “like” tasks, then asks you to top up first.",
    warnings: [
      "An unsolicited offer through WhatsApp or Telegram",
      "High pay for unusually simple tasks",
      "A fee, deposit or top-up before you can earn",
    ],
    safeAction:
      "Verify the employer using independently found details. Do not pay money to begin or unlock a job.",
    question:
      "A recruiter asks for RM200 to unlock higher-paid tasks. What should you do?",
    options: [
      { id: "stop", label: "Stop and verify the employer independently" },
      { id: "top-up", label: "Pay once to test whether withdrawals work" },
    ],
    correctOption: "stop",
    explanation:
      "PDRM warns that task-job scams may combine easy-work promises with requests for upfront payments.",
  },
  {
    id: "apps",
    title: "Fake apps and websites",
    example:
      "A message says to install an APK or sign in through a link so a payment can be released.",
    warnings: [
      "An app arrives as a chat attachment or download link",
      "Requests for powerful permissions, screen sharing or banking access",
      "A copied logo paired with an unusual web address",
    ],
    safeAction:
      "Use the official app store or type the organisation’s known address yourself. Do not install the file or share your screen.",
    question:
      "A support agent sends an APK through chat. What is the safer choice?",
    options: [
      { id: "official", label: "Use the official app store instead" },
      { id: "install", label: "Install it after checking the logo" },
    ],
    correctOption: "official",
    explanation:
      "A convincing name or logo does not make an app attachment safe. Use an official distribution channel.",
  },
];

const TOPIC_STYLE: Record<
  TopicId,
  { badge: string; icon: string; border: string }
> = {
  messages: {
    badge: "bg-[#e5f5f0] text-[#0f6b63]",
    icon: "bg-[#d9f3eb] text-[#0f766e]",
    border: "border-t-[#1f9d86]",
  },
  calls: {
    badge: "bg-[#e8effd] text-[#2f5fa9]",
    icon: "bg-[#e1eafd] text-[#356dc3]",
    border: "border-t-[#4d7fd0]",
  },
  social: {
    badge: "bg-[#f1eafe] text-[#7446ad]",
    icon: "bg-[#eee5fd] text-[#7948b4]",
    border: "border-t-[#8a5cc2]",
  },
  marketplaces: {
    badge: "bg-[#fff3df] text-[#9a6514]",
    icon: "bg-[#ffefd2] text-[#aa6e13]",
    border: "border-t-[#d6932c]",
  },
  jobs: {
    badge: "bg-[#fdebea] text-[#a84742]",
    icon: "bg-[#fae3e1] text-[#b54b45]",
    border: "border-t-[#c9625b]",
  },
  apps: {
    badge: "bg-[#e8edf4] text-[#475569]",
    icon: "bg-[#e1e7ef] text-[#475569]",
    border: "border-t-[#64748b]",
  },
};

const NSRC_URL = "https://nfcc.jpm.gov.my/index.php/en/about-nsrc";
const SEMAK_MULE_URL = "https://semakmule.rmp.gov.my/";
const SEMAK_GUIDANCE_URL =
  "https://www.rmp.gov.my/news-detail/2026/06/04/posting-pilihan-scam-alert-semak-dulu-baru-transfer";
const PDRM_ALERTS_URL = "https://www.rmp.gov.my/scam-alert/2025/10";
const PDRM_JOB_URL =
  "https://www.rmp.gov.my/news-detail/2026/01/27/besmartstayalert-letsfightscammertogether-posting-pilihan-scam-alert-statistik-kes-penipuan-tawaran-pekerjaan-sambilan";
const PDRM_APP_URL =
  "https://www.rmp.gov.my/news-detail/2025/10/29/posting-pilihan-waspada-penipuan-ambil-alih-akaun-aplikasi-komunikasi-dan-pinjam-duit";
const MALWARE_GUIDANCE_URL =
  "https://www.maybank2u.com.my/maybank2u/malaysia/en/personal/security-enhancement/malware-shielding.page";

export default function ScamSafetyPage() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answeredCount = Object.keys(answers).length;

  return (
    <MaybankChrome
      hero={
        <div className="pb-[clamp(18px,3vh,30px)] pt-[clamp(14px,2.4vh,24px)]">
          <p className="mb-xs font-bold uppercase tracking-[0.16em]">
            Pause · Understand · Verify
          </p>
          <h1 className="mb-h1 mt-[6px]">Scam Safety</h1>
          <p className="mb-sub mt-[clamp(5px,1vh,9px)]">
            Six quick lessons to help you recognise pressure before money leaves
            your account.
          </p>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-[1500px] space-y-[clamp(16px,2.4vh,24px)] py-[clamp(16px,2.6vh,26px)]">
        <EmergencyBanner />

        <section
          aria-labelledby="safety-intro-title"
          className="grid gap-[14px] rounded-[16px] border border-[#dce7e5] bg-[#f7fbfa] p-[clamp(16px,2.4vw,24px)] shadow-[0_12px_34px_-24px_rgba(15,77,72,0.45)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
        >
          <div>
            <p className="mb-xs font-bold uppercase tracking-[0.12em] text-[#0f766e]">
              Learn in the moment
            </p>
            <h2 id="safety-intro-title" className="mb-title mt-[5px] text-[#17252b]">
              Warning signs are reasons to pause—not proof of fraud.
            </h2>
            <p className="mb-body mt-[7px] max-w-[850px] leading-relaxed text-[#5c6870]">
              Read one example, notice the three signals, then try the short
              question. PDRM&apos;s Semak Mule can check bank-account and phone-number
              reports before you pay; no record is not a guarantee of safety.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-[10px] lg:justify-end">
            <a
              href={SEMAK_MULE_URL}
              target="_blank"
              rel="noreferrer"
              className="mb-body inline-flex min-h-11 items-center justify-center gap-[8px] rounded-[10px] bg-[#0f766e] px-[16px] py-[10px] font-bold text-white transition-colors hover:bg-[#0b625b]"
            >
              Open official Semak Mule
              <ExternalIcon />
            </a>
            {answeredCount > 0 ? (
              <button
                type="button"
                onClick={() => setAnswers({})}
                className="mb-body min-h-11 rounded-[10px] border border-[#cfdad8] bg-white px-[16px] py-[10px] font-semibold text-[#3f4b52] hover:bg-[#f1f6f5]"
              >
                Reset {answeredCount} {answeredCount === 1 ? "answer" : "answers"}
              </button>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="topics-title">
          <div className="mb-[12px] flex flex-wrap items-end justify-between gap-[8px]">
            <div>
              <p className="mb-xs font-bold uppercase tracking-[0.12em] text-[#0f766e]">
                Six places scams can begin
              </p>
              <h2 id="topics-title" className="mb-title mt-[4px] text-[#17252b]">
                Pick any card and practise the safer next step
              </h2>
            </div>
            <p className="mb-small text-[#6b767d]">
              {answeredCount} of {TOPICS.length} questions answered
            </p>
          </div>

          <div className="grid gap-[clamp(14px,2vw,20px)] md:grid-cols-2 2xl:grid-cols-3">
            {TOPICS.map((topic, index) => (
              <SafetyCard
                key={topic.id}
                topic={topic}
                index={index}
                selected={answers[topic.id]}
                onAnswer={(answer) =>
                  setAnswers((current) => ({ ...current, [topic.id]: answer }))
                }
              />
            ))}
          </div>
        </section>

        <OfficialSources />
      </div>
    </MaybankChrome>
  );
}

function EmergencyBanner() {
  return (
    <section
      aria-labelledby="urgent-help-title"
      className="overflow-hidden rounded-[16px] border border-[#f3c9c5] bg-[#fff5f4] shadow-[0_14px_34px_-26px_rgba(145,45,39,0.55)]"
    >
      <div className="grid gap-[16px] p-[clamp(16px,2.5vw,26px)] lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
        <span className="grid h-[46px] w-[46px] place-items-center rounded-[13px] bg-[#b94f47] text-white" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-[24px] w-[24px]" fill="none">
            <path d="M12 8v5m0 3h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <p className="mb-xs font-bold uppercase tracking-[0.12em] text-[#a03f38]">
            Money already sent?
          </p>
          <h2 id="urgent-help-title" className="mb-title mt-[4px] text-[#512a27]">
            Contact your bank immediately, then call NSRC 997.
          </h2>
          <p className="mb-small mt-[6px] max-w-[920px] leading-relaxed text-[#79534f]">
            The NFCC lists 997 as available from 8:00 am to 8:00 pm every day,
            including public holidays. Outside those hours, call your bank&apos;s
            24-hour fraud hotline. Fast action may reduce losses, but recovery is
            not guaranteed.
          </p>
        </div>
        <div className="flex flex-wrap gap-[10px] lg:justify-end">
          <a
            href="tel:997"
            className="mb-body inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#a9443d] px-[18px] py-[10px] font-extrabold text-white hover:bg-[#913a34]"
          >
            Call 997
          </a>
          <a
            href={NSRC_URL}
            target="_blank"
            rel="noreferrer"
            className="mb-body inline-flex min-h-11 items-center justify-center gap-[7px] rounded-[10px] border border-[#d9a7a2] bg-white px-[16px] py-[10px] font-bold text-[#843b35] hover:bg-[#fffafa]"
          >
            Official NSRC guidance
            <ExternalIcon />
          </a>
        </div>
      </div>
    </section>
  );
}

function SafetyCard({
  topic,
  index,
  selected,
  onAnswer,
}: {
  topic: SafetyTopic;
  index: number;
  selected?: string;
  onAnswer: (answer: string) => void;
}) {
  const style = TOPIC_STYLE[topic.id];
  const answered = selected !== undefined;
  const correct = selected === topic.correctOption;

  return (
    <article
      className={`flex min-w-0 flex-col rounded-[14px] border border-[#e2e7e9] border-t-[4px] ${style.border} bg-white p-[clamp(16px,2vw,22px)] shadow-[0_12px_34px_-24px_rgba(24,39,50,0.42)]`}
    >
      <div className="flex items-start justify-between gap-[12px]">
        <div className="flex min-w-0 items-center gap-[10px]">
          <span className={`grid h-[40px] w-[40px] shrink-0 place-items-center rounded-[12px] ${style.icon}`}>
            <TopicIcon topic={topic.id} />
          </span>
          <div className="min-w-0">
            <p className="mb-xs font-bold uppercase tracking-[0.11em] text-[#89939a]">
              Lesson {String(index + 1).padStart(2, "0")}
            </p>
            <h3 className="mb-title truncate text-[#19252c]">{topic.title}</h3>
          </div>
        </div>
        <span className={`mb-xs shrink-0 rounded-full px-[9px] py-[4px] font-bold ${style.badge}`}>
          15-sec check
        </span>
      </div>

      <div className="mt-[14px] rounded-[10px] bg-[#f7f8fa] p-[13px]">
        <p className="mb-xs font-bold uppercase tracking-[0.1em] text-[#77828a]">
          Example
        </p>
        <p className="mb-body mt-[5px] leading-relaxed text-[#354149]">{topic.example}</p>
      </div>

      <div className="mt-[14px]">
        <p className="mb-small font-bold text-[#263239]">Three warning signs</p>
        <ul className="mt-[8px] space-y-[7px]">
          {topic.warnings.map((warning) => (
            <li key={warning} className="mb-small flex items-start gap-[8px] leading-relaxed text-[#59656d]">
              <span className="mt-[0.48em] h-[6px] w-[6px] shrink-0 rounded-full bg-[#cc655d]" aria-hidden="true" />
              {warning}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-[14px] rounded-[10px] border border-[#cfe7df] bg-[#f0faf7] p-[13px]">
        <p className="mb-xs font-bold uppercase tracking-[0.1em] text-[#167161]">Safer action</p>
        <p className="mb-small mt-[5px] leading-relaxed text-[#3f625c]">{topic.safeAction}</p>
      </div>

      <fieldset className="mt-[16px] border-t border-[#e9edef] pt-[14px]">
        <legend className="mb-xs rounded-full bg-[#edf1f4] px-[9px] py-[4px] font-bold uppercase tracking-[0.1em] text-[#66727a]">
          Spot the scam · about 15 seconds
        </legend>
        <p className="mb-small mt-[9px] font-semibold leading-relaxed text-[#263239]">
          {topic.question}
        </p>
        <div className="mt-[10px] grid gap-[8px] sm:grid-cols-2">
          {topic.options.map((option) => {
            const isSelected = selected === option.id;
            const optionCorrect = option.id === topic.correctOption;
            const answerStyle = isSelected
              ? optionCorrect
                ? "border-[#2a907b] bg-[#e7f6f1] text-[#145f53]"
                : "border-[#c76760] bg-[#fff0ef] text-[#8c3d38]"
              : "border-[#dce2e5] bg-white text-[#4b565d] hover:border-[#92aaa4] hover:bg-[#f8fbfa]";

            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onAnswer(option.id)}
                className={`mb-small min-h-11 rounded-[9px] border px-[11px] py-[9px] text-left font-semibold transition-colors ${answerStyle}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div
          role="status"
          aria-live="polite"
          className={`mb-small mt-[9px] min-h-[44px] rounded-[9px] px-[11px] py-[9px] leading-relaxed ${
            answered
              ? correct
                ? "bg-[#edf8f4] text-[#28685c]"
                : "bg-[#fff3f2] text-[#874943]"
              : "border border-dashed border-[#dce2e5] text-[#8a949a]"
          }`}
        >
          {answered
            ? `${correct ? "Good pause. " : "Try the safer pause. "}${topic.explanation}`
            : "Choose one response to reveal the safer next step."}
        </div>
      </fieldset>
    </article>
  );
}

function OfficialSources() {
  return (
    <section
      aria-labelledby="sources-title"
      className="rounded-[14px] border border-[#dfe5e7] bg-[#f7f8fa] p-[clamp(16px,2.4vw,24px)]"
    >
      <h2 id="sources-title" className="mb-lg font-bold text-[#263239]">
        Official safety resources
      </h2>
      <p className="mb-small mt-[5px] max-w-[1000px] leading-relaxed text-[#68737a]">
        These examples summarise warning patterns—not accusations or fraud
        verdicts. Resource details and NSRC hours were checked against the
        linked official pages on 18 July 2026.
      </p>
      <ol className="mt-[12px] grid gap-[9px] lg:grid-cols-2">
        <SourceLink
          number="1"
          href={NSRC_URL}
          label="NFCC: National Scam Response Centre FAQ and urgent reporting steps"
        />
        <SourceLink
          number="2"
          href={SEMAK_GUIDANCE_URL}
          label="PDRM: Check first with Semak Mule before transferring"
        />
        <SourceLink
          number="3"
          href={PDRM_ALERTS_URL}
          label="PDRM: Scam Alert archive on messaging, investments and emotional pressure"
        />
        <SourceLink
          number="4"
          href={PDRM_JOB_URL}
          label="PDRM: Warning signs in part-time job offers"
        />
        <SourceLink
          number="5"
          href={PDRM_APP_URL}
          label="PDRM: Communication-account takeover, links and APK warnings"
        />
        <SourceLink
          number="6"
          href={MALWARE_GUIDANCE_URL}
          label="Bank security guidance: malware and risky device permissions"
        />
        <SourceLink
          number="7"
          href={SEMAK_MULE_URL}
          label="PDRM: Official Semak Mule portal"
        />
      </ol>
      <p className="mb-xs mt-[14px] border-t border-[#e0e5e7] pt-[12px] text-[#7b858b]">
        NusaSafe Bank is fictional. This educational prototype is not operated
        by, affiliated with or endorsed by the linked organisations or
        authorities.
      </p>
    </section>
  );
}

function SourceLink({
  number,
  href,
  label,
}: {
  number: string;
  href: string;
  label: string;
}) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="mb-small flex min-h-11 items-center gap-[9px] rounded-[9px] border border-[#e0e5e7] bg-white px-[12px] py-[9px] font-semibold leading-relaxed text-[#405159] transition-colors hover:border-[#9bbab2] hover:bg-[#f5fbf9]"
      >
        <span className="grid h-[24px] w-[24px] shrink-0 place-items-center rounded-full bg-[#e5f5f0] text-[11px] font-bold text-[#0f6b63]">
          {number}
        </span>
        <span className="min-w-0 flex-1">{label}</span>
        <ExternalIcon />
      </a>
    </li>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[14px] w-[14px] shrink-0" fill="none" aria-hidden="true">
      <path d="M14 5h5v5m0-5-8 8M19 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TopicIcon({ topic }: { topic: TopicId }) {
  const paths: Record<TopicId, React.ReactNode> = {
    messages: (
      <path d="M5 5h14v11H9l-4 3V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    ),
    calls: (
      <path d="M7 4h3l1 4-2 1.5a13 13 0 0 0 5.5 5.5l1.5-2 4 1v3c0 1.1-.9 2-2 2C10.8 19 5 13.2 5 6c0-1.1.9-2 2-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    ),
    social: (
      <>
        <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.8 19c.8-3.4 2.5-5 5.2-5s4.4 1.6 5.2 5M15 8h5m-2.5-2.5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
    marketplaces: (
      <>
        <path d="M5 9h14l-1 11H6L5 9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 10V7a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
    jobs: (
      <>
        <rect x="4" y="7" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 7V5h6v2m-11 5h16M10 12v2h4v-2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </>
    ),
    apps: (
      <>
        <rect x="7" y="3" width="10" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10 7h4m-3 10h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" aria-hidden="true">
      {paths[topic]}
    </svg>
  );
}
