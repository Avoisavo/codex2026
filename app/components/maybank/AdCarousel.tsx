"use client";

import { useCallback, useEffect, useState } from "react";

type Slide = {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  gradient: string;
};

const SLIDES: Slide[] = [
  {
    eyebrow: "Maybank Islamic Card-i",
    title: "5% cashback on everyday spend",
    body: "No annual fee for life. Apply online in minutes.",
    cta: "Apply now",
    gradient: "from-[#0f766e] to-[#0891b2]",
  },
  {
    eyebrow: "Personal Financing-i",
    title: "Rates from 4.5% p.a.",
    body: "Get approved and receive funds within 24 hours.",
    cta: "Check eligibility",
    gradient: "from-[#4f46e5] to-[#7c3aed]",
  },
  {
    eyebrow: "ASNB Unit Trust",
    title: "Start investing from RM10",
    body: "Grow your savings with Malaysia's trusted funds.",
    cta: "Invest today",
    gradient: "from-[#b45309] to-[#d97706]",
  },
  {
    eyebrow: "MAE by Maybank2u",
    title: "Split bills instantly",
    body: "Send and request money from friends with a tap.",
    cta: "Get MAE",
    gradient: "from-[#be123c] to-[#e11d48]",
  },
];

export function AdCarousel() {
  const [index, setIndex] = useState(0);
  const count = SLIDES.length;

  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 4500);
    return () => clearInterval(id);
  }, [count]);

  return (
    <div className="relative h-full overflow-hidden rounded-[14px] shadow-[0_10px_30px_-16px_rgba(20,26,58,0.4)]">
      {/* Track */}
      <div
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {SLIDES.map((s) => (
          <div
            key={s.title}
            className={`relative flex h-full min-w-full items-center overflow-hidden bg-gradient-to-r ${s.gradient} pl-[clamp(52px,5vw,68px)] pr-[clamp(20px,4vw,44px)]`}
          >
            {/* Decorative rings */}
            <span className="pointer-events-none absolute -right-[6%] top-1/2 aspect-square h-[220%] -translate-y-1/2 rounded-full bg-white/10" />
            <span className="pointer-events-none absolute right-[8%] top-1/2 aspect-square h-[150%] -translate-y-1/2 rounded-full bg-white/10" />

            <div className="relative max-w-[62%]">
              <p className="mb-small font-semibold uppercase tracking-[1.5px] text-white/75">{s.eyebrow}</p>
              <h3 className="mb-lg mt-[clamp(3px,0.8vh,6px)] font-extrabold leading-tight text-white">{s.title}</h3>
              <p className="mb-small mt-[clamp(3px,0.8vh,6px)] text-white/85">{s.body}</p>
              <span className="mb-xs mt-[clamp(8px,1.4vh,12px)] inline-flex items-center gap-[6px] rounded-full bg-white px-[clamp(12px,1.4vw,18px)] py-[clamp(5px,1vh,8px)] font-bold text-[#1e2129]">
                {s.cta}
                <svg viewBox="0 0 24 24" className="h-[13px] w-[13px]" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Arrows */}
      <button
        aria-label="Previous"
        onClick={() => go(index - 1)}
        className="absolute left-[10px] top-1/2 grid h-[32px] w-[32px] -translate-y-1/2 place-items-center rounded-full bg-white/25 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
      >
        <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none">
          <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        aria-label="Next"
        onClick={() => go(index + 1)}
        className="absolute right-[10px] top-1/2 grid h-[32px] w-[32px] -translate-y-1/2 place-items-center rounded-full bg-white/25 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
      >
        <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dots */}
      <div className="absolute bottom-[10px] left-1/2 flex -translate-x-1/2 gap-[6px]">
        {SLIDES.map((s, i) => (
          <button
            key={s.title}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => go(i)}
            className={`h-[7px] rounded-full transition-all ${
              i === index ? "w-[20px] bg-white" : "w-[7px] bg-white/50 hover:bg-white/75"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
