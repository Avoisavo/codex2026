/**
 * Hand-drawn SVG icon set for the Touch 'n Go eWallet clone.
 * No emoji anywhere — every glyph is real vector art.
 */

type IconProps = { className?: string };

/* ── Status bar ─────────────────────────────────────────────── */

export function LocationArrow({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#1d9bf0" />
      <path d="M17.5 6.9 6.6 11.2c-.6.2-.6 1 0 1.2l4.1 1.4 1.5 4.2c.2.6 1 .6 1.2 0l4.4-10.4c.2-.5-.3-1-.8-.7z" fill="#fff" />
    </svg>
  );
}

export function SignalBars({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 14" className={className} aria-hidden>
      <rect x="0" y="9" width="3.4" height="5" rx="1" fill="currentColor" />
      <rect x="5.5" y="6" width="3.4" height="8" rx="1" fill="currentColor" />
      <rect x="11" y="3" width="3.4" height="11" rx="1" fill="currentColor" opacity="0.35" />
      <rect x="16.5" y="0" width="3.4" height="14" rx="1" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

export function WifiIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 15" className={className} aria-hidden>
      <path d="M10 14.2 7.3 10.9a4.3 4.3 0 0 1 5.4 0z" fill="currentColor" />
      <path d="M3.9 6.8a9.6 9.6 0 0 1 12.2 0" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" fill="none" />
      <path d="M6.4 9.9a5.8 5.8 0 0 1 7.2 0" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" fill="none" />
      <path d="M1.2 3.6a13.6 13.6 0 0 1 17.6 0" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function BatteryIcon({ className, level = 49 }: IconProps & { level?: number }) {
  return (
    <svg viewBox="0 0 40 18" className={className} aria-hidden>
      <rect x="0.7" y="0.7" width="34" height="16.6" rx="5" fill="#fff" fillOpacity="0.35" />
      <rect x="1.6" y="1.6" width={Math.max(4, (32.2 * level) / 100)} height="14.8" rx="4.2" fill="#fff" />
      <path d="M37.4 6.2a3.6 3.6 0 0 1 0 5.6z" fill="#fff" fillOpacity="0.5" />
      <text x="17.5" y="13.4" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1a1550" fontFamily="inherit">
        {level}
      </text>
    </svg>
  );
}

/* ── Header ─────────────────────────────────────────────────── */

export function MalaysiaFlag({ className }: IconProps) {
  const stripes = Array.from({ length: 14 }, (_, i) => i);
  return (
    <svg viewBox="0 0 28 14" className={className} aria-hidden>
      <defs>
        <clipPath id="my-flag-clip">
          <rect width="28" height="14" rx="2" />
        </clipPath>
      </defs>
      <g clipPath="url(#my-flag-clip)">
        <rect width="28" height="14" fill="#fff" />
        {stripes.map((i) =>
          i % 2 === 0 ? <rect key={i} y={i} width="28" height="0.5" fill="#cc0001" x="0" /> : null,
        )}
        {stripes.map((i) => (
          <rect key={`s${i}`} y={i} width="28" height="1" fill={i % 2 === 0 ? "#cc0001" : "#fff"} />
        ))}
        <rect width="15.5" height="8" fill="#010066" />
        <path
          d="M9.1 4a2.9 2.9 0 1 0 0 4.2 3.5 3.5 0 1 1 0-4.2z"
          fill="#ffcc00"
          transform="translate(-1.3 -2)"
        />
        <path
          d="m10.9 3.1.55 1.32 1.43.11-1.09.94.33 1.4-1.22-.75-1.22.75.33-1.4-1.09-.94 1.43-.11z"
          fill="#ffcc00"
        />
      </g>
    </svg>
  );
}

/** KL skyline (Petronas towers + KL tower) with palm fronds — the art inside the country pill. */
export function CountrySkyline({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 40" className={className} aria-hidden preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="sky-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3aa0d8" />
          <stop offset="55%" stopColor="#7cc6e8" />
          <stop offset="100%" stopColor="#bfe4f2" />
        </linearGradient>
      </defs>
      <rect width="64" height="40" fill="url(#sky-bg)" />
      {/* Petronas twin towers */}
      <g fill="#2f4a66" opacity="0.92">
        <rect x="24" y="12" width="5" height="28" />
        <rect x="33" y="12" width="5" height="28" />
        <rect x="29" y="20" width="4" height="3" />
        <path d="M26.5 5.5 24 12h5z" />
        <path d="M35.5 5.5 33 12h5z" />
        <rect x="26.1" y="2" width="0.8" height="4" />
        <rect x="35.1" y="2" width="0.8" height="4" />
        {/* KL tower */}
        <rect x="45" y="18" width="2.6" height="22" />
        <ellipse cx="46.3" cy="17" rx="3.6" ry="2.1" />
        <rect x="45.9" y="9" width="0.8" height="6" />
        <rect x="13" y="24" width="4" height="16" />
        <rect x="18" y="29" width="3.5" height="11" />
      </g>
      {/* Palm fronds */}
      <g stroke="#1f6b3a" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M56 40c0-8 1.5-14 3-18" />
        <path d="M59 22c3-3 6-3.6 8-3" />
        <path d="M59 22c3.4-.4 6 1 7.4 3" />
        <path d="M59 22c-2.6-2.4-5.4-3-8-2.4" />
        <path d="M59 22c-2.4.6-4.4 2.4-5.4 4.8" />
        <path d="M6 40c.6-7 0-12-1.4-16" />
        <path d="M4.6 24c-2.4-2.4-4-2.8-4.6-2.6" />
        <path d="M4.6 24c2.6-2 5-2.2 6.6-1.4" />
        <path d="M4.6 24c1.8 1 3 2.8 3.4 5" />
      </g>
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2.2" />
      <path d="m15.6 15.6 4.4 4.4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function FlameIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12.9 2c.5 3-1.1 4.4-2.6 5.8C8.5 9.5 6.6 11.3 6.6 14.6A6.4 6.4 0 0 0 13 21a6.4 6.4 0 0 0 6.4-6.4c0-4.6-3.3-7-4.6-9.2-.5-.9-1.3-2.4-1.9-3.4z"
        fill="#ff6b2c"
      />
      <path
        d="M13 21a3.4 3.4 0 0 0 3.4-3.4c0-2.2-1.9-3.3-2.4-4.9-1 1.3-1.6 1.9-2.6 2.8-.9.8-1.8 1.6-1.8 3a3.4 3.4 0 0 0 3.4 2.5z"
        fill="#ffc531"
      />
    </svg>
  );
}

export function ChevronDown({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRight({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EyeIcon({ className, off = false }: IconProps & { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.9" />
      {off && <path d="M3.5 3.5 20.5 20.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />}
    </svg>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M12 2.5 4.5 5.6v6c0 4.6 3.2 8.9 7.5 9.9 4.3-1 7.5-5.3 7.5-9.9v-6z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M6 6 18 18M18 6 6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

/* ── Quick actions ──────────────────────────────────────────── */

export function GoFinanceIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="qa-bag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffc043" />
          <stop offset="100%" stopColor="#f6821f" />
        </linearGradient>
      </defs>
      <path d="M18.6 9.5h10.8l-1.1 2.2H19.7z" fill="#c76a13" />
      <path
        d="M19.7 11.7h8.6l-2 3.6c6.5 2.6 10.9 8.2 10.9 14.1 0 5.8-5.4 9.1-13.2 9.1s-13.2-3.3-13.2-9.1c0-5.9 4.4-11.5 10.9-14.1z"
        fill="url(#qa-bag)"
      />
      <text x="24" y="33.5" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff" fontFamily="inherit">
        $
      </text>
    </svg>
  );
}

export function FoodDealsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="qa-tag" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffa938" />
          <stop offset="100%" stopColor="#f4700f" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="32" height="32" rx="8" fill="url(#qa-tag)" />
      <circle cx="16.5" cy="16.5" r="2.6" fill="#fff" />
      <path d="M31.5 15.5 17 32" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="31.5" cy="31.5" r="2.6" fill="#fff" />
    </svg>
  );
}

export function BillsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="qa-bill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b6cf5" />
          <stop offset="100%" stopColor="#6a3fe0" />
        </linearGradient>
      </defs>
      <path
        d="M11 10.5a2 2 0 0 1 2-2h22a2 2 0 0 1 2 2v28.2c0 .8-.9 1.3-1.6.9l-3.2-2a1 1 0 0 0-1 0l-3.2 2a1 1 0 0 1-1 0l-3.2-2a1 1 0 0 0-1 0l-3.2 2a1 1 0 0 1-1 0l-3.2-2a1 1 0 0 0-1 0l-3.2 2c-.7.4-1.6-.1-1.6-.9z"
        fill="url(#qa-bill)"
      />
      <rect x="16.5" y="16" width="15" height="2.8" rx="1.4" fill="#fff" />
      <rect x="16.5" y="22.5" width="15" height="2.8" rx="1.4" fill="#fff" opacity="0.75" />
      <rect x="16.5" y="29" width="9" height="2.8" rx="1.4" fill="#fff" opacity="0.55" />
    </svg>
  );
}

export function TransportIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="qa-train" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4aa3ff" />
          <stop offset="100%" stopColor="#1e6fe0" />
        </linearGradient>
      </defs>
      <path d="M12 17a8 8 0 0 1 8-8h8a8 8 0 0 1 8 8v14a5 5 0 0 1-5 5H17a5 5 0 0 1-5-5z" fill="url(#qa-train)" />
      <rect x="16.5" y="14.5" width="15" height="8.5" rx="2.6" fill="#fff" />
      <circle cx="18.5" cy="28.5" r="2.2" fill="#fff" />
      <circle cx="29.5" cy="28.5" r="2.2" fill="#fff" />
      <path d="M15 36.5 11 41M33 36.5 37 41" stroke="#1e6fe0" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/* ── Promo cards ────────────────────────────────────────────── */

export function GrowMoneyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="grow-coin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd75e" />
          <stop offset="100%" stopColor="#f5a623" />
        </linearGradient>
      </defs>
      <path d="M24 30c0-5 3.5-8.5 8-9-0.5 5-3.5 8.5-8 9z" fill="#2fb457" />
      <path d="M24 31c-4-.5-7-4-7.5-8.5 4.5.5 7.5 4 7.5 8.5z" fill="#43cc6c" />
      <path d="M23 40V27" stroke="#2fb457" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="23" cy="16" r="9" fill="url(#grow-coin)" />
      <text x="23" y="20" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fff" fontFamily="inherit">
        RM
      </text>
      <path d="M38 12.5 39 15l2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" fill="#5aa9f8" />
      <path d="M10 8l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" fill="#5aa9f8" />
    </svg>
  );
}

export function GiftIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="gift-box" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a9bff" />
          <stop offset="100%" stopColor="#1c62d6" />
        </linearGradient>
      </defs>
      <path d="M14 12c-1-3 2-5 4-3.4 1.5 1.2 3.6 3.4 5.4 5.4H15z" fill="#ffc043" />
      <path d="M34 12c1-3-2-5-4-3.4-1.5 1.2-3.6 3.4-5.4 5.4H33z" fill="#ffc043" />
      <rect x="8" y="14" width="32" height="8" rx="2.4" fill="url(#gift-box)" />
      <rect x="11" y="22" width="26" height="17" rx="2.4" fill="url(#gift-box)" />
      <rect x="20.5" y="14" width="7" height="25" fill="#ffc043" />
      <path d="M41 27l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="#ffd75e" />
    </svg>
  );
}

/* ── Recommended ────────────────────────────────────────────── */

export function MissionIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="mis-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5b8def" />
          <stop offset="100%" stopColor="#3d5afe" />
        </linearGradient>
      </defs>
      <circle cx="15" cy="17" r="6" fill="#ffd75e" />
      <circle cx="15" cy="17" r="3.4" fill="#f5a623" />
      <circle cx="33" cy="14" r="4.6" fill="#ffd75e" />
      <rect x="24" y="18" width="18" height="12" rx="2.4" fill="#ffca3a" transform="rotate(-8 33 24)" />
      <path d="M7 28h34v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" fill="url(#mis-b)" />
      <path d="M7 28h34l-3.5 4.5H10.5z" fill="#2f45c5" opacity="0.35" />
      <text x="24" y="37.5" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#fff" letterSpacing="0.5" fontFamily="inherit">
        MISSION
      </text>
      <path d="M40 6l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9z" fill="#7fd0ff" />
    </svg>
  );
}

export function CheckInIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="20" cy="28" r="12" fill="#fff" stroke="#1a1a1a" strokeWidth="1.6" />
      <path d="M20 20.5l5.2 3.8-2 6.2h-6.4l-2-6.2z" fill="#1a1a1a" />
      <path d="M20 16.2v4.3M11.3 25.6l4.4-1.3M28.7 25.6l-4.4-1.3M14.8 36.2l2-5.7M25.2 36.2l-2-5.7" stroke="#1a1a1a" strokeWidth="1.5" />
      <rect x="22" y="6" width="24" height="12" rx="4" fill="#ff3b30" />
      <text x="34" y="14.6" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#fff" letterSpacing="0.3" fontFamily="inherit">
        CLAIM
      </text>
      <path d="M27 17.5 25 22l5-3z" fill="#ff3b30" />
      <text x="30" y="27" textAnchor="middle" fontSize="7" fontWeight="800" fill="#f5a623" fontFamily="inherit">
        Reward
      </text>
    </svg>
  );
}

export function SimIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        d="M12 11a3 3 0 0 1 3-3h13.5L36 15.5V37a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3z"
        fill="#fff"
        stroke="#7c4dff"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M28.5 8v7.5H36" fill="none" stroke="#7c4dff" strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="17" y="21" width="14" height="11" rx="2.4" fill="#7c4dff" />
      <text x="24" y="29.6" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fff" fontFamily="inherit">
        5G
      </text>
    </svg>
  );
}

export function RemittanceIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="rem-c" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd75e" />
          <stop offset="100%" stopColor="#f5a623" />
        </linearGradient>
      </defs>
      <path d="M42 8 6 21.5l12.5 4.8z" fill="#4a9bff" />
      <path d="M42 8 18.5 26.3l1.5 12.7z" fill="#1c62d6" />
      <path d="M18.5 26.3 20 39l5.6-7.4z" fill="#7fbcff" />
      <circle cx="15" cy="14" r="8" fill="url(#rem-c)" stroke="#fff" strokeWidth="1.6" />
      <text x="15" y="18" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" fontFamily="inherit">
        $
      </text>
    </svg>
  );
}

/* ── My Favourites ──────────────────────────────────────────── */

export function TngCardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect x="7" y="10" width="30" height="30" rx="4.5" fill="#fff" stroke="#1a73e8" strokeWidth="2.4" />
      <circle cx="17" cy="21" r="6.5" fill="#1a73e8" />
      <circle cx="17" cy="21" r="4.2" fill="#ffd400" />
      <text x="17" y="23.4" textAnchor="middle" fontSize="5" fontWeight="800" fill="#1a73e8" fontFamily="inherit">
        tng
      </text>
      <rect x="11" y="32" width="17" height="2.6" rx="1.3" fill="#1a73e8" opacity="0.35" />
      <path d="M33 15.5a9 9 0 0 1 0 12" stroke="#1a73e8" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M37 12a13.5 13.5 0 0 1 0 19" stroke="#1a73e8" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.5" />
    </svg>
  );
}

export function CardMatchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect x="8" y="12" width="17" height="26" rx="3.2" fill="#fff" stroke="#1a73e8" strokeWidth="2.4" transform="rotate(-8 16.5 25)" />
      <rect x="22" y="14" width="16" height="24" rx="3.2" fill="#ffd400" stroke="#1a73e8" strokeWidth="2.4" />
      <rect x="25.5" y="19" width="9" height="2.6" rx="1.3" fill="#1a73e8" />
      <path d="M40 9l1.1 2.6 2.6 1.1-2.6 1.1L40 16.4l-1.1-2.6-2.6-1.1 2.6-1.1z" fill="#1a73e8" />
    </svg>
  );
}

export function CashLoanIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="loan-c" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd75e" />
          <stop offset="100%" stopColor="#f5a623" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="18" r="9.5" fill="url(#loan-c)" />
      <text x="24" y="22.5" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff" fontFamily="inherit">
        $
      </text>
      <path
        d="M8 33c2.5-2.6 5-2.6 7.5-1l4 2.4h6.2c1.6 0 1.6 2.4 0 2.4h-5"
        stroke="#1a73e8"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M20.5 37.8h6.8c3.6 0 7-3.4 10.2-6.2 1.5-1.3 3.4.6 2.2 2.2C36 38.4 32 42 27 42h-9.5c-2 0-3-.8-4.4-2.2L8 34.4"
        stroke="#1a73e8"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function AsnbIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <text x="24" y="29" textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#0b5fd0" letterSpacing="-0.3" fontFamily="inherit">
        AS
      </text>
      <text x="24" y="29" textAnchor="middle" fontSize="12.5" fontWeight="800" fill="transparent" fontFamily="inherit">
        AS
      </text>
      <g>
        <text x="12" y="29" fontSize="12.5" fontWeight="800" fill="#0b5fd0" fontFamily="inherit">
          A
        </text>
        <path d="M21.4 19.5c1.6 0 2.6 1.4 2.4 3-.2 2-1.6 3.4-1.6 5 0 1.2 1 2 2.2 1.8" stroke="#e8461e" strokeWidth="2" fill="none" strokeLinecap="round" />
        <text x="25" y="29" fontSize="12.5" fontWeight="800" fill="#0b5fd0" fontFamily="inherit">
          NB
        </text>
      </g>
    </svg>
  );
}

export function MyPrepaidIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect x="10" y="8" width="21" height="32" rx="3.4" fill="#fff" stroke="#1a73e8" strokeWidth="2.4" />
      <rect x="16" y="12" width="9" height="1.8" rx="0.9" fill="#1a73e8" opacity="0.4" />
      <rect x="26" y="18" width="18" height="11" rx="3.4" fill="#1a73e8" />
      <text x="35" y="26.4" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fff" fontFamily="inherit">
        +60
      </text>
      <path d="M6 18a7 7 0 0 1 0 12" stroke="#1a73e8" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.55" />
      <circle cx="20.5" cy="35" r="1.6" fill="#1a73e8" opacity="0.4" />
    </svg>
  );
}

export function MyBusinessIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path d="M9 18h30v20a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2z" fill="#fff" stroke="#1a73e8" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M7 18l3-8h28l3 8z" fill="#ffd400" stroke="#1a73e8" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M17 10v8M31 10v8" stroke="#1a73e8" strokeWidth="2" />
      <rect x="19" y="26" width="10" height="14" fill="#1a73e8" opacity="0.18" stroke="#1a73e8" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}

export function TravelPlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="tv-p" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <circle cx="22" cy="24" r="11" fill="url(#tv-p)" />
      <ellipse
        cx="22"
        cy="24"
        rx="19"
        ry="6.5"
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2.4"
        transform="rotate(-22 22 24)"
      />
      <path d="M17 22.5c2.5-1.6 5.5-1.6 8 0 2 1.3 3.6 1 5-.5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.85" />
      <path d="M39 10l1.1 2.7 2.7 1.1-2.7 1.1L39 17.6l-1.1-2.7-2.7-1.1 2.7-1.1z" fill="#fff" stroke="#8b5cf6" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Bottom navigation ──────────────────────────────────────── */

export function HomeIcon({ className, active }: IconProps & { active?: boolean }) {
  return (
    <svg viewBox="0 0 28 28" className={className} fill="none" aria-hidden>
      <path
        d="M4 12.4 14 4.5l10 7.9V22a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.14 : 0}
      />
      <path d="M10.5 16.5c1.8 2 5.2 2 7 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function TransferIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" className={className} fill="none" aria-hidden>
      <path d="M24.5 4 3.5 12.2l8 3.1z" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M24.5 4 11.5 15.3 12.4 24z" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
    </svg>
  );
}

export function ScanIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden>
      <path
        d="M4 11V7a3 3 0 0 1 3-3h4M21 4h4a3 3 0 0 1 3 3v4M28 21v4a3 3 0 0 1-3 3h-4M11 28H7a3 3 0 0 1-3-3v-4"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <rect x="8.5" y="14.4" width="15" height="3.2" rx="1.6" fill="#fff" />
    </svg>
  );
}

export function ActivityIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" className={className} fill="none" aria-hidden>
      <rect x="4" y="3.5" width="20" height="21" rx="3" stroke="currentColor" strokeWidth="2.1" />
      <path d="M8.5 10.5h5M8.5 15.5h5M8.5 20h3" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M17.5 9.5v9M17.5 9.5l2.5 2.5M17.5 9.5 15 12" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ProfileIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" className={className} fill="none" aria-hidden>
      <circle cx="14" cy="14" r="10.5" stroke="currentColor" strokeWidth="2.1" />
      <circle cx="14" cy="11.5" r="3.6" stroke="currentColor" strokeWidth="2.1" />
      <path d="M7.2 22.2a7.4 7.4 0 0 1 13.6 0" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

/* ── Test page / voice agent ────────────────────────────────── */

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M6.6 3h-.9A2.7 2.7 0 0 0 3 5.9C3 14.8 9.2 21 18.1 21a2.7 2.7 0 0 0 2.9-2.7v-.9a1.4 1.4 0 0 0-1-1.3l-3.4-1a1.4 1.4 0 0 0-1.5.5l-.9 1.2a11.6 11.6 0 0 1-5-5l1.2-.9a1.4 1.4 0 0 0 .5-1.5l-1-3.4a1.4 1.4 0 0 0-1.3-1z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PhoneHangUpIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <g transform="rotate(135 12 12)">
        <path
          d="M6.6 3h-.9A2.7 2.7 0 0 0 3 5.9C3 14.8 9.2 21 18.1 21a2.7 2.7 0 0 0 2.9-2.7v-.9a1.4 1.4 0 0 0-1-1.3l-3.4-1a1.4 1.4 0 0 0-1.5.5l-.9 1.2a11.6 11.6 0 0 1-5-5l1.2-.9a1.4 1.4 0 0 0 .5-1.5l-1-3.4a1.4 1.4 0 0 0-1.3-1z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}

export function MicIcon({ className, muted = false }: IconProps & { muted?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x="9" y="2.5" width="6" height="11.5" rx="3" fill="currentColor" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M12 18v3.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      {muted && <path d="M3.5 3.5 20.5 20.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />}
    </svg>
  );
}

export function GuardShieldIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="guard-s" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#6d31a8" />
        </linearGradient>
      </defs>
      <path d="M24 4 7 11v12.5C7 33.8 14.2 43 24 45.5 33.8 43 41 33.8 41 23.5V11z" fill="url(#guard-s)" />
      <path d="m16 24 5.5 5.5L32.5 18.5" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 2.8a1.6 1.6 0 0 1 1.4.8l9 15.6a1.6 1.6 0 0 1-1.4 2.4H3a1.6 1.6 0 0 1-1.4-2.4l9-15.6A1.6 1.6 0 0 1 12 2.8z"
        fill="currentColor"
      />
      <path d="M12 9v5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="17.6" r="1.3" fill="#fff" />
    </svg>
  );
}
