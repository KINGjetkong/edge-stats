/*
  '/health': plain pass / caution / issue checks on one recorded run's trade
  list, read from the suite. Every light keeps its run's trade count, window,
  source tag and mode beside it; the raw value and rule source sit behind
  "More details".
*/
import { useState } from "react";
import { CircleAlert, CircleCheck, CircleHelp, CircleX, Info } from "lucide-react";
import { useAsync } from "../lib/hooks";
import { fmtInt } from "../lib/format";
import { suite } from "../lib/suite";
import type { HealthLight, HealthReport, Light, RunRow } from "../lib/suite";
import { Badge, EmptyState, NativeSelect, Panel, PanelHeader, Skeleton } from "../components/ui";
import type { Tone } from "../components/ui";

const LIGHT: Record<Light, { tone: Tone; word: string; Icon: typeof CircleCheck }> = {
  pass: { tone: "green", word: "Pass", Icon: CircleCheck },
  caution: { tone: "warn", word: "Caution", Icon: CircleAlert },
  issue: { tone: "red", word: "Issue", Icon: CircleX },
  unknown: { tone: "dim", word: "Not enough data", Icon: CircleHelp },
};

const EXPLAIN: Record<string, string> = {
  profit_factor:
    "Profit factor: money won on winning trades divided by money lost on losing trades. Above 1 means it made more than it lost. Very high values often mean too few trades or an over-fitted test.",
  win_rate:
    "Win rate: the share of trades that made money. It only means something next to payoff (average win ÷ average loss) and the number of trades.",
  concentration:
    "How much of the total profit came from the best 5% of trades. A high share means a few lucky trades carry the result.",
  profitable_months: "The share of calendar months (New York time) that ended with a profit.",
  performance_decay:
    "Profit factor of the newer half of trades divided by the older half. Below 1 means results are getting worse lately.",
  drawdown_to_profit:
    "The worst peak-to-bottom drop in running profit, as a share of total profit. Smaller is steadier.",
  sample_size: "How many trades the checks are based on. Few trades make every other number shaky.",
};

function InfoButton({ open, onToggle, label }: { open: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={`What does ${label} mean?`}
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-faint hover:text-foreground"
    >
      <Info className="size-3.5" aria-hidden="true" />
    </button>
  );
}

function LightBadge({ light }: { light: Light }) {
  const { tone, word, Icon } = LIGHT[light] ?? LIGHT.unknown;
  return (
    <Badge tone={tone}>
      <Icon className="size-3" aria-hidden="true" />
      {word}
    </Badge>
  );
}

function LightCard({ item }: { item: HealthLight }) {
  const [explain, setExplain] = useState(false);
  const meaning = EXPLAIN[item.id] ?? item.label;
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
          <span className="truncate">{item.label}</span>
          <InfoButton open={explain} onToggle={() => setExplain((v) => !v)} label={item.label} />
        </div>
        <LightBadge light={item.light} />
      </div>
      {explain ? (
        <p className="mt-2 rounded-lg border border-border bg-white/[0.03] p-3 text-xs leading-relaxed text-muted-foreground">
          {meaning}
        </p>
      ) : null}
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.plain}</p>
      <details className="mt-3 text-xs text-faint">
        <summary className="cursor-pointer select-none">More details</summary>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono">
          <dt>raw value</dt>
          <dd className="stat">{item.value === null ? "—" : String(item.value)}</dd>
          <dt>check id</dt>
          <dd>{item.id}</dd>
          <dt>cut-offs from</dt>
          <dd>{item.source}</dd>
        </dl>
      </details>
    </Panel>
  );
}

function RunHeader({ report }: { report: HealthReport }) {
  return (
    <Panel accent="prism">
      <PanelHeader>run record · {report.run_id}</PanelHeader>
      <div className="flex flex-wrap items-center gap-2 p-4">
        <Badge tone="dim">
          <span className="stat font-mono">{fmtInt(report.n)} trades</span>
        </Badge>
        {report.window ? <Badge tone="dim">{report.window} (New York time)</Badge> : null}
        {report.mode ? <Badge tone="accent">{report.mode}</Badge> : null}
        {(report.tags ?? (report.provenance_tag ? [report.provenance_tag] : [])).map((t) => (
          <Badge key={t} tone={t === "[PARTLY-IS]" || t === "[LOOKAHEAD]" ? "warn" : "dim"}>
            <span className="font-mono">{t}</span>
          </Badge>
        ))}
        {(report.f_ids ?? []).map((f) => (
          <Badge key={f} tone="dim">
            <span className="font-mono">{f}</span>
          </Badge>
        ))}
        {report.fees_scope === "FEES_EXCLUDED_PURE_MATH" ? (
          <Badge tone="dim">fees not included</Badge>
        ) : report.fees_scope ? (
          <Badge tone="dim">{report.fees_scope}</Badge>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-4 border-t border-white/[0.06] px-4 py-3 text-sm">
        <span className="text-success">{report.overall.pass} pass</span>
        <span className="text-warning">{report.overall.caution} caution</span>
        <span className="text-destructive">{report.overall.issue} issue</span>
      </div>
      {report.note ? (
        <p className="border-t border-white/[0.06] px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          {report.note}
        </p>
      ) : null}
    </Panel>
  );
}

function initialRun(): string {
  return new URLSearchParams(window.location.search).get("run") ?? "";
}

export function HealthPage() {
  const runs = useAsync((signal) => suite.runs(signal), []);
  const [picked, setPicked] = useState(initialRun);
  const ranked: RunRow[] = runs.data?.ranked ?? [];
  const unranked: RunRow[] = runs.data?.unranked ?? [];
  const runId = picked || ranked[0]?.run_id || "";
  const report = useAsync(
    (signal) => (runId ? suite.health(runId, signal) : Promise.resolve(null)),
    [runId],
  );

  const choose = (id: string) => {
    setPicked(id);
    const url = new URL(window.location.href);
    url.searchParams.set("run", id);
    window.history.replaceState(null, "", url);
  };

  return (
    <div>
      <h1 className="text-2xl font-medium tracking-tight">Strategy health</h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Quick pass / caution / issue checks on a run's recorded trades. They are research checks,
        not trade advice. Tap <Info className="inline size-3.5 align-[-2px]" aria-label="the info icon" /> on any
        check to see what it means.
      </p>

      <div className="mt-6 max-w-xl">
        {runs.loading ? (
          <Skeleton className="h-9 w-full" />
        ) : runs.error ? (
          <EmptyState title="Can't reach the research suite">
            <p>Start the suite on :7790, then reload. ({runs.error.message})</p>
          </EmptyState>
        ) : (
          <label className="block text-xs text-faint">
            Run
            <NativeSelect
              value={runId}
              onChange={(e) => choose(e.target.value)}
              wrapperClassName="mt-1 flex w-full"
              className="w-full"
            >
              {ranked.map((r) => (
                <option key={r.run_id} value={r.run_id}>
                  {r.name} · {r.n === null ? "?" : fmtInt(r.n)} trades
                </option>
              ))}
              {unranked.map((r) => (
                <option key={r.run_id} value={r.run_id}>
                  {r.run_id} · {r.reason ?? "no trade count"}
                </option>
              ))}
            </NativeSelect>
          </label>
        )}
      </div>

      <div className="mt-6 space-y-6">
        {report.loading && runId ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : report.error ? (
          <EmptyState title="No health checks for this run">
            <p>{report.error.message}</p>
          </EmptyState>
        ) : report.data ? (
          <>
            <RunHeader report={report.data} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {report.data.lights.map((item) => (
                <LightCard key={item.id} item={item} />
              ))}
            </div>
            {report.data.rule ? <p className="text-xs text-faint">{report.data.rule}</p> : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
