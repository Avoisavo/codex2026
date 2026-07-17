"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ActivityIcon, HomeIcon, ProfileIcon, ScanIcon, TransferIcon } from "./icons";

const TABS = [
  { key: "home", label: "Home", href: "/", Icon: HomeIcon },
  { key: "transfer", label: "Transfer", href: "/test", Icon: TransferIcon },
  { key: "activity", label: "Activity", href: "/test", Icon: ActivityIcon },
  { key: "profile", label: "Profile", href: "/test", Icon: ProfileIcon, dot: true },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="relative z-20 shrink-0 border-t border-black/[0.06] bg-white pb-[18px] pt-2.5">
      {/* Centre scan button, floating above the bar */}
      <Link
        href="/test"
        aria-label="Scan"
        className="absolute -top-[26px] left-1/2 grid h-[62px] w-[62px] -translate-x-1/2 place-items-center rounded-full bg-gradient-to-br from-[#3b9cff] via-[#4a63f0] to-[#a13ad0] shadow-[0_8px_20px_-4px_rgba(70,80,220,0.55)] ring-[5px] ring-white transition active:scale-95"
      >
        <ScanIcon className="h-[30px] w-[30px]" />
      </Link>

      <nav className="grid grid-cols-5 items-center">
        {TABS.slice(0, 2).map((t) => (
          <NavItem
            key={t.key}
            label={t.label}
            href={t.href}
            Icon={t.Icon}
            active={t.key === "home" && pathname === "/"}
          />
        ))}
        <span aria-hidden />
        {TABS.slice(2).map((t) => (
          <NavItem
            key={t.key}
            label={t.label}
            href={t.href}
            Icon={t.Icon}
            dot={"dot" in t ? t.dot : undefined}
            active={false}
          />
        ))}
      </nav>
    </div>
  );
}

function NavItem({
  label,
  href,
  Icon,
  active,
  dot,
}: {
  label: string;
  href: string;
  Icon: (p: { className?: string; active?: boolean }) => React.ReactElement;
  active: boolean;
  dot?: boolean;
}) {
  return (
    <Link href={href} className="flex flex-col items-center gap-[5px] py-1">
      <span className={`relative ${active ? "text-tng-ink" : "text-[#9aa1ad]"}`}>
        <Icon className="h-[26px] w-[26px]" active={active} />
        {dot && <span className="absolute -right-[3px] -top-[2px] h-[7px] w-[7px] rounded-full bg-[#ff3b30] ring-2 ring-white" />}
      </span>
      <span className={`text-[11px] leading-none ${active ? "font-semibold text-tng-ink" : "font-medium text-[#9aa1ad]"}`}>
        {label}
      </span>
    </Link>
  );
}
