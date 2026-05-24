import { supabase } from "@/integrations/supabase/client";
import type { AIModelTier } from "@/services/aiUsageLogger";

export type AgentStatus =
  | "healthy" | "watch" | "expensive" | "over_limit" | "paused" | "human_approval_required";

export const TIER_ORDER: AIModelTier[] = ["no_ai", "cheap", "standard", "premium", "human_required"];

export const RESTRICTED_NO_BYPASS = new Set([
  "legal_sensitive",
  "financial_sensitive",
  "compliance_sensitive",
  "investor_analysis",
  "valuation_analysis",
  "m_and_a_research",
  "high_value_external_communication",
]);

export const CONSERVATIVE_AGENT_DEFAULTS = {
  allowed_model_tiers: ["no_ai", "cheap", "standard"] as string[],
  default_model_tier: "cheap" as string,
  daily_spend_cap: 5,
  weekly_spend_cap: 25,
  monthly_spend_cap: 75,
  max_retries: 3,
  max_actions_per_hour: 60,
  requires_human_approval: false,
  allowed_task_categories: null as string[] | null,
  blocked_task_categories: [] as string[],
  escalation_rules: {} as Record<string, unknown>,
  active: true,
};

export type AgentSpend = {
  agent_id: string;
  spend_today: number;
  spend_week: number;
  spend_month: number;
  actions_today: number;
  failed_actions: number;
  retry_count: number;
  human_review_required: number;
  avg_cost_per_action: number;
  roi_score: number | null;
  status: AgentStatus;
  status_reason: string;
};

function startOfDay() { const x = new Date(); x.setHours(0, 0, 0, 0); return x; }
function startOfWeek() {
  const x = startOfDay(); const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day); return x;
}
function startOfMonth() { const x = startOfDay(); x.setDate(1); return x; }

export async function ensureAgentCostControl(agent_id: string, business_id?: string | null) {
  const { data: existing } = await supabase
    .from("ai_agent_cost_controls").select("*").eq("agent_id", agent_id).maybeSingle();
  if (existing) return { row: existing, created: false };
  const { data, error } = await supabase
    .from("ai_agent_cost_controls")
    .insert({ agent_id, business_id: business_id ?? null, ...CONSERVATIVE_AGENT_DEFAULTS } as any)
    .select("*").single();
  if (error) return { row: null, created: false, error };
  return { row: data, created: true };
}

export async function getAgentSpend(agent_id: string): Promise<AgentSpend> {
  const [{ data: rowsData }, { data: control }] = await Promise.all([
    supabase
      .from("ai_usage_ledger")
      .select("estimated_cost,created_at,status,roi_score,audit_metadata")
      .eq("agent_id", agent_id)
      .gte("created_at", startOfMonth().toISOString())
      .limit(5000),
    supabase.from("ai_agent_cost_controls").select("*").eq("agent_id", agent_id).maybeSingle(),
  ]);
  const rows = (rowsData ?? []) as any[];

  const dayStart = startOfDay().getTime();
  const weekStart = startOfWeek().getTime();
  let spend_today = 0, spend_week = 0, spend_month = 0;
  let actions_today = 0, failed_actions = 0, retry_count = 0;
  let human_review_required = 0, totalActions = 0, roiSum = 0, roiN = 0;

  for (const r of rows) {
    const cost = Number(r.estimated_cost ?? 0);
    const t = new Date(r.created_at).getTime();
    spend_month += cost;
    totalActions += 1;
    if (t >= weekStart) spend_week += cost;
    if (t >= dayStart) { spend_today += cost; actions_today += 1; }
    if (r.status === "failed") failed_actions += 1;
    if (r.status === "human_review_required") human_review_required += 1;
    const retries = Number(r.audit_metadata?.retries ?? 0);
    if (retries > 0) retry_count += retries;
    if (r.roi_score != null) { roiSum += Number(r.roi_score); roiN += 1; }
  }

  const cfg: any = control;
  const dailyPct = cfg?.daily_spend_cap ? (spend_today / cfg.daily_spend_cap) * 100 : 0;
  const weeklyPct = cfg?.weekly_spend_cap ? (spend_week / cfg.weekly_spend_cap) * 100 : 0;
  const monthlyPct = cfg?.monthly_spend_cap ? (spend_month / cfg.monthly_spend_cap) * 100 : 0;
  const peak = Math.max(dailyPct, weeklyPct, monthlyPct);

  let status: AgentStatus = "healthy";
  let reason = "within limits";
  if (cfg?.active === false) { status = "paused"; reason = "agent paused"; }
  else if (human_review_required > 0) { status = "human_approval_required"; reason = `${human_review_required} action(s) awaiting approval`; }
  else if (peak >= 100) { status = "over_limit"; reason = "spend cap exceeded"; }
  else if (peak >= 80) { status = "expensive"; reason = `at ${peak.toFixed(0)}% of cap`; }
  else if (peak >= 60) { status = "watch"; reason = `at ${peak.toFixed(0)}% of cap`; }

  return {
    agent_id, spend_today, spend_week, spend_month,
    actions_today, failed_actions, retry_count, human_review_required,
    avg_cost_per_action: totalActions ? spend_month / totalActions : 0,
    roi_score: roiN ? roiSum / roiN : null,
    status, status_reason: reason,
  };
}

export type CheckAgentInput = {
  agent_id: string;
  business_id?: string | null;
  task_category?: string | null;
  estimated_action_cost: number;
  requested_model_tier?: AIModelTier | null;
};

export type CheckAgentResult = {
  allowed: boolean;
  selected_model_tier: AIModelTier;
  blocked_reason: string | null;
  requires_human_approval: boolean;
  spend_remaining_today: number | null;
  recommended_action: string;
};

export async function checkAgentCostControlBeforeAction(
  input: CheckAgentInput,
): Promise<CheckAgentResult> {
  const { row: ctl } = await ensureAgentCostControl(input.agent_id, input.business_id ?? null);
  const cfg: any = ctl ?? CONSERVATIVE_AGENT_DEFAULTS;
  const spend = await getAgentSpend(input.agent_id);
  const cost = Math.max(0, Number(input.estimated_action_cost ?? 0));

  const requested = input.requested_model_tier ?? (cfg.default_model_tier as AIModelTier);
  const allowedTiers: AIModelTier[] = (cfg.allowed_model_tiers ?? []) as AIModelTier[];
  let selected: AIModelTier = requested;

  // Model-tier control: downgrade if not allowed.
  if (allowedTiers.length > 0 && !allowedTiers.includes(requested)) {
    const ranked = [...allowedTiers].sort(
      (a, b) => TIER_ORDER.indexOf(b) - TIER_ORDER.indexOf(a),
    );
    if (ranked.length === 0) {
      return {
        allowed: false, selected_model_tier: requested,
        blocked_reason: "no model tiers allowed for this agent",
        requires_human_approval: false,
        spend_remaining_today: cfg.daily_spend_cap != null ? cfg.daily_spend_cap - spend.spend_today : null,
        recommended_action: "configure allowed_model_tiers for this agent",
      };
    }
    selected = ranked[0];
  }

  // Paused.
  if (cfg.active === false) {
    return {
      allowed: false, selected_model_tier: selected,
      blocked_reason: "agent paused",
      requires_human_approval: false,
      spend_remaining_today: null,
      recommended_action: "reactivate agent or reassign task",
    };
  }

  // Category filters.
  const cat = input.task_category ?? "";
  if (cfg.blocked_task_categories?.includes(cat)) {
    return {
      allowed: false, selected_model_tier: selected,
      blocked_reason: `category "${cat}" blocked for this agent`,
      requires_human_approval: false,
      spend_remaining_today: cfg.daily_spend_cap != null ? cfg.daily_spend_cap - spend.spend_today : null,
      recommended_action: "route to a different agent",
    };
  }
  if (cfg.allowed_task_categories && cfg.allowed_task_categories.length > 0
      && cat && !cfg.allowed_task_categories.includes(cat)) {
    return {
      allowed: false, selected_model_tier: selected,
      blocked_reason: `category "${cat}" not in allow-list`,
      requires_human_approval: false,
      spend_remaining_today: cfg.daily_spend_cap != null ? cfg.daily_spend_cap - spend.spend_today : null,
      recommended_action: "route to a different agent or expand allow-list",
    };
  }

  // Restricted categories — always human approval, no bypass.
  let requiresHuman = !!cfg.requires_human_approval;
  if (RESTRICTED_NO_BYPASS.has(cat)) requiresHuman = true;

  // Spend caps.
  const caps: Array<[number | null, number, string]> = [
    [cfg.daily_spend_cap, spend.spend_today, "daily"],
    [cfg.weekly_spend_cap, spend.spend_week, "weekly"],
    [cfg.monthly_spend_cap, spend.spend_month, "monthly"],
  ];
  for (const [cap, used, label] of caps) {
    if (cap != null && used + cost > cap) {
      return {
        allowed: false, selected_model_tier: selected,
        blocked_reason: `would exceed ${label} spend cap (${used.toFixed(2)} + ${cost.toFixed(2)} > ${cap})`,
        requires_human_approval: true,
        spend_remaining_today: cfg.daily_spend_cap != null ? cfg.daily_spend_cap - spend.spend_today : null,
        recommended_action: "pause agent; downgrade model; founder review",
      };
    }
  }

  // Rate limit (max actions per hour).
  if (cfg.max_actions_per_hour != null) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("ai_usage_ledger")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", input.agent_id)
      .gte("created_at", oneHourAgo);
    if ((count ?? 0) >= cfg.max_actions_per_hour) {
      return {
        allowed: false, selected_model_tier: selected,
        blocked_reason: `rate limit: ${count} actions in last hour ≥ ${cfg.max_actions_per_hour}`,
        requires_human_approval: false,
        spend_remaining_today: cfg.daily_spend_cap != null ? cfg.daily_spend_cap - spend.spend_today : null,
        recommended_action: "throttle agent or raise rate limit",
      };
    }
  }

  return {
    allowed: !requiresHuman || (cat && !RESTRICTED_NO_BYPASS.has(cat) ? !cfg.requires_human_approval : false),
    selected_model_tier: selected,
    blocked_reason: null,
    requires_human_approval: requiresHuman,
    spend_remaining_today: cfg.daily_spend_cap != null ? cfg.daily_spend_cap - spend.spend_today : null,
    recommended_action: requiresHuman ? "request human approval" : "proceed",
  };
}

/** Record a failed retry and raise an alert if max_retries exceeded. */
export async function recordAgentRetry(args: {
  agent_id: string; business_id?: string | null;
  task_id?: string | null; retry_count: number;
  error_message?: string | null;
}) {
  const { data: ctl } = await supabase
    .from("ai_agent_cost_controls").select("max_retries").eq("agent_id", args.agent_id).maybeSingle();
  const max = (ctl as any)?.max_retries ?? 3;
  if (args.retry_count < max) return { stopped: false };

  const severity = args.retry_count >= max * 2 ? "high" : "warning";
  // Dedupe last hour.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("ai_cost_alerts")
    .select("id")
    .eq("agent_id", args.agent_id)
    .eq("alert_type", "excessive_retries")
    .is("resolved_at", null)
    .gte("created_at", oneHourAgo)
    .limit(1);
  if (!existing || existing.length === 0) {
    await supabase.from("ai_cost_alerts").insert({
      agent_id: args.agent_id,
      business_id: args.business_id ?? null,
      task_id: args.task_id ?? null,
      alert_type: "excessive_retries",
      severity,
      message: `Agent exceeded max retries (${args.retry_count} ≥ ${max}).${args.error_message ? " Last error: " + args.error_message : ""}`,
      recommended_action: "human review; simplify prompt; check upstream data",
      status: "open",
      audit_metadata: { retry_count: args.retry_count, max_retries: max },
    } as any);
  }
  return { stopped: true };
}