import Link from "next/link";
import { BottomNav } from "./components/BottomNav";
import { PhoneShell, StatusBar } from "./components/PhoneShell";
import { BalanceBlock, FloatingAd, PromoCarousel } from "./components/home/HomeInteractive";
import {
  AsnbIcon,
  BillsIcon,
  CardMatchIcon,
  CashLoanIcon,
  CheckInIcon,
  ChevronDown,
  ChevronRight,
  CountrySkyline,
  FlameIcon,
  FoodDealsIcon,
  GiftIcon,
  GoFinanceIcon,
  GrowMoneyIcon,
  MalaysiaFlag,
  MissionIcon,
  MyBusinessIcon,
  MyPrepaidIcon,
  RemittanceIcon,
  SearchIcon,
  SimIcon,
  TngCardIcon,
  TransportIcon,
  TravelPlusIcon,
} from "./components/icons";

const QUICK_ACTIONS = [
  { label: "GOfinance", Icon: GoFinanceIcon, tint: "bg-[#fff2dd]" },
  { label: "Food & Deals", Icon: FoodDealsIcon, tint: "bg-[#ffeadb]" },
  { label: "Bills", Icon: BillsIcon, tint: "bg-[#ece7fe]" },
  { label: "Transport", Icon: TransportIcon, tint: "bg-[#dceafd]" },
];

const RECOMMENDED = [
  { label: "Mission", Icon: MissionIcon },
  { label: "Check-In", Icon: CheckInIcon },
  { label: "Get SIM", Icon: SimIcon },
  { label: "Remittance", Icon: RemittanceIcon },
];

const FAVOURITES = [
  { label: "TNG Card", Icon: TngCardIcon },
  { label: "CardMatch", Icon: CardMatchIcon },
  { label: "CashLoan", Icon: CashLoanIcon },
  { label: "ASNB", Icon: AsnbIcon },
  { label: "MY Prepaid", Icon: MyPrepaidIcon },
  { label: "My Business", Icon: MyBusinessIcon },
  { label: "Travel+", Icon: TravelPlusIcon },
];

export default function Home() {
  return (
    <PhoneShell>
      {/* ── Blue/purple header ── */}
      <div className="tng-header shrink-0 pb-[26px]">
        <StatusBar tone="light" />

        <div className="flex items-center gap-[10px] px-[22px] pt-[6px]">
          {/* Country pill */}
          <button className="relative flex h-[38px] w-[100px] shrink-0 items-center overflow-hidden rounded-full bg-[#141a3a]/85 pl-[7px] ring-1 ring-white/15">
            <MalaysiaFlag className="h-[16px] w-[24px] shrink-0 rounded-[2px] ring-1 ring-white/25" />
            <span className="ml-[5px] text-[14px] font-bold text-white">MY</span>
            <ChevronDown className="ml-[2px] h-[13px] w-[13px] shrink-0 text-white" />
            <CountrySkyline className="absolute inset-y-0 right-0 h-full w-[40px] opacity-90" />
          </button>

          {/* Search */}
          <Link
            href="/test"
            className="flex h-[38px] flex-1 items-center gap-[7px] rounded-full bg-white pl-[13px] pr-[10px] shadow-sm"
          >
            <SearchIcon className="h-[16px] w-[16px] shrink-0 text-[#9aa1ad]" />
            <span className="truncate text-[14px]">
              <span className="font-bold text-[#0f6fe5]">Search </span>
              <span className="font-medium text-[#3d4453]">Reload TNG Card</span>
            </span>
            <FlameIcon className="h-[14px] w-[14px] shrink-0" />
          </Link>
        </div>

        <BalanceBlock />
      </div>

      {/* ── Scrolling body ── */}
      <div className="tng-scroll relative flex-1">
        {/* Quick actions card, pulled up over the header seam */}
        <div className="-mt-[18px] px-[16px]">
          <div className="grid grid-cols-4 rounded-[18px] bg-white px-[6px] py-[16px] shadow-[0_4px_16px_-6px_rgba(20,26,58,0.18)]">
            {QUICK_ACTIONS.map(({ label, Icon, tint }) => (
              <Link key={label} href="/test" className="flex flex-col items-center gap-[9px]">
                <span className={`grid h-[54px] w-[54px] place-items-center rounded-[16px] ${tint}`}>
                  <Icon className="h-[38px] w-[38px]" />
                </span>
                <span className="text-[12.5px] font-medium text-tng-ink">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Grow money / GOrewards */}
        <div className="mt-[14px] grid grid-cols-2 gap-[10px] px-[16px]">
          <div className="flex items-center gap-[8px] rounded-[14px] bg-[#e9f0fd] py-[11px] pl-[10px] pr-[8px]">
            <GrowMoneyIcon className="h-[36px] w-[36px] shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold leading-tight text-tng-ink">Grow your money</p>
              <p className="mt-[2px] truncate text-[11.5px] font-medium text-[#6b7280]">Start with just RM10</p>
            </div>
          </div>

          <div className="flex items-center gap-[8px] rounded-[14px] bg-[#e9f0fd] py-[11px] pl-[10px] pr-[8px]">
            <GiftIcon className="h-[36px] w-[36px] shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold leading-tight text-tng-ink">GOrewards</p>
              <span className="mt-[3px] inline-block rounded-[6px] bg-white px-[7px] py-[2px] text-[12px] font-bold text-[#0f6fe5]">
                2,739 pts
              </span>
            </div>
          </div>
        </div>

        <PromoCarousel />

        {/* Recommended */}
        <Section title="Recommended" className="mt-[18px]">
          <IconGrid items={RECOMMENDED} />
        </Section>

        {/* My Favourites */}
        <Section
          title="My Favourites"
          className="mt-[16px]"
          action={<span className="text-[15px] font-semibold text-[#0f6fe5]">Edit</span>}
        >
          <IconGrid items={FAVOURITES} />
        </Section>

        {/* GOfinance teaser peeking at the bottom, like the reference */}
        <div className="mt-[18px] rounded-t-[20px] bg-[#fdf6e8] px-[22px] pb-[30px] pt-[16px]">
          <div className="flex items-center justify-between">
            <h2 className="text-[19px] font-bold tracking-[-0.2px] text-tng-ink">GOfinance</h2>
            <span className="flex items-center gap-[2px] text-[15px] font-semibold text-[#0f6fe5]">
              Open
              <ChevronRight className="h-[14px] w-[14px]" />
            </span>
          </div>
        </div>

        <FloatingAd />
      </div>

      <BottomNav />
    </PhoneShell>
  );
}

function Section({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="flex items-center gap-[10px] px-[22px]">
        <h2 className="text-[19px] font-bold tracking-[-0.2px] text-tng-ink">{title}</h2>
        {action}
      </div>
      <div className="mt-[12px] px-[16px]">{children}</div>
    </section>
  );
}

function IconGrid({
  items,
}: {
  items: readonly { label: string; Icon: (p: { className?: string }) => React.ReactElement }[];
}) {
  return (
    <div className="grid grid-cols-4 gap-y-[16px]">
      {items.map(({ label, Icon }) => (
        <Link key={label} href="/test" className="flex flex-col items-center gap-[7px]">
          <Icon className="h-[44px] w-[44px]" />
          <span className="text-[12px] font-medium text-tng-ink">{label}</span>
        </Link>
      ))}
    </div>
  );
}
