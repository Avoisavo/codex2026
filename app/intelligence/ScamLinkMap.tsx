"use client";

import { useMemo, useState } from "react";

import type {
  IntelligenceEvidenceStatus,
  IntelligenceIndicatorKind,
  IntelligenceLearnedPattern,
  IntelligenceReport,
  IntelligenceReportIndicator,
  IntelligenceShadowRecommendation,
  IntelligenceSnapshot,
} from "@/lib/intelligence/types";

const EVIDENCE_STEPS: Array<{
  status: IntelligenceEvidenceStatus;
  label: string;
  humanOnly?: true;
}> = [
  { status: "observed", label: "Observed" },
  { status: "potentially_suspicious", label: "Potentially suspicious" },
  { status: "user_reported", label: "User-reported" },
  { status: "corroborated", label: "Corroborated" },
  { status: "bank_verified", label: "Bank-verified", humanOnly: true },
  { status: "cleared", label: "Cleared", humanOnly: true },
];

const RECOMMENDATION_LABELS: Record<IntelligenceShadowRecommendation, string> = {
  insufficient_evidence: "More evidence needed",
  monitor_in_shadow: "Monitor in Shadow Mode",
  pause_and_verify: "Pause and verify",
  human_review_recommended: "Human review recommended",
};

const CHOICES = [
  {
    id: "stop",
    label: "Stop and report",
    response: "You previewed pausing and reporting the contact for review.",
  },
  {
    id: "verify",
    label: "Verify independently",
    response: "You previewed verifying through an official contact you find independently.",
  },
  {
    id: "trusted",
    label: "Review with trusted contact",
    response: "You previewed reviewing the evidence with someone you trust.",
  },
  {
    id: "continue",
    label: "Continue after additional verification",
    response: "You previewed waiting for additional verification before deciding what to do.",
  },
] as const;

type ChoiceId = (typeof CHOICES)[number]["id"];

interface IndicatorMatch {
  indicator: IntelligenceReportIndicator;
  reportCount: number;
}

interface ScamLinkModel {
  pattern: IntelligenceLearnedPattern;
  reports: IntelligenceReport[];
  phone: IndicatorMatch | null;
  bridge: IndicatorMatch | null;
  account: IndicatorMatch | null;
  evidenceSourceCount: number;
  reportStatuses: IntelligenceEvidenceStatus[];
  graphStatuses: IntelligenceEvidenceStatus[];
  currentStatus: IntelligenceEvidenceStatus;
  bullets: string[];
}

function evidenceLabel(status: IntelligenceEvidenceStatus) {
  return EVIDENCE_STEPS.find((step) => step.status === status)?.label ?? status;
}

function formatConfidence(value: number) {
  const normalized = value <= 1 ? value * 100 : value;
  return String(Math.round(normalized)) + "%";
}

function bestIndicator(
  reports: IntelligenceReport[],
  kinds: IntelligenceIndicatorKind[],
): IndicatorMatch | null {
  const matches = new Map<
    string,
    { indicator: IntelligenceReportIndicator; reportIds: Set<string> }
  >();

  for (const report of reports) {
    for (const indicator of report.indicators) {
      if (!kinds.includes(indicator.kind)) continue;
      const key = indicator.kind + ":" + indicator.normalizedValue;
      const existing = matches.get(key) ?? {
        indicator,
        reportIds: new Set<string>(),
      };
      existing.reportIds.add(report.id);
      matches.set(key, existing);
    }
  }

  const best = Array.from(matches.values()).sort((left, right) => {
    const countDifference = right.reportIds.size - left.reportIds.size;
    if (countDifference !== 0) return countDifference;
    return left.indicator.normalizedValue.localeCompare(
      right.indicator.normalizedValue,
    );
  })[0];

  return best
    ? { indicator: best.indicator, reportCount: best.reportIds.size }
    : null;
}

function selectPattern(patterns: IntelligenceLearnedPattern[]) {
  const eligible = patterns.filter(
    (pattern) => pattern.evidenceReportIds.length >= 2,
  );
  const emerging = eligible.filter((pattern) => pattern.status === "emerging");
  const pool = emerging.length > 0 ? emerging : eligible;

  return [...pool].sort(
    (left, right) =>
      right.confidence - left.confidence ||
      right.evidenceReportIds.length - left.evidenceReportIds.length,
  )[0];
}

function buildLinkModel(snapshot: IntelligenceSnapshot): ScamLinkModel | null {
  const pattern = selectPattern(snapshot.patterns);
  if (!pattern) return null;

  const reportsById = new Map(
    snapshot.reports.map((report) => [report.id, report]),
  );
  const reports = pattern.evidenceReportIds.flatMap((id) => {
    const report = reportsById.get(id);
    return report ? [report] : [];
  });
  if (reports.length < 2) return null;

  const phone = bestIndicator(reports, ["phone"]);
  const bridge = bestIndicator(reports, ["url", "phrase"]);
  const account = bestIndicator(reports, ["account"]);
  const evidenceSourceCount = new Set(
    reports.flatMap((report) =>
      report.evidenceSources.map((source) => source.id),
    ),
  ).size;
  const evidenceReportIds = new Set(reports.map((report) => report.id));
  const relevantNodes = snapshot.graph.nodes.filter((node) =>
    node.reportIds.some((reportId) => evidenceReportIds.has(reportId)),
  );
  const relevantNodeIds = new Set(relevantNodes.map((node) => node.id));
  const relevantEdges = snapshot.graph.edges.filter(
    (edge) =>
      relevantNodeIds.has(edge.source) && relevantNodeIds.has(edge.target),
  );
  const bullets = [
    String(reports.length) +
      " synthetic reports contribute evidence to this possible link.",
  ];

  if (phone) {
    bullets.push(
      phone.indicator.label +
        " appears in " +
        String(phone.reportCount) +
        " of the linked reports.",
    );
  }
  if (bridge) {
    bullets.push(
      bridge.indicator.label +
        " appears in " +
        String(bridge.reportCount) +
        " of the linked reports.",
    );
  }
  if (account) {
    bullets.push(
      account.indicator.label +
        " appears in " +
        String(account.reportCount) +
        " of the linked reports.",
    );
  }
  if (bullets.length < 3) {
    bullets.push(
      String(evidenceSourceCount) +
        " synthetic evidence sources retain review and expiry dates.",
    );
  }
  if (bullets.length < 3) {
    bullets.push(
      "The deterministic pattern score is " +
        formatConfidence(pattern.confidence) +
        "; it is not a fraud verdict.",
    );
  }

  return {
    pattern,
    reports,
    phone,
    bridge,
    account,
    evidenceSourceCount,
    reportStatuses: Array.from(
      new Set(reports.map((report) => report.governance.status)),
    ),
    graphStatuses: Array.from(
      new Set([
        ...relevantNodes.map((node) => node.governance.status),
        ...relevantEdges.map((edge) => edge.governance.status),
      ]),
    ),
    currentStatus: pattern.governance.status,
    bullets: bullets.slice(0, 4),
  };
}

function MapNode({
  step,
  title,
  value,
  tone,
}: {
  step: string;
  title: string;
  value: string;
  tone: "cyan" | "violet" | "amber" | "emerald";
}) {
  const styles = {
    cyan: "border-cyan-300/20 bg-cyan-300/[0.065] text-cyan-200",
    violet: "border-violet-300/20 bg-violet-300/[0.065] text-violet-200",
    amber: "border-amber-300/20 bg-amber-300/[0.065] text-amber-200",
    emerald: "border-emerald-300/20 bg-emerald-300/[0.065] text-emerald-200",
  } as const;

  return (
    <div className={["min-w-0 rounded-xl border p-4", styles[tone]].join(" ")}>
      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] opacity-65">
        {step}
      </p>
      <p className="mt-2 text-xs font-semibold text-slate-100">{title}</p>
      <p className="mt-1.5 break-words font-mono text-[10px] leading-4 text-slate-400">
        {value}
      </p>
    </div>
  );
}

function MapArrow() {
  return (
    <span
      className="grid h-7 place-items-center text-slate-700 md:h-auto"
      aria-hidden="true"
    >
      <svg
        className="size-4 rotate-90 md:rotate-0"
        fill="none"
        viewBox="0 0 20 20"
      >
        <path
          d="M3 10h13m-4-4 4 4-4 4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.4"
        />
      </svg>
    </span>
  );
}

function LearningLoop() {
  const steps = [
    "Synthetic report",
    "Seven agents compare",
    "Graph memory updates",
    "Customer learns safely",
  ];

  return (
    <div className="border-t border-white/7 bg-[#07101b]/80 px-5 py-4 sm:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <p className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-300/65">
          Learning loop · simulated
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
          {steps.map((step, index) => (
            <span key={step} className="contents">
              <span className="rounded-md border border-white/8 bg-white/[0.025] px-2.5 py-1.5">
                {step}
              </span>
              {index < steps.length - 1 ? (
                <span className="text-slate-700" aria-hidden="true">
                  →
                </span>
              ) : null}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function EvidenceLadder({ model }: { model: ScamLinkModel }) {
  const graphStatusSummary = model.graphStatuses
    .map((status) => evidenceLabel(status))
    .join(", ");

  return (
    <div className="rounded-xl border border-white/8 bg-[#07101b]/75 p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">
            Evidence-confidence categories
          </p>
          <p className="mt-1.5 text-xs text-slate-400">
            Current pattern status:{" "}
            <strong className="font-semibold text-emerald-200">
              {evidenceLabel(model.currentStatus)}
            </strong>
          </p>
        </div>
        <p className="text-[10px] text-slate-600">
          {model.reports.length} linked reports inform this view; count does not
          auto-promote status
        </p>
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {EVIDENCE_STEPS.map((step) => {
          const isCurrent = step.status === model.currentStatus;
          const appliesToReports = model.reportStatuses.includes(step.status);
          const appliesToGraph = model.graphStatuses.includes(step.status);
          const hasEvidenceRecord = isCurrent || appliesToReports || appliesToGraph;
          const className = isCurrent
            ? "border-emerald-300/35 bg-emerald-300/10"
            : hasEvidenceRecord
              ? "border-emerald-300/12 bg-emerald-300/[0.035]"
              : "border-white/7 bg-white/[0.018]";

          return (
            <li
              key={step.status}
              aria-current={isCurrent ? "true" : undefined}
              className={["relative rounded-lg border px-3 py-3", className].join(
                " ",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={[
                    "grid size-5 place-items-center rounded-full border font-mono text-[8px]",
                    hasEvidenceRecord
                      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                      : "border-white/10 text-slate-700",
                  ].join(" ")}
                >
                  {step.humanOnly ? "H" : "•"}
                </span>
                {isCurrent ? (
                  <span className="font-mono text-[7px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                    Current
                  </span>
                ) : null}
              </div>
              <p
                className={[
                  "mt-2 text-[10px]",
                  hasEvidenceRecord ? "text-slate-300" : "text-slate-600",
                ].join(" ")}
              >
                {step.label}
              </p>
              {hasEvidenceRecord ? (
                <p className="mt-1 text-[8px] leading-3 text-slate-600">
                  {[
                    isCurrent ? "Pattern" : null,
                    appliesToReports ? "Reports" : null,
                    appliesToGraph ? "Graph" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-col gap-2 text-[10px] leading-4 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Graph evidence records: {graphStatusSummary || "None yet"}. Pattern confidence:{" "}
          {formatConfidence(model.pattern.governance.confidence)}.
        </span>
        <span className="text-amber-200/65">
          Statuses are governed categories, not automatic steps. Bank-verified
          and Cleared require human review.
        </span>
      </div>
    </div>
  );
}

export default function ScamLinkMap({
  snapshot,
}: {
  snapshot: IntelligenceSnapshot;
}) {
  const [selectedChoice, setSelectedChoice] = useState<ChoiceId | null>(null);
  const model = useMemo(() => buildLinkModel(snapshot), [snapshot]);
  const selected = CHOICES.find((choice) => choice.id === selectedChoice);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#0a1320]/95 shadow-[0_20px_70px_rgba(0,0,0,0.18)]">
      <div className="flex flex-col gap-4 border-b border-white/8 px-5 py-6 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/75">
            Customer-facing concept · lab mock
          </p>
          <h2 className="text-xl font-semibold tracking-[-0.025em] text-white sm:text-2xl">
            Scam Link Map
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            The agents investigate. The graph remembers. The user learns.
          </p>
        </div>
        <div className="flex w-fit flex-wrap items-center gap-2">
          <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-amber-200">
            Not enforced
          </span>
          <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.13em] text-emerald-200">
            Shadow education only
          </span>
        </div>
      </div>

      {!model ? (
        <div className="px-5 py-10 text-center sm:px-6 sm:py-14">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-dashed border-cyan-300/20 bg-cyan-300/[0.045] font-mono text-xs text-cyan-200">
            0→2
          </span>
          <h3 className="mt-4 text-sm font-semibold text-white">
            More evidence is needed to draw a careful link
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-slate-500">
            Process at least two related synthetic reports using the simulation
            controls above. The map stays empty until there is enough evidence
            to avoid implying a connection too early.
          </p>
        </div>
      ) : (
        <div className="space-y-5 p-4 sm:p-5 lg:p-6">
          <div className="rounded-xl border border-amber-300/18 bg-amber-300/[0.055] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-amber-300/20 bg-amber-300/10 font-serif text-sm font-bold text-amber-200">
                !
              </span>
              <div>
                <p className="text-sm font-semibold text-amber-100">
                  Similar details may be connected across {model.reports.length}{" "}
                  synthetic reports.
                </p>
                <p className="mt-1.5 text-xs leading-5 text-amber-100/60">
                  Similar details can have innocent explanations. This map shows
                  explainable associations, not confirmed fraud. Pause and
                  verify independently before making a decision.
                </p>
              </div>
            </div>
          </div>

          <div className="grid items-stretch md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
            <MapNode
              step="Phone detail"
              title={model.phone?.indicator.label ?? "No phone linked yet"}
              value={
                model.phone?.indicator.value ??
                "Awaiting another evidence source"
              }
              tone="cyan"
            />
            <MapArrow />
            <MapNode
              step={
                model.bridge?.indicator.kind === "url"
                  ? "URL detail"
                  : "Phrase detail"
              }
              title={
                model.bridge?.indicator.label ??
                "No phrase or URL linked yet"
              }
              value={
                model.bridge?.indicator.value ??
                "Awaiting another evidence source"
              }
              tone="violet"
            />
            <MapArrow />
            <MapNode
              step="Account detail"
              title={model.account?.indicator.label ?? "No account linked yet"}
              value={
                model.account?.indicator.value ??
                "Awaiting another evidence source"
              }
              tone="amber"
            />
            <MapArrow />
            <MapNode
              step="Graph memory"
              title="Related reports"
              value={
                String(model.reports.length) + " related synthetic reports"
              }
              tone="emerald"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-xl border border-white/8 bg-white/[0.022] p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">
                    Why the map surfaced this
                  </p>
                  <h3 className="mt-2 text-sm font-semibold text-white">
                    {model.pattern.name}
                  </h3>
                </div>
                <span className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-2.5 py-1 text-[9px] text-cyan-200">
                  {model.evidenceSourceCount} governed sources
                </span>
              </div>
              <ul className="mt-4 space-y-2.5">
                {model.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex gap-2.5 text-[11px] leading-5 text-slate-400"
                  >
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-cyan-300/60" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-emerald-300/12 bg-emerald-300/[0.035] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-300/70">
                  Shadow recommendation
                </p>
                <span className="rounded-full border border-amber-300/15 bg-amber-300/[0.07] px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-amber-200">
                  Not enforced
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-white">
                {
                  RECOMMENDATION_LABELS[
                    snapshot.shadowOutput.recommendation
                  ]
                }
              </p>
              <p className="mt-1.5 text-xs leading-5 text-slate-400">
                {snapshot.shadowOutput.education.summary}
              </p>
              {snapshot.shadowOutput.education.warningSigns.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {snapshot.shadowOutput.education.warningSigns
                    .slice(0, 3)
                    .map((sign) => (
                      <span
                        key={sign}
                        className="rounded-md border border-white/8 bg-[#07101b]/60 px-2 py-1 text-[9px] text-slate-400"
                      >
                        {sign}
                      </span>
                    ))}
                </div>
              ) : null}
              <p className="mt-4 border-t border-emerald-300/10 pt-3 text-[9px] leading-4 text-emerald-100/45">
                Education only. The Orchestrator is in Shadow Mode, is not
                connected to the main flow, and cannot stop or approve a
                transfer.
              </p>
            </div>
          </div>

          <EvidenceLadder model={model} />

          <div className="rounded-xl border border-white/8 bg-white/[0.022] p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">
                  What would you do next?
                </p>
                <p className="mt-1.5 text-xs text-slate-400">
                  These buttons demonstrate education choices inside the lab
                  only.
                </p>
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-200/65">
                No banking action
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {CHOICES.map((choice) => {
                const isSelected = selectedChoice === choice.id;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedChoice(choice.id)}
                    className={[
                      "min-h-11 rounded-lg border px-3 py-2.5 text-left text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-300/50",
                      isSelected
                        ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100"
                        : "border-white/9 bg-white/[0.025] text-slate-300 hover:border-white/18 hover:bg-white/[0.05]",
                    ].join(" ")}
                  >
                    {choice.label}
                  </button>
                );
              })}
            </div>
            <div
              aria-live="polite"
              className={[
                "mt-3 rounded-lg border px-3 py-2.5 text-[11px] leading-5",
                selected
                  ? "border-cyan-300/15 bg-cyan-300/[0.045] text-slate-300"
                  : "border-dashed border-white/7 text-slate-600",
              ].join(" ")}
            >
              {selected ? (
                <>
                  {selected.response}{" "}
                  <strong className="font-semibold text-cyan-200">
                    No report, message, or transfer action was sent.
                  </strong>
                </>
              ) : (
                "Choose an option to preview the lab-only response. No report, message, or transfer action will be sent."
              )}
            </div>
          </div>
        </div>
      )}

      <LearningLoop />
    </section>
  );
}
