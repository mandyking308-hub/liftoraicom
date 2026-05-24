import { supabase } from "@/integrations/supabase/client";
import { getBusinessBudgetUsage } from "@/services/aiBudgetService";
import { getAgentSpend } from "@/services/aiAgentCostService";

export type StopLossTrigger =
  | "daily_budget_exceeded"
  | "weekly_budget_exceeded"
  | "monthly_budget_exceeded"
  | "campaign_budget_exceeded"
  | "agent_spend_cap_exceeded"
  | "cost_per_lead_too_high"
  | "cost_per_opportunity_too_high"
  | "repeated_failed_outputs"
  | "repeated_low_confidence"
  | "excessive_retries"
  | "no_value_produced"
  | "human_queue_overloaded"
  | "high_risk_without_approval"
  | "premium_model_overuse"
  | "prompt_loop_detected";

export type Severity = "info" | "warning" | "high" | "critical";

export type StopLossInput = {
  business_id?: string | null;
  agent_id?: string | null;
  campaign_id?: string | null;
  task_id?: string | null;
  task_category?: string | null;
  estimated_action_cost?: number;
  actual_action_cost?: number;
  status?: string | null;
  confidence_score?: number | null;
  retry_count?: number;
  human_review_queue_count?: number;
};

export type StopLossResult = {
  action_allowed: boolean;
  stop_loss_triggered: boolean;
  trigger_type: StopLossTrigger | null;
  severity: Severity;
  recommended_action: string;
  should_pause_agent: boolean;
  should_pause_campaign: boolean;
  should_downgrade_model: boolean;
  requires_founder_review: boolean;
  reasons: string[];
};

const HIGH_RISK_CATEGORIES = new Set([
  "legal_sensitive", "financial_sensitive", "compliance_sensitive",
  "investor_analysis", "valuation_analysis", "m_and_a_research",
  "acquisition_contact", "partnership_offer", "founder_strategy",
]);

/**
 * Evaluate whether AI activity must be paused, downgraded, blocked or escalated.
 * Pure decision function — does NOT send anything externally.
 */
export async function evaluateAIStopLoss(input: StopLossInput): Promise<StopLossResult> {
  const reasons: string[] = [];
  let result: StopLossResult = {
    action_allowed: true,
    stop_loss_triggered: false,
    trigger_type: null,
    severity: "info",
    recommended_action: "proceed",
    should_pause_agent: false,
    should_pause_campaign: false,
    should_downgrade_model: false,
    requires_founder_review: false,
    reasons,
  };

  function trip(
    trigger: StopLossTrigger, severity: Severity, recommended: string,
    flags: Partial<Pick<StopLossResult,
      "should_pause_agent" | "should_pause_campaign" | "should_downgrade_model" | "requires_founder_review">>,
    allowed = false,
  ) {
    // Keep the most severe trigger.
    const sevOrder: Severity[] = ["info", "warning", "high", "critical"];
    if (sevOrder.indexOf(severity) >= sevOrder.indexOf(result.severity)) {
      result.trigger_type = trigger;
      result.severity = severity;
      result.recommended_action = recommended;
    }
    result.stop_loss_triggered = true;
    result.action_allowed = result.action_allowed && allowed;
    Object.assign(result, {
      should_pause_agent: result.should_pause_agent || !!flags.should_pause_agent,
      should_pause_campaign: result.should_pause_campaign || !!flags.should_pause_campaign,
      should_downgrade_model: result.should_downgrade_model || !!flags.should_downgrade_model,
      requires_founder_review: result.requires_founder_review || !!flags.requires_founder_review,
    });
  }

  // 1-4. Business / campaign budgets.
  if (input.business_id) {
    const usage = await getBusinessBudgetUsage(input.business_id, {
      campaign_id: input.campaign_id ?? null,
    });
    const { data: budget } = await supabase
      .from("ai_business_budgets")
      .select("*").eq("business_id", input.business_id).maybeSingle();
    const cfg: any = budget ?? {};

    if (cfg.daily_ai_budget != null && usage.spend_today > cfg.daily_ai_budget) {
      reasons.push(`daily spend £${usage.spend_today.toFixed(2)} > cap £${cfg.daily_ai_budget}`);
      trip("daily_budget_exceeded", "high", "pause agent; founder review",
        { should_pause_agent: true, requires_founder_review: true });
    }
    if (cfg.weekly_ai_budget != null && usage.spend_week > cfg.weekly_ai_budget) {
      reasons.push(`weekly spend £${usage.spend_week.toFixed(2)} > cap £${cfg.weekly_ai_budget}`);
      trip("weekly_budget_exceeded", "high", "pause campaign; downgrade model; founder review",
        { should_pause_campaign: true, should_downgrade_model: true, requires_founder_review: true });
    }
    if (cfg.monthly_ai_budget != null && usage.spend_month > cfg.monthly_ai_budget) {
      reasons.push(`monthly spend £${usage.spend_month.toFixed(2)} > cap £${cfg.monthly_ai_budget}`);
      trip("monthly_budget_exceeded", "critical", "pause agent and campaign; founder review",
        { should_pause_agent: true, should_pause_campaign: true, requires_founder_review: true });
    }
    if (input.campaign_id && cfg.campaign_ai_budget != null
        && usage.spend_campaign > cfg.campaign_ai_budget) {
      reasons.push(`campaign spend £${usage.spend_campaign.toFixed(2)} > cap £${cfg.campaign_ai_budget}`);
      trip("campaign_budget_exceeded", "high", "pause campaign; downgrade model",
        { should_pause_campaign: true, should_downgrade_model: true, requires_founder_review: true });
    }
  }

  // 5. Agent spend cap.
  if (input.agent_id) {
    const spend = await getAgentSpend(input.agent_id);
    const { data: ctl } = await supabase
      .from("ai_agent_cost_controls").select("*").eq("agent_id", input.agent_id).maybeSingle();
    const cfg: any = ctl ?? {};
    if (cfg.daily_spend_cap != null && spend.spend_today > cfg.daily_spend_cap) {
      reasons.push(`agent daily £${spend.spend_today.toFixed(2)} > cap £${cfg.daily_spend_cap}`);
      trip("agent_spend_cap_exceeded", "high", "pause agent; founder review",
        { should_pause_agent: true, requires_founder_review: true });
    }
    if (cfg.monthly_spend_cap != null && spend.spend_month > cfg.monthly_spend_cap) {
      reasons.push(`agent monthly £${spend.spend_month.toFixed(2)} > cap £${cfg.monthly_spend_cap}`);
      trip("agent_spend_cap_exceeded", "critical", "pause agent; founder review",
        { should_pause_agent: true, requires_founder_review: true });
    }

    // 13. Premium model overuse — > 70% of agent actions in last 24h on premium.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("ai_usage_ledger")
      .select("model_tier")
      .eq("agent_id", input.agent_id)
      .gte("created_at", since)
      .limit(500);
    const total = (recent ?? []).length;
    const premium = (recent ?? []).filter((r: any) => r.model_tier === "premium").length;
    if (total >= 20 && premium / total > 0.7) {
      reasons.push(`premium tier used in ${premium}/${total} recent actions`);
      trip("premium_model_overuse", "warning", "downgrade non-critical tasks to standard",
        { should_downgrade_model: true });
    }
  }

  // 6-7. Cost per lead / opportunity heuristic.
  if (input.business_id && (input.actual_action_cost ?? input.estimated_action_cost ?? 0) > 0) {
    const cost = input.actual_action_cost ?? input.estimated_action_cost ?? 0;
    const { data: budget } = await supabase
      .from("ai_business_budgets")
      .select("max_cost_per_lead,max_cost_per_opportunity")
      .eq("business_id", input.business_id).maybeSingle();
    const cfg: any = budget ?? {};
    if (input.task_category === "lead_scoring" && cfg.max_cost_per_lead != null
        && cost > cfg.max_cost_per_lead) {
      reasons.push(`cost £${cost} > max per lead £${cfg.max_cost_per_lead}`);
      trip("cost_per_lead_too_high", "warning", "downgrade model; switch to cached context",
        { should_downgrade_model: true });
    }
    if (input.task_category === "opportunity_qualification" && cfg.max_cost_per_opportunity != null
        && cost > cfg.max_cost_per_opportunity) {
      reasons.push(`cost £${cost} > max per opportunity £${cfg.max_cost_per_opportunity}`);
      trip("cost_per_opportunity_too_high", "warning", "downgrade model; human review",
        { should_downgrade_model: true, requires_founder_review: true });
    }
  }

  // 8. Repeated failed outputs (agent-level, last hour).
  if (input.agent_id) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: failedCount } = await supabase
      .from("ai_usage_ledger")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", input.agent_id)
      .eq("status", "failed")
      .gte("created_at", since);
    if ((failedCount ?? 0) >= 5) {
      reasons.push(`${failedCount} failed actions in last hour`);
      trip("repeated_failed_outputs", "high", "pause agent; simplify prompt; human review",
        { should_pause_agent: true, requires_founder_review: true });
    }
  }

  // 9. Repeated low confidence.
  if (input.confidence_score != null && input.confidence_score < 0.4) {
    reasons.push(`low confidence ${input.confidence_score.toFixed(2)}`);
    if (input.agent_id) {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: low } = await supabase
        .from("ai_usage_ledger")
        .select("id,confidence_score")
        .eq("agent_id", input.agent_id)
        .gte("created_at", since)
        .lt("confidence_score", 0.4)
        .limit(20);
      if ((low ?? []).length >= 3) {
        trip("repeated_low_confidence", "warning",
          "switch to cached context; simplify prompt; human review",
          { should_downgrade_model: true, requires_founder_review: true });
      }
    }
  }

  // 10. Excessive retries.
  if ((input.retry_count ?? 0) >= 5) {
    reasons.push(`retry count ${input.retry_count}`);
    trip("excessive_retries", "high", "stop task; human review; simplify prompt",
      { should_pause_agent: true, requires_founder_review: true });
  }

  // 11. No value produced — agent has spent £20+ in 7 days with zero linked revenue/pipeline.
  if (input.agent_id) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: ledger } = await supabase
      .from("ai_usage_ledger")
      .select("estimated_cost,revenue_linked_amount,pipeline_linked_amount")
      .eq("agent_id", input.agent_id)
      .gte("created_at", since)
      .limit(1000);
    const rows = ledger ?? [];
    const spend = rows.reduce((s, r: any) => s + Number(r.estimated_cost ?? 0), 0);
    const value = rows.reduce((s, r: any) =>
      s + Number(r.revenue_linked_amount ?? 0) + Number(r.pipeline_linked_amount ?? 0), 0);
    if (spend >= 20 && value === 0) {
      reasons.push(`agent spent £${spend.toFixed(2)} in 7d with no linked value`);
      trip("no_value_produced", "warning",
        "reduce frequency; downgrade model; founder review of ROI",
        { should_downgrade_model: true, requires_founder_review: true });
    }
  }

  // 12. Human queue overloaded.
  if ((input.human_review_queue_count ?? 0) >= 50) {
    reasons.push(`human review queue ${input.human_review_queue_count}`);
    trip("human_queue_overloaded", "warning",
      "reduce frequency; pause non-critical campaigns",
      { should_pause_campaign: true, requires_founder_review: true });
  }

  // 14. High-risk task without approval.
  if (input.task_category && HIGH_RISK_CATEGORIES.has(input.task_category)
      && input.status !== "human_review_required") {
    reasons.push(`high-risk category "${input.task_category}" without explicit approval`);
    trip("high_risk_without_approval", "critical",
      "block action; require founder approval",
      { should_pause_agent: true, requires_founder_review: true });
  }

  // 15. Prompt loop — same task_id failing/looping ≥ 4 times in last 30 min.
  if (input.task_id) {
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("ai_usage_ledger")
      .select("id", { count: "exact", head: true })
      .eq("task_id", input.task_id)
      .gte("created_at", since);
    if ((count ?? 0) >= 4) {
      reasons.push(`task fired ${count} times in 30 min`);
      trip("prompt_loop_detected", "high",
        "stop task; switch to cached context; human review",
        { should_pause_agent: true, requires_founder_review: true });
    }
  }

  // Persist an alert if anything tripped.
  if (result.stop_loss_triggered && result.trigger_type) {
    await persistStopLossAlert(input, result);
  }

  return result;
}

async function persistStopLossAlert(input: StopLossInput, r: StopLossResult) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  // Dedupe: same trigger for same scope in last hour.
  const { data: dup } = await supabase
    .from("ai_cost_alerts")
    .select("id")
    .eq("alert_type", r.trigger_type as string)
    .eq("business_id", input.business_id ?? "")
    .eq("agent_id", input.agent_id ?? "")
    .is("resolved_at", null)
    .gte("created_at", oneHourAgo)
    .limit(1);
  if (dup && dup.length > 0) return;

  await supabase.from("ai_cost_alerts").insert({
    business_id: input.business_id ?? null,
    agent_id: input.agent_id ?? null,
    campaign_id: input.campaign_id ?? null,
    task_id: input.task_id ?? null,
    alert_type: r.trigger_type,
    severity: r.severity,
    message: `Stop-loss: ${r.trigger_type?.replace(/_/g, " ")} — ${r.reasons.join("; ")}`,
    recommended_action: r.recommended_action,
    status: "open",
    audit_metadata: {
      should_pause_agent: r.should_pause_agent,
      should_pause_campaign: r.should_pause_campaign,
      should_downgrade_model: r.should_downgrade_model,
      requires_founder_review: r.requires_founder_review,
      task_category: input.task_category ?? null,
      estimated_action_cost: input.estimated_action_cost ?? null,
      actual_action_cost: input.actual_action_cost ?? null,
      retry_count: input.retry_count ?? null,
      confidence_score: input.confidence_score ?? null,
    },
  } as any);
}