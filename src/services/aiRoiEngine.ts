import { supabase } from "@/integrations/supabase/client";

/**
 * ROI Engine for Liftor AI Cost Governor.
 * Calculates whether AI usage is creating value vs wasting money.
 * Reads from ai_usage_ledger and stores into ai_roi_snapshots.
 */

export type RoiStatus = "excellent" | "healthy" | "watch" | "poor" | "stop";
export type PeriodType = "daily" | "weekly" | "monthly" | "quarterly";

export interface RoiAssumptions {
  admin_hourly_cost: number;
  marketing_hourly_cost: number;
  research_hourly_cost: number;
  sales_hourly_cost: number;
  strategy_hourly_cost: number;
  va_hourly_cost: number;
}

// Conservative GBP defaults — flagged as assumptions when used.
export const DEFAULT_ASSUMPTIONS: RoiAssumptions = {
  admin_hourly_cost: 18,
  marketing_hourly_cost: 35,
  research_hourly_cost: 40,
  sales_hourly_cost: 45,
  strategy_hourly_cost: 90,
  va_hourly_cost: 12,
};

export interface CalculateRoiInput {
  business_id?: string | null;
  agent_id?: string | null;
  campaign_id?: string | null;
  task_category?: string | null;
  period_start: string; // ISO
  period_end: string;   // ISO
  period_type: PeriodType;
  assumptions?: Partial<RoiAssumptions>;
}

export interface RoiResult {
  period_start: string;
  period_end: string;
  period_type: PeriodType;
  total_ai_spend: number;
  estimated_human_cost_saved: number;
  net_saving: number;
  revenue_linked: number;
  pipeline_linked: number;
  ai_cost_to_revenue_ratio: number | null;
  ai_cost_to_pipeline_ratio: number | null;
  cost_per_lead: number | null;
  cost_per_opportunity: number | null;
  cost_per_sale: number | null;
  cost_per_content_asset: number | null;
  cost_per_customer_interaction: number | null;
  time_saved_minutes: number;
  roi_score: number;
  roi_status: RoiStatus;
  action_count: number;
  used_default_assumptions: boolean;
  warning: string | null;
  estimated_flag: boolean;
}

function categoryHourlyRate(category: string | null | undefined, a: RoiAssumptions): number {
  if (!category) return a.admin_hourly_cost;
  const c = category.toLowerCase();
  if (c.includes("strategy") || c.includes("valuation") || c.includes("investor") || c.includes("m_and_a")) return a.strategy_hourly_cost;
  if (c.includes("research")) return a.research_hourly_cost;
  if (c.includes("sales") || c.includes("crm") || c.includes("opportunity")) return a.sales_hourly_cost;
  if (c.includes("marketing") || c.includes("content") || c.includes("copy") || c.includes("outbound")) return a.marketing_hourly_cost;
  if (c.includes("va") || c.includes("assistant")) return a.va_hourly_cost;
  return a.admin_hourly_cost;
}

function scoreRoi(
  spend: number,
  net_saving: number,
  revenue: number,
  pipeline: number,
  actionCount: number,
): { roi_score: number; roi_status: RoiStatus } {
  if (actionCount === 0) {
    return { roi_score: 0, roi_status: "watch" };
  }
  const value = net_saving + revenue * 0.5 + pipeline * 0.1;
  const ratio = spend > 0 ? value / spend : value > 0 ? 5 : 0;

  let roi_status: RoiStatus;
  if (ratio >= 3 && (revenue > 0 || pipeline > 0 || net_saving > 0)) roi_status = "excellent";
  else if (ratio >= 1.2 && value > 0) roi_status = "healthy";
  else if (ratio >= 0.5) roi_status = "watch";
  else if (spend > 0 && value <= 0 && actionCount >= 20) roi_status = "stop";
  else roi_status = "poor";

  const roi_score = Math.max(-100, Math.min(100, Math.round(ratio * 25)));
  return { roi_score, roi_status };
}

export async function calculateAIROI(input: CalculateRoiInput): Promise<RoiResult> {
  const assumptions: RoiAssumptions = { ...DEFAULT_ASSUMPTIONS, ...(input.assumptions ?? {}) };
  const usedDefaults = !input.assumptions || Object.keys(input.assumptions).length === 0;

  let q = supabase
    .from("ai_usage_ledger")
    .select(
      "estimated_cost,human_equivalent_cost,revenue_linked_amount,pipeline_linked_amount,time_saved_minutes,task_category,action_type,output_summary,status",
    )
    .gte("created_at", input.period_start)
    .lte("created_at", input.period_end);

  if (input.business_id) q = q.eq("business_id", input.business_id);
  if (input.agent_id) q = q.eq("agent_id", input.agent_id);
  if (input.campaign_id) q = q.eq("campaign_id", input.campaign_id);
  if (input.task_category) q = q.eq("task_category", input.task_category);

  const { data, error } = await q;
  if (error) throw error;
  const rows = data ?? [];

  let total_ai_spend = 0;
  let estimated_human_cost_saved = 0;
  let revenue_linked = 0;
  let pipeline_linked = 0;
  let time_saved_minutes = 0;
  let leadCount = 0;
  let oppCount = 0;
  let saleCount = 0;
  let contentCount = 0;
  let interactionCount = 0;

  for (const r of rows) {
    const cost = Number(r.estimated_cost ?? 0);
    total_ai_spend += cost;
    const tMin = Number(r.time_saved_minutes ?? 0);
    time_saved_minutes += tMin;

    const ledgerHuman = Number(r.human_equivalent_cost ?? 0);
    if (ledgerHuman > 0) {
      estimated_human_cost_saved += ledgerHuman;
    } else if (tMin > 0) {
      const rate = categoryHourlyRate(r.task_category, assumptions);
      estimated_human_cost_saved += (tMin / 60) * rate;
    }

    revenue_linked += Number(r.revenue_linked_amount ?? 0);
    pipeline_linked += Number(r.pipeline_linked_amount ?? 0);

    const cat = (r.task_category ?? "").toLowerCase();
    const action = (r.action_type ?? "").toLowerCase();
    if (cat.includes("lead") || action.includes("lead")) leadCount += 1;
    if (cat.includes("opportunity") || action.includes("opportunity")) oppCount += 1;
    if (cat.includes("sale") || cat.includes("customer_won") || action.includes("sale")) saleCount += 1;
    if (cat.includes("content") || action.includes("content") || action.includes("asset")) contentCount += 1;
    if (cat.includes("interaction") || cat.includes("inbox") || action.includes("reply") || action.includes("message")) interactionCount += 1;
  }

  const net_saving = estimated_human_cost_saved - total_ai_spend;

  const ai_cost_to_revenue_ratio = revenue_linked > 0 ? total_ai_spend / revenue_linked : null;
  const ai_cost_to_pipeline_ratio = pipeline_linked > 0 ? total_ai_spend / pipeline_linked : null;
  const cost_per_lead = leadCount > 0 ? total_ai_spend / leadCount : null;
  const cost_per_opportunity = oppCount > 0 ? total_ai_spend / oppCount : null;
  const cost_per_sale = saleCount > 0 ? total_ai_spend / saleCount : null;
  const cost_per_content_asset = contentCount > 0 ? total_ai_spend / contentCount : null;
  const cost_per_customer_interaction = interactionCount > 0 ? total_ai_spend / interactionCount : null;

  const { roi_score, roi_status } = scoreRoi(total_ai_spend, net_saving, revenue_linked, pipeline_linked, rows.length);

  // Cost-rising-without-value warning
  let warning: string | null = null;
  if (total_ai_spend > 0 && revenue_linked === 0 && pipeline_linked === 0 && time_saved_minutes === 0 && rows.length >= 10) {
    warning = "AI cost rising without matching value. Review model routing, prompt reuse or agent activity.";
  }

  const estimated_flag = revenue_linked === 0 && pipeline_linked === 0;

  return {
    period_start: input.period_start,
    period_end: input.period_end,
    period_type: input.period_type,
    total_ai_spend: round(total_ai_spend),
    estimated_human_cost_saved: round(estimated_human_cost_saved),
    net_saving: round(net_saving),
    revenue_linked: round(revenue_linked),
    pipeline_linked: round(pipeline_linked),
    ai_cost_to_revenue_ratio: ai_cost_to_revenue_ratio !== null ? round(ai_cost_to_revenue_ratio, 4) : null,
    ai_cost_to_pipeline_ratio: ai_cost_to_pipeline_ratio !== null ? round(ai_cost_to_pipeline_ratio, 4) : null,
    cost_per_lead: cost_per_lead !== null ? round(cost_per_lead) : null,
    cost_per_opportunity: cost_per_opportunity !== null ? round(cost_per_opportunity) : null,
    cost_per_sale: cost_per_sale !== null ? round(cost_per_sale) : null,
    cost_per_content_asset: cost_per_content_asset !== null ? round(cost_per_content_asset) : null,
    cost_per_customer_interaction: cost_per_customer_interaction !== null ? round(cost_per_customer_interaction) : null,
    time_saved_minutes: Math.round(time_saved_minutes),
    roi_score,
    roi_status,
    action_count: rows.length,
    used_default_assumptions: usedDefaults,
    warning,
    estimated_flag,
  };
}

function round(n: number, dp = 2): number {
  const m = Math.pow(10, dp);
  return Math.round(n * m) / m;
}

export interface SaveSnapshotInput extends CalculateRoiInput {}

export async function generateRoiSnapshot(input: SaveSnapshotInput): Promise<RoiResult> {
  const result = await calculateAIROI(input);
  const { error } = await supabase.from("ai_roi_snapshots").insert({
    business_id: input.business_id ?? null,
    agent_id: input.agent_id ?? null,
    campaign_id: input.campaign_id ?? null,
    period_start: input.period_start,
    period_end: input.period_end,
    period_type: input.period_type,
    total_ai_spend: result.total_ai_spend,
    estimated_human_cost_saved: result.estimated_human_cost_saved,
    net_saving: result.net_saving,
    revenue_linked: result.revenue_linked,
    pipeline_linked: result.pipeline_linked,
    ai_cost_to_revenue_ratio: result.ai_cost_to_revenue_ratio,
    ai_cost_to_pipeline_ratio: result.ai_cost_to_pipeline_ratio,
    cost_per_lead: result.cost_per_lead,
    cost_per_opportunity: result.cost_per_opportunity,
    cost_per_sale: result.cost_per_sale,
    cost_per_content_asset: result.cost_per_content_asset,
    cost_per_customer_interaction: result.cost_per_customer_interaction,
    time_saved_minutes: result.time_saved_minutes,
    roi_score: result.roi_score,
    roi_status: result.roi_status,
    audit_metadata: {
      action_count: result.action_count,
      used_default_assumptions: result.used_default_assumptions,
      assumptions: { ...DEFAULT_ASSUMPTIONS, ...(input.assumptions ?? {}) },
      warning: result.warning,
      estimated_flag: result.estimated_flag,
      task_category: input.task_category ?? null,
    },
  });
  if (error) throw error;
  return result;
}

export function periodRange(type: PeriodType, now = new Date()): { period_start: string; period_end: string } {
  const end = new Date(now);
  const start = new Date(now);
  switch (type) {
    case "daily":
      start.setDate(end.getDate() - 1);
      break;
    case "weekly":
      start.setDate(end.getDate() - 7);
      break;
    case "monthly":
      start.setMonth(end.getMonth() - 1);
      break;
    case "quarterly":
      start.setMonth(end.getMonth() - 3);
      break;
  }
  return { period_start: start.toISOString(), period_end: end.toISOString() };
}

/** Group ROI rows from ledger by a dimension (business/agent/campaign/category). */
export async function roiByDimension(
  dimension: "business_id" | "agent_id" | "campaign_id" | "task_category",
  range: { period_start: string; period_end: string },
  assumptions?: Partial<RoiAssumptions>,
): Promise<Array<RoiResult & { key: string | null }>> {
  const { data, error } = await supabase
    .from("ai_usage_ledger")
    .select(
      "business_id,agent_id,campaign_id,task_category,estimated_cost,human_equivalent_cost,revenue_linked_amount,pipeline_linked_amount,time_saved_minutes,action_type,status",
    )
    .gte("created_at", range.period_start)
    .lte("created_at", range.period_end);
  if (error) throw error;

  const groups = new Map<string | null, typeof data>();
  for (const row of data ?? []) {
    const key = (row as any)[dimension] ?? null;
    if (!groups.has(key)) groups.set(key, [] as any);
    groups.get(key)!.push(row);
  }

  const out: Array<RoiResult & { key: string | null }> = [];
  const a: RoiAssumptions = { ...DEFAULT_ASSUMPTIONS, ...(assumptions ?? {}) };

  for (const [key, rows] of groups) {
    let total_ai_spend = 0;
    let estimated_human_cost_saved = 0;
    let revenue_linked = 0;
    let pipeline_linked = 0;
    let time_saved_minutes = 0;
    let leadCount = 0, oppCount = 0, saleCount = 0, contentCount = 0, interactionCount = 0;
    for (const r of rows ?? []) {
      total_ai_spend += Number(r.estimated_cost ?? 0);
      const tMin = Number(r.time_saved_minutes ?? 0);
      time_saved_minutes += tMin;
      const ledgerHuman = Number(r.human_equivalent_cost ?? 0);
      if (ledgerHuman > 0) estimated_human_cost_saved += ledgerHuman;
      else if (tMin > 0) estimated_human_cost_saved += (tMin / 60) * categoryHourlyRate(r.task_category, a);
      revenue_linked += Number(r.revenue_linked_amount ?? 0);
      pipeline_linked += Number(r.pipeline_linked_amount ?? 0);
      const cat = (r.task_category ?? "").toLowerCase();
      const action = (r.action_type ?? "").toLowerCase();
      if (cat.includes("lead") || action.includes("lead")) leadCount += 1;
      if (cat.includes("opportunity") || action.includes("opportunity")) oppCount += 1;
      if (cat.includes("sale") || cat.includes("customer_won")) saleCount += 1;
      if (cat.includes("content") || action.includes("content") || action.includes("asset")) contentCount += 1;
      if (cat.includes("interaction") || cat.includes("inbox") || action.includes("reply")) interactionCount += 1;
    }
    const net_saving = estimated_human_cost_saved - total_ai_spend;
    const { roi_score, roi_status } = scoreRoi(total_ai_spend, net_saving, revenue_linked, pipeline_linked, (rows ?? []).length);
    out.push({
      key,
      period_start: range.period_start,
      period_end: range.period_end,
      period_type: "monthly",
      total_ai_spend: round(total_ai_spend),
      estimated_human_cost_saved: round(estimated_human_cost_saved),
      net_saving: round(net_saving),
      revenue_linked: round(revenue_linked),
      pipeline_linked: round(pipeline_linked),
      ai_cost_to_revenue_ratio: revenue_linked > 0 ? round(total_ai_spend / revenue_linked, 4) : null,
      ai_cost_to_pipeline_ratio: pipeline_linked > 0 ? round(total_ai_spend / pipeline_linked, 4) : null,
      cost_per_lead: leadCount > 0 ? round(total_ai_spend / leadCount) : null,
      cost_per_opportunity: oppCount > 0 ? round(total_ai_spend / oppCount) : null,
      cost_per_sale: saleCount > 0 ? round(total_ai_spend / saleCount) : null,
      cost_per_content_asset: contentCount > 0 ? round(total_ai_spend / contentCount) : null,
      cost_per_customer_interaction: interactionCount > 0 ? round(total_ai_spend / interactionCount) : null,
      time_saved_minutes: Math.round(time_saved_minutes),
      roi_score,
      roi_status,
      action_count: (rows ?? []).length,
      used_default_assumptions: !assumptions,
      warning: total_ai_spend > 0 && revenue_linked === 0 && pipeline_linked === 0 && time_saved_minutes === 0 && (rows ?? []).length >= 10
        ? "AI cost rising without matching value. Review model routing, prompt reuse or agent activity."
        : null,
      estimated_flag: revenue_linked === 0 && pipeline_linked === 0,
    });
  }
  out.sort((x, y) => y.total_ai_spend - x.total_ai_spend);
  return out;
}