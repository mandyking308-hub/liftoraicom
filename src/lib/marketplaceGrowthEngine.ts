import { supabase } from "@/integrations/supabase/client";

export type LiquidityRow = {
  id: string;
  category: string | null;
  location: string | null;
  active_supply: number;
  active_demand: number;
  matched_transactions: number;
  failed_matches: number;
  average_time_to_match: number | null;
  supply_gap_score: number;
  demand_gap_score: number;
  liquidity_status: string;
  recommended_action: string | null;
  created_at: string;
};

export type GrowthAction = {
  id: string;
  action_type: string;
  category: string | null;
  location: string | null;
  reason: string | null;
  expected_impact: string | null;
  priority: string;
  assigned_agent: string | null;
  approval_required: boolean;
  action_status: string;
  created_at: string;
};

export type MatchAttempt = {
  id: string;
  buyer_contact_id: string | null;
  seller_id: string | null;
  category: string | null;
  location: string | null;
  match_status: string;
  failure_reason: string | null;
  created_at: string;
};

export type GrowthSnapshot = {
  total_cells: number;
  cold_start: number;
  supply_short: number;
  demand_short: number;
  balanced: number;
  oversupplied: number;
  undersupplied: number;
  watch: number;
  failed_match_rate: number;
  top_supply_gaps: LiquidityRow[];
  top_demand_gaps: LiquidityRow[];
  oversupplied_cells: LiquidityRow[];
  failed_reasons: Record<string, number>;
  growth_actions_open: number;
  growth_actions_approval: number;
  recommended_action: string;
};

const CATEGORIES_LIMIT = 50;

export async function computeGrowthSnapshot(): Promise<GrowthSnapshot> {
  const sb: any = supabase as any;
  const [liquidity, attempts, actions] = await Promise.all([
    sb.from("marketplace_liquidity_scores").select("*").order("created_at", { ascending: false }).limit(500).then((r: any) => r.data ?? []).catch(() => []),
    sb.from("marketplace_match_attempts").select("match_status,failure_reason").limit(2000).then((r: any) => r.data ?? []).catch(() => []),
    sb.from("marketplace_growth_actions").select("action_status,approval_required").limit(500).then((r: any) => r.data ?? []).catch(() => []),
  ]);

  // Keep latest score per category/location cell
  const latest: Record<string, LiquidityRow> = {};
  (liquidity as LiquidityRow[]).forEach((row) => {
    const key = `${row.category ?? ""}::${row.location ?? ""}`;
    if (!latest[key]) latest[key] = row;
  });
  const cells = Object.values(latest).slice(0, CATEGORIES_LIMIT);

  const countBy = (s: string) => cells.filter((c) => c.liquidity_status === s).length;
  const failedTotal = attempts.filter((a: any) => a.match_status === "failed").length;
  const failed_match_rate = attempts.length === 0 ? 0 : failedTotal / attempts.length;

  const failed_reasons: Record<string, number> = {};
  attempts.forEach((a: any) => {
    if (a.match_status === "failed") {
      const r = a.failure_reason ?? "unknown";
      failed_reasons[r] = (failed_reasons[r] ?? 0) + 1;
    }
  });

  const top_supply_gaps = [...cells].sort((a, b) => Number(b.supply_gap_score) - Number(a.supply_gap_score)).slice(0, 8);
  const top_demand_gaps = [...cells].sort((a, b) => Number(b.demand_gap_score) - Number(a.demand_gap_score)).slice(0, 8);
  const oversupplied_cells = cells.filter((c) => c.liquidity_status === "oversupplied");

  const growth_actions_open = (actions as any[]).filter((a) => a.action_status === "active_internal" || a.action_status === "draft").length;
  const growth_actions_approval = (actions as any[]).filter((a) => a.action_status === "approval_required" || a.approval_required).length;

  let recommended_action = "Liquidity stable — keep monitoring.";
  if (cells.length === 0) recommended_action = "No liquidity snapshots yet — record category/location signals to begin balancing.";
  else if (countBy("cold_start") > 0) recommended_action = `${countBy("cold_start")} cold-start cells — prepare cold-start strategy (seed sellers and buyers together).`;
  else if (countBy("supply_short") > 0) recommended_action = `${countBy("supply_short")} cells supply-short — queue seller recruitment actions.`;
  else if (countBy("demand_short") > 0) recommended_action = `${countBy("demand_short")} cells demand-short — queue buyer marketing actions.`;
  else if (failed_match_rate > 0.25) recommended_action = `High failed-match rate (${(failed_match_rate * 100).toFixed(0)}%) — analyse failure reasons.`;
  else if (countBy("oversupplied") > 0) recommended_action = `${countBy("oversupplied")} cells oversupplied — pause recruitment or open new locations.`;

  return {
    total_cells: cells.length,
    cold_start: countBy("cold_start"),
    supply_short: countBy("supply_short"),
    demand_short: countBy("demand_short"),
    balanced: countBy("balanced"),
    oversupplied: countBy("oversupplied"),
    undersupplied: countBy("undersupplied"),
    watch: countBy("watch"),
    failed_match_rate,
    top_supply_gaps,
    top_demand_gaps,
    oversupplied_cells,
    failed_reasons,
    growth_actions_open,
    growth_actions_approval,
    recommended_action,
  };
}

export function recommendActionForCell(row: LiquidityRow): { action_type: string; reason: string; approval_required: boolean } {
  const s = Number(row.supply_gap_score ?? 0);
  const d = Number(row.demand_gap_score ?? 0);
  if (row.active_supply === 0 && row.active_demand === 0) {
    return { action_type: "manual_review", reason: "Cold-start cell — needs seeded strategy", approval_required: true };
  }
  if (s > 0.5 && d <= 0.3) return { action_type: "recruit_sellers", reason: "Supply gap with healthy demand", approval_required: true };
  if (d > 0.5 && s <= 0.3) return { action_type: "attract_buyers", reason: "Demand gap with healthy supply", approval_required: true };
  if (s > 0.3 && d > 0.3) return { action_type: "manual_review", reason: "Both sides weak — cold-start risk", approval_required: true };
  if (row.liquidity_status === "oversupplied") return { action_type: "pause_category", reason: "Oversupplied — slow seller intake", approval_required: true };
  if (row.failed_matches > row.matched_transactions) return { action_type: "improve_quality", reason: "Failed matches exceed completed", approval_required: false };
  return { action_type: "improve_listings", reason: "Healthy — polish listings", approval_required: false };
}