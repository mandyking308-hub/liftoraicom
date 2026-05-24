import { supabase } from "@/integrations/supabase/client";

export const CONSERVATIVE_DEFAULTS = {
  daily_ai_budget: 10,
  weekly_ai_budget: 50,
  monthly_ai_budget: 150,
  campaign_ai_budget: 50,
  max_cost_per_lead: 1,
  max_cost_per_opportunity: 5,
  max_cost_per_customer: 25,
  max_cost_per_content_asset: 3,
  max_cost_per_agent_per_day: 20,
  stop_when_budget_exceeded: true,
  require_founder_approval_when_exceeded: true,
  currency: "GBP" as const,
  active: true,
};

export type BudgetStatus = "safe" | "watch" | "near_limit" | "exceeded" | "blocked" | "not_configured";

export type BudgetUsage = {
  business_id: string;
  budget_id: string | null;
  configured: boolean;
  spend_today: number;
  spend_week: number;
  spend_month: number;
  spend_campaign: number;
  remaining_daily: number | null;
  remaining_weekly: number | null;
  remaining_monthly: number | null;
  pct_daily: number | null;
  pct_weekly: number | null;
  pct_monthly: number | null;
  projected_month_end: number;
  status: BudgetStatus;
  status_reason: string;
  top_agent: { agent_id: string | null; spend: number } | null;
  top_campaign: { campaign_id: string | null; spend: number } | null;
  alert_count_open: number;
};

export function statusFromPct(pct: number | null, opts?: { stop?: boolean }): BudgetStatus {
  if (pct === null) return "safe";
  if (pct >= 100) return opts?.stop ? "blocked" : "exceeded";
  if (pct >= 80) return "near_limit";
  if (pct >= 60) return "watch";
  return "safe";
}

function escalate(a: BudgetStatus, b: BudgetStatus): BudgetStatus {
  const order: BudgetStatus[] = ["safe", "watch", "near_limit", "exceeded", "blocked"];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

function startOfDay(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}
function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // Monday=0
  x.setDate(x.getDate() - day); return x;
}
function startOfMonth(d = new Date()) {
  const x = startOfDay(d); x.setDate(1); return x;
}

/** Ensure a business has a budget row; creates conservative defaults if missing. */
export async function ensureBusinessBudget(business_id: string) {
  const { data: existing } = await supabase
    .from("ai_business_budgets")
    .select("*")
    .eq("business_id", business_id)
    .maybeSingle();
  if (existing) return { row: existing, created: false };
  const { data, error } = await supabase
    .from("ai_business_budgets")
    .insert({ business_id, ...CONSERVATIVE_DEFAULTS })
    .select("*")
    .single();
  if (error) return { row: null, created: false, error };
  return { row: data, created: true };
}

/** Compute spend + status for a business. Optionally scope to a campaign for campaign budget. */
export async function getBusinessBudgetUsage(
  business_id: string,
  opts?: { campaign_id?: string | null },
): Promise<BudgetUsage> {
  const [{ data: budget }, ledger, alerts] = await Promise.all([
    supabase.from("ai_business_budgets").select("*").eq("business_id", business_id).maybeSingle(),
    supabase
      .from("ai_usage_ledger")
      .select("estimated_cost,created_at,agent_id,campaign_id,status")
      .eq("business_id", business_id)
      .gte("created_at", startOfMonth().toISOString())
      .neq("status", "skipped")
      .neq("status", "blocked")
      .limit(5000),
    supabase
      .from("ai_cost_alerts")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business_id)
      .is("resolved_at", null),
  ]);

  const rows = (ledger.data ?? []) as Array<{
    estimated_cost: number | null;
    created_at: string;
    agent_id: string | null;
    campaign_id: string | null;
  }>;

  const dayStart = startOfDay().getTime();
  const weekStart = startOfWeek().getTime();
  let spend_today = 0, spend_week = 0, spend_month = 0, spend_campaign = 0;
  const agentMap = new Map<string | null, number>();
  const campaignMap = new Map<string | null, number>();

  for (const r of rows) {
    const cost = Number(r.estimated_cost ?? 0);
    const t = new Date(r.created_at).getTime();
    spend_month += cost;
    if (t >= weekStart) spend_week += cost;
    if (t >= dayStart) spend_today += cost;
    if (opts?.campaign_id && r.campaign_id === opts.campaign_id) spend_campaign += cost;
    agentMap.set(r.agent_id, (agentMap.get(r.agent_id) ?? 0) + cost);
    campaignMap.set(r.campaign_id, (campaignMap.get(r.campaign_id) ?? 0) + cost);
  }

  const pick = (m: Map<string | null, number>) => {
    let best: [string | null, number] | null = null;
    for (const e of m) if (!best || e[1] > best[1]) best = e;
    return best;
  };
  const topAgent = pick(agentMap);
  const topCampaign = pick(campaignMap);

  const cfg = budget as any | null;
  const configured = !!cfg;
  const stop = !!cfg?.stop_when_budget_exceeded;

  const safeDiv = (used: number, cap: number | null | undefined) =>
    cap && cap > 0 ? (used / cap) * 100 : null;

  const pct_daily = safeDiv(spend_today, cfg?.daily_ai_budget);
  const pct_weekly = safeDiv(spend_week, cfg?.weekly_ai_budget);
  const pct_monthly = safeDiv(spend_month, cfg?.monthly_ai_budget);

  let status: BudgetStatus = configured ? "safe" : "not_configured";
  let reason = configured ? "within budget" : "no budget configured — conservative defaults recommended";
  if (configured) {
    const s = [
      statusFromPct(pct_daily, { stop }),
      statusFromPct(pct_weekly, { stop }),
      statusFromPct(pct_monthly, { stop }),
    ].reduce(escalate, "safe");
    status = s;
    if (s === "blocked") reason = "monthly/weekly/daily budget exceeded — actions blocked";
    else if (s === "exceeded") reason = "budget exceeded — founder approval required";
    else if (s === "near_limit") reason = "approaching budget cap";
    else if (s === "watch") reason = "spend rising — monitor";
  }

  // Projected month-end based on average daily run-rate so far.
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projected_month_end =
    dayOfMonth > 0 ? (spend_month / dayOfMonth) * daysInMonth : spend_month;

  return {
    business_id,
    budget_id: cfg?.id ?? null,
    configured,
    spend_today,
    spend_week,
    spend_month,
    spend_campaign,
    remaining_daily: cfg?.daily_ai_budget != null ? cfg.daily_ai_budget - spend_today : null,
    remaining_weekly: cfg?.weekly_ai_budget != null ? cfg.weekly_ai_budget - spend_week : null,
    remaining_monthly: cfg?.monthly_ai_budget != null ? cfg.monthly_ai_budget - spend_month : null,
    pct_daily, pct_weekly, pct_monthly,
    projected_month_end,
    status, status_reason: reason,
    top_agent: topAgent ? { agent_id: topAgent[0], spend: topAgent[1] } : null,
    top_campaign: topCampaign ? { campaign_id: topCampaign[0], spend: topCampaign[1] } : null,
    alert_count_open: alerts.count ?? 0,
  };
}

export type CheckBudgetInput = {
  business_id: string;
  agent_id?: string | null;
  campaign_id?: string | null;
  estimated_action_cost: number;
  task_category?: string | null;
};

export type CheckBudgetResult = {
  allowed: boolean;
  status: BudgetStatus;
  reason: string;
  budget_remaining: { daily: number | null; weekly: number | null; monthly: number | null };
  requires_founder_approval: boolean;
  recommended_action: string;
};

/** Decide whether an AI action may proceed against the business AI budget. */
export async function checkAIBudgetBeforeAction(
  input: CheckBudgetInput,
): Promise<CheckBudgetResult> {
  const { row: budget } = await ensureBusinessBudget(input.business_id);
  const usage = await getBusinessBudgetUsage(input.business_id, {
    campaign_id: input.campaign_id ?? null,
  });

  const cost = Math.max(0, Number(input.estimated_action_cost ?? 0));
  const cfg: any = budget ?? CONSERVATIVE_DEFAULTS;
  const stop = !!cfg.stop_when_budget_exceeded;
  const reqApproval = !!cfg.require_founder_approval_when_exceeded;

  const projected = {
    daily: cfg.daily_ai_budget != null ? usage.spend_today + cost : null,
    weekly: cfg.weekly_ai_budget != null ? usage.spend_week + cost : null,
    monthly: cfg.monthly_ai_budget != null ? usage.spend_month + cost : null,
    campaign:
      cfg.campaign_ai_budget != null && input.campaign_id
        ? usage.spend_campaign + cost
        : null,
  };

  const breaches: string[] = [];
  if (projected.daily != null && projected.daily > cfg.daily_ai_budget) breaches.push("daily");
  if (projected.weekly != null && projected.weekly > cfg.weekly_ai_budget) breaches.push("weekly");
  if (projected.monthly != null && projected.monthly > cfg.monthly_ai_budget) breaches.push("monthly");
  if (projected.campaign != null && projected.campaign > cfg.campaign_ai_budget) breaches.push("campaign");

  const result: CheckBudgetResult = {
    allowed: true,
    status: usage.status,
    reason: "within budget",
    budget_remaining: {
      daily: usage.remaining_daily,
      weekly: usage.remaining_weekly,
      monthly: usage.remaining_monthly,
    },
    requires_founder_approval: false,
    recommended_action: "proceed",
  };

  if (breaches.length > 0) {
    result.reason = `would breach ${breaches.join(", ")} budget`;
    if (stop) {
      result.allowed = false;
      result.status = "blocked";
      result.recommended_action = "pause action; downgrade model tier; founder review";
      await createBudgetAlert({
        business_id: input.business_id,
        agent_id: input.agent_id ?? null,
        campaign_id: input.campaign_id ?? null,
        alert_type: "budget_exceeded",
        severity: "high",
        message: `AI action blocked — projected to exceed ${breaches.join(", ")} budget (cost £${cost.toFixed(2)}).`,
        recommended_action: "pause campaign or downgrade model; founder review",
      });
    } else {
      result.allowed = !reqApproval;
      result.requires_founder_approval = reqApproval;
      result.status = "exceeded";
      result.recommended_action = reqApproval
        ? "request founder approval; consider downgrading model"
        : "downgrade model tier";
      await createBudgetAlert({
        business_id: input.business_id,
        agent_id: input.agent_id ?? null,
        campaign_id: input.campaign_id ?? null,
        alert_type: "budget_exceeded",
        severity: "medium",
        message: `AI spend over ${breaches.join(", ")} budget threshold (cost £${cost.toFixed(2)}).`,
        recommended_action: result.recommended_action,
      });
    }
    return result;
  }

  // Near-limit warning (≥ 80%) — allow but alert.
  const pcts = [usage.pct_daily, usage.pct_weekly, usage.pct_monthly].filter(
    (p): p is number => p !== null,
  );
  const peak = pcts.length ? Math.max(...pcts) : 0;
  if (peak >= 80) {
    result.status = "near_limit";
    result.reason = `approaching budget cap (${peak.toFixed(0)}% used)`;
    result.recommended_action = "monitor; consider downgrading non-critical tasks";
    await createBudgetAlert({
      business_id: input.business_id,
      agent_id: input.agent_id ?? null,
      campaign_id: input.campaign_id ?? null,
      alert_type: "budget_near_limit",
      severity: "low",
      message: `AI budget at ${peak.toFixed(0)}% — approaching cap.`,
      recommended_action: "downgrade non-critical AI tasks; reduce frequency",
    });
  }

  return result;
}

type AlertInput = {
  business_id: string;
  agent_id?: string | null;
  campaign_id?: string | null;
  alert_type: "budget_near_limit" | "budget_exceeded";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  recommended_action: string;
};

async function createBudgetAlert(input: AlertInput) {
  // De-dupe: skip if an open alert of same type already exists in last hour.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("ai_cost_alerts")
    .select("id")
    .eq("business_id", input.business_id)
    .eq("alert_type", input.alert_type)
    .is("resolved_at", null)
    .gte("created_at", oneHourAgo)
    .limit(1);
  if (existing && existing.length > 0) return;

  await supabase.from("ai_cost_alerts").insert({
    business_id: input.business_id,
    agent_id: input.agent_id ?? null,
    campaign_id: input.campaign_id ?? null,
    alert_type: input.alert_type,
    severity: input.severity,
    message: input.message,
    recommended_action: input.recommended_action,
    status: "open",
    audit_metadata: {},
  } as any);
}