import { supabase } from "@/integrations/supabase/client";

export type AllocationType =
  | "ai_budget" | "human_time" | "founder_time" | "cash"
  | "sales_effort" | "build_effort" | "content_effort";

export type PlanStatus = "draft" | "review_required" | "approved" | "active" | "archived";
export type ItemStatus = "recommended" | "approved" | "active" | "completed" | "rejected";

export type AllocationPlan = {
  id: string;
  allocation_period_start: string;
  allocation_period_end: string;
  allocation_type: AllocationType;
  total_available: number;
  unit: string;
  plan_status: PlanStatus;
  created_at: string;
  updated_at: string;
};

export type AllocationItem = {
  id: string;
  plan_id: string;
  business_id: string;
  allocated_amount: number;
  unit: string;
  priority: string;
  reason: string | null;
  expected_return: string | null;
  risk_notes: string | null;
  status: ItemStatus;
  created_at: string;
  updated_at: string;
};

export type UsageActual = {
  id: string;
  business_id: string;
  allocation_type: AllocationType;
  period_start: string;
  period_end: string;
  actual_used: number;
  unit: string;
  output_summary: string | null;
  roi_summary: string | null;
  created_at: string;
  audit_metadata: Record<string, unknown>;
};

export const TYPE_META: Record<AllocationType, { label: string; unit: string; cls: string }> = {
  ai_budget:     { label: "AI budget",     unit: "GBP",   cls: "bg-primary/15 text-primary border-primary/30" },
  human_time:    { label: "Human / VA time", unit: "hours", cls: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  founder_time:  { label: "Founder time",  unit: "hours", cls: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  cash:          { label: "Cash / spend",  unit: "GBP",   cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  sales_effort:  { label: "Sales effort",  unit: "hours", cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  build_effort:  { label: "Build effort",  unit: "hours", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  content_effort:{ label: "Content effort",unit: "hours", cls: "bg-pink-500/15 text-pink-300 border-pink-500/30" },
};

const sb = () => supabase as any;

export async function fetchPlans(allocation_type?: AllocationType): Promise<AllocationPlan[]> {
  let q = sb().from("resource_allocation_plans").select("*").order("updated_at", { ascending: false });
  if (allocation_type) q = q.eq("allocation_type", allocation_type);
  const { data, error } = await q;
  if (error) throw error; return data ?? [];
}

export async function fetchItems(plan_id?: string): Promise<AllocationItem[]> {
  let q = sb().from("resource_allocation_items").select("*").order("allocated_amount", { ascending: false });
  if (plan_id) q = q.eq("plan_id", plan_id);
  const { data, error } = await q;
  if (error) throw error; return data ?? [];
}

export async function fetchActuals(allocation_type?: AllocationType): Promise<UsageActual[]> {
  let q = sb().from("resource_usage_actuals").select("*").order("period_end", { ascending: false });
  if (allocation_type) q = q.eq("allocation_type", allocation_type);
  const { data, error } = await q;
  if (error) throw error; return data ?? [];
}

/* -------- recommendation logic -------- */

export type PriorityInput = {
  business_id: string;
  total_priority_score: number;   // 0-10
  recommended_decision: string;   // build_now / scale / operate / watch / pause / park / kill_review / exit_prepare
  founder_attention_required_score: number; // 0-10 (higher = less)
  cash_required_score: number;    // 0-10 (higher = cheaper)
  compliance_risk_score: number;  // 0-10 (higher = safer)
};

const DECISION_WEIGHT: Record<string, number> = {
  build_now: 1.2, scale: 1.3, operate: 1.0, watch: 0.6,
  pause: 0.2, park: 0.1, kill_review: 0.0, exit_prepare: 0.3,
};

/** Recommend allocation across businesses given a total pool. Internal only. */
export function recommendAllocation(
  total_available: number,
  allocation_type: AllocationType,
  priorities: PriorityInput[],
): Array<Omit<AllocationItem, "id" | "plan_id" | "created_at" | "updated_at">> {
  if (priorities.length === 0 || total_available <= 0) return [];
  const unit = TYPE_META[allocation_type].unit;

  const weighted = priorities.map(p => {
    const base = (p.total_priority_score || 0) * (DECISION_WEIGHT[p.recommended_decision] ?? 0.5);
    // bias by resource type
    let bias = 1;
    if (allocation_type === "founder_time") bias = (p.founder_attention_required_score >= 7 ? 0.7 : 1.2);
    if (allocation_type === "cash") bias = (p.cash_required_score <= 3 ? 0.6 : 1.0);
    if (p.compliance_risk_score <= 3) bias *= 0.5; // reduce funding for risky
    return { p, weight: Math.max(0, base * bias) };
  });
  const sumW = weighted.reduce((a, w) => a + w.weight, 0);
  if (sumW <= 0) return [];

  return weighted.map(({ p, weight }) => {
    const share = weight / sumW;
    const amount = Number((total_available * share).toFixed(2));
    const priority =
      p.recommended_decision === "scale" || p.recommended_decision === "build_now" ? "high"
      : p.recommended_decision === "operate" ? "normal"
      : "low";
    const expected_return = priority === "high"
      ? "Compound on a proven/strong business."
      : priority === "normal"
      ? "Maintain steady-state operation."
      : "Minimum maintenance only.";
    const risk_notes = p.compliance_risk_score <= 3
      ? "Compliance risk high — verify before committing spend."
      : null;
    return {
      business_id: p.business_id,
      allocated_amount: amount,
      unit,
      priority,
      reason: `Score ${p.total_priority_score.toFixed(1)} · ${p.recommended_decision} · share ${(share*100).toFixed(1)}%`,
      expected_return,
      risk_notes,
      status: "recommended" as ItemStatus,
    };
  });
}

/** Persist a draft plan + its items. Plan is review_required by default. */
export async function persistPlan(
  allocation_type: AllocationType,
  total_available: number,
  items: Array<Omit<AllocationItem, "id" | "plan_id" | "created_at" | "updated_at">>,
  period_start = new Date().toISOString().slice(0,10),
  period_end = new Date(Date.now() + 7*24*3600*1000).toISOString().slice(0,10),
): Promise<AllocationPlan> {
  const planRow = {
    allocation_period_start: period_start,
    allocation_period_end: period_end,
    allocation_type,
    total_available,
    unit: TYPE_META[allocation_type].unit,
    plan_status: "review_required" as PlanStatus,
  };
  const { data: plan, error } = await sb().from("resource_allocation_plans").insert(planRow).select().single();
  if (error) throw error;
  if (items.length) {
    const rows = items.map(it => ({ ...it, plan_id: (plan as any).id }));
    const { error: e2 } = await sb().from("resource_allocation_items").insert(rows);
    if (e2) throw e2;
  }
  return plan as AllocationPlan;
}

/* -------- diagnostics -------- */

export type AllocWarning = {
  business_id: string;
  allocation_type: AllocationType;
  severity: "info" | "warn" | "block";
  message: string;
};

export function diagnoseAllocation(
  items: AllocationItem[],
  plans: AllocationPlan[],
  priorities: PriorityInput[],
  actuals: UsageActual[],
): AllocWarning[] {
  const out: AllocWarning[] = [];
  const planById = new Map(plans.map(p => [p.id, p]));
  const priById = new Map(priorities.map(p => [p.business_id, p]));

  for (const it of items) {
    const plan = planById.get(it.plan_id);
    if (!plan) continue;
    const pri = priById.get(it.business_id);
    if (pri) {
      if (pri.total_priority_score < 4 && it.allocated_amount > 0 && it.status === "active") {
        out.push({ business_id: it.business_id, allocation_type: plan.allocation_type, severity: "warn",
          message: `Low-priority business consuming ${plan.allocation_type} — consider reallocating.` });
      }
      if (pri.total_priority_score >= 7 && it.allocated_amount === 0) {
        out.push({ business_id: it.business_id, allocation_type: plan.allocation_type, severity: "warn",
          message: `High-priority business has no ${plan.allocation_type} allocation.` });
      }
      if (pri.compliance_risk_score <= 3 && it.status === "active") {
        out.push({ business_id: it.business_id, allocation_type: plan.allocation_type, severity: "block",
          message: `Compliance risk high — approval required before spend on this business.` });
      }
    }
  }

  // overspend
  const allocByBizType = new Map<string, number>();
  for (const it of items) {
    const plan = planById.get(it.plan_id);
    if (!plan) continue;
    const k = `${it.business_id}|${plan.allocation_type}`;
    allocByBizType.set(k, (allocByBizType.get(k) ?? 0) + it.allocated_amount);
  }
  const usedByBizType = new Map<string, number>();
  for (const a of actuals) {
    const k = `${a.business_id}|${a.allocation_type}`;
    usedByBizType.set(k, (usedByBizType.get(k) ?? 0) + a.actual_used);
  }
  for (const [k, used] of usedByBizType.entries()) {
    const alloc = allocByBizType.get(k) ?? 0;
    if (alloc > 0 && used > alloc * 1.2) {
      const [business_id, allocation_type] = k.split("|") as [string, AllocationType];
      out.push({ business_id, allocation_type, severity: "warn",
        message: `Usage exceeds allocation by >20% — reallocate or approve top-up.` });
    }
  }
  return out;
}

export function summarize(plans: AllocationPlan[], items: AllocationItem[], actuals: UsageActual[]) {
  const totalsByType: Record<string, { available: number; allocated: number; used: number }> = {};
  for (const p of plans) {
    const t = p.allocation_type;
    if (!totalsByType[t]) totalsByType[t] = { available: 0, allocated: 0, used: 0 };
    if (p.plan_status === "active" || p.plan_status === "approved") totalsByType[t].available += Number(p.total_available);
  }
  const planById = new Map(plans.map(p => [p.id, p]));
  for (const it of items) {
    const plan = planById.get(it.plan_id); if (!plan) continue;
    const t = plan.allocation_type;
    if (!totalsByType[t]) totalsByType[t] = { available: 0, allocated: 0, used: 0 };
    totalsByType[t].allocated += Number(it.allocated_amount);
  }
  for (const a of actuals) {
    const t = a.allocation_type;
    if (!totalsByType[t]) totalsByType[t] = { available: 0, allocated: 0, used: 0 };
    totalsByType[t].used += Number(a.actual_used);
  }
  return {
    plans: plans.length,
    plans_pending_review: plans.filter(p => p.plan_status === "review_required").length,
    items: items.length,
    items_recommended: items.filter(i => i.status === "recommended").length,
    items_active: items.filter(i => i.status === "active").length,
    totals_by_type: totalsByType,
  };
}

/** Fetch priority inputs from portfolio_priority_scores (latest per business). */
export async function fetchPriorityInputs(): Promise<PriorityInput[]> {
  const { data, error } = await sb()
    .from("portfolio_priority_scores")
    .select("business_id,total_priority_score,recommended_decision,founder_attention_required_score,cash_required_score,compliance_risk_score,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const map = new Map<string, PriorityInput>();
  for (const r of (data ?? []) as any[]) {
    if (!map.has(r.business_id)) {
      map.set(r.business_id, {
        business_id: r.business_id,
        total_priority_score: Number(r.total_priority_score),
        recommended_decision: r.recommended_decision,
        founder_attention_required_score: Number(r.founder_attention_required_score),
        cash_required_score: Number(r.cash_required_score),
        compliance_risk_score: Number(r.compliance_risk_score),
      });
    }
  }
  return Array.from(map.values());
}