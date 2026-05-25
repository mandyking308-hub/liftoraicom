import { supabase } from "@/integrations/supabase/client";

export type Decision = "scale" | "keep" | "watch" | "reduce" | "pause" | "retire";

export type MonthRange = { start: string; end: string; label: string };

export function monthRange(yyyyMm: string): MonthRange {
  const [y, m] = yyyyMm.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: start.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
  };
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

type LedgerRow = {
  id: string;
  business_id: string | null;
  agent_id: string | null;
  campaign_id: string | null;
  task_category: string | null;
  status: string | null;
  estimated_cost: number;
  human_equivalent_cost: number;
  time_saved_minutes: number;
  revenue_linked_amount: number;
  pipeline_linked_amount: number;
  human_approved: boolean;
  cost_basis?: string | null;
  actual_cost_gbp?: number | null;
};

type QualityRow = {
  ai_usage_ledger_id: string;
  business_id: string | null;
  agent_id: string | null;
  approved_without_edit: boolean;
  edited_before_approval: boolean;
  rejected: boolean;
};

export type Bucket = {
  key: string;
  label?: string;
  ai_spend: number;
  human_cost_saved: number;
  net_saving: number;
  revenue_linked: number;
  pipeline_linked: number;
  actions: number;
  approved: number;
  rejected: number;
  edited: number;
  approval_rate: number;
  rejection_rate: number;
  edit_rate: number;
  quality_adjusted_roi: number;
  cost_per_approved: number | null;
  cost_per_action: number | null;
  decision: Decision;
  decision_reason: string;
};

export type FinancePack = {
  range: MonthRange;
  totals: {
    ai_spend: number;
    actual_known_cost: number;
    estimated_cost: number;
    pricing_missing_rows: number;
    revenue_confirmed: number;
    revenue_estimated: number;
    pipeline_confirmed: number;
    pipeline_estimated: number;
    human_equivalent_saving_estimated: number;
    human_cost_saved: number;
    net_saving: number;
    revenue_linked: number;
    pipeline_linked: number;
    actions: number;
    approved: number;
    rejected: number;
    edited: number;
    approval_rate: number;
    rejection_rate: number;
    edit_rate: number;
    quality_adjusted_roi: number;
    cost_per_lead: number | null;
    cost_per_opportunity: number | null;
    cost_per_sale: number | null;
    cost_per_content_asset: number | null;
    cost_per_customer_interaction: number | null;
  };
  by_business: Bucket[];
  by_agent: Bucket[];
  by_campaign: Bucket[];
  by_category: Bucket[];
  business_unit_economics: BusinessUE[];
  founder_summary: string[];
  estimates_disclaimer: string;
};

export type BusinessUE = {
  business_id: string;
  ai_spend: number;
  revenue: number;
  pipeline: number;
  ai_spend_pct_revenue: number | null;
  ai_spend_pct_pipeline: number | null;
  active_campaigns: number;
  ai_spend_per_campaign: number | null;
  customer_interactions: number;
  ai_spend_per_interaction: number | null;
  approved_outputs: number;
  rejected_outputs: number;
  ai_spend_per_approved: number | null;
  ai_spend_per_rejected: number | null;
  budget_remaining: number | null;
  recommended_monthly_budget: number;
  estimated_payback_months: number | null;
};

const CATEGORY_OUTCOME: Record<string, "lead" | "opportunity" | "sale" | "content" | "interaction"> = {
  lead_qualification: "lead",
  email_classification: "lead",
  outbound_email: "lead",
  proposal_generation: "opportunity",
  meeting_booking: "opportunity",
  deal_closure: "sale",
  content_generation: "content",
  blog_writing: "content",
  social_post: "content",
  customer_reply: "interaction",
  inbox_reply: "interaction",
  support_response: "interaction",
};

function round(n: number, d = 2): number {
  const m = Math.pow(10, d);
  return Math.round((Number(n) || 0) * m) / m;
}

function decideFromMetrics(b: Omit<Bucket, "decision" | "decision_reason">): { decision: Decision; reason: string } {
  const net = b.net_saving;
  const ar = b.approval_rate;
  const rr = b.rejection_rate;
  const qroi = b.quality_adjusted_roi;

  if (b.actions < 3) return { decision: "watch", reason: "Too few actions to judge — keep monitoring." };
  if (rr >= 0.4) return { decision: "pause", reason: `Rejection rate ${(rr * 100).toFixed(0)}% — pause and review.` };
  if (net < 0 && b.ai_spend > 5) return { decision: "retire", reason: `Net loss of £${(-net).toFixed(2)} — retire or rebuild.` };
  if (qroi > 5 && ar >= 0.7) return { decision: "scale", reason: `High quality-adjusted ROI (${qroi.toFixed(1)}×) and ${(ar * 100).toFixed(0)}% approval.` };
  if (qroi < 1) return { decision: "reduce", reason: `Quality-adjusted ROI under 1× — downgrade model or reduce volume.` };
  if (ar < 0.5) return { decision: "watch", reason: `Approval rate ${(ar * 100).toFixed(0)}% — investigate prompt quality.` };
  return { decision: "keep", reason: `Profitable and stable — keep as-is.` };
}

function bucketise(
  rows: LedgerRow[],
  quality: Map<string, QualityRow>,
  keyOf: (r: LedgerRow) => string | null,
): Bucket[] {
  const map = new Map<string, Omit<Bucket, "decision" | "decision_reason">>();
  for (const r of rows) {
    const key = keyOf(r);
    if (!key) continue;
    const b = map.get(key) ?? {
      key, ai_spend: 0, human_cost_saved: 0, net_saving: 0,
      revenue_linked: 0, pipeline_linked: 0,
      actions: 0, approved: 0, rejected: 0, edited: 0,
      approval_rate: 0, rejection_rate: 0, edit_rate: 0,
      quality_adjusted_roi: 0, cost_per_approved: null, cost_per_action: null,
    };
    b.ai_spend += Number(r.estimated_cost ?? 0);
    b.human_cost_saved += Number(r.human_equivalent_cost ?? 0);
    b.revenue_linked += Number(r.revenue_linked_amount ?? 0);
    b.pipeline_linked += Number(r.pipeline_linked_amount ?? 0);
    b.actions += 1;
    const q = quality.get(r.id);
    if (q?.approved_without_edit || r.human_approved) b.approved += 1;
    if (q?.rejected) b.rejected += 1;
    if (q?.edited_before_approval) b.edited += 1;
    map.set(key, b);
  }

  return Array.from(map.values()).map((b) => {
    b.net_saving = b.human_cost_saved - b.ai_spend;
    b.approval_rate = b.actions ? b.approved / b.actions : 0;
    b.rejection_rate = b.actions ? b.rejected / b.actions : 0;
    b.edit_rate = b.actions ? b.edited / b.actions : 0;
    const qFactor = Math.max(0, b.approval_rate * (1 - b.rejection_rate));
    b.quality_adjusted_roi = b.ai_spend > 0 ? (b.human_cost_saved * qFactor) / b.ai_spend : 0;
    b.cost_per_approved = b.approved > 0 ? b.ai_spend / b.approved : null;
    b.cost_per_action = b.actions > 0 ? b.ai_spend / b.actions : null;
    const d = decideFromMetrics(b);
    return {
      ...b,
      ai_spend: round(b.ai_spend),
      human_cost_saved: round(b.human_cost_saved),
      net_saving: round(b.net_saving),
      revenue_linked: round(b.revenue_linked),
      pipeline_linked: round(b.pipeline_linked),
      quality_adjusted_roi: round(b.quality_adjusted_roi),
      cost_per_approved: b.cost_per_approved == null ? null : round(b.cost_per_approved, 3),
      cost_per_action: b.cost_per_action == null ? null : round(b.cost_per_action, 3),
      approval_rate: round(b.approval_rate, 3),
      rejection_rate: round(b.rejection_rate, 3),
      edit_rate: round(b.edit_rate, 3),
      decision: d.decision,
      decision_reason: d.reason,
    };
  }).sort((a, b) => b.ai_spend - a.ai_spend);
}

export async function buildFinancePack(yyyyMm: string): Promise<FinancePack> {
  const range = monthRange(yyyyMm);

  const { data: ledger, error } = await supabase
    .from("ai_usage_ledger")
    .select("id,business_id,agent_id,campaign_id,task_category,status,estimated_cost,human_equivalent_cost,time_saved_minutes,revenue_linked_amount,pipeline_linked_amount,human_approved,cost_basis,actual_cost_gbp")
    .eq("is_simulation", false)
    .gte("created_at", range.start)
    .lt("created_at", range.end)
    .limit(5000);
  if (error) throw error;
  const rows = (ledger ?? []) as LedgerRow[];

  const ids = rows.map((r) => r.id);
  let qMap = new Map<string, QualityRow>();
  if (ids.length) {
    const { data: q } = await supabase
      .from("ai_quality_scores")
      .select("ai_usage_ledger_id,business_id,agent_id,approved_without_edit,edited_before_approval,rejected")
      .in("ai_usage_ledger_id", ids);
    qMap = new Map((q ?? []).map((x: any) => [x.ai_usage_ledger_id, x as QualityRow]));
  }

  const by_business = bucketise(rows, qMap, (r) => r.business_id);
  const by_agent = bucketise(rows, qMap, (r) => r.agent_id);
  const by_campaign = bucketise(rows, qMap, (r) => r.campaign_id);
  const by_category = bucketise(rows, qMap, (r) => r.task_category);

  // Totals & outcome-cost ratios
  let ai_spend = 0, human_cost_saved = 0, rev = 0, pipe = 0;
  let actual_known_cost = 0, estimated_only_cost = 0, pricing_missing_rows = 0;
  let revenue_confirmed = 0, revenue_estimated = 0;
  let pipeline_confirmed = 0, pipeline_estimated = 0;
  let actions = 0, approved = 0, rejected = 0, edited = 0;
  const outcomeCount: Record<string, number> = { lead: 0, opportunity: 0, sale: 0, content: 0, interaction: 0 };
  for (const r of rows) {
    const est = Number(r.estimated_cost ?? 0);
    const act = Number(r.actual_cost_gbp ?? 0);
    const basis = String(r.cost_basis ?? "").toLowerCase();
    ai_spend += act > 0 ? act : est;
    if (basis === "pricing_missing") pricing_missing_rows += 1;
    else if (act > 0) actual_known_cost += act;
    else estimated_only_cost += est;
    human_cost_saved += Number(r.human_equivalent_cost ?? 0);
    const revAmt = Number(r.revenue_linked_amount ?? 0);
    const pipeAmt = Number(r.pipeline_linked_amount ?? 0);
    rev += revAmt;
    pipe += pipeAmt;
    if (r.human_approved) {
      revenue_confirmed += revAmt;
      pipeline_confirmed += pipeAmt;
    } else {
      revenue_estimated += revAmt;
      pipeline_estimated += pipeAmt;
    }
    actions += 1;
    const q = qMap.get(r.id);
    if (q?.approved_without_edit || r.human_approved) approved += 1;
    if (q?.rejected) rejected += 1;
    if (q?.edited_before_approval) edited += 1;
    const cat = r.task_category ?? "";
    const o = CATEGORY_OUTCOME[cat];
    if (o) outcomeCount[o] += 1;
  }
  const approval_rate = actions ? approved / actions : 0;
  const rejection_rate = actions ? rejected / actions : 0;
  const edit_rate = actions ? edited / actions : 0;
  const qFactor = Math.max(0, approval_rate * (1 - rejection_rate));
  const quality_adjusted_roi = ai_spend > 0 ? (human_cost_saved * qFactor) / ai_spend : 0;

  const totals = {
    ai_spend: round(ai_spend),
    actual_known_cost: round(actual_known_cost),
    estimated_cost: round(estimated_only_cost),
    pricing_missing_rows,
    revenue_confirmed: round(revenue_confirmed),
    revenue_estimated: round(revenue_estimated),
    pipeline_confirmed: round(pipeline_confirmed),
    pipeline_estimated: round(pipeline_estimated),
    human_equivalent_saving_estimated: round(human_cost_saved),
    human_cost_saved: round(human_cost_saved),
    net_saving: round(human_cost_saved - ai_spend),
    revenue_linked: round(rev),
    pipeline_linked: round(pipe),
    actions,
    approved,
    rejected,
    edited,
    approval_rate: round(approval_rate, 3),
    rejection_rate: round(rejection_rate, 3),
    edit_rate: round(edit_rate, 3),
    quality_adjusted_roi: round(quality_adjusted_roi),
    cost_per_lead: outcomeCount.lead ? round(ai_spend / outcomeCount.lead, 3) : null,
    cost_per_opportunity: outcomeCount.opportunity ? round(ai_spend / outcomeCount.opportunity, 3) : null,
    cost_per_sale: outcomeCount.sale ? round(ai_spend / outcomeCount.sale, 3) : null,
    cost_per_content_asset: outcomeCount.content ? round(ai_spend / outcomeCount.content, 3) : null,
    cost_per_customer_interaction: outcomeCount.interaction ? round(ai_spend / outcomeCount.interaction, 3) : null,
  };

  // Business unit economics
  const business_unit_economics: BusinessUE[] = [];
  const campaignsByBusiness = new Map<string, Set<string>>();
  for (const r of rows) {
    if (r.business_id && r.campaign_id) {
      const s = campaignsByBusiness.get(r.business_id) ?? new Set<string>();
      s.add(r.campaign_id); campaignsByBusiness.set(r.business_id, s);
    }
  }
  for (const b of by_business) {
    const ueRows = rows.filter((r) => r.business_id === b.key);
    const interactions = ueRows.filter((r) => CATEGORY_OUTCOME[r.task_category ?? ""] === "interaction").length;
    let budgetRemaining: number | null = null;
    try {
      const { data: bud } = await supabase
        .from("ai_business_budgets" as any)
        .select("monthly_ai_budget")
        .eq("business_id", b.key)
        .maybeSingle();
      if (bud && (bud as any).monthly_ai_budget != null) {
        budgetRemaining = Number((bud as any).monthly_ai_budget) - b.ai_spend;
      }
    } catch { /* ignore */ }

    const paybackMonths = b.net_saving > 0 ? round(b.ai_spend / b.net_saving, 1) : null;
    const recommendedBudget = round(b.ai_spend * (b.decision === "scale" ? 1.3 : b.decision === "reduce" || b.decision === "pause" ? 0.5 : b.decision === "retire" ? 0 : 1.05));

    business_unit_economics.push({
      business_id: b.key,
      ai_spend: b.ai_spend,
      revenue: b.revenue_linked,
      pipeline: b.pipeline_linked,
      ai_spend_pct_revenue: b.revenue_linked > 0 ? round((b.ai_spend / b.revenue_linked) * 100, 1) : null,
      ai_spend_pct_pipeline: b.pipeline_linked > 0 ? round((b.ai_spend / b.pipeline_linked) * 100, 1) : null,
      active_campaigns: (campaignsByBusiness.get(b.key) ?? new Set()).size,
      ai_spend_per_campaign: (campaignsByBusiness.get(b.key)?.size ?? 0) > 0 ? round(b.ai_spend / (campaignsByBusiness.get(b.key) as Set<string>).size, 2) : null,
      customer_interactions: interactions,
      ai_spend_per_interaction: interactions > 0 ? round(b.ai_spend / interactions, 3) : null,
      approved_outputs: b.approved,
      rejected_outputs: b.rejected,
      ai_spend_per_approved: b.cost_per_approved,
      ai_spend_per_rejected: b.rejected > 0 ? round(b.ai_spend / b.rejected, 3) : null,
      budget_remaining: budgetRemaining,
      recommended_monthly_budget: recommendedBudget,
      estimated_payback_months: paybackMonths,
    });
  }

  // Founder summary
  const summary: string[] = [];
  if (totals.actions === 0) {
    summary.push("No AI activity recorded this month — nothing to evaluate.");
  } else {
    summary.push(`Total AI spend £${totals.ai_spend.toFixed(2)} produced an estimated human cost saving of £${totals.human_cost_saved.toFixed(2)} (net £${totals.net_saving.toFixed(2)}).`);
    const scale = by_agent.filter((a) => a.decision === "scale").slice(0, 3);
    const pause = by_agent.filter((a) => a.decision === "pause" || a.decision === "retire").slice(0, 3);
    const reduce = by_category.filter((c) => c.decision === "reduce").slice(0, 3);
    if (scale.length) summary.push(`Scale recommended for agents: ${scale.map((a) => `${a.key.slice(0, 8)} (ROI ${a.quality_adjusted_roi}×)`).join(", ")}.`);
    if (pause.length) summary.push(`Pause or retire: ${pause.map((a) => `${a.key.slice(0, 8)} (net £${a.net_saving})`).join(", ")}.`);
    if (reduce.length) summary.push(`Downgrade routing for categories: ${reduce.map((c) => c.key).join(", ")}.`);
    if (totals.rejection_rate > 0.2) summary.push(`Overall rejection rate is ${(totals.rejection_rate * 100).toFixed(0)}% — review prompt templates.`);
    if (totals.quality_adjusted_roi < 1 && totals.ai_spend > 10) summary.push("Quality-adjusted ROI is below 1× — AI is currently costing more than it saves.");
    if (totals.quality_adjusted_roi >= 3) summary.push("Quality-adjusted ROI is strong — consider increasing next month's AI budget.");
  }

  return {
    range,
    totals,
    by_business, by_agent, by_campaign, by_category,
    business_unit_economics,
    founder_summary: summary,
    estimates_disclaimer:
      "AI spend separates actual cost (token usage × current pricing), estimated cost (pricing-table rates with no token receipt), and pricing-missing rows. Pricing rows are marked verified or estimated in /founder/ai-cost/pricing. Revenue/pipeline split between confirmed (human-approved entries) and estimated (unapproved). Human-cost-saved figures are always estimates based on configured hourly rates and time saved.",
  };
}

export function financePackToCSV(pack: FinancePack): string {
  const lines: string[] = [];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const row = (...cells: unknown[]) => lines.push(cells.map(esc).join(","));

  row(`Liftor AI Finance Pack — ${pack.range.label}`);
  row("Generated", new Date().toISOString());
  row("");
  row("TOTALS");
  Object.entries(pack.totals).forEach(([k, v]) => row(k, v ?? ""));
  row("");
  row("FOUNDER SUMMARY");
  pack.founder_summary.forEach((s) => row(s));
  row("");
  row("DISCLAIMER", pack.estimates_disclaimer);

  const sections: [string, Bucket[]][] = [
    ["BY BUSINESS", pack.by_business],
    ["BY AGENT", pack.by_agent],
    ["BY CAMPAIGN", pack.by_campaign],
    ["BY TASK CATEGORY", pack.by_category],
  ];
  for (const [title, buckets] of sections) {
    row("");
    row(title);
    row("key", "ai_spend", "human_cost_saved", "net_saving", "revenue_linked", "pipeline_linked",
        "actions", "approved", "rejected", "edited",
        "approval_rate", "rejection_rate", "edit_rate", "quality_adjusted_roi",
        "cost_per_approved", "cost_per_action", "decision", "decision_reason");
    for (const b of buckets) {
      row(b.key, b.ai_spend, b.human_cost_saved, b.net_saving, b.revenue_linked, b.pipeline_linked,
          b.actions, b.approved, b.rejected, b.edited,
          b.approval_rate, b.rejection_rate, b.edit_rate, b.quality_adjusted_roi,
          b.cost_per_approved ?? "", b.cost_per_action ?? "",
          b.decision, b.decision_reason);
    }
  }

  row("");
  row("BUSINESS UNIT ECONOMICS");
  row("business_id", "ai_spend", "revenue", "pipeline", "ai_spend_pct_revenue", "ai_spend_pct_pipeline",
      "active_campaigns", "ai_spend_per_campaign", "customer_interactions", "ai_spend_per_interaction",
      "approved_outputs", "rejected_outputs", "ai_spend_per_approved", "ai_spend_per_rejected",
      "budget_remaining", "recommended_monthly_budget", "estimated_payback_months");
  for (const u of pack.business_unit_economics) {
    row(u.business_id, u.ai_spend, u.revenue, u.pipeline, u.ai_spend_pct_revenue ?? "", u.ai_spend_pct_pipeline ?? "",
        u.active_campaigns, u.ai_spend_per_campaign ?? "", u.customer_interactions, u.ai_spend_per_interaction ?? "",
        u.approved_outputs, u.rejected_outputs, u.ai_spend_per_approved ?? "", u.ai_spend_per_rejected ?? "",
        u.budget_remaining ?? "", u.recommended_monthly_budget, u.estimated_payback_months ?? "");
  }

  return lines.join("\n");
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}