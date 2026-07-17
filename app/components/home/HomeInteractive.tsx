"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, CloseIcon, EyeIcon, ShieldIcon } from "../icons";

/* ── Balance + Add money ────────────────────────────────────── */

export function BalanceBlock() {
  const [hidden, setHidden] = useState(false);

  return (
    <div className="flex items-start justify-between px-[22px] pt-[18px]">
      <div>
        <button
          onClick={() => setHidden((v) => !v)}
          className="flex items-center gap-[7px] text-white/95 transition active:opacity-70"
        >
          <span className="text-[15px] font-medium">Total asset</span>
          <EyeIcon className="h-[17px] w-[17px]" off={hidden} />
        </button>
        <div className="mt-[3px] flex items-center gap-[9px]">
          <span className="text-[34px] font-bold leading-none tracking-[-0.5px] text-white tabular-nums">
            {hidden ? "RM ••••" : "RM 85.93"}
          </span>
          <ShieldIcon className="h-[19px] w-[19px] text-white/85" />
        </div>
      </div>

      <button className="mt-[3px] flex items-center gap-[2px] rounded-full border border-white/70 py-[9px] pl-[15px] pr-[9px] text-[15px] font-semibold text-white transition active:bg-white/15">
        Add money
        <ChevronRight className="h-[15px] w-[15px]" />
      </button>
    </div>
  );
}

/* ── Promo carousel ─────────────────────────────────────────── */

const SLIDES = [
  { id: 0, kind: "lounge" as const },
  { id: 1, kind: "lounge" as const },
  { id: 2, kind: "cashback" as const },
  { id: 3, kind: "travel" as const },
];

export function PromoCarousel() {
  const [active, setActive] = useState(1);

  return (
    <div className="mt-[18px]">
      <div
        className="tng-rail gap-[10px] px-[22px]"
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / (el.clientWidth - 44 + 10));
          if (i !== active) setActive(Math.min(SLIDES.length - 1, Math.max(0, i)));
        }}
      >
        {SLIDES.map((s) => (
          <div key={s.id} className="w-[calc(100%-44px)] shrink-0">
            <PromoSlide kind={s.kind} />
          </div>
        ))}
      </div>

      <div className="mt-[13px] flex items-center justify-center gap-[6px]">
        {SLIDES.map((s, i) => (
          <span
            key={s.id}
            className={`h-[7px] rounded-full transition-all duration-300 ${
              i === active ? "w-[22px] bg-[#0f6fe5]" : "w-[7px] bg-[#c8ccd6]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function PromoSlide({ kind }: { kind: "lounge" | "cashback" | "travel" }) {
  if (kind === "cashback") {
    return (
      <div className="relative h-[168px] overflow-hidden rounded-[14px] bg-gradient-to-br from-[#ff8a3d] via-[#ff6b2c] to-[#e8461e] p-[18px]">
        <p className="text-[13px] font-semibold text-white/85">Food &amp; Deals</p>
        <p className="mt-[6px] text-[26px] font-bold leading-[1.1] text-white">
          Up to 50% off
          <br />
          your next meal
        </p>
        <p className="mt-[8px] text-[12px] font-medium text-white/85">Vouchers drop every Friday</p>
        <div className="absolute -bottom-8 -right-6 h-[130px] w-[130px] rounded-full bg-white/15" />
      </div>
    );
  }

  if (kind === "travel") {
    return (
      <div className="relative h-[168px] overflow-hidden rounded-[14px] bg-gradient-to-br from-[#5b2f9e] via-[#4a2b8f] to-[#1b1a63] p-[18px]">
        <p className="text-[13px] font-semibold text-white/75">Travel+</p>
        <p className="mt-[6px] text-[26px] font-bold leading-[1.1] text-white">
          Insure your trip
          <br />
          from RM9
        </p>
        <p className="mt-[8px] text-[12px] font-medium text-white/75">Covers delays &amp; lost bags</p>
        <div className="absolute -right-4 top-6 h-[110px] w-[110px] rounded-full border-[3px] border-white/20" />
      </div>
    );
  }

  /* The GOfinance x VISA airport-lounge banner from the reference. */
  return (
    <div className="relative h-[168px] overflow-hidden rounded-[14px] bg-gradient-to-br from-[#e8dcc8] via-[#d9c7ab] to-[#b99f7d]">
      {/* Lounge backdrop: window light + seating silhouettes */}
      <div className="absolute inset-0">
        <div className="absolute inset-y-0 right-0 w-[62%] bg-gradient-to-b from-[#f3ece0] to-[#cbb591] opacity-70" />
        <div className="absolute bottom-0 left-0 h-[46%] w-full bg-gradient-to-t from-[#8a6f4d]/45 to-transparent" />
        <div className="absolute bottom-[14px] left-[104px] h-[52px] w-[74px] rounded-[10px] bg-[#8a5f36]/55" />
        <div className="absolute inset-y-0 left-[46%] w-px bg-white/25" />
        <div className="absolute inset-y-0 left-[70%] w-px bg-white/25" />
      </div>

      {/* Dark blue travel card, bottom-left */}
      <div className="absolute -left-[6px] bottom-[10px] h-[92px] w-[136px] rotate-[-7deg] rounded-[9px] bg-gradient-to-br from-[#1c3d8f] via-[#16276b] to-[#0d1846] p-[9px] shadow-lg ring-1 ring-white/15">
        <div className="h-[13px] w-[17px] rounded-[3px] bg-gradient-to-br from-[#e8c46a] to-[#b8903a]" />
        <div className="absolute right-[9px] top-[9px] text-[6px] font-bold italic tracking-tight text-white">
          VISA
        </div>
        <div className="absolute bottom-[8px] left-[9px] text-[6px] font-semibold leading-tight text-white/80">
          Touch &apos;n Go
          <br />
          eWallet
        </div>
        <div className="absolute bottom-[22px] right-[8px] h-[30px] w-[30px] rounded-full bg-white/15 ring-1 ring-white/25" />
      </div>

      {/* Partner chips */}
      <div className="absolute left-[126px] top-[13px] flex flex-col gap-[5px]">
        <span className="w-fit rounded-[5px] bg-white px-[7px] py-[3px] text-[9px] font-bold text-[#5b2f9e] shadow-sm">
          agoda
        </span>
        <span className="ml-[10px] w-fit rounded-[5px] bg-white px-[7px] py-[3px] text-[9px] font-bold text-[#0f6fe5] shadow-sm">
          kkday
        </span>
      </div>

      {/* Headline */}
      <div className="absolute right-[14px] top-[14px] w-[190px] text-right">
        <div className="flex items-center justify-end gap-[6px]">
          <span className="text-[10px] font-bold text-[#16276b]">GOfinance</span>
          <span className="h-[10px] w-px bg-[#16276b]/40" />
          <span className="text-[11px] font-bold italic tracking-tight text-[#16276b]">VISA</span>
        </div>
        <p className="mt-[7px] text-[17px] font-bold italic leading-[1.15] text-[#16276b]">
          Enjoy Free Airport
          <br />
          Lounge access
        </p>
        <p className="mt-[5px] text-[8.5px] font-semibold text-[#16276b]/85">
          when you spend with Visa Travel Card
        </p>
      </div>
    </div>
  );
}

/* ── Floating Pizza Hut ad ──────────────────────────────────── */

export function FloatingAd() {
  const [gone, setGone] = useState(false);
  if (gone) return null;

  return (
    <div className="pointer-events-auto absolute bottom-[86px] right-[14px] z-10 w-[104px]">
      <button
        onClick={() => setGone(true)}
        aria-label="Dismiss ad"
        className="absolute -right-[3px] -top-[3px] z-10 grid h-[22px] w-[22px] place-items-center rounded-full bg-[#3d4453] text-white shadow-md transition active:scale-90"
      >
        <CloseIcon className="h-[11px] w-[11px]" />
      </button>

      <Link href="/test" className="block">
        <div className="relative h-[104px] w-[104px] overflow-hidden rounded-full bg-gradient-to-br from-[#f0f2f7] to-[#d9dee8] shadow-lg ring-1 ring-black/5">
          <div className="absolute inset-x-[14px] top-[10px] flex gap-[3px]">
            <span className="rounded-[3px] bg-[#e8461e] px-[4px] py-[1px] text-[6px] font-bold text-white">30%</span>
            <span className="rounded-[3px] bg-[#e8461e] px-[4px] py-[1px] text-[6px] font-bold text-white">30%</span>
          </div>
          <div className="absolute inset-x-[20px] top-[24px] h-[42px] rounded-t-[8px] bg-white shadow-inner ring-1 ring-black/5" />
          <div className="absolute left-1/2 top-[36px] h-[26px] w-[52px] -translate-x-1/2 rounded-[4px] bg-gradient-to-br from-[#ffb347] to-[#e8461e]" />
        </div>
        <div className="relative -mt-[16px] grid h-[30px] place-items-center rounded-full bg-gradient-to-r from-[#7b2ff7] to-[#c13ad0] text-[11px] font-bold text-white shadow-md">
          50% OFF
        </div>
      </Link>
    </div>
  );
}
