/*
  Read-only client for the MADX suite research API (:7790). The suite owns
  run records, strategy-health lights and the leaderboard; Edge Stats only
  displays them, with the run's trade count, window, source tag and mode.
*/
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
export const SUITE_API = env?.VITE_SUITE_API ?? "http://127.0.0.1:7790";

export type Light = "pass" | "caution" | "issue" | "unknown";

export type HealthLight = {
  id: string;
  label: string;
  value: number | null;
  light: Light;
  plain: string;
  source: string;
};

export type HealthReport = {
  ok: boolean;
  run_id: string;
  n: number;
  window: string | null;
  payoff: number | null;
  lights: HealthLight[];
  overall: { pass: number; caution: number; issue: number };
  provenance_tag?: string | null;
  mode?: string | null;
  fees_scope?: string | null;
  f_ids?: string[];
  tags?: string[];
  note?: string | null;
  rule?: string;
  error?: string;
};

export type RunRow = {
  id: string;
  name: string;
  run_id: string;
  n: number | null;
  window: string | null;
  provenance: string | null;
  mode: string | null;
  reason?: string;
};

export type RunBoard = { ranked: RunRow[]; unranked?: RunRow[] };

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${SUITE_API}${path}`, { signal: signal ?? null });
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || body === null) {
    throw new Error(body?.error ?? `The suite answered HTTP ${res.status}`);
  }
  return body;
}

export const suite = {
  runs: (signal?: AbortSignal) => getJson<RunBoard>("/api/v1/leaderboard?kind=run&metric=pf", signal),
  health: (runId: string, signal?: AbortSignal) =>
    getJson<HealthReport>(`/api/v1/strategy_health/${encodeURIComponent(runId)}`, signal),
};
