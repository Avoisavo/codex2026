"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type {
  IntelligenceAction,
  IntelligenceAgentName,
  IntelligenceAgentProfile,
  IntelligenceAgentRun,
  IntelligenceAgentTrace,
  IntelligenceGraphEdge,
  IntelligenceGraphNode,
  IntelligenceGraphNodeKind,
  IntelligenceLearnedPattern,
  IntelligenceReport,
  IntelligenceRiskLevel,
  IntelligenceShadowRule,
  IntelligenceSnapshot,
} from "@/lib/intelligence/types";

import ScamLinkMap from "./ScamLinkMap";

const RISK_ORDER: Record<IntelligenceRiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const RISK_STYLES: Record<
  IntelligenceRiskLevel,
  { badge: string; graph: string; label: string }
> = {
  low: {
    badge: "border-sky-300/20 bg-sky-300/10 text-sky-200",
    graph: "#38bdf8",
    label: "Low",
  },
  medium: {
    badge: "border-amber-300/20 bg-amber-300/10 text-amber-200",
    graph: "#fbbf24",
    label: "Medium",
  },
  high: {
    badge: "border-orange-300/20 bg-orange-300/10 text-orange-200",
    graph: "#fb923c",
    label: "High",
  },
  critical: {
    badge: "border-rose-300/20 bg-rose-300/10 text-rose-200",
    graph: "#fb7185",
    label: "Critical",
  },
};

const NODE_STYLES: Record<
  IntelligenceGraphNodeKind,
  { fill: string; label: string; shortLabel: string }
> = {
  report: { fill: "#5b8cff", label: "Report", shortLabel: "R" },
  account: { fill: "#a78bfa", label: "Account", shortLabel: "A" },
  phone: { fill: "#22d3ee", label: "Phone", shortLabel: "P" },
  phrase: { fill: "#fbbf24", label: "Phrase", shortLabel: "T" },
  url: { fill: "#fb7185", label: "URL", shortLabel: "U" },
  pattern: { fill: "#4ade80", label: "Pattern", shortLabel: "★" },
};

const AGENT_NUMBERS: Record<IntelligenceAgentName, string> = {
  "Transaction Agent": "01",
  "Conversation Agent": "02",
  "Entity Agent": "03",
  "Graph Agent": "04",
  "Scam Pattern Agent": "05",
  "Education Agent": "06",
  Orchestrator: "07",
};

const GRAPH_COLUMNS: Record<IntelligenceGraphNodeKind, number> = {
  report: 92,
  account: 278,
  phone: 418,
  phrase: 558,
  url: 698,
  pattern: 872,
};

interface ErrorPayload {
  error: string;
}

interface GraphPoint {
  x: number;
  y: number;
}

function isErrorPayload(value: unknown): value is ErrorPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  );
}

async function snapshotFromResponse(
  response: Response,
): Promise<IntelligenceSnapshot> {
  const body: unknown = await response.json();

  if (!response.ok) {
    throw new Error(
      isErrorPayload(body) ? body.error : "The intelligence lab did not respond.",
    );
  }

  return body as IntelligenceSnapshot;
}

async function fetchSnapshot(signal?: AbortSignal) {
  const response = await fetch("/api/intelligence", {
    cache: "no-store",
    signal,
  });
  return snapshotFromResponse(response);
}

function formatDate(value: string | null, includeDate = false) {
  if (!value) return "Not run yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-MY", {
    ...(includeDate
      ? { day: "2-digit", month: "short", year: "numeric" }
      : {}),
    hour: "2-digit",
    minute: "2-digit",
    second: includeDate ? undefined : "2-digit",
  }).format(date);
}

function compactLabel(value: string, length = 22) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

function percentage(value: number) {
  const normalized = value <= 1 ? value * 100 : value;
  return `${Math.round(normalized)}%`;
}

function highestRisk(
  reportIds: string[],
  risksByReport: Map<string, IntelligenceRiskLevel>,
) {
  return reportIds.reduce<IntelligenceRiskLevel | null>((highest, reportId) => {
    const risk = risksByReport.get(reportId);
    if (!risk) return highest;
    if (!highest || RISK_ORDER[risk] > RISK_ORDER[highest]) return risk;
    return highest;
  }, null);
}

function makeGraphLayout(nodes: IntelligenceGraphNode[]) {
  const groups = new Map<IntelligenceGraphNodeKind, IntelligenceGraphNode[]>();

  for (const node of nodes) {
    const group = groups.get(node.kind) ?? [];
    group.push(node);
    groups.set(node.kind, group);
  }

  const layout = new Map<string, GraphPoint>();
  for (const [kind, group] of groups) {
    const ordered = [...group].sort(
      (left, right) => right.weight - left.weight || left.id.localeCompare(right.id),
    );
    const top = 54;
    const bottom = 408;
    const interval = ordered.length > 1 ? (bottom - top) / (ordered.length - 1) : 0;

    ordered.forEach((node, index) => {
      layout.set(node.id, {
        x: GRAPH_COLUMNS[kind],
        y: ordered.length === 1 ? (top + bottom) / 2 : top + interval * index,
      });
    });
  }

  return layout;
}

function LabMark() {
  return (
    <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-emerald-300/25 bg-emerald-300/10 shadow-[0_0_26px_rgba(52,211,153,0.12)]">
      <svg
        aria-hidden="true"
        className="size-5 text-emerald-200"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M9 3h6M10 3v5l-5.2 8.3A3 3 0 0 0 7.35 21h9.3a3 3 0 0 0 2.55-4.7L14 8V3M7.2 14h9.6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
        <circle cx="10" cy="17" fill="currentColor" r=".8" />
        <circle cx="14" cy="18.5" fill="currentColor" r=".65" />
      </svg>
    </span>
  );
}

function ArrowLeftIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20" className="size-4">
      <path
        d="m12.5 4.5-5.5 5.5 5.5 5.5M7.5 10H17"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function SparkIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20" className={className}>
      <path
        d="M10 2.5c.45 3.3 2.2 5.05 5.5 5.5-3.3.45-5.05 2.2-5.5 5.5C9.55 10.2 7.8 8.45 4.5 8 7.8 7.55 9.55 5.8 10 2.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path d="M15.5 13v4M13.5 15h4" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20" className="size-4">
      <path
        d="M4.5 6.3A6.5 6.5 0 1 1 3.6 12M4.5 6.3V2.7m0 3.6h3.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  trailing,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-white/8 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
      <div>
        <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
          {eyebrow}
        </p>
        <h2 className="text-base font-semibold tracking-[-0.01em] text-white sm:text-lg">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400 sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {trailing}
    </div>
  );
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="grid min-h-48 place-items-center px-6 py-10 text-center">
      <div className="max-w-sm">
        <span className="mx-auto mb-4 grid size-10 place-items-center rounded-xl border border-dashed border-white/15 bg-white/[0.025] text-slate-500">
          <SparkIcon />
        </span>
        <p className="text-sm font-medium text-slate-200">{title}</p>
        <p className="mt-1.5 text-xs leading-5 text-slate-500">{copy}</p>
      </div>
    </div>
  );
}

function LoadingLab() {
  return (
    <div className="space-y-5" aria-label="Loading intelligence lab" aria-live="polite">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl border border-white/8 bg-white/[0.035]"
          />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="h-96 animate-pulse rounded-2xl border border-white/8 bg-white/[0.035]" />
        <div className="h-96 animate-pulse rounded-2xl border border-white/8 bg-white/[0.035]" />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: number | string;
  note: string;
  accent: "green" | "blue" | "violet" | "amber" | "rose";
}) {
  const accents = {
    green: "from-emerald-300 to-teal-400 text-emerald-200",
    blue: "from-sky-300 to-blue-500 text-sky-200",
    violet: "from-violet-300 to-fuchsia-500 text-violet-200",
    amber: "from-amber-300 to-orange-500 text-amber-200",
    rose: "from-rose-300 to-pink-500 text-rose-200",
  } as const;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/8 bg-[#0b1422]/90 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.16)]">
      <span
        className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accents[accent]}`}
      />
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <span className={`size-1.5 rounded-full bg-current ${accents[accent]}`} />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</p>
      <p className="mt-2 text-[11px] leading-4 text-slate-500">{note}</p>
    </article>
  );
}

function AgentPipeline({
  agents,
  latestRun,
  isRunning,
}: {
  agents: IntelligenceAgentProfile[];
  latestRun: IntelligenceAgentRun | null;
  isRunning: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#0a1320]/95 shadow-[0_20px_70px_rgba(0,0,0,0.18)]">
      <SectionHeading
        eyebrow="Seven-agent pipeline"
        title="Signal-to-knowledge reasoning chain"
        description="Every stage is deterministic, inspectable, and isolated from transfer decisions."
        trailing={
          <span className="w-fit rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-slate-400">
            {isRunning ? "Pipeline running" : latestRun ? "Last run complete" : "Awaiting signal"}
          </span>
        }
      />
      {agents.length === 0 ? (
        <EmptyState
          title="No agent profiles available"
          copy="The simulated pipeline will appear when the intelligence store is initialized."
        />
      ) : (
        <div className="grid gap-px bg-white/8 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          {agents.map((agent, index) => {
            const completed = latestRun?.traces.some(
              (trace) => trace.agent === agent.name,
            );
            return (
              <article
                key={agent.name}
                className="relative min-h-48 bg-[#0a1320] p-5 transition-colors hover:bg-[#0c1726]"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-[10px] font-semibold tracking-[0.2em] text-slate-600">
                    AGENT {AGENT_NUMBERS[agent.name]}
                  </span>
                  <span
                    className={`grid size-6 place-items-center rounded-full border text-[10px] font-semibold ${
                      isRunning
                        ? "animate-pulse border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                        : completed
                          ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"
                          : "border-white/10 bg-white/[0.025] text-slate-500"
                    }`}
                  >
                    {isRunning ? "•" : completed ? "✓" : index + 1}
                  </span>
                </div>
                <div className="mt-7 flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.035] font-mono text-xs text-emerald-200">
                    {AGENT_NUMBERS[agent.name]}
                  </span>
                  <h3 className="text-sm font-semibold text-white">{agent.name}</h3>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-400">{agent.role}</p>
                <div className="absolute bottom-4 left-5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-slate-600">
                  <span className="size-1 rounded-full bg-emerald-300/60" />
                  No external calls
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ReportCard({ report }: { report: IntelligenceReport }) {
  return (
    <article className="border-b border-white/7 px-5 py-5 last:border-b-0 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] ${
                report.status === "queued"
                  ? "border-amber-300/20 bg-amber-300/10 text-amber-200"
                  : "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
              }`}
            >
              {report.status}
            </span>
            <span className="font-mono text-[10px] text-slate-600">{report.id}</span>
          </div>
          <h3 className="text-sm font-semibold text-slate-100">{report.title}</h3>
        </div>
        {report.riskLevel && report.riskScore !== null ? (
          <span
            className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-semibold ${RISK_STYLES[report.riskLevel].badge}`}
          >
            {report.riskScore} · {RISK_STYLES[report.riskLevel].label}
          </span>
        ) : (
          <span className="w-fit rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[10px] text-slate-500">
            Awaiting review
          </span>
        )}
      </div>
      <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-400">
        {report.narrative}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-slate-500">
        <span>{report.channel}</span>
        <span className="size-0.5 rounded-full bg-slate-700" />
        <span>{report.location}</span>
        <span className="size-0.5 rounded-full bg-slate-700" />
        <span>{report.scamType}</span>
        <span className="ml-auto">{formatDate(report.receivedAt)}</span>
      </div>
      {report.indicators.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {report.indicators.slice(0, 4).map((indicator) => (
            <span
              key={`${indicator.kind}-${indicator.normalizedValue}`}
              title={indicator.value}
              className="max-w-full truncate rounded-md border border-white/8 bg-white/[0.025] px-2 py-1 font-mono text-[9px] text-slate-400"
            >
              {indicator.kind}: {indicator.label}
            </span>
          ))}
          {report.indicators.length > 4 ? (
            <span className="px-1 py-1 text-[9px] text-slate-600">
              +{report.indicators.length - 4} more
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function ReportFeed({ reports }: { reports: IntelligenceReport[] }) {
  const orderedReports = useMemo(
    () =>
      [...reports].sort((left, right) => {
        if (left.status !== right.status) return left.status === "queued" ? -1 : 1;
        return right.receivedAt.localeCompare(left.receivedAt);
      }),
    [reports],
  );

  const queued = reports.filter((report) => report.status === "queued").length;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#0a1320]/95 shadow-[0_20px_70px_rgba(0,0,0,0.18)]">
      <SectionHeading
        eyebrow="Synthetic signal feed"
        title="Queued & processed reports"
        description="Synthetic scenarios only; no customer or production data enters this lab."
        trailing={
          <div className="flex w-fit gap-2">
            <span className="rounded-full border border-amber-300/15 bg-amber-300/8 px-2.5 py-1 text-[10px] text-amber-200">
              {queued} queued
            </span>
            <span className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[10px] text-slate-400">
              {reports.length - queued} processed
            </span>
          </div>
        }
      />
      <div className="max-h-[680px] overflow-y-auto">
        {orderedReports.length === 0 ? (
          <EmptyState
            title="No synthetic reports"
            copy="Reset the simulation to restore the demonstration dataset."
          />
        ) : (
          orderedReports.map((report) => <ReportCard key={report.id} report={report} />)
        )}
      </div>
    </section>
  );
}

function TraceItem({ trace, defaultOpen }: { trace: IntelligenceAgentTrace; defaultOpen: boolean }) {
  return (
    <details
      className="group border-b border-white/7 px-5 py-4 last:border-b-0 sm:px-6"
      open={defaultOpen || undefined}
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden">
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-emerald-300/20 bg-emerald-300/8 text-[10px] font-semibold text-emerald-200">
          {trace.order.toString().padStart(2, "0")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-100">{trace.agent}</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-emerald-300/70">
              completed
            </span>
          </span>
          <span className="mt-1 block text-[11px] leading-4 text-slate-500">
            {trace.outputSummary}
          </span>
        </span>
        <svg
          aria-hidden="true"
          className="mt-1 size-4 shrink-0 text-slate-600 transition-transform group-open:rotate-180"
          fill="none"
          viewBox="0 0 16 16"
        >
          <path d="m4 6 4 4 4-4" stroke="currentColor" strokeLinecap="round" />
        </svg>
      </summary>
      <div className="ml-10 mt-4 space-y-4 border-l border-white/8 pl-4">
        <div>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.13em] text-slate-600">
            Input
          </p>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">{trace.inputSummary}</p>
        </div>
        {trace.decisions.length > 0 ? (
          <div>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.13em] text-slate-600">
              Explainable decisions
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {trace.decisions.map((decision) => (
                <li key={decision} className="flex gap-2 text-[11px] leading-4 text-slate-400">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-emerald-300/60" />
                  {decision}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {trace.evidence.length > 0 ? (
          <div>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.13em] text-slate-600">
              Evidence
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {trace.evidence.map((item) => (
                <span
                  key={item}
                  className="rounded-md border border-white/8 bg-white/[0.025] px-2 py-1 text-[9px] text-slate-500"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function AgentTrace({ run }: { run: IntelligenceAgentRun | null }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#0a1320]/95 shadow-[0_20px_70px_rgba(0,0,0,0.18)]">
      <SectionHeading
        eyebrow="Explainability log"
        title="Latest agent trace"
        description={run?.summary ?? "Run a signal to inspect each deterministic decision."}
        trailing={
          run ? (
            <span className="w-fit font-mono text-[10px] text-slate-500">
              {formatDate(run.completedAt)}
            </span>
          ) : null
        }
      />
      {run && run.traces.length > 0 ? (
        <div className="max-h-[680px] overflow-y-auto">
          {run.traces.map((trace, index) => (
            <TraceItem
              key={trace.id}
              trace={trace}
              defaultOpen={index === run.traces.length - 1}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No reasoning trace yet"
          copy="Analyze the next queued signal to generate a transparent, step-by-step trace."
        />
      )}
    </section>
  );
}

function edgeStroke(edge: IntelligenceGraphEdge) {
  if (edge.relationship === "MATCHES_PATTERN") return "#4ade80";
  if (edge.relationship === "SHARES_ENTITY") return "#a78bfa";
  return "#334155";
}

function KnowledgeGraph({ snapshot }: { snapshot: IntelligenceSnapshot }) {
  const nodes = snapshot.graph.nodes;
  const edges = snapshot.graph.edges;
  const layout = useMemo(() => makeGraphLayout(nodes), [nodes]);
  const risksByReport = useMemo(
    () =>
      new Map(
        snapshot.reports.flatMap((report) =>
          report.riskLevel ? ([[report.id, report.riskLevel]] as const) : [],
        ),
      ),
    [snapshot.reports],
  );

  const visibleKinds = useMemo(
    () => Array.from(new Set(nodes.map((node) => node.kind))),
    [nodes],
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#09121e]/95 shadow-[0_20px_70px_rgba(0,0,0,0.18)]">
      <SectionHeading
        eyebrow="Persisted knowledge graph"
        title="Entity and pattern memory"
        description="Graph facts persist in the isolated simulation store across page reloads. Edges retain the evidence for every link."
        trailing={
          <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/8 px-3 py-1.5 text-[10px] text-emerald-200">
            <span className="size-1.5 rounded-full bg-emerald-300" />
            {snapshot.boundary.store}
          </div>
        }
      />
      {nodes.length === 0 ? (
        <EmptyState
          title="The graph is ready for its first facts"
          copy="Process a synthetic report to persist report, entity, relationship, and pattern nodes."
        />
      ) : (
        <>
          <div className="border-b border-white/7 bg-[#070f1a] px-3 py-4 sm:px-5">
            <div className="overflow-x-auto">
              <svg
                aria-label={`Knowledge graph with ${nodes.length} nodes and ${edges.length} edges`}
                className="h-auto min-w-[780px]"
                role="img"
                viewBox="0 0 960 462"
              >
                <defs>
                  <radialGradient id="graph-background" cx="50%" cy="45%" r="65%">
                    <stop offset="0%" stopColor="#122235" />
                    <stop offset="100%" stopColor="#07101b" />
                  </radialGradient>
                  <filter id="node-glow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <rect width="960" height="462" rx="14" fill="url(#graph-background)" />
                {[92, 278, 418, 558, 698, 872].map((x) => (
                  <line
                    key={x}
                    x1={x}
                    x2={x}
                    y1="28"
                    y2="434"
                    stroke="#ffffff"
                    strokeDasharray="2 10"
                    strokeOpacity="0.035"
                  />
                ))}
                {edges.map((edge) => {
                  const source = layout.get(edge.source);
                  const target = layout.get(edge.target);
                  if (!source || !target) return null;
                  return (
                    <line
                      key={edge.id}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={edgeStroke(edge)}
                      strokeDasharray={
                        edge.relationship === "SHARES_ENTITY"
                          ? "3 5"
                          : edge.relationship === "MATCHES_PATTERN"
                            ? "8 5"
                            : undefined
                      }
                      strokeOpacity={edge.relationship === "MENTIONS" ? 0.28 : 0.58}
                      strokeWidth={Math.min(1 + edge.weight * 0.35, 3)}
                    >
                      <title>{`${edge.relationship}: ${edge.evidence}`}</title>
                    </line>
                  );
                })}
                {nodes.map((node) => {
                  const point = layout.get(node.id);
                  if (!point) return null;
                  const risk = highestRisk(node.reportIds, risksByReport);
                  const radius = Math.min(9 + node.weight * 1.2, 17);
                  const style = NODE_STYLES[node.kind];
                  const showLabel = node.kind === "report" || node.kind === "pattern" || node.weight > 1;
                  return (
                    <g key={node.id} transform={`translate(${point.x} ${point.y})`}>
                      <title>{`${style.label}: ${node.label} · ${node.reportIds.length} linked report${node.reportIds.length === 1 ? "" : "s"}`}</title>
                      {risk ? (
                        <circle
                          fill="none"
                          r={radius + 4}
                          stroke={RISK_STYLES[risk].graph}
                          strokeOpacity="0.7"
                          strokeWidth="1.7"
                        />
                      ) : null}
                      <circle
                        fill={style.fill}
                        fillOpacity="0.18"
                        filter="url(#node-glow)"
                        r={radius}
                        stroke={style.fill}
                        strokeOpacity="0.9"
                        strokeWidth="1.4"
                      />
                      <text
                        dominantBaseline="central"
                        fill={style.fill}
                        fontFamily="monospace"
                        fontSize="8"
                        fontWeight="700"
                        textAnchor="middle"
                      >
                        {style.shortLabel}
                      </text>
                      {showLabel ? (
                        <text
                          dominantBaseline="central"
                          fill="#aebdce"
                          fontSize="8.5"
                          textAnchor={point.x > 800 ? "end" : "start"}
                          x={point.x > 800 ? -(radius + 7) : radius + 7}
                        >
                          {compactLabel(node.label, 20)}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
          <div className="grid gap-5 px-5 py-5 text-[10px] sm:grid-cols-3 sm:px-6">
            <div>
              <p className="mb-2 font-mono font-semibold uppercase tracking-[0.13em] text-slate-600">
                Node type
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-2">
                {visibleKinds.map((kind) => (
                  <span key={kind} className="flex items-center gap-1.5 text-slate-400">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: NODE_STYLES[kind].fill }}
                    />
                    {NODE_STYLES[kind].label}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 font-mono font-semibold uppercase tracking-[0.13em] text-slate-600">
                Risk ring
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-2">
                {(Object.keys(RISK_STYLES) as IntelligenceRiskLevel[]).map((risk) => (
                  <span key={risk} className="flex items-center gap-1.5 text-slate-400">
                    <span
                      className="size-2 rounded-full border-2 bg-transparent"
                      style={{ borderColor: RISK_STYLES[risk].graph }}
                    />
                    {RISK_STYLES[risk].label}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 font-mono font-semibold uppercase tracking-[0.13em] text-slate-600">
                Relationship
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-2 text-slate-400">
                <span>— Mentions</span>
                <span className="text-violet-300">┄ Shares entity</span>
                <span className="text-emerald-300">╌ Matches pattern</span>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function PatternCard({
  pattern,
  rule,
}: {
  pattern: IntelligenceLearnedPattern;
  rule: IntelligenceShadowRule | undefined;
}) {
  return (
    <article className="rounded-xl border border-white/8 bg-white/[0.025] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] ${
                pattern.status === "emerging"
                  ? "border-rose-300/20 bg-rose-300/10 text-rose-200"
                  : "border-sky-300/20 bg-sky-300/10 text-sky-200"
              }`}
            >
              {pattern.status}
            </span>
            <span className="text-[10px] text-slate-600">{pattern.scamType}</span>
          </div>
          <h3 className="text-sm font-semibold text-white">{pattern.name}</h3>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-emerald-200">
            {percentage(pattern.confidence)}
          </p>
          <p className="text-[9px] uppercase tracking-[0.12em] text-slate-600">confidence</p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">{pattern.description}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {pattern.sharedIndicators.map((indicator) => (
          <span
            key={`${indicator.kind}-${indicator.normalizedValue}`}
            className="rounded-md border border-white/8 bg-[#08111d] px-2 py-1 font-mono text-[9px] text-slate-400"
          >
            {indicator.kind}: {indicator.label}
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/7 pt-4 text-[10px] text-slate-500">
        <span>{pattern.evidenceReportIds.length} evidence reports</span>
        <span>Learned {formatDate(pattern.lastLearnedAt)}</span>
      </div>
      {rule ? (
        <div className="mt-4 rounded-lg border border-amber-300/12 bg-amber-300/[0.045] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.13em] text-amber-200/80">
              Candidate threat rule
            </p>
            <span className="rounded-full border border-amber-300/15 px-2 py-0.5 text-[9px] text-amber-200">
              Shadow only
            </span>
          </div>
          <p className="mt-2 text-[11px] font-medium text-slate-300">{rule.name}</p>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">{rule.condition}</p>
        </div>
      ) : null}
    </article>
  );
}

function EmergingPatterns({
  patterns,
  rules,
}: {
  patterns: IntelligenceLearnedPattern[];
  rules: IntelligenceShadowRule[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#0a1320]/95 shadow-[0_20px_70px_rgba(0,0,0,0.18)]">
      <SectionHeading
        eyebrow="Learned pattern memory"
        title="Emerging patterns & candidate threats"
        description="Candidates accumulate explainable evidence in Shadow Mode; they are never deployed into banking rules."
        trailing={
          <span className="w-fit rounded-full border border-rose-300/15 bg-rose-300/8 px-3 py-1.5 text-[10px] text-rose-200">
            {rules.length} shadow candidates
          </span>
        }
      />
      {patterns.length === 0 ? (
        <EmptyState
          title="No patterns learned yet"
          copy="Shared entities and repeated tactics will become explainable candidates as reports are processed."
        />
      ) : (
        <div className="grid gap-3 p-4 lg:grid-cols-2 sm:p-5">
          {patterns.map((pattern) => (
            <PatternCard
              key={pattern.id}
              pattern={pattern}
              rule={rules.find((rule) => rule.supportingPatternId === pattern.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function InitialError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <section className="rounded-2xl border border-rose-300/15 bg-rose-300/[0.045] px-6 py-12 text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-xl border border-rose-300/20 bg-rose-300/10 text-lg text-rose-200">
        !
      </span>
      <h2 className="mt-4 text-base font-semibold text-white">The lab could not load</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">{message}</p>
      <button
        type="button"
        onClick={retry}
        className="mt-5 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-300/50"
      >
        Try again
      </button>
    </section>
  );
}

export default function IntelligenceLab() {
  const [snapshot, setSnapshot] = useState<IntelligenceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<IntelligenceAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = async () => {
    setLoading(true);
    setError(null);

    try {
      setSnapshot(await fetchSnapshot());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load the lab.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    void fetchSnapshot(controller.signal)
      .then((nextSnapshot) => {
        setSnapshot(nextSnapshot);
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load the lab.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const runAction = async (action: IntelligenceAction) => {
    setPendingAction(action);
    setError(null);

    try {
      const response = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setSnapshot(await snapshotFromResponse(response));
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The simulation action could not be completed.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const latestRun = snapshot?.agentRuns[0] ?? null;
  const controlsDisabled = pendingAction !== null || !snapshot;
  const queueEmpty = snapshot?.overview.queuedReports === 0;

  return (
    <main className="relative isolate min-h-screen w-full overflow-x-hidden bg-[#060b14] text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[700px] bg-[radial-gradient(circle_at_18%_0%,rgba(52,211,153,0.12),transparent_36%),radial-gradient(circle_at_88%_8%,rgba(56,189,248,0.09),transparent_31%)]" />

      <header className="border-b border-white/8 bg-[#060b14]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <LabMark />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[-0.01em] text-white sm:text-base">
                Scam Intelligence Lab
              </p>
              <p className="mt-0.5 hidden text-[10px] uppercase tracking-[0.16em] text-slate-500 sm:block">
                Deterministic threat-learning sandbox
              </p>
            </div>
          </div>
          <Link
            href="/bank"
            className="flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/50"
          >
            <ArrowLeftIcon />
            <span className="hidden sm:inline">Back to banking</span>
            <span className="sm:hidden">Banking</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1560px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <section
          aria-label="Simulation safety boundary"
          className="flex flex-col gap-3 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.055] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="flex items-center gap-2 rounded-md bg-emerald-300/12 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-200">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-40" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-300" />
              </span>
              Shadow Mode
            </span>
            <span className="text-[11px] font-medium text-emerald-100/80">Simulated</span>
            <span className="hidden h-3 w-px bg-emerald-200/15 sm:block" />
            <span className="text-[11px] font-medium text-emerald-100/80">0 rules deployed</span>
          </div>
          <p className="text-[10px] leading-4 text-emerald-100/50 sm:text-right">
            Isolated from the main banking flow · no transfer decisions changed
          </p>
        </section>

        <section className="grid gap-7 py-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-12 lg:py-14">
          <div className="max-w-4xl">
            <p className="mb-4 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/80">
              <SparkIcon />
              Explainable intelligence simulation
            </p>
            <h1 className="max-w-3xl text-3xl font-semibold leading-[1.08] tracking-[-0.045em] text-white sm:text-5xl lg:text-[58px]">
              Watch scam signals become connected knowledge.
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
              Seven simulated agents compare transaction context and conversation signals, link
              entities, persist graph facts,
              surface repeated tactics, and explain risk. This is a deterministic demo—not live
              model retraining.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:max-w-[480px] lg:justify-end">
            <button
              type="button"
              disabled={controlsDisabled || queueEmpty}
              onClick={() => void runAction("next")}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-2.5 text-xs font-bold text-[#06120f] shadow-[0_12px_32px_rgba(52,211,153,0.16)] transition hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-[#060b14] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SparkIcon />
              {pendingAction === "next" ? "Analyzing signal…" : "Analyze next signal"}
            </button>
            <button
              type="button"
              disabled={controlsDisabled || queueEmpty}
              onClick={() => void runAction("run_all")}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-300/20 bg-sky-300/10 px-4 py-2.5 text-xs font-bold text-sky-100 transition hover:border-sky-300/35 hover:bg-sky-300/15 focus:outline-none focus:ring-2 focus:ring-sky-300/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span aria-hidden="true" className="font-mono text-[10px]">
                ▶▶
              </span>
              {pendingAction === "run_all" ? "Running simulation…" : "Run full simulation"}
            </button>
            <button
              type="button"
              disabled={controlsDisabled}
              onClick={() => void runAction("reset")}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.07] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ResetIcon />
              {pendingAction === "reset" ? "Resetting…" : "Reset"}
            </button>
          </div>
        </section>

        {error && snapshot ? (
          <div
            role="alert"
            className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-rose-300/15 bg-rose-300/[0.055] px-4 py-3 text-xs text-rose-100"
          >
            <span>{error} The last loaded snapshot remains visible.</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="shrink-0 text-rose-200/60 hover:text-rose-100"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        ) : null}

        {loading && !snapshot ? (
          <LoadingLab />
        ) : error && !snapshot ? (
          <InitialError message={error} retry={() => void loadSnapshot()} />
        ) : snapshot ? (
          <div className="space-y-5">
            <section aria-label="Intelligence overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard
                label="Signals processed"
                value={snapshot.overview.processedReports}
                note={`${snapshot.overview.totalReports} synthetic reports in this run`}
                accent="green"
              />
              <KpiCard
                label="Signals queued"
                value={snapshot.overview.queuedReports}
                note={queueEmpty ? "Simulation queue complete" : "Ready for deterministic analysis"}
                accent="amber"
              />
              <KpiCard
                label="Graph facts"
                value={snapshot.overview.graphNodes + snapshot.overview.graphEdges}
                note={`${snapshot.overview.graphNodes} nodes · ${snapshot.overview.graphEdges} evidence edges`}
                accent="blue"
              />
              <KpiCard
                label="Learned patterns"
                value={snapshot.overview.learnedPatterns}
                note="Persisted, explainable pattern memory"
                accent="violet"
              />
              <KpiCard
                label="Candidate threats"
                value={snapshot.overview.candidateRules}
                note="Shadow-only · zero rules deployed"
                accent="rose"
              />
            </section>

            <AgentPipeline
              agents={snapshot.agents}
              latestRun={latestRun}
              isRunning={pendingAction === "next" || pendingAction === "run_all"}
            />

            <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
              <ReportFeed reports={snapshot.reports} />
              <AgentTrace run={latestRun} />
            </div>

            <KnowledgeGraph snapshot={snapshot} />

            <ScamLinkMap snapshot={snapshot} />

            <EmergingPatterns patterns={snapshot.patterns} rules={snapshot.shadowRules} />

            <section className="rounded-2xl border border-white/8 bg-[#0a1320]/80 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="max-w-3xl">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                    Simulation boundary
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Synthetic reports → normalized entities → persisted graph → explainable
                    patterns → shadow candidates. No external AI calls, autonomous deployment,
                    or changes to the transfer flow.
                  </p>
                </div>
                <div className="shrink-0 text-left md:text-right">
                  <p className="text-[10px] text-slate-600">Last simulation run</p>
                  <p className="mt-1 font-mono text-[10px] text-slate-400">
                    {formatDate(snapshot.overview.lastRunAt, true)}
                  </p>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
