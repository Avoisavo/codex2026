"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "My accounts", href: "/bank" },
  { label: "Pay and Transfer", href: "/transfer" },
  { label: "Apply", href: "#" },
  { label: "Settings", href: "/settings" },
];

/**
 * Shared Maybank2u desktop chrome. Fills the viewport (100vw x 100dvh) as a
 * flex column with no scrolling; type/spacing scale with viewport height via
 * the .mb-* clamp classes, so it stays consistent across screens.
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
      {/* Gold band: nav + hero share one continuous background */}
      <header className="shrink-0 bg-gradient-to-b from-[#f6bd47] to-[#efab30]">
        <nav className="flex items-center justify-between px-[clamp(20px,4vw,64px)] pt-[clamp(14px,2.4vh,26px)]">
          <Link
            href="/bank"
            className="mb-logo font-extrabold tracking-[-0.3px] text-white drop-shadow-[0_1px_1px_rgba(120,80,0,0.25)]"
          >
            Maybank2u
          </Link>

          <ul className="flex items-center gap-[clamp(18px,3vw,44px)]">
            {NAV.map(({ label, href }) => {
              const active = pathname === href;
              return (
                <li key={label}>
                  <Link
                    href={href}
                    className={`mb-nav relative pb-[6px] transition-colors ${
                      active
                        ? "font-bold text-[#1e2129]"
                        : "font-medium text-[#4a3c17] hover:text-[#1e2129]"
                    }`}
                  >
                    {label}
                    {active && (
                      <span className="absolute inset-x-0 -bottom-[1px] h-[2.5px] rounded-full bg-[#1e2129]" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {hero && <div className="px-[clamp(20px,4vw,64px)]">{hero}</div>}
      </header>

      {/* Body fills the rest of the viewport; no scrolling */}
      <main className="min-h-0 flex-1 overflow-hidden px-[clamp(16px,4vw,64px)] pb-[clamp(16px,3vh,32px)]">
        {children}
      </main>
    </div>
  );
}
