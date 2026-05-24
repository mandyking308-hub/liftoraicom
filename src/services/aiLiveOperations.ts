import { supabase } from "@/integrations/supabase/client";

/**
 * AI Cost Governor — Live Operating Mode.
 *
 * This module is LIVE by default. It tracks real AI usage across Liftor and
 * surfaces health, budget, approval, cost, risk and pause signals through a
 * single operational status. It never blocks the platform from running.
 *
 * Internal activity (logging, cost calc, dashboards, ROI, prompt reuse,
 * cached context, routing, recommendations, draft preparation) runs without
 * founder approval. Only HIGH-RISK EXTERNAL or SENSITIVE actions are gated.
 */

export type LiveStatus =
  | "live_healthy"
  | "live_watch"
  | "live_budget_warning"
  | "live_approval_required"
  | "live_cost_alert"
  | "live_risk_alert"
  | "live_paused_by_founder"
  | "live_paused_by_stop_loss";

export const LIVE_STATUS_LABEL: Record<LiveStatus, string> = {
  live_healthy: "Live — Healthy",
  live_watch: "Live — Watch",
  live_budget_warning: "Live — Budget Warning",
  live_approval_required: "Live — Approval Required",
  live_cost_alert: "Live — Cost Alert",
  live_risk_alert: "Live — Risk Alert",
  live_paused_by_founder: "Live — Paused by Founder",
  live_paused_by_stop_loss: "Live — Paused by Stop-Loss",
};

/** Task categories that REQUIRE founder approval before any external action. */
export const HIGH_RISK_EXTERNAL_CATEGORIES = [
  "external_email_send",
  "social_post_publish",
  "contact_buyer",
  "contact_investor",
  "contact_partner",
  "legal_sensitive",
  "tax_sensitive",
  "financial_sensitive",
  "compliance_sensitive",
  "acquisition_or_valuation_sensitive",
  "public_reputation_sensitive",
  "contract_language",
] as const;

/** Internal AI activity that runs live with no approval requirement. */
export const APPROVAL_FREE_INTERNAL_CATEGORIES = [
  "internal_logging",
  "internal_cost_calculation",
  "internal_analysis",
  "internal_dashboard_update",
  "internal_roi_snapshot",
  "internal_alert",
  "internal_prompt_reuse",
  "internal_cached_context",
  "internal_routing_decision",
  "internal_recommendation",
  "internal_draft_preparation",
] as const;

/** Decide whether a task category requires founder approval before it can
 * leave the system. Internal activities NEVER require approval. */
export function requiresFounderApproval(opts: {
  task_category: string;
  risk_level?: "low" | "medium" | "high" | "critical" | null;
  external_action?: boolean;
}): boolean {
  if (!opts.external_action) return false;
  if ((APPROVAL_FREE_INTERNAL_CATEGORIES as readonly string[]).includes(opts.task_category)) return false;
  if (opts.risk_level === "high" || opts.risk_level === "critical") return true;
  return (HIGH_RISK_EXTERNAL_CATEGORIES as readonly string[]).includes(opts.task_category);
}

export type LiveSignals = {
  spend_today_gbp: number;
  spend_month_gbp: number;
  budget_warnings: number;
  cost_alerts_open: number;
  high_risk_pending_approval: number;
  paused_agents: number;
  paused_campaigns: number;
  failed_actions_24h: number;
  prompt_injection_warnings_24h: number;
  redaction_events_24h: number;
  stop_loss_alerts_open: number;
  risk_alerts_open: number;
  global_paused: boolean;
  paused_by_founder: boolean;
  paused_by_stop_loss: boolean;
  // Configuration gaps (warnings only — not blockers)
  pricing_rows: number;
  budget_rows: number;
  agent_control_rows: number;
};

function startOfDayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function startOfMonthISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d.toISOString();
}
function hoursAgoISO(h: number): string {
  return new Date(Date.now() - h * 3600 * 1000).toISOString();
}

async function sumCost(sinceISO: string): Promise<number> {
  const { data } = await supabase
    .from("ai_usage_ledger")
    .select("display_cost_total, total_cost_gbp, total_cost")
    .eq("is_simulation", false)
    .gte("created_at", sinceISO)
    .limit(5000);
  if (!data) return 0;
  let s = 0;
  for (const r of data as any[]) {
    const v = Number(r.display_cost_total ?? r.total_cost_gbp ?? r.total_cost ?? 0);
    if (!Number.isNaN(v)) s += v;
  }
  return Math.round(s * 10000) / 10000;
}

async function countWhere(table: string, build: (q: any) => any): Promise<number> {
  let q: any = supabase.from(table as any).select("*", { count: "exact", head: true });
  q = build(q);
  const { count } = await q;
  return count ?? 0;
}

export async function loadLiveSignals(): Promise<LiveSignals> {
  const [
    spend_today,
    spend_month,
    budget_warnings,
    cost_alerts_open,
    high_risk_pending_approval,
    failed_actions_24h,
    prompt_injection_warnings_24h,
    redaction_events_24h,
    stop_loss_alerts_open,
    risk_alerts_open,
    pricing_rows,
    budget_rows,
    agent_control_rows,
    kill,
  ] = await Promise.all([
    sumCost(startOfDayISO()),
    sumCost(startOfMonthISO()),
    countWhere("ai_cost_alerts", (q) => q.eq("alert_type", "budget_warning").eq("status", "open")),
    countWhere("ai_cost_alerts", (q) => q.eq("status", "open")),
    countWhere("ai_action_queue", (q) => q.eq("status", "requires_approval")),
    countWhere("ai_action_queue", (q) =>
      q.eq("status", "failed").gte("created_at", hoursAgoISO(24)),
    ),
    countWhere("ai_cost_alerts", (q) =>
      q.eq("alert_type", "prompt_injection").gte("created_at", hoursAgoISO(24)),
    ),
    countWhere("ai_cost_alerts", (q) =>
      q.eq("alert_type", "sensitive_data_redacted").gte("created_at", hoursAgoISO(24)),
    ),
    countWhere("ai_cost_alerts", (q) => q.eq("alert_type", "stop_loss").eq("status", "open")),
    countWhere("ai_cost_alerts", (q) =>
      q.in("severity", ["high", "critical"]).eq("status", "open"),
    ),
    countWhere("ai_provider_pricing", (q) => q.eq("active", true)),
    countWhere("ai_business_budgets", (q) => q),
    countWhere("ai_agent_cost_controls", (q) => q),
    supabase.from("ai_kill_switch_state").select("*").maybeSingle().then((r) => r.data),
  ]);

  const [paused_agents, paused_campaigns] = await Promise.all([
    Promise.resolve(((kill as any)?.paused_agent_ids ?? []).length),
    Promise.resolve(((kill as any)?.paused_campaign_ids ?? []).length),
  ]);

  return {
    spend_today_gbp: spend_today,
    spend_month_gbp: spend_month,
    budget_warnings,
    cost_alerts_open,
    high_risk_pending_approval,
    paused_agents,
    paused_campaigns,
    failed_actions_24h,
    prompt_injection_warnings_24h,
    redaction_events_24h,
    stop_loss_alerts_open,
    risk_alerts_open,
    global_paused: !!(kill as any)?.global_ai_paused,
    paused_by_founder: !!(kill as any)?.global_ai_paused,
    paused_by_stop_loss: !!(kill as any)?.paused_by_stop_loss,
    pricing_rows,
    budget_rows,
    agent_control_rows,
  };
}

/** Derive live operational status from real signals. Never blocks. */
export function deriveLiveStatus(s: LiveSignals): { status: LiveStatus; reason: string } {
  if (s.paused_by_stop_loss) return { status: "live_paused_by_stop_loss", reason: "Stop-loss has paused AI activity. Founder review required." };
  if (s.paused_by_founder || s.global_paused) return { status: "live_paused_by_founder", reason: "Founder kill switch is active. AI activity paused." };
  if (s.risk_alerts_open > 0 || s.prompt_injection_warnings_24h > 0) return { status: "live_risk_alert", reason: `${s.risk_alerts_open} high/critical alerts, ${s.prompt_injection_warnings_24h} injection warnings in last 24h.` };
  if (s.stop_loss_alerts_open > 0) return { status: "live_cost_alert", reason: `${s.stop_loss_alerts_open} stop-loss alerts open.` };
  if (s.budget_warnings > 0) return { status: "live_budget_warning", reason: `${s.budget_warnings} budget warning(s) open.` };
  if (s.high_risk_pending_approval > 0) return { status: "live_approval_required", reason: `${s.high_risk_pending_approval} high-risk external action(s) waiting for founder approval.` };
  if (s.cost_alerts_open > 0 || s.failed_actions_24h > 0) return { status: "live_watch", reason: `${s.cost_alerts_open} open cost alerts, ${s.failed_actions_24h} failed actions in last 24h.` };
  return { status: "live_healthy", reason: "All systems operating live within thresholds." };
}

export async function persistLiveStatus(status: LiveStatus, evaluation: any) {
  const { data: existing } = await supabase
    .from("ai_go_live_readiness")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const payload: any = {
    current_status: status,
    evaluation_results: evaluation,
    evaluated_at: new Date().toISOString(),
  };
  if (existing?.id) {
    await supabase.from("ai_go_live_readiness").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("ai_go_live_readiness").insert(payload);
  }
}

export async function loadCurrentStatusRow() {
  const { data } = await supabase
    .from("ai_go_live_readiness")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

/* --------------------------- Insight queries --------------------------- */

export type AgentSpend = { agent_id: string; agent_name: string; spend_gbp: number };
export type AgentRoi = { agent_id: string; agent_name: string; roi_score: number };

export async function highestCostAgents(limit = 5): Promise<AgentSpend[]> {
  const since = startOfMonthISO();
  const { data } = await supabase
    .from("ai_usage_ledger")
    .select("agent_id, display_cost_total, total_cost_gbp, total_cost")
    .eq("is_simulation", false)
    .gte("created_at", since)
    .not("agent_id", "is", null)
    .limit(5000);
  const map = new Map<string, number>();
  for (const r of (data ?? []) as any[]) {
    const id = r.agent_id as string;
    const cost = Number(r.display_cost_total ?? r.total_cost_gbp ?? r.total_cost ?? 0) || 0;
    map.set(id, (map.get(id) ?? 0) + cost);
  }
  const ids = Array.from(map.keys());
  let names: Record<string, string> = {};
  if (ids.length) {
    const { data: agents } = await supabase.from("ai_agents").select("id, name").in("id", ids);
    for (const a of (agents ?? []) as any[]) names[a.id] = a.name;
  }
  return Array.from(map.entries())
    .map(([agent_id, spend_gbp]) => ({ agent_id, agent_name: names[agent_id] ?? agent_id.slice(0, 8), spend_gbp: Math.round(spend_gbp * 10000) / 10000 }))
    .sort((a, b) => b.spend_gbp - a.spend_gbp)
    .slice(0, limit);
}

export async function lowestRoiAgents(limit = 5): Promise<AgentRoi[]> {
  const { data } = await supabase
    .from("ai_roi_snapshots")
    .select("agent_id, roi_score")
    .not("agent_id", "is", null)
    .order("roi_score", { ascending: true })
    .limit(50);
  const ids = Array.from(new Set(((data ?? []) as any[]).map((r) => r.agent_id))).filter(Boolean);
  let names: Record<string, string> = {};
  if (ids.length) {
    const { data: agents } = await supabase.from("ai_agents").select("id, name").in("id", ids);
    for (const a of (agents ?? []) as any[]) names[a.id] = a.name;
  }
  const seen = new Set<string>();
  const out: AgentRoi[] = [];
  for (const r of (data ?? []) as any[]) {
    if (seen.has(r.agent_id)) continue;
    seen.add(r.agent_id);
    out.push({ agent_id: r.agent_id, agent_name: names[r.agent_id] ?? r.agent_id.slice(0, 8), roi_score: Number(r.roi_score ?? 0) });
    if (out.length >= limit) break;
  }
  return out;
}

export type BusinessRoi = { business_id: string; business_name: string; status: string; roi_score: number };

export async function roiStatusByBusiness(): Promise<BusinessRoi[]> {
  const { data } = await supabase
    .from("ai_roi_snapshots")
    .select("business_id, roi_score, status")
    .not("business_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);
  const latest = new Map<string, any>();
  for (const r of (data ?? []) as any[]) {
    if (!latest.has(r.business_id)) latest.set(r.business_id, r);
  }
  const ids = Array.from(latest.keys());
  let names: Record<string, string> = {};
  if (ids.length) {
    const { data: bs } = await supabase.from("businesses").select("id, name").in("id", ids);
    for (const b of (bs ?? []) as any[]) names[b.id] = b.name;
  }
  return Array.from(latest.values()).map((r) => ({
    business_id: r.business_id,
    business_name: names[r.business_id] ?? r.business_id.slice(0, 8),
    status: r.status ?? "unknown",
    roi_score: Number(r.roi_score ?? 0),
  }));
}

export function buildRecommendedActions(s: LiveSignals): string[] {
  const out: string[] = [];
  if (s.pricing_rows === 0) out.push("Seed Provider Pricing so future cost estimates are accurate.");
  if (s.budget_rows === 0) out.push("Configure at least one Business Budget to enable per-business stop-loss.");
  if (s.agent_control_rows === 0) out.push("Configure Agent Cost Controls to cap per-agent spend and tier ceiling.");
  if (s.high_risk_pending_approval > 0) out.push(`Review ${s.high_risk_pending_approval} high-risk external action(s) waiting for approval.`);
  if (s.budget_warnings > 0) out.push(`Investigate ${s.budget_warnings} open budget warning(s).`);
  if (s.prompt_injection_warnings_24h > 0) out.push(`Inspect ${s.prompt_injection_warnings_24h} prompt-injection warning(s) from the last 24h.`);
  if (s.failed_actions_24h > 5) out.push(`Investigate failure cluster: ${s.failed_actions_24h} failed actions in 24h.`);
  if (s.stop_loss_alerts_open > 0) out.push("Resolve stop-loss alerts before resuming related agents.");
  if (out.length === 0) out.push("No actions required. Continue monitoring.");
  return out;
}
