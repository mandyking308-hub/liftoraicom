import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase as any;

export type PerfEventType = "slow_page"|"slow_query"|"edge_function_error"|"api_error"|"rate_limit"|"large_table"|"bundle_warning"|"memory_warning"|"timeout"|"other";
export type Severity = "low"|"medium"|"high"|"critical";
export type PerfStatus = "open"|"acknowledged"|"resolved"|"ignored";
export type CostSource = "ai"|"supabase"|"provider_api"|"email"|"voice"|"payment"|"storage"|"hosting"|"other";
export type CostBasis = "estimated"|"provider_reported"|"invoice"|"manual"|"unknown";
export type RecType = "index_needed"|"pagination_needed"|"code_split"|"cache_needed"|"archive_old_data"|"provider_plan_review"|"rate_limit_adjustment"|"query_refactor"|"other";
export type RecPriority = "low"|"normal"|"high"|"urgent";
export type RecActionStatus = "recommended"|"approval_required"|"approved"|"implemented"|"rejected"|"parked";

export interface PerfEvent {
  id: string; business_id: string | null; source_module: string; event_type: PerfEventType;
  severity: Severity; event_summary: string | null; metric_value: number | null;
  threshold_value: number | null; recommended_action: string | null; status: PerfStatus;
  created_at: string; updated_at: string; audit_metadata: Record<string, any>;
}
export interface CostRecord {
  id: string; cost_source: CostSource; business_id: string | null;
  cost_period_start: string; cost_period_end: string;
  estimated_cost: number | null; confirmed_cost: number | null;
  currency: string; cost_basis: CostBasis;
  created_at: string; updated_at: string; audit_metadata: Record<string, any>;
}
export interface ScaleRec {
  id: string; recommendation_type: RecType; source_module: string;
  recommendation_summary: string | null; priority: RecPriority;
  expected_impact: string | null; action_status: RecActionStatus;
  created_at: string; updated_at: string;
}

export async function listPerfEvents(filters?: { event_type?: PerfEventType; status?: PerfStatus; severity?: Severity; limit?: number }) {
  let q = sb.from("platform_performance_events").select("*").order("created_at", { ascending: false }).limit(filters?.limit ?? 300);
  if (filters?.event_type) q = q.eq("event_type", filters.event_type);
  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.severity) q = q.eq("severity", filters.severity);
  const { data } = await q;
  return (data ?? []) as PerfEvent[];
}

export async function listCostRecords(filters?: { cost_source?: CostSource; limit?: number }) {
  let q = sb.from("platform_cost_records").select("*").order("cost_period_end", { ascending: false }).limit(filters?.limit ?? 300);
  if (filters?.cost_source) q = q.eq("cost_source", filters.cost_source);
  const { data } = await q;
  return (data ?? []) as CostRecord[];
}

export async function listScaleRecs(filters?: { action_status?: RecActionStatus; limit?: number }) {
  let q = sb.from("platform_scalability_recommendations").select("*").order("created_at", { ascending: false }).limit(filters?.limit ?? 300);
  if (filters?.action_status) q = q.eq("action_status", filters.action_status);
  const { data } = await q;
  return (data ?? []) as ScaleRec[];
}

export interface MonitorSummary {
  totalEvents: number;
  openEvents: number;
  criticalOpen: number;
  highOpen: number;
  slowPages: number;
  edgeErrors: number;
  rateLimits: number;
  largeTables: number;
  bundleWarnings: number;
  costRecords: number;
  costLast30d: number;
  aiCostLast30d: number;
  recommendations: number;
  recsAwaitingApproval: number;
  recsApproved: number;
  watchItems: string[];
}

export async function summariseMonitor(): Promise<MonitorSummary> {
  const [ev, cs, rc] = await Promise.all([
    sb.from("platform_performance_events").select("event_type,severity,status,created_at").limit(2000),
    sb.from("platform_cost_records").select("cost_source,estimated_cost,confirmed_cost,cost_period_end").limit(2000),
    sb.from("platform_scalability_recommendations").select("action_status,priority").limit(2000),
  ]);
  const events = (ev.data ?? []) as Array<Pick<PerfEvent, "event_type"|"severity"|"status"|"created_at">>;
  const costs = (cs.data ?? []) as Array<Pick<CostRecord, "cost_source"|"estimated_cost"|"confirmed_cost"|"cost_period_end">>;
  const recs = (rc.data ?? []) as Array<Pick<ScaleRec, "action_status"|"priority">>;
  const open = events.filter(e => e.status === "open");
  const cutoff = Date.now() - 30 * 86400 * 1000;
  const last30 = costs.filter(c => new Date(c.cost_period_end).getTime() >= cutoff);
  const costSum = (arr: typeof costs) => arr.reduce((s, c) => s + Number(c.confirmed_cost ?? c.estimated_cost ?? 0), 0);
  const watch: string[] = [];
  const criticalOpen = open.filter(e => e.severity === "critical").length;
  const highOpen = open.filter(e => e.severity === "high").length;
  const recsApproval = recs.filter(r => r.action_status === "approval_required").length;
  if (criticalOpen > 0) watch.push(`${criticalOpen} critical performance/cost event(s)`);
  if (highOpen > 0) watch.push(`${highOpen} high-severity event(s) open`);
  const edgeErrors = open.filter(e => e.event_type === "edge_function_error").length;
  if (edgeErrors > 0) watch.push(`${edgeErrors} edge function error(s)`);
  const rateLimits = open.filter(e => e.event_type === "rate_limit").length;
  if (rateLimits > 0) watch.push(`${rateLimits} rate-limit warning(s)`);
  if (recsApproval > 0) watch.push(`${recsApproval} scalability action(s) awaiting approval`);
  return {
    totalEvents: events.length,
    openEvents: open.length,
    criticalOpen,
    highOpen,
    slowPages: open.filter(e => e.event_type === "slow_page").length,
    edgeErrors,
    rateLimits,
    largeTables: open.filter(e => e.event_type === "large_table").length,
    bundleWarnings: open.filter(e => e.event_type === "bundle_warning").length,
    costRecords: costs.length,
    costLast30d: costSum(last30),
    aiCostLast30d: costSum(last30.filter(c => c.cost_source === "ai")),
    recommendations: recs.length,
    recsAwaitingApproval: recsApproval,
    recsApproved: recs.filter(r => r.action_status === "approved").length,
    watchItems: watch,
  };
}