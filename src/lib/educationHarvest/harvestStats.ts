export type HarvestRun = { run_key: string; slot: "AM" | "PM"; status: string; claimed_count: number; screened_count: number; buyer_researched_count: number; held_count: number; error_count: number; claim_calls: number; finished_at: string | null; started_at: string };
export type StatusCounts = Partial<Record<"queued" | "claimed" | "institution_screened" | "buyer_researched" | "held" | "error", number>>;

/** Progress counts only completed unique URNs (screened or buyer researched); claims and attempts never count. */
export function harvestProgress(openBaseline: number, c: StatusCounts, runs: HarvestRun[]) {
  const screened = (c.institution_screened ?? 0) + (c.buyer_researched ?? 0);
  const remaining = Math.max(openBaseline - screened, 0);
  const pct = openBaseline > 0 ? Math.round((screened / openBaseline) * 1000) / 10 : 0;
  const done = runs.filter((r) => r.status === "completed");
  const recent = done.slice(0, 14);
  const perRun = recent.length ? recent.reduce((s, r) => s + r.screened_count, 0) / recent.length : 0;
  const runsLeft = perRun > 0 ? Math.ceil(remaining / perRun) : null;
  return {
    screened, remaining, pct,
    buyerResearched: c.buyer_researched ?? 0,
    activeClaims: c.claimed ?? 0, held: c.held ?? 0, errors: c.error ?? 0,
    lastAM: runs.find((r) => r.slot === "AM") ?? null,
    lastPM: runs.find((r) => r.slot === "PM") ?? null,
    lastSuccess: done.find((r) => r.screened_count > 0) ?? null,
    repeatClaimCalls: runs.reduce((s, r) => s + Math.max(r.claim_calls - 1, 0), 0),
    estimatedDaysLeft: runsLeft === null ? null : Math.ceil(runsLeft / 2),
  };
}
