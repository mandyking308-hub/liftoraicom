import { supabase } from "@/integrations/supabase/client";

export type KpiCategory = "revenue"|"pipeline"|"customer"|"ai_cost"|"sales"|"delivery"|"support"|"finance"|"marketplace"|"portfolio"|"risk"|"other";
export type ConflictType = "revenue_mismatch"|"pipeline_mismatch"|"test_data_leak"|"duplicate_metric"|"source_disagreement"|"missing_source"|"stale_snapshot"|"other";
export type Severity = "low"|"medium"|"high"|"critical";
export type ConflictStatus = "open"|"review_required"|"resolved"|"ignored";
export type RuleType = "confirmed_revenue"|"estimated_pipeline"|"test_data"|"active_customer"|"active_business"|"ai_cost"|"conversion"|"churn"|"marketplace_gmv"|"seller_payout"|"other";

export interface KpiDefinition {
  id: string;
  kpi_code: string;
  kpi_name: string;
  kpi_category: KpiCategory;
  definition: string;
  source_of_truth_table: string | null;
  source_of_truth_field: string | null;
  calculation_logic_summary: string | null;
  confirmed_vs_estimated_rules: string | null;
  test_data_exclusion_rules: string | null;
  active: boolean;
}

export interface TruthRule {
  id: string;
  rule_name: string;
  rule_type: RuleType;
  rule_summary: string;
  source_priority_order: any;
  exclusion_conditions: any;
  active: boolean;
}

export interface ReportingConflict {
  id: string;
  business_id: string | null;
  conflict_type: ConflictType;
  source_a: string | null;
  source_b: string | null;
  conflict_summary: string;
  severity: Severity;
  recommended_fix: string | null;
  conflict_status: ConflictStatus;
  created_at: string;
  audit_metadata: any;
}

export interface ReportingSnapshot {
  id: string;
  business_id: string | null;
  snapshot_type: "daily"|"weekly"|"monthly"|"portfolio"|"module";
  period_start: string;
  period_end: string;
  metrics: any;
  generated_from_rules_version: string | null;
  created_at: string;
  audit_metadata: any;
}

export const SEVERITY_META: Record<Severity, { label: string; cls: string }> = {
  low: { label: "Low", cls: "bg-muted text-muted-foreground border-border/50" },
  medium: { label: "Medium", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  high: { label: "High", cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  critical: { label: "Critical", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
};

export const STATUS_META: Record<ConflictStatus, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  review_required: { label: "Review", cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  resolved: { label: "Resolved", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  ignored: { label: "Ignored", cls: "bg-muted text-muted-foreground border-border/50" },
};

export const CATEGORY_META: Record<KpiCategory, string> = {
  revenue: "Revenue", pipeline: "Pipeline", customer: "Customer", ai_cost: "AI Cost",
  sales: "Sales", delivery: "Delivery", support: "Support", finance: "Finance",
  marketplace: "Marketplace", portfolio: "Portfolio", risk: "Risk", other: "Other",
};

export async function fetchKpiDefinitions(): Promise<KpiDefinition[]> {
  const { data, error } = await (supabase as any).from("kpi_definitions").select("*").order("kpi_category").order("kpi_code");
  if (error) { console.warn("kpi_definitions fetch failed", error); return []; }
  return (data ?? []) as KpiDefinition[];
}

export async function fetchTruthRules(): Promise<TruthRule[]> {
  const { data, error } = await (supabase as any).from("reporting_truth_rules").select("*").order("rule_type");
  if (error) { console.warn("reporting_truth_rules fetch failed", error); return []; }
  return (data ?? []) as TruthRule[];
}

export async function fetchConflicts(opts: { status?: ConflictStatus[] } = {}): Promise<ReportingConflict[]> {
  let q = (supabase as any).from("reporting_conflicts").select("*").order("severity", { ascending: false }).order("created_at", { ascending: false });
  if (opts.status?.length) q = q.in("conflict_status", opts.status);
  const { data, error } = await q;
  if (error) { console.warn("reporting_conflicts fetch failed", error); return []; }
  return (data ?? []) as ReportingConflict[];
}

export async function fetchSnapshots(limit = 50): Promise<ReportingSnapshot[]> {
  const { data, error } = await (supabase as any).from("reporting_snapshots").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) { console.warn("reporting_snapshots fetch failed", error); return []; }
  return (data ?? []) as ReportingSnapshot[];
}

export interface TruthSummary {
  total_kpis: number;
  active_rules: number;
  open_conflicts: number;
  high_severity: number;
  test_data_leaks: number;
  recent_snapshots: number;
  top_conflict: ReportingConflict | null;
}

export function summarize(conflicts: ReportingConflict[], kpis: KpiDefinition[], rules: TruthRule[], snapshots: ReportingSnapshot[]): TruthSummary {
  const open = conflicts.filter(c => c.conflict_status === "open" || c.conflict_status === "review_required");
  const high = open.filter(c => c.severity === "high" || c.severity === "critical");
  const leaks = open.filter(c => c.conflict_type === "test_data_leak");
  const sevOrder: Severity[] = ["critical","high","medium","low"];
  const top = [...open].sort((a,b) => sevOrder.indexOf(a.severity) - sevOrder.indexOf(b.severity))[0] ?? null;
  return {
    total_kpis: kpis.length,
    active_rules: rules.filter(r => r.active).length,
    open_conflicts: open.length,
    high_severity: high.length,
    test_data_leaks: leaks.length,
    recent_snapshots: snapshots.length,
    top_conflict: top,
  };
}