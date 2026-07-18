"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "My accounts", href: "/bank" },
  { label: "Pay and Transfer", href: "/transfer" },
  { label: "Family Guard", href: "/family-guard" },
  { label: "Scam Safety", href: "/scam-safety" },
  { label: "Settings", href: "/settings" },
];

/**
 * Shared shell for the fictional NusaSafe Bank hackathon prototype. The main
 * region owns vertical scrolling so both compact banking screens and longer
 * education pages remain usable on small viewports.
 */
export function MaybankChrome({
  hero,
  children,
}: {
  hero?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="mb-stage flex flex-col bg-white text-[#20242c]">
      <header className="shrink-0 bg-gradient-to-br from-[#0b3b4b] via-[#0f6670] to-[#168272] text-white">
        <nav
          aria-label="Primary navigation"
          className="flex flex-col gap-[clamp(12px,2vh,18px)] px-[clamp(16px,4vw,64px)] pt-[clamp(14px,2.4vh,26px)] lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex flex-wrap items-center gap-[10px]">
            <Link
              href="/bank"
              className="mb-logo font-extrabold tracking-[-0.3px] text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]"
            >
              NusaSafe Bank
            </Link>
            <span className="rounded-full border border-white/30 bg-white/10 px-[10px] py-[4px] text-[10px] font-bold uppercase tracking-[0.08em] text-white/90">
              Hackathon prototype · fictional bank
            </span>
          </div>

          <ul className="bank-nav -mx-[4px] flex max-w-full items-center gap-[clamp(14px,2.4vw,34px)] overflow-x-auto px-[4px] pb-[3px] lg:mx-0 lg:w-auto lg:px-0">
            {NAV.map(({ label, href }) => {
              const active = pathname === href;
              return (
                <li key={label} className="shrink-0">
                  <Link
                    href={href}
                    className={`mb-nav relative pb-[6px] transition-colors ${
                      active
                        ? "font-bold text-white"
                        : "font-medium text-white/70 hover:text-white"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {label}
                    {active && (
                      <span className="absolute inset-x-0 -bottom-[1px] h-[2.5px] rounded-full bg-[#8ff0d0]" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {hero && (
          <div className="px-[clamp(16px,4vw,64px)] [&_h1]:!text-white [&_p]:!text-white/75">
            {hero}
          </div>
        )}
      </header>

      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-[clamp(14px,4vw,64px)] pb-[clamp(16px,3vh,32px)]">
        {children}
      </main>
    </div>
  );
}
