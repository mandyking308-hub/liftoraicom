import { supabase } from "@/integrations/supabase/client";

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type RuleType =
  | "claim" | "channel" | "customer_type" | "jurisdiction" | "product"
  | "pricing" | "refund" | "privacy" | "recording" | "marketing" | "other";
export type ActionRequired =
  | "founder_approval" | "legal_review" | "tax_review"
  | "compliance_review" | "block" | "warning";

export type ComplianceProfile = {
  id: string;
  business_id: string;
  compliance_risk_level: RiskLevel;
  regulated_activity_possible: boolean;
  handles_children_data: boolean;
  handles_health_data: boolean;
  handles_financial_data: boolean;
  handles_legal_sensitive_data: boolean;
  marketplace_liability: boolean;
  requires_disclaimers: boolean;
  founder_confirmed: boolean;
  notes: string | null;
};

export type ComplianceRule = {
  id: string;
  business_id: string;
  rule_name: string;
  rule_type: RuleType;
  rule_summary: string | null;
  allowed_behavior: string | null;
  prohibited_behavior: string | null;
  approval_required: boolean;
  adviser_review_required: boolean;
  active: boolean;
};

export type ApprovalTrigger = {
  id: string;
  business_id: string;
  trigger_name: string;
  trigger_condition: string;
  action_required: ActionRequired;
  active: boolean;
};

/** Archetype → suggested compliance posture. Conservative defaults. */
export const ARCHETYPE_RISK_PROFILE: Record<string, Partial<ComplianceProfile> & { risk: RiskLevel }> = {
  saas: { risk: "medium", handles_financial_data: false, requires_disclaimers: true },
  marketplace: { risk: "high", marketplace_liability: true, requires_disclaimers: true },
  ecommerce: { risk: "medium", requires_disclaimers: true },
  agency: { risk: "medium", requires_disclaimers: true },
  content: { risk: "medium", requires_disclaimers: true },
  course: { risk: "medium", requires_disclaimers: true },
  health: { risk: "critical", handles_health_data: true, regulated_activity_possible: true, requires_disclaimers: true },
  finance: { risk: "critical", handles_financial_data: true, regulated_activity_possible: true, requires_disclaimers: true },
  legal: { risk: "critical", handles_legal_sensitive_data: true, regulated_activity_possible: true, requires_disclaimers: true },
  kids: { risk: "critical", handles_children_data: true, regulated_activity_possible: true, requires_disclaimers: true },
};

/** Standard rule templates surfaced when generating a baseline rulebook. */
export const STANDARD_RULES: Array<Omit<ComplianceRule, "id" | "business_id">> = [
  { rule_name: "No medical/health outcome claims", rule_type: "claim",
    rule_summary: "No guaranteed health or treatment outcomes in any external content.",
    allowed_behavior: "Educational, well-sourced content with disclaimer.",
    prohibited_behavior: "Cures, guaranteed weight loss, medical advice.",
    approval_required: true, adviser_review_required: true, active: true },
  { rule_name: "No financial return guarantees", rule_type: "claim",
    rule_summary: "No guaranteed returns, ROI promises or investment advice.",
    allowed_behavior: "Historical case studies with clear caveats.",
    prohibited_behavior: "Guaranteed profit / risk-free language.",
    approval_required: true, adviser_review_required: true, active: true },
  { rule_name: "No unsolicited contact to minors", rule_type: "customer_type",
    rule_summary: "No outreach or data collection from users under 16.",
    allowed_behavior: "Parent/guardian-gated flows only.",
    prohibited_behavior: "Direct minor outreach, profiling under-16.",
    approval_required: true, adviser_review_required: true, active: true },
  { rule_name: "Call recording consent", rule_type: "recording",
    rule_summary: "Disclose recording at start of every call.",
    allowed_behavior: "Opt-in disclosure script.",
    prohibited_behavior: "Silent recording or post-hoc consent.",
    approval_required: true, adviser_review_required: false, active: true },
  { rule_name: "Refund policy must be linked", rule_type: "refund",
    rule_summary: "Refund policy linked from every checkout/quote.",
    allowed_behavior: "Footer + checkout link.",
    prohibited_behavior: "Hidden / no-refund without disclosure.",
    approval_required: true, adviser_review_required: false, active: true },
  { rule_name: "Marketplace seller liability disclaimer", rule_type: "marketing",
    rule_summary: "Marketplace listings must disclose that the seller, not Liftor, is responsible for fulfilment and claims.",
    allowed_behavior: "Visible disclaimer on listing & checkout.",
    prohibited_behavior: "Marketplace claiming first-party responsibility.",
    approval_required: true, adviser_review_required: true, active: true },
  { rule_name: "Privacy notice required", rule_type: "privacy",
    rule_summary: "All forms must link a current Privacy Policy.",
    allowed_behavior: "Footer + inline notice.",
    prohibited_behavior: "Data capture without notice.",
    approval_required: true, adviser_review_required: false, active: true },
  { rule_name: "Jurisdiction-restricted products", rule_type: "jurisdiction",
    rule_summary: "Some products may not be sold into restricted regions (e.g. sanctions lists).",
    allowed_behavior: "Geo-block + adviser review.",
    prohibited_behavior: "Selling into restricted regions.",
    approval_required: true, adviser_review_required: true, active: true },
];

export const STANDARD_TRIGGERS: Array<Omit<ApprovalTrigger, "id" | "business_id">> = [
  { trigger_name: "Regulated claim detected", trigger_condition: "AI Gateway output contains health/finance/legal claim keywords", action_required: "compliance_review", active: true },
  { trigger_name: "Bulk outbound to new region", trigger_condition: "Outreach campaign targets a jurisdiction not on the approved list", action_required: "founder_approval", active: true },
  { trigger_name: "Public publishing of price change", trigger_condition: "Pricing change ready for public site / marketplace", action_required: "founder_approval", active: true },
  { trigger_name: "Customer data export request", trigger_condition: "DSAR or bulk export requested", action_required: "compliance_review", active: true },
  { trigger_name: "Voice campaign launch", trigger_condition: "Outbound voice campaign queued", action_required: "founder_approval", active: true },
  { trigger_name: "Refund > threshold", trigger_condition: "Refund amount exceeds policy threshold", action_required: "compliance_review", active: true },
];

/* -------- fetchers -------- */
const sb = () => supabase as any;

export async function fetchProfiles(): Promise<ComplianceProfile[]> {
  const { data, error } = await sb().from("business_compliance_profiles").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function fetchRules(business_id?: string): Promise<ComplianceRule[]> {
  let q = sb().from("business_compliance_rules").select("*").order("rule_type");
  if (business_id) q = q.eq("business_id", business_id);
  const { data, error } = await q;
  if (error) throw error; return data ?? [];
}
export async function fetchTriggers(business_id?: string): Promise<ApprovalTrigger[]> {
  let q = sb().from("compliance_approval_triggers").select("*").order("trigger_name");
  if (business_id) q = q.eq("business_id", business_id);
  const { data, error } = await q;
  if (error) throw error; return data ?? [];
}

/* -------- writers (live internal only) -------- */
export async function suggestProfile(business_id: string, archetype_code: string): Promise<ComplianceProfile> {
  const tpl = ARCHETYPE_RISK_PROFILE[archetype_code] ?? { risk: "medium" as RiskLevel };
  const row = {
    business_id,
    compliance_risk_level: tpl.risk,
    regulated_activity_possible: !!tpl.regulated_activity_possible,
    handles_children_data: !!tpl.handles_children_data,
    handles_health_data: !!tpl.handles_health_data,
    handles_financial_data: !!tpl.handles_financial_data,
    handles_legal_sensitive_data: !!tpl.handles_legal_sensitive_data,
    marketplace_liability: !!tpl.marketplace_liability,
    requires_disclaimers: tpl.requires_disclaimers ?? true,
    founder_confirmed: false,
    notes: `Auto-suggested from archetype "${archetype_code}". Founder confirmation required.`,
  };
  const { data, error } = await sb()
    .from("business_compliance_profiles")
    .upsert(row, { onConflict: "business_id" })
    .select().single();
  if (error) throw error; return data as ComplianceProfile;
}

export async function seedStandardRules(business_id: string): Promise<ComplianceRule[]> {
  const rows = STANDARD_RULES.map(r => ({ ...r, business_id }));
  const { data, error } = await sb().from("business_compliance_rules").insert(rows).select();
  if (error) throw error; return data ?? [];
}

export async function seedStandardTriggers(business_id: string): Promise<ApprovalTrigger[]> {
  const rows = STANDARD_TRIGGERS.map(r => ({ ...r, business_id }));
  const { data, error } = await sb().from("compliance_approval_triggers").insert(rows).select();
  if (error) throw error; return data ?? [];
}

/* -------- diagnostics -------- */
export type ComplianceWarning = {
  business_id: string;
  severity: "info" | "warn" | "block";
  message: string;
};

export function diagnoseCompliance(
  profiles: ComplianceProfile[],
  rules: ComplianceRule[],
  triggers: ApprovalTrigger[],
): ComplianceWarning[] {
  const out: ComplianceWarning[] = [];
  const ruleByBiz = new Map<string, ComplianceRule[]>();
  for (const r of rules) (ruleByBiz.get(r.business_id) ?? ruleByBiz.set(r.business_id, []).get(r.business_id))!.push(r);
  const trigByBiz = new Map<string, ApprovalTrigger[]>();
  for (const t of triggers) (trigByBiz.get(t.business_id) ?? trigByBiz.set(t.business_id, []).get(t.business_id))!.push(t);

  for (const p of profiles) {
    if (!p.founder_confirmed) {
      out.push({ business_id: p.business_id, severity: "warn", message: "Compliance profile not founder-confirmed yet." });
    }
    if (p.compliance_risk_level === "critical" && (ruleByBiz.get(p.business_id) ?? []).length < 4) {
      out.push({ business_id: p.business_id, severity: "block", message: "Critical-risk business has fewer than 4 active rules — seed standard rulebook." });
    }
    if ((p.handles_health_data || p.handles_financial_data || p.handles_legal_sensitive_data) && !p.requires_disclaimers) {
      out.push({ business_id: p.business_id, severity: "block", message: "Sensitive data flagged but disclaimers not required — fix profile." });
    }
    if (p.marketplace_liability && !(ruleByBiz.get(p.business_id) ?? []).some(r => /marketplace/i.test(r.rule_name))) {
      out.push({ business_id: p.business_id, severity: "warn", message: "Marketplace liability set but no marketplace disclaimer rule found." });
    }
    if ((trigByBiz.get(p.business_id) ?? []).length === 0) {
      out.push({ business_id: p.business_id, severity: "warn", message: "No approval triggers configured for this business." });
    }
  }
  return out;
}

export function summarize(profiles: ComplianceProfile[], rules: ComplianceRule[], triggers: ApprovalTrigger[]) {
  return {
    businesses: profiles.length,
    critical: profiles.filter(p => p.compliance_risk_level === "critical").length,
    high: profiles.filter(p => p.compliance_risk_level === "high").length,
    rules: rules.filter(r => r.active).length,
    triggers: triggers.filter(t => t.active).length,
    adviser_required: rules.filter(r => r.adviser_review_required && r.active).length,
  };
}