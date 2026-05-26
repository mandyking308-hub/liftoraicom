import { supabase } from "@/integrations/supabase/client";

export type PolicyType =
  | "public_liability" | "professional_indemnity" | "cyber" | "product_liability"
  | "employer_liability" | "media_ip" | "marketplace_liability" | "event" | "other";

export type PolicyStatus =
  | "missing" | "quote_needed" | "active" | "expired" | "cancelled" | "review_required";

export type Severity = "low" | "medium" | "high" | "critical";

export type GapStatus = "open" | "review_required" | "resolved" | "accepted";

export type EventType =
  | "complaint" | "claim" | "incident" | "dispute"
  | "customer_harm" | "ip_issue" | "data_issue" | "other";

export const POLICY_TYPE_META: Record<PolicyType, { label: string; cls: string }> = {
  public_liability:      { label: "Public liability",       cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  professional_indemnity:{ label: "Professional indemnity", cls: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" },
  cyber:                 { label: "Cyber",                  cls: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30" },
  product_liability:     { label: "Product liability",      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  employer_liability:    { label: "Employer liability",     cls: "bg-teal-500/15 text-teal-300 border-teal-500/30" },
  media_ip:              { label: "Media / IP",             cls: "bg-pink-500/15 text-pink-300 border-pink-500/30" },
  marketplace_liability: { label: "Marketplace liability",  cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  event:                 { label: "Event",                  cls: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  other:                 { label: "Other",                  cls: "bg-muted text-muted-foreground border-border/50" },
};

export const POLICY_STATUS_META: Record<PolicyStatus, { label: string; cls: string }> = {
  missing:          { label: "Missing",          cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  quote_needed:     { label: "Quote needed",     cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  active:           { label: "Active",           cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  expired:          { label: "Expired",          cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  cancelled:        { label: "Cancelled",        cls: "bg-muted text-muted-foreground border-border/50" },
  review_required:  { label: "Review required",  cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
};

export const SEVERITY_META: Record<Severity, { label: string; cls: string }> = {
  low:      { label: "Low",      cls: "bg-muted text-muted-foreground border-border/50" },
  medium:   { label: "Medium",   cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  high:     { label: "High",     cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  critical: { label: "Critical", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
};

export const EVENT_TYPE_META: Record<EventType, { label: string; cls: string }> = {
  complaint:     { label: "Complaint",     cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  claim:         { label: "Claim",         cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  incident:      { label: "Incident",      cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  dispute:       { label: "Dispute",       cls: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  customer_harm: { label: "Customer harm", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  ip_issue:      { label: "IP issue",      cls: "bg-pink-500/15 text-pink-300 border-pink-500/30" },
  data_issue:    { label: "Data issue",    cls: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30" },
  other:         { label: "Other",         cls: "bg-muted text-muted-foreground border-border/50" },
};

export type InsurancePolicy = {
  id: string;
  business_id: string | null;
  entity_id: string | null;
  policy_type: PolicyType;
  insurer_name: string | null;
  policy_summary: string | null;
  cover_amount: number | null;
  currency: string | null;
  renewal_date: string | null;
  policy_status: PolicyStatus;
  created_at: string;
  updated_at: string;
};

export type InsuranceGap = {
  id: string;
  business_id: string | null;
  risk_type: string;
  gap_summary: string | null;
  severity: Severity;
  recommended_cover: string | null;
  adviser_review_required: boolean;
  status: GapStatus;
  created_at: string;
  updated_at: string;
};

export type LiabilityEvent = {
  id: string;
  business_id: string | null;
  event_type: EventType;
  event_summary: string | null;
  severity: Severity;
  insurance_relevant: boolean;
  status: string;
  created_at: string;
  updated_at: string;
};

const sb = () => supabase as any;

export async function fetchPolicies(): Promise<InsurancePolicy[]> {
  const { data, error } = await sb().from("insurance_policy_records").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function fetchGaps(): Promise<InsuranceGap[]> {
  const { data, error } = await sb().from("insurance_gap_assessments").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function fetchEvents(): Promise<LiabilityEvent[]> {
  const { data, error } = await sb().from("liability_events").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}

export async function updatePolicyStatus(id: string, status: PolicyStatus): Promise<void> {
  const { error } = await sb().from("insurance_policy_records").update({ policy_status: status }).eq("id", id);
  if (error) throw error;
}
export async function updateGapStatus(id: string, status: GapStatus): Promise<void> {
  const { error } = await sb().from("insurance_gap_assessments").update({ status }).eq("id", id);
  if (error) throw error;
}

/** Recommended insurance types by business archetype. */
export const ARCHETYPE_RECOMMENDATIONS: Record<string, PolicyType[]> = {
  service:          ["professional_indemnity", "public_liability", "cyber"],
  agency:           ["professional_indemnity", "public_liability", "cyber", "media_ip"],
  ecommerce:        ["product_liability", "public_liability", "cyber"],
  marketplace:      ["marketplace_liability", "public_liability", "cyber"],
  saas:             ["professional_indemnity", "cyber"],
  media:            ["media_ip", "professional_indemnity", "cyber"],
  events:           ["event", "public_liability", "employer_liability"],
  physical_product: ["product_liability", "public_liability", "employer_liability"],
  consulting:       ["professional_indemnity", "public_liability"],
  default:          ["public_liability", "cyber"],
};

export function recommendedFor(archetype: string | null | undefined): PolicyType[] {
  if (!archetype) return ARCHETYPE_RECOMMENDATIONS.default;
  return ARCHETYPE_RECOMMENDATIONS[archetype] ?? ARCHETYPE_RECOMMENDATIONS.default;
}

export function summarize(policies: InsurancePolicy[], gaps: InsuranceGap[], events: LiabilityEvent[]) {
  const now = Date.now();
  const active = policies.filter(p => p.policy_status === "active");
  const missing = policies.filter(p => p.policy_status === "missing").length;
  const expired = policies.filter(p => p.policy_status === "expired").length;
  const reviewReq = policies.filter(p => p.policy_status === "review_required").length;
  const renewSoon = policies.filter(p => {
    if (!p.renewal_date) return false;
    const ms = new Date(p.renewal_date).getTime() - now;
    return ms > 0 && ms < 1000 * 60 * 60 * 24 * 60;
  }).length;
  const renewOverdue = policies.filter(p => {
    if (!p.renewal_date) return false;
    return new Date(p.renewal_date).getTime() < now && p.policy_status !== "cancelled";
  }).length;
  const totalCover = active.reduce((s, p) => s + Number(p.cover_amount ?? 0), 0);

  return {
    policies_total: policies.length,
    policies_active: active.length,
    policies_missing: missing,
    policies_expired: expired,
    policies_review: reviewReq,
    renew_soon: renewSoon,
    renew_overdue: renewOverdue,
    cover_active_total: totalCover,
    gaps_total: gaps.length,
    gaps_open: gaps.filter(g => g.status === "open").length,
    gaps_critical: gaps.filter(g => g.severity === "critical" && g.status !== "resolved").length,
    gaps_review: gaps.filter(g => g.adviser_review_required && g.status !== "resolved").length,
    events_total: events.length,
    events_open: events.filter(e => e.status !== "resolved" && e.status !== "closed").length,
    events_insurance_relevant: events.filter(e => e.insurance_relevant).length,
    events_critical: events.filter(e => e.severity === "critical").length,
  };
}

export type Diagnostic = {
  id: string;
  severity: "info" | "warn" | "block";
  business_id: string | null;
  message: string;
};

export function diagnose(
  policies: InsurancePolicy[],
  gaps: InsuranceGap[],
  events: LiabilityEvent[],
): Diagnostic[] {
  const out: Diagnostic[] = [];
  const now = Date.now();

  for (const p of policies) {
    const typeLabel = POLICY_TYPE_META[p.policy_type]?.label ?? p.policy_type;
    if (p.policy_status === "missing") {
      out.push({ id: p.id, severity: "warn", business_id: p.business_id,
        message: `${typeLabel} cover marked missing — Insurance Agent must prepare adviser brief.` });
    }
    if (p.policy_status === "expired") {
      out.push({ id: p.id, severity: "block", business_id: p.business_id,
        message: `${typeLabel} policy expired — business is uninsured for this risk.` });
    }
    if (p.policy_status === "review_required") {
      out.push({ id: p.id, severity: "warn", business_id: p.business_id,
        message: `${typeLabel} policy flagged for review — adviser input required before renewal.` });
    }
    if (p.renewal_date) {
      const ms = new Date(p.renewal_date).getTime() - now;
      if (ms < 0 && p.policy_status === "active") {
        out.push({ id: p.id, severity: "block", business_id: p.business_id,
          message: `${typeLabel} renewal overdue (${p.renewal_date}) — confirm cover or treat as lapsed.` });
      } else if (ms > 0 && ms < 1000 * 60 * 60 * 24 * 30) {
        out.push({ id: p.id, severity: "warn", business_id: p.business_id,
          message: `${typeLabel} renews ${p.renewal_date} — prepare adviser questions, do not auto-renew.` });
      }
    }
    if (p.policy_status === "active" && (p.cover_amount == null || Number(p.cover_amount) <= 0)) {
      out.push({ id: p.id, severity: "warn", business_id: p.business_id,
        message: `${typeLabel} active but cover amount missing — confirm with insurer.` });
    }
  }

  for (const g of gaps) {
    if (g.status === "resolved") continue;
    if (g.severity === "critical") {
      out.push({ id: g.id, severity: "block", business_id: g.business_id,
        message: `Critical insurance gap (${g.risk_type}) — escalate to adviser immediately.` });
    } else if (g.severity === "high") {
      out.push({ id: g.id, severity: "warn", business_id: g.business_id,
        message: `High-severity gap (${g.risk_type}) — adviser review required before exposure increases.` });
    }
    if (!g.adviser_review_required && g.status !== "accepted") {
      out.push({ id: g.id, severity: "info", business_id: g.business_id,
        message: `Gap "${g.risk_type}" not flagged for adviser review — confirm acceptance is recorded.` });
    }
  }

  for (const e of events) {
    if (e.insurance_relevant && (e.status === "open" || e.status === "investigating")) {
      out.push({ id: e.id, severity: "warn", business_id: e.business_id,
        message: `Insurance-relevant ${e.event_type} open — link to policy and notify adviser (do not notify insurer without approval).` });
    }
    if (e.severity === "critical" && e.status !== "resolved" && e.status !== "closed") {
      out.push({ id: e.id, severity: "block", business_id: e.business_id,
        message: `Critical liability event (${e.event_type}) — verify cover and prepare disclosure for adviser.` });
    }
  }

  return out;
}

export function adviserQuestions(policies: InsurancePolicy[], gaps: InsuranceGap[], events: LiabilityEvent[]): string[] {
  const qs: string[] = [];
  const missingTypes = new Set(policies.filter(p => p.policy_status === "missing").map(p => POLICY_TYPE_META[p.policy_type]?.label ?? p.policy_type));
  for (const t of missingTypes) qs.push(`What cover level do you recommend for ${t}, and which insurers should we quote?`);
  const renewSoon = policies.filter(p => {
    if (!p.renewal_date) return false;
    const ms = new Date(p.renewal_date).getTime() - Date.now();
    return ms > 0 && ms < 1000 * 60 * 60 * 24 * 60;
  });
  for (const p of renewSoon) qs.push(`${POLICY_TYPE_META[p.policy_type]?.label ?? p.policy_type} renews ${p.renewal_date} — should cover or insurer change?`);
  for (const g of gaps.filter(g => g.severity === "critical" || g.severity === "high")) {
    qs.push(`Risk "${g.risk_type}" (${g.severity}) — is recommended cover "${g.recommended_cover ?? "TBD"}" sufficient?`);
  }
  for (const e of events.filter(e => e.insurance_relevant && e.status !== "resolved" && e.status !== "closed")) {
    qs.push(`Liability event (${e.event_type}, ${e.severity}) is open — must we notify the insurer or is it below threshold?`);
  }
  return qs;
}