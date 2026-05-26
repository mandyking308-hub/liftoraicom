import { supabase } from "@/integrations/supabase/client";

export type PartnerType =
  | "affiliate" | "referral" | "strategic" | "creator"
  | "adviser" | "reseller" | "marketplace_partner" | "introducer" | "other";

export type OutreachStatus =
  | "new" | "researched" | "qualified" | "draft_prepared"
  | "approval_required" | "contacted" | "active" | "rejected" | "parked";

export type ReferralStatus =
  | "new" | "qualified" | "converted" | "rejected" | "paid" | "cancelled";

export type CommissionType = "fixed" | "percent" | "tiered" | "manual";

export const PARTNER_TYPE_META: Record<PartnerType, { label: string; cls: string }> = {
  affiliate:           { label: "Affiliate",   cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  referral:            { label: "Referral",    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  strategic:           { label: "Strategic",   cls: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  creator:             { label: "Creator",     cls: "bg-pink-500/15 text-pink-300 border-pink-500/30" },
  adviser:             { label: "Adviser",     cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  reseller:            { label: "Reseller",    cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  marketplace_partner: { label: "Marketplace", cls: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" },
  introducer:          { label: "Introducer",  cls: "bg-teal-500/15 text-teal-300 border-teal-500/30" },
  other:               { label: "Other",       cls: "bg-muted text-muted-foreground border-border/50" },
};

export const OUTREACH_STATUS_META: Record<OutreachStatus, { label: string; cls: string }> = {
  new:               { label: "New",               cls: "bg-muted text-muted-foreground border-border/50" },
  researched:        { label: "Researched",        cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  qualified:         { label: "Qualified",         cls: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  draft_prepared:    { label: "Draft prepared",    cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  approval_required: { label: "Approval required", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  contacted:         { label: "Contacted",         cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  active:            { label: "Active",            cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  rejected:          { label: "Rejected",          cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  parked:            { label: "Parked",            cls: "bg-muted text-muted-foreground border-border/50" },
};

export const REFERRAL_STATUS_META: Record<ReferralStatus, { label: string; cls: string }> = {
  new:       { label: "New",       cls: "bg-muted text-muted-foreground border-border/50" },
  qualified: { label: "Qualified", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  converted: { label: "Converted", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  rejected:  { label: "Rejected",  cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  paid:      { label: "Paid",      cls: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  cancelled: { label: "Cancelled", cls: "bg-muted text-muted-foreground border-border/50" },
};

export type PartnerProspect = {
  id: string;
  business_id: string | null;
  partner_name: string;
  partner_type: PartnerType;
  website: string | null;
  email: string | null;
  category: string | null;
  fit_score: number | null;
  expected_value: number | null;
  risk_flags: string[] | null;
  outreach_status: OutreachStatus;
  created_at: string;
  updated_at: string;
};

export type ReferralRecord = {
  id: string;
  business_id: string | null;
  referrer_contact_id: string | null;
  referred_contact_id: string | null;
  referral_status: ReferralStatus;
  value_amount: number | null;
  currency: string | null;
  commission_due: number | null;
  created_at: string;
  updated_at: string;
};

export type CommissionRule = {
  id: string;
  business_id: string | null;
  partner_id: string | null;
  commission_type: CommissionType;
  commission_value: number | null;
  currency: string | null;
  approval_required: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type PerformanceSnapshot = {
  id: string;
  business_id: string | null;
  partner_id: string | null;
  period_start: string | null;
  period_end: string | null;
  leads_generated: number | null;
  revenue_generated: number | null;
  commission_due: number | null;
  quality_score: number | null;
  recommended_action: string | null;
  created_at: string;
};

const sb = () => supabase as any;

export async function fetchProspects(): Promise<PartnerProspect[]> {
  const { data, error } = await sb().from("partner_prospects").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function fetchReferrals(): Promise<ReferralRecord[]> {
  const { data, error } = await sb().from("referral_records").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function fetchCommissionRules(): Promise<CommissionRule[]> {
  const { data, error } = await sb().from("partner_commission_rules").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function fetchPerformance(): Promise<PerformanceSnapshot[]> {
  const { data, error } = await sb().from("partner_performance_snapshots").select("*").order("created_at", { ascending: false });
  if (error) throw error; return data ?? [];
}

export async function updateProspectStatus(id: string, status: OutreachStatus): Promise<void> {
  const { error } = await sb().from("partner_prospects").update({ outreach_status: status }).eq("id", id);
  if (error) throw error;
}
export async function updateReferralStatus(id: string, status: ReferralStatus): Promise<void> {
  const { error } = await sb().from("referral_records").update({ referral_status: status }).eq("id", id);
  if (error) throw error;
}

export function summarize(
  prospects: PartnerProspect[],
  referrals: ReferralRecord[],
  rules: CommissionRule[],
  perf: PerformanceSnapshot[],
) {
  const activePartners = prospects.filter(p => p.outreach_status === "active").length;
  const inApproval = prospects.filter(p => p.outreach_status === "approval_required").length;
  const drafted = prospects.filter(p => p.outreach_status === "draft_prepared").length;
  const referralsConverted = referrals.filter(r => r.referral_status === "converted" || r.referral_status === "paid").length;
  const commissionDueOpen = referrals
    .filter(r => r.referral_status === "converted")
    .reduce((s, r) => s + Number(r.commission_due ?? 0), 0);
  const commissionDuePaid = referrals
    .filter(r => r.referral_status === "paid")
    .reduce((s, r) => s + Number(r.commission_due ?? 0), 0);
  const revenueFromReferrals = referrals
    .filter(r => r.referral_status === "converted" || r.referral_status === "paid")
    .reduce((s, r) => s + Number(r.value_amount ?? 0), 0);
  return {
    prospects_total: prospects.length,
    active_partners: activePartners,
    approval_queue: inApproval,
    drafts_ready: drafted,
    referrals_total: referrals.length,
    referrals_converted: referralsConverted,
    commission_due_open: commissionDueOpen,
    commission_due_paid: commissionDuePaid,
    revenue_from_referrals: revenueFromReferrals,
    rules_total: rules.length,
    rules_active: rules.filter(r => r.active).length,
    perf_snapshots: perf.length,
  };
}

export type Diagnostic = {
  id: string;
  severity: "info" | "warn" | "block";
  business_id: string | null;
  partner_id: string | null;
  message: string;
};

export function diagnose(
  prospects: PartnerProspect[],
  referrals: ReferralRecord[],
  rules: CommissionRule[],
  perf: PerformanceSnapshot[],
): Diagnostic[] {
  const out: Diagnostic[] = [];

  for (const p of prospects) {
    if ((p.fit_score ?? 0) >= 80 && p.outreach_status === "new") {
      out.push({ id: p.id, severity: "info", business_id: p.business_id, partner_id: p.id,
        message: `High-fit prospect "${p.partner_name}" still unqualified — Partner Agent should research.` });
    }
    if ((p.risk_flags ?? []).length > 0 && (p.outreach_status === "contacted" || p.outreach_status === "active")) {
      out.push({ id: p.id, severity: "warn", business_id: p.business_id, partner_id: p.id,
        message: `Active partner "${p.partner_name}" has unresolved risk flags: ${(p.risk_flags ?? []).join(", ")}.` });
    }
  }

  for (const r of rules) {
    if (r.active && !r.approval_required) {
      out.push({ id: r.id, severity: "block", business_id: r.business_id, partner_id: r.partner_id,
        message: `Commission rule has approval gate disabled — re-enable; no commission may be committed without founder approval.` });
    }
  }

  for (const r of referrals) {
    if (r.referral_status === "converted" && (r.commission_due == null || Number(r.commission_due) === 0)) {
      out.push({ id: r.id, severity: "warn", business_id: r.business_id, partner_id: null,
        message: `Converted referral ${r.id.slice(0, 6)} has no commission calculated — apply rule.` });
    }
    if (r.referral_status === "paid" && (r.commission_due == null || Number(r.commission_due) === 0)) {
      out.push({ id: r.id, severity: "warn", business_id: r.business_id, partner_id: null,
        message: `Referral marked paid with zero commission — verify finance record.` });
    }
  }

  const perfByPartner = new Map<string, PerformanceSnapshot[]>();
  for (const s of perf) {
    if (!s.partner_id) continue;
    const arr = perfByPartner.get(s.partner_id) ?? [];
    arr.push(s); perfByPartner.set(s.partner_id, arr);
  }
  for (const [pid, snaps] of perfByPartner) {
    const latest = snaps[0];
    if (latest && (latest.quality_score ?? 0) > 0 && (latest.quality_score ?? 0) < 40) {
      out.push({ id: latest.id, severity: "warn", business_id: latest.business_id, partner_id: pid,
        message: `Partner ${pid.slice(0, 6)} quality score ${latest.quality_score} — consider pause / review.` });
    }
  }
  return out;
}

export function calcCommission(rule: CommissionRule, value: number): number {
  if (!rule.active) return 0;
  switch (rule.commission_type) {
    case "fixed":   return Number(rule.commission_value ?? 0);
    case "percent": return (value * Number(rule.commission_value ?? 0)) / 100;
    case "tiered":  return (value * Number(rule.commission_value ?? 0)) / 100;
    case "manual":  return 0;
    default:        return 0;
  }
}
