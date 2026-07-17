import { BatteryIcon, LocationArrow, SignalBars, WifiIcon } from "./icons";

/**
 * Fixed 440x956 phone canvas, centred on desktop and edge-to-edge on a real
 * handset. Everything in the app renders inside this.
 */
export function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full justify-center bg-[#d7d9e0]">
      <div className="relative flex h-[100dvh] max-h-[956px] w-full max-w-[440px] flex-col overflow-hidden bg-tng-page shadow-2xl sm:my-auto sm:h-[956px] sm:rounded-[44px]">
        {children}
      </div>
    </div>
  );
}

export function StatusBar({ tone = "light" }: { tone?: "light" | "dark" }) {
  const color = tone === "light" ? "text-white" : "text-tng-ink";
  return (
    <div className={`flex h-[54px] shrink-0 items-center justify-between px-[26px] pt-2 ${color}`}>
      <div className="flex items-center gap-1.5">
        <span className="text-[17px] font-semibold tracking-tight tabular-nums">17:54</span>
        <LocationArrow className="h-[15px] w-[15px]" />
      </div>
      <div className="flex items-center gap-[7px]">
        <SignalBars className="h-[13px] w-[18px]" />
        <WifiIcon className="h-[14px] w-[18px]" />
        <BatteryIcon className="h-[17px] w-[38px]" level={49} />
      </div>
    </div>
  );
}
