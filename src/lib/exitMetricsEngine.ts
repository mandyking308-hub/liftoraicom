import { supabase } from "@/integrations/supabase/client";

export type MetricCategory =
  | "revenue" | "retention" | "growth" | "margin" | "customer"
  | "marketplace" | "product" | "ip" | "compliance" | "operations" | "other";

export type MetricStatus = "missing" | "estimated" | "confirmed" | "watch" | "strong";

export const ARCHETYPE_META: Record<string, { label: string; cls: string }> = {
  saas:        { label: "SaaS",            cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  marketplace: { label: "Marketplace",     cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  ecommerce:   { label: "eCommerce",       cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  service:     { label: "Service / Agency",cls: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" },
  media:       { label: "Media / Content", cls: "bg-pink-500/15 text-pink-300 border-pink-500/30" },
  lead_gen:    { label: "Lead-gen",        cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  course:      { label: "Course / Community", cls: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30" },
  other:       { label: "Other",           cls: "bg-muted text-muted-foreground border-border/50" },
};

export const METRIC_CATEGORY_META: Record<MetricCategory, { label: string; cls: string }> = {
  revenue:     { label: "Revenue",     cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  retention:   { label: "Retention",   cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  growth:      { label: "Growth",      cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  margin:      { label: "Margin",      cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  customer:    { label: "Customer",    cls: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" },
  marketplace: { label: "Marketplace", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  product:     { label: "Product",     cls: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  ip:          { label: "IP",          cls: "bg-pink-500/15 text-pink-300 border-pink-500/30" },
  compliance:  { label: "Compliance",  cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  operations:  { label: "Operations",  cls: "bg-teal-500/15 text-teal-300 border-teal-500/30" },
  other:       { label: "Other",       cls: "bg-muted text-muted-foreground border-border/50" },
};

export const METRIC_STATUS_META: Record<MetricStatus, { label: string; cls: string; weight: number }> = {
  missing:   { label: "Missing",   cls: "bg-red-500/15 text-red-400 border-red-500/30", weight: 0 },
  estimated: { label: "Estimated", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30", weight: 0.4 },
  watch:     { label: "Watch",     cls: "bg-amber-500/15 text-amber-300 border-amber-500/30", weight: 0.5 },
  confirmed: { label: "Confirmed", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30", weight: 0.8 },
  strong:    { label: "Strong",    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", weight: 1 },
};

export type ExitMetricTemplate = {
  id: string;
  archetype_code: string;
  metric_name: string;
  metric_category: MetricCategory;
  description: string | null;
  buyer_importance_score: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type BusinessExitMetricValue = {
  id: string;
  business_id: string | null;
  metric_template_id: string | null;
  metric_value: number | null;
  metric_status: MetricStatus;
  evidence_source: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  updated_at: string;
};

export type ExitReadinessScore = {
  id: string;
  business_id: string | null;
  score_period_start: string | null;
  score_period_end: string | null;
  revenue_quality_score: number | null;
  growth_score: number | null;
  margin_score: number | null;
  defensibility_score: number | null;
  operations_score: number | null;
  compliance_score: number | null;
  buyer_fit_score: number | null;
  data_room_score: number | null;
  total_exit_readiness_score: number | null;
  recommended_action: string | null;
  created_at: string;
  audit_metadata: Record<string, unknown> | null;
};

const sb = () => supabase as any;

export async function fetchTemplates(): Promise<ExitMetricTemplate[]> {
  const { data, error } = await sb().from("exit_metric_templates").select("*").eq("active", true).order("archetype_code");
  if (error) throw error; return data ?? [];
}
export async function fetchValues(): Promise<BusinessExitMetricValue[]> {
  const { data, error } = await sb().from("business_exit_metric_values").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function fetchScores(): Promise<ExitReadinessScore[]> {
  const { data, error } = await sb().from("business_exit_readiness_scores").select("*").order("created_at", { ascending: false });
  if (error) throw error; return data ?? [];
}

export async function updateValueStatus(id: string, status: MetricStatus): Promise<void> {
  const { error } = await sb().from("business_exit_metric_values").update({ metric_status: status }).eq("id", id);
  if (error) throw error;
}

/** Compute an internal exit-readiness score for a business given values + templates. */
export function computeReadiness(
  businessId: string | null,
  archetype: string,
  templates: ExitMetricTemplate[],
  values: BusinessExitMetricValue[],
) {
  const relevant = templates.filter(t => t.archetype_code === archetype && t.active);
  const valuesById = new Map(values.filter(v => v.business_id === businessId).map(v => [v.metric_template_id, v]));

  const byCategory: Partial<Record<MetricCategory, { sum: number; weight: number }>> = {};
  let totalSum = 0, totalWeight = 0;
  let missing = 0;

  for (const t of relevant) {
    const v = valuesById.get(t.id);
    const w = t.buyer_importance_score;
    const ws = v ? METRIC_STATUS_META[v.metric_status].weight : 0;
    if (!v || v.metric_status === "missing") missing++;
    const bucket = byCategory[t.metric_category] ?? { sum: 0, weight: 0 };
    bucket.sum += ws * w; bucket.weight += w;
    byCategory[t.metric_category] = bucket;
    totalSum += ws * w; totalWeight += w;
  }

  const score = (s?: { sum: number; weight: number }) =>
    s && s.weight > 0 ? Math.round((s.sum / s.weight) * 100) : null;

  const total = totalWeight > 0 ? Math.round((totalSum / totalWeight) * 100) : 0;

  return {
    archetype,
    relevant_total: relevant.length,
    relevant_missing: missing,
    revenue_quality_score: score(byCategory.revenue),
    growth_score: score(byCategory.growth),
    margin_score: score(byCategory.margin),
    defensibility_score: score(byCategory.ip) ?? score(byCategory.retention),
    operations_score: score(byCategory.operations),
    compliance_score: score(byCategory.compliance),
    buyer_fit_score: score(byCategory.customer) ?? score(byCategory.marketplace),
    data_room_score: Math.round(((relevant.length - missing) / Math.max(1, relevant.length)) * 100),
    total_exit_readiness_score: total,
    recommended_action:
      total >= 80 ? "Exit-ready — prepare data room (approval required to share)" :
      total >= 60 ? "Strengthen weak categories before approaching buyers" :
      total >= 40 ? "Material gaps — fill missing metrics, defer buyer contact" :
      "Not exit-ready — block any buyer/adviser outreach",
  };
}

export function summarize(templates: ExitMetricTemplate[], values: BusinessExitMetricValue[], scores: ExitReadinessScore[]) {
  const missing = values.filter(v => v.metric_status === "missing").length;
  const estimated = values.filter(v => v.metric_status === "estimated").length;
  const strong = values.filter(v => v.metric_status === "strong").length;
  const businesses = new Set(values.map(v => v.business_id).filter(Boolean)).size;
  const latestByBiz = new Map<string, ExitReadinessScore>();
  for (const s of scores) {
    if (!s.business_id) continue;
    if (!latestByBiz.has(s.business_id)) latestByBiz.set(s.business_id, s);
  }
  const totals = Array.from(latestByBiz.values()).map(s => Number(s.total_exit_readiness_score ?? 0));
  const avgReadiness = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0;
  return {
    templates_total: templates.length,
    values_total: values.length,
    values_missing: missing,
    values_estimated: estimated,
    values_strong: strong,
    businesses_tracked: businesses,
    scored_businesses: latestByBiz.size,
    exit_ready: totals.filter(t => t >= 80).length,
    not_ready: totals.filter(t => t < 40).length,
    avg_readiness: avgReadiness,
  };
}

export type Diagnostic = {
  id: string;
  severity: "info" | "warn" | "block";
  business_id: string | null;
  message: string;
};

export function diagnose(
  templates: ExitMetricTemplate[],
  values: BusinessExitMetricValue[],
  scores: ExitReadinessScore[],
  businesses: Array<{ id: string | null; name: string; archetype: string | null }>,
): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const b of businesses) {
    const arche = (b.archetype ?? "other").toLowerCase();
    const relevant = templates.filter(t => t.archetype_code === arche);
    if (relevant.length === 0) {
      out.push({ id: b.id ?? "no-id", severity: "info", business_id: b.id,
        message: `${b.name}: no exit-metric template for archetype "${arche}" — Exit Metrics Agent should select correct template.` });
      continue;
    }
    const r = computeReadiness(b.id, arche, templates, values);
    if (r.relevant_missing > 0) {
      out.push({ id: b.id ?? "no-id", severity: "warn", business_id: b.id,
        message: `${b.name}: ${r.relevant_missing}/${r.relevant_total} ${ARCHETYPE_META[arche]?.label ?? arche} metrics missing — fill before buyer contact.` });
    }
    if (r.total_exit_readiness_score < 40) {
      out.push({ id: b.id ?? "no-id", severity: "block", business_id: b.id,
        message: `${b.name}: exit readiness ${r.total_exit_readiness_score}% — block buyer/adviser outreach until improved.` });
    } else if (r.total_exit_readiness_score < 60) {
      out.push({ id: b.id ?? "no-id", severity: "warn", business_id: b.id,
        message: `${b.name}: exit readiness ${r.total_exit_readiness_score}% — strengthen weak categories first.` });
    }
  }
  // Cross-check: confirmed/strong values without evidence source
  for (const v of values) {
    if ((v.metric_status === "confirmed" || v.metric_status === "strong") && !v.evidence_source) {
      out.push({ id: v.id, severity: "warn", business_id: v.business_id,
        message: `Metric value marked ${v.metric_status} without evidence source — buyer due diligence will challenge.` });
    }
  }
  return out;
}

export function recommendedFor(archetype: string | null | undefined, templates: ExitMetricTemplate[]): ExitMetricTemplate[] {
  const a = (archetype ?? "other").toLowerCase();
  return templates.filter(t => t.archetype_code === a);
}