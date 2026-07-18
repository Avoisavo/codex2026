"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

type Slide = {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  gradient: string;
};

const SLIDES: Slide[] = [
  {
    eyebrow: "NusaSafe Bank · Fictional demo",
    title: "A calm pause before important transfers",
    body: "Scam Guard explains warning signs before you decide what to do next.",
    cta: "Explore protection",
    href: "/family-guard",
    gradient: "from-[#075b62] to-[#0f8a77]",
  },
  {
    eyebrow: "Scam Safety",
    title: "Spot pressure, secrecy and false promises",
    body: "Try six quick examples based on common scam warning patterns.",
    cta: "Learn the signs",
    href: "/scam-safety",
    gradient: "from-[#334155] to-[#475569]",
  },
  {
    eyebrow: "Family Guard",
    title: "Review high-risk transfers together",
    body: "A trusted contact can help without receiving your password, PIN or OTP.",
    cta: "See the concept",
    href: "/family-guard",
    gradient: "from-[#4c3f78] to-[#6755a5]",
  },
  {
    eyebrow: "Hackathon prototype",
    title: "Designed for education, not financial advice",
    body: "All branding, products and account details shown here are fictional demo content.",
    cta: "Prototype notice",
    href: "/bank",
    gradient: "from-[#9a5b16] to-[#b7791f]",
  },
];

export function AdCarousel() {
  const [index, setIndex] = useState(0);
  const count = SLIDES.length;

  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  return (
    <div className="relative h-full overflow-hidden rounded-[14px] shadow-[0_10px_30px_-16px_rgba(20,26,58,0.4)]">
      {/* Track */}
      <div
        className="flex h-full transition-transform duration-500 ease-out motion-reduce:transition-none"
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

            <div className="relative max-w-[85%] sm:max-w-[62%]">
              <p className="mb-small font-semibold uppercase tracking-[1.5px] text-white/75">{s.eyebrow}</p>
              <h3 className="mb-lg mt-[clamp(3px,0.8vh,6px)] font-extrabold leading-tight text-white">{s.title}</h3>
              <p className="mb-small mt-[clamp(3px,0.8vh,6px)] hidden text-white/85 sm:block">{s.body}</p>
              <Link
                href={s.href}
                className="mb-xs mt-[clamp(8px,1.4vh,12px)] inline-flex items-center gap-[6px] rounded-full bg-white px-[clamp(12px,1.4vw,18px)] py-[clamp(5px,1vh,8px)] font-bold text-[#1e2129] transition-colors hover:bg-white/90"
              >
                {s.cta}
                <svg viewBox="0 0 24 24" className="h-[13px] w-[13px]" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Arrows */}
      <button
        type="button"
        aria-label="Previous promotion"
        onClick={() => go(index - 1)}
        className="absolute left-[10px] top-1/2 grid h-[32px] w-[32px] -translate-y-1/2 place-items-center rounded-full bg-white/25 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
      >
        <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none">
          <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Next promotion"
        onClick={() => go(index + 1)}
        className="absolute right-[10px] top-1/2 grid h-[32px] w-[32px] -translate-y-1/2 place-items-center rounded-full bg-white/25 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
      >
        <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dots. Slides advance only when the user chooses a control. */}
      <div
        role="group"
        className="absolute bottom-[10px] left-1/2 flex -translate-x-1/2 gap-[6px]"
        aria-label="Choose promotion"
      >
        {SLIDES.map((s, i) => (
          <button
            key={s.title}
            type="button"
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
