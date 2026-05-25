// Customer Sales Safety helpers — internal eligibility + close-safety evaluators.
// All evaluators are pure; they never call providers. They produce a decision
// + blockers list that the UI and edge functions can use to gate external action.

export type SafetyDecision = "allowed" | "warn" | "blocked";

export interface SafetyResult {
  decision: SafetyDecision;
  blockers: string[];
  warnings: string[];
  approval_required: boolean;
}

export interface ContactSafety {
  permission_status?: string;
  opt_out?: boolean;
  do_not_call?: boolean;
  on_suppression_list?: boolean;
  suppression_reason?: string;
  time_zone?: string;
  allowed_window_start?: string | null;
  allowed_window_end?: string | null;
  frequency_cap_per_week?: number;
  cooldown_hours?: number;
  last_contacted_at?: string | null;
  vulnerable_flag?: boolean;
}

export interface OutboundContext {
  contact?: ContactSafety | null;
  provider_status?: string;
  founder_approval_granted?: boolean;
  external_action_gate_locked?: boolean;
  now?: Date;
}

export function evaluateOutboundCall(ctx: OutboundContext): SafetyResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const c = ctx.contact ?? {};
  if (c.opt_out) blockers.push("contact_opted_out");
  if (c.do_not_call) blockers.push("do_not_call_flag");
  if (c.on_suppression_list) blockers.push("contact_suppressed");
  if (c.permission_status && !["consented", "soft_opt_in", "legitimate_interest"].includes(c.permission_status))
    blockers.push("no_lawful_basis");
  if (c.vulnerable_flag) warnings.push("vulnerable_customer");

  if (c.allowed_window_start && c.allowed_window_end && c.time_zone) {
    try {
      const now = ctx.now ?? new Date();
      const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: c.time_zone });
      const [h, m] = fmt.format(now).split(":").map(Number);
      const minutes = h * 60 + m;
      const toMin = (s: string) => { const [hh, mm] = s.split(":").map(Number); return hh * 60 + (mm ?? 0); };
      if (minutes < toMin(c.allowed_window_start) || minutes > toMin(c.allowed_window_end))
        blockers.push("outside_calling_window");
    } catch { warnings.push("calling_window_evaluation_failed"); }
  }

  if (c.cooldown_hours && c.last_contacted_at) {
    const last = new Date(c.last_contacted_at).getTime();
    const elapsedH = (Date.now() - last) / 3_600_000;
    if (elapsedH < c.cooldown_hours) blockers.push("cooldown_active");
  }

  if (ctx.external_action_gate_locked) blockers.push("external_action_gate_locked");
  if (ctx.provider_status && ctx.provider_status !== "live") blockers.push("provider_not_live");
  if (!ctx.founder_approval_granted) blockers.push("founder_approval_required");

  return {
    blockers,
    warnings,
    approval_required: !ctx.founder_approval_granted,
    decision: blockers.length ? "blocked" : warnings.length ? "warn" : "allowed",
  };
}

export interface CloseSafetyContext {
  product_knowledge_completeness?: number;
  offer_active?: boolean;
  price_confirmed?: boolean;
  terms_known?: boolean;
  refund_policy_known?: boolean;
  prohibited_claim_warnings?: string[];
  provider_configured?: boolean;
  founder_approval_granted?: boolean;
  pre_approved_rule_matched?: boolean;
}

export function evaluateCloseSafety(ctx: CloseSafetyContext): SafetyResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if ((ctx.product_knowledge_completeness ?? 0) < 70) blockers.push("product_knowledge_below_70");
  if (!ctx.offer_active) blockers.push("offer_not_active");
  if (!ctx.price_confirmed) blockers.push("price_not_confirmed");
  if (!ctx.terms_known) blockers.push("terms_unknown");
  if (!ctx.refund_policy_known) warnings.push("refund_policy_unknown");
  if ((ctx.prohibited_claim_warnings ?? []).length) blockers.push("prohibited_claim_used");
  if (!ctx.provider_configured) blockers.push("provider_not_configured");
  const approvalNeeded = !ctx.pre_approved_rule_matched && !ctx.founder_approval_granted;
  if (approvalNeeded) blockers.push("founder_approval_required");
  return {
    blockers,
    warnings,
    approval_required: approvalNeeded,
    decision: blockers.length ? "blocked" : warnings.length ? "warn" : "allowed",
  };
}