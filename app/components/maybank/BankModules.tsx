"use client";

import Link from "next/link";

/* ────────────────────────────────────────────────────────────────────────
   Quick actions — common account tasks and a direct route to scam education.
   ──────────────────────────────────────────────────────────────────────── */

type Action = {
  label: string;
  href: string;
  tint: string;
  color: string;
  icon: React.ReactNode;
};

const stroke = { fill: "none", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const ACTIONS: Action[] = [
  {
    label: "Transfer",
    href: "/transfer",
    tint: "bg-[#e7f0fd]",
    color: "#1d6fe0",
    icon: (
      <path d="M7 7h11m0 0-3-3m3 3-3 3M17 17H6m0 0 3-3m-3 3 3 3" stroke="currentColor" {...stroke} />
    ),
  },
  {
    label: "Pay Bills",
    href: "#",
    tint: "bg-[#efe9fe]",
    color: "#6d3fd4",
    icon: (
      <>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" stroke="currentColor" {...stroke} />
        <path d="M9 8h6M9 12h6" stroke="currentColor" {...stroke} />
      </>
    ),
  },
  {
    label: "Reload",
    href: "#",
    tint: "bg-[#fdf0d9]",
    color: "#d1901a",
    icon: (
      <>
        <path d="M21 12a9 9 0 1 1-3-6.7" stroke="currentColor" {...stroke} />
        <path d="M21 4v4h-4" stroke="currentColor" {...stroke} />
      </>
    ),
  },
  {
    label: "DuitNow QR",
    href: "#",
    tint: "bg-[#fde7ef]",
    color: "#d6336c",
    icon: (
      <>
        <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" stroke="currentColor" {...stroke} />
        <path d="M14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18h2" stroke="currentColor" {...stroke} />
      </>
    ),
  },
  {
    label: "Top-up",
    href: "#",
    tint: "bg-[#e4f6e9]",
    color: "#1f9d55",
    icon: (
      <>
        <rect x="7" y="3" width="10" height="18" rx="2.5" stroke="currentColor" {...stroke} />
        <path d="M12 7v6m-3-3h6" stroke="currentColor" {...stroke} />
      </>
    ),
  },
  {
    label: "e-Statement",
    href: "#",
    tint: "bg-[#eef1f6]",
    color: "#52606d",
    icon: (
      <>
        <path d="M6 3h8l4 4v14H6z" stroke="currentColor" {...stroke} />
        <path d="M14 3v4h4M9 12h6M9 16h6" stroke="currentColor" {...stroke} />
      </>
    ),
  },
  {
    label: "Fixed Deposit",
    href: "#",
    tint: "bg-[#fdeee0]",
    color: "#d9730d",
    icon: (
      <>
        <path d="M3 10 12 4l9 6" stroke="currentColor" {...stroke} />
        <path d="M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18" stroke="currentColor" {...stroke} />
      </>
    ),
  },
  {
    label: "Scam Safety",
    href: "/scam-safety",
    tint: "bg-[#dff6ef]",
    color: "#0f766e",
    icon: (
      <>
        <path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6l-7-3Z" stroke="currentColor" {...stroke} />
        <path d="M12 8v5m0 3h.01" stroke="currentColor" {...stroke} />
      </>
    ),
  },
];

export function QuickActions() {
  return (
    <div className="rounded-[12px] border border-[#edeff2] bg-white p-[clamp(14px,2.2vh,20px)] shadow-[0_8px_28px_-18px_rgba(20,26,58,0.28)]">
      <p className="mb-lg font-bold text-[#1e2129]">Quick actions</p>
      <div className="mt-[clamp(10px,1.8vh,14px)] grid grid-cols-4 gap-y-[clamp(10px,1.8vh,16px)]">
        {ACTIONS.map((a) => (
          <Link key={a.label} href={a.href} className="group flex flex-col items-center gap-[clamp(5px,1vh,8px)]">
            <span
              className={`grid place-items-center rounded-[15px] ${a.tint} h-[clamp(38px,5.6vh,52px)] w-[clamp(38px,5.6vh,52px)] transition-transform group-hover:-translate-y-[2px]`}
              style={{ color: a.color }}
            >
              <svg viewBox="0 0 24 24" className="h-[clamp(20px,3vh,26px)] w-[clamp(20px,3vh,26px)]">
                {a.icon}
              </svg>
            </span>
            <span className="mb-xs text-center font-medium text-[#3a3f48]">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Debit card visual — premium card mock, the hero object neobanks show.
   ──────────────────────────────────────────────────────────────────────── */

export function CardVisual() {
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-[12px] border border-[#edeff2] bg-white p-[clamp(14px,2.2vh,20px)] shadow-[0_8px_28px_-18px_rgba(20,26,58,0.28)]">
      <div className="flex items-center justify-between">
        <p className="mb-lg font-bold text-[#1e2129]">My Card</p>
        <span className="mb-xs rounded-full bg-[#e5f5f0] px-[10px] py-[3px] font-semibold text-[#0f6b63]">
          Digital debit · Demo
        </span>
      </div>

      <div className="mt-[clamp(8px,1.6vh,12px)] flex min-h-0 flex-1 items-center justify-center">
        <FictionalCard />
      </div>

      <div className="mt-[clamp(8px,1.6vh,12px)] flex items-end justify-between border-t border-[#eef0f3] pt-[clamp(8px,1.4vh,12px)]">
        <div>
          <p className="mb-xs uppercase tracking-[1px] text-[#a2a8b0]">Card holder</p>
          <p className="mb-small font-bold text-[#1e2129]">Danial Ariff</p>
        </div>
        <p className="mb-small font-semibold tracking-[2px] text-[#6b7280]">•••• 7348</p>
      </div>
    </div>
  );
}

/** Code-native card art for the explicitly fictional hackathon bank. */
function FictionalCard() {
  return (
    <div
      role="img"
      aria-label="Fictional NusaSafe Bank demo debit card"
      className="relative aspect-[1.6/1] w-full max-w-[300px] overflow-hidden rounded-[14px] bg-gradient-to-br from-[#073b4c] via-[#0b6570] to-[#13947f] p-[clamp(12px,2vh,16px)] text-white shadow-[0_14px_28px_-12px_rgba(20,26,58,0.5)]"
    >
      <span className="pointer-events-none absolute -right-[10%] -top-[30%] aspect-square w-[55%] rounded-full bg-white/10" />
      <span className="pointer-events-none absolute right-[12%] top-[26%] aspect-square w-[35%] rounded-full bg-[#8ff0d0]/25" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="mb-small font-extrabold">NusaSafe Bank</span>
          <span className="mb-xs rounded-full border border-white/25 px-[8px] py-[2px] font-semibold text-white/80">
            FICTIONAL DEMO
          </span>
        </div>
        <div className="h-[clamp(20px,3vh,28px)] w-[clamp(28px,4vh,38px)] rounded-[5px] bg-gradient-to-br from-[#d7fff2] to-[#78d8bd]" />
        <p className="mb-small font-semibold tracking-[3px] text-white/90">•••• •••• •••• 7348</p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Spending insights — code-native conic-gradient ring and legend.
   ──────────────────────────────────────────────────────────────────────── */

const CATEGORIES = [
  { label: "Shopping", pct: 42, amount: "RM 3,898", color: "#6d3fd4" },
  { label: "Food & Dining", pct: 26, amount: "RM 2,413", color: "#1f9d55" },
  { label: "Bills", pct: 20, amount: "RM 1,856", color: "#d9730d" },
  { label: "Transport", pct: 12, amount: "RM 1,114", color: "#1d6fe0" },
];

const DONUT_STOPS = CATEGORIES.reduce(
  (result, category) => ({
    offset: result.offset + category.pct,
    stops: [
      ...result.stops,
      `${category.color} ${result.offset}% ${result.offset + category.pct}%`,
    ],
  }),
  { offset: 0, stops: [] as string[] },
).stops.join(", ");

export function SpendingInsights() {
  return (
    <div className="rounded-[12px] border border-[#edeff2] bg-white p-[clamp(14px,2.2vh,20px)] shadow-[0_8px_28px_-18px_rgba(20,26,58,0.28)]">
      <div className="flex items-center justify-between">
        <p className="mb-lg font-bold text-[#1e2129]">Spending this month</p>
        <span className="mb-xs rounded-full bg-[#f0f2f6] px-[10px] py-[3px] font-semibold text-[#6b7280]">July</span>
      </div>

      <div className="mt-[clamp(10px,1.6vh,14px)] flex items-center gap-[clamp(16px,2.5vw,28px)]">
        {/* Donut */}
        <div
          className="relative grid aspect-square h-[clamp(72px,11vh,104px)] shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(${DONUT_STOPS})` }}
        >
          <div className="grid aspect-square w-[62%] place-items-center rounded-full bg-white text-center">
            <div>
              <p className="mb-xs leading-none text-[#8b9099]">Total</p>
              <p className="mb-small font-bold leading-tight text-[#1e2129]">RM 9,281</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <ul className="grid flex-1 grid-cols-2 gap-x-[clamp(10px,1.5vw,18px)] gap-y-[clamp(6px,1.2vh,10px)]">
          {CATEGORIES.map((c) => (
            <li key={c.label} className="min-w-0">
              <div className="flex items-center gap-[6px]">
                <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: c.color }} />
                <span className="mb-small truncate font-medium text-[#3a3f48]">{c.label}</span>
              </div>
              <p className="mb-small ml-[15px] font-semibold text-[#1e2129]">{c.amount}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
