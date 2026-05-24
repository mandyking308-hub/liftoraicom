import { supabase } from "@/integrations/supabase/client";
import type { AIModelTier } from "@/services/aiUsageLogger";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type RouteAIModelInput = {
  business_id?: string | null;
  agent_id?: string | null;
  task_category: string;
  action_type?: string | null;
  risk_level?: RiskLevel | null;
  estimated_value?: number | null;
  requires_external_action?: boolean;
  contains_legal_financial_or_compliance_content?: boolean;
  campaign_id?: string | null;
  task_id?: string | null;
};

export type RouteAIModelDecision = {
  selected_model_tier: AIModelTier;
  fallback_model_tier: AIModelTier | null;
  requires_human_approval: boolean;
  max_cost_per_action: number | null;
  risk_level: RiskLevel;
  routing_reason: string;
  matched_rule_id: string | null;
  matched_rule_scope: "business" | "global" | "fallback_default" | "none";
  blocked: boolean;
  warning_message?: string;
};

/** Categories that ALWAYS require human handling at high/critical risk. */
const HUMAN_REQUIRED_CATEGORIES = new Set([
  "legal_sensitive",
  "financial_sensitive",
  "compliance_sensitive",
  "investor_analysis",
  "acquisition_contact",
  "partnership_offer",
]);

/** Categories that always require founder review even if AI assists. */
const FOUNDER_REVIEW_CATEGORIES = new Set([
  "founder_strategy",
  "m_and_a_research",
  "valuation_analysis",
]);

/** Simple/cheap categories — downgrade aggressively. */
const SIMPLE_CATEGORIES = new Set([
  "email_classification",
  "crm_update",
  "tagging",
  "deduplication",
  "lookup",
]);

const TIER_ORDER: AIModelTier[] = ["no_ai", "cheap", "standard", "premium", "human_required"];

function normaliseTier(value: string | null | undefined): AIModelTier | null {
  if (!value) return null;
  const v = value.toLowerCase();
  if ((TIER_ORDER as string[]).includes(v)) return v as AIModelTier;
  return null;
}

function normaliseRisk(value: string | null | undefined): RiskLevel | null {
  if (!value) return null;
  const v = value.toLowerCase();
  if (["low", "medium", "high", "critical"].includes(v)) return v as RiskLevel;
  return null;
}

function escalateTier(a: AIModelTier, b: AIModelTier): AIModelTier {
  return TIER_ORDER.indexOf(a) >= TIER_ORDER.indexOf(b) ? a : b;
}

type Rule = {
  id: string;
  business_id: string | null;
  task_category: string;
  action_type: string | null;
  default_model_tier: string | null;
  fallback_model_tier: string | null;
  max_cost_per_action: number | null;
  requires_human_approval: boolean | null;
  risk_level: string | null;
  rule_priority: number | null;
  active: boolean | null;
};

/**
 * Decide which model tier (if any) should handle this task.
 * Pure decision function — does NOT trigger any AI call.
 */
export async function routeAIModel(
  input: RouteAIModelInput,
): Promise<RouteAIModelDecision> {
  const reasons: string[] = [];
  const baseRisk: RiskLevel = input.risk_level ?? "medium";

  // Fetch candidate rules: business-scoped + global, active only.
  const { data, error } = await supabase
    .from("ai_model_routing_rules")
    .select(
      "id,business_id,task_category,action_type,default_model_tier,fallback_model_tier,max_cost_per_action,requires_human_approval,risk_level,rule_priority,active",
    )
    .eq("task_category", input.task_category)
    .eq("active", true);

  if (error) {
    reasons.push(`rule lookup failed: ${error.message}`);
  }

  const rules = (data ?? []) as Rule[];

  // Filter by business + action_type match.
  const businessMatches = rules.filter(
    (r) =>
      r.business_id === (input.business_id ?? null) &&
      (!r.action_type || r.action_type === (input.action_type ?? null)),
  );
  const globalMatches = rules.filter(
    (r) =>
      r.business_id === null &&
      (!r.action_type || r.action_type === (input.action_type ?? null)),
  );

  const pickHighest = (arr: Rule[]) =>
    arr.sort((a, b) => (b.rule_priority ?? 0) - (a.rule_priority ?? 0))[0] ?? null;

  let matched: Rule | null = pickHighest(businessMatches);
  let scope: RouteAIModelDecision["matched_rule_scope"] = matched ? "business" : "none";
  if (!matched) {
    matched = pickHighest(globalMatches);
    scope = matched ? "global" : "none";
  }

  // Start with rule-derived defaults, then enforce safety overlays.
  let selected: AIModelTier =
    normaliseTier(matched?.default_model_tier) ?? "standard";
  const fallback = normaliseTier(matched?.fallback_model_tier);
  let requiresHuman = !!matched?.requires_human_approval;
  let maxCost = matched?.max_cost_per_action ?? null;
  let risk: RiskLevel = normaliseRisk(matched?.risk_level) ?? baseRisk;

  if (matched) {
    reasons.push(
      `${scope} rule matched for category "${input.task_category}" (priority ${matched.rule_priority ?? 0})`,
    );
  } else {
    reasons.push(
      `no rule found for "${input.task_category}" — applying conservative default`,
    );
    selected = "standard";
    scope = "fallback_default";
  }

  // Sensitivity overlay.
  if (input.contains_legal_financial_or_compliance_content) {
    selected = "human_required";
    requiresHuman = true;
    risk = risk === "low" || risk === "medium" ? "high" : risk;
    reasons.push("content flagged legal/financial/compliance — human required");
  }

  // Hard human-required categories at elevated risk.
  if (
    HUMAN_REQUIRED_CATEGORIES.has(input.task_category) &&
    (risk === "high" || risk === "critical")
  ) {
    selected = "human_required";
    requiresHuman = true;
    reasons.push(
      `category "${input.task_category}" requires human handling at ${risk} risk`,
    );
  }

  // Founder review categories always need approval.
  if (FOUNDER_REVIEW_CATEGORIES.has(input.task_category)) {
    selected = escalateTier(selected, "premium");
    requiresHuman = true;
    reasons.push(
      `category "${input.task_category}" requires founder review at premium tier`,
    );
  }

  // External actions raise approval bar.
  if (input.requires_external_action && (risk === "high" || risk === "critical")) {
    requiresHuman = true;
    reasons.push("external action at high/critical risk — human approval required");
  }

  // High estimated value → require human review.
  if ((input.estimated_value ?? 0) >= 1000) {
    requiresHuman = true;
    reasons.push(
      `estimated value £${input.estimated_value} — human approval required`,
    );
  }

  // Downgrade simple low-risk tasks.
  if (
    SIMPLE_CATEGORIES.has(input.task_category) &&
    risk === "low" &&
    !requiresHuman
  ) {
    selected = escalateTier("cheap", selected === "no_ai" ? "no_ai" : "cheap");
    if (input.task_category === "crm_update") selected = "no_ai";
    reasons.push("simple low-risk task — downgraded to minimal tier");
  }

  // Block if high-risk and no safe rule.
  let blocked = false;
  let warning: string | undefined;
  if (!matched && (risk === "high" || risk === "critical")) {
    blocked = true;
    selected = "human_required";
    requiresHuman = true;
    warning = `No routing rule exists for high-risk category "${input.task_category}". Founder must define a rule before AI may run this.`;
    reasons.push("blocked: high-risk task with no matching rule");
  }

  return {
    selected_model_tier: selected,
    fallback_model_tier: fallback,
    requires_human_approval: requiresHuman,
    max_cost_per_action: maxCost,
    risk_level: risk,
    routing_reason: reasons.join(" · "),
    matched_rule_id: matched?.id ?? null,
    matched_rule_scope: scope,
    blocked,
    warning_message: warning,
  };
}

/**
 * Convenience: produce audit_metadata to attach to ai_usage_ledger rows
 * so routing rationale is permanently recorded with the action.
 */
export function routingAuditMetadata(decision: RouteAIModelDecision) {
  return {
    routing: {
      selected_model_tier: decision.selected_model_tier,
      fallback_model_tier: decision.fallback_model_tier,
      requires_human_approval: decision.requires_human_approval,
      max_cost_per_action: decision.max_cost_per_action,
      risk_level: decision.risk_level,
      routing_reason: decision.routing_reason,
      matched_rule_id: decision.matched_rule_id,
      matched_rule_scope: decision.matched_rule_scope,
      blocked: decision.blocked,
      warning_message: decision.warning_message ?? null,
    },
  };
}