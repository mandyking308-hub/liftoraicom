import { supabase } from "@/integrations/supabase/client";

export interface VendorSnapshot {
  vendors_total: number;
  vendors_active: number;
  subs_total: number;
  subs_active: number;
  subs_pending_approval: number;
  monthly_spend: number;
  annualised_spend: number;
  renewals_30d: number;
  cancellation_deadlines_30d: number;
  unknown_owner: number;
  unknown_payment: number;
  duplicate_candidates: number;
  vendors_missing_dpa: number;
  access_requests_pending: number;
  high_risk: number;
  recommended_action: string;
}

export async function computeVendorSnapshot(): Promise<VendorSnapshot> {
  const sb: any = supabase as any;
  const [vendorsRes, subsRes, accessRes, riskRes] = await Promise.all([
    sb.from("vendors").select("id,vendor_name,vendor_type,risk_level,data_processor,dpa_required,active"),
    sb.from("vendor_subscriptions").select("id,vendor_id,subscription_name,subscription_status,monthly_cost,annual_cost,renewal_date,cancellation_deadline,owner,payment_method_summary"),
    sb.from("vendor_access_records").select("id,access_status"),
    sb.from("vendor_risk_reviews").select("id,vendor_id,review_status,dpa_status"),
  ]);
  const vendors = vendorsRes.data ?? [];
  const subs = subsRes.data ?? [];
  const access = accessRes.data ?? [];
  const risks = riskRes.data ?? [];

  const now = Date.now();
  const in30 = now + 30 * 24 * 3600 * 1000;

  const subs_active = subs.filter((s: any) => ["trial", "active"].includes(s.subscription_status));
  const monthly_spend = subs_active.reduce((sum: number, s: any) =>
    sum + Number(s.monthly_cost ?? (s.annual_cost ? Number(s.annual_cost) / 12 : 0)), 0,
  );
  const annualised_spend = subs_active.reduce((sum: number, s: any) =>
    sum + Number(s.annual_cost ?? (s.monthly_cost ? Number(s.monthly_cost) * 12 : 0)), 0,
  );

  const renewals_30d = subs.filter((s: any) => {
    if (!s.renewal_date) return false;
    const t = new Date(s.renewal_date).getTime();
    return t >= now && t <= in30;
  }).length;
  const cancellation_deadlines_30d = subs.filter((s: any) => {
    if (!s.cancellation_deadline) return false;
    const t = new Date(s.cancellation_deadline).getTime();
    return t >= now && t <= in30;
  }).length;

  const unknown_owner = subs_active.filter((s: any) => !s.owner).length;
  const unknown_payment = subs_active.filter((s: any) => !s.payment_method_summary).length;

  const nameMap: Record<string, number> = {};
  for (const s of subs_active) {
    const k = (s.subscription_name || "").trim().toLowerCase();
    if (!k) continue;
    nameMap[k] = (nameMap[k] || 0) + 1;
  }
  const duplicate_candidates = Object.values(nameMap).filter((n) => n > 1).length;

  const approvedDpaVendorIds = new Set(
    risks.filter((r: any) => r.dpa_status === "in_place" || r.dpa_status === "signed").map((r: any) => r.vendor_id),
  );
  const vendors_missing_dpa = vendors.filter((v: any) =>
    v.active && (v.data_processor || v.dpa_required) && !approvedDpaVendorIds.has(v.id),
  ).length;

  const access_requests_pending = access.filter((a: any) => a.access_status === "requested").length;
  const high_risk = vendors.filter((v: any) => ["high", "critical"].includes(v.risk_level)).length;
  const subs_pending_approval = subs.filter((s: any) => s.subscription_status === "pending_approval").length;

  let recommended_action = "Vendor estate is calm.";
  if (subs_pending_approval > 0) recommended_action = `${subs_pending_approval} subscription(s) pending founder approval before activation.`;
  else if (cancellation_deadlines_30d > 0) recommended_action = `${cancellation_deadlines_30d} cancellation deadline(s) within 30 days — decide keep or cancel.`;
  else if (vendors_missing_dpa > 0) recommended_action = `${vendors_missing_dpa} vendor(s) missing DPA where required.`;
  else if (access_requests_pending > 0) recommended_action = `${access_requests_pending} vendor access request(s) awaiting approval.`;
  else if (duplicate_candidates > 0) recommended_action = `${duplicate_candidates} duplicate subscription name(s) detected — review for cost waste.`;
  else if (renewals_30d > 0) recommended_action = `${renewals_30d} renewal(s) within 30 days — prepare decision.`;
  else if (unknown_owner > 0 || unknown_payment > 0) recommended_action = `Fill in owner/payment method for ${unknown_owner + unknown_payment} active subscription(s).`;

  return {
    vendors_total: vendors.length,
    vendors_active: vendors.filter((v: any) => v.active).length,
    subs_total: subs.length,
    subs_active: subs_active.length,
    subs_pending_approval,
    monthly_spend,
    annualised_spend,
    renewals_30d,
    cancellation_deadlines_30d,
    unknown_owner,
    unknown_payment,
    duplicate_candidates,
    vendors_missing_dpa,
    access_requests_pending,
    high_risk,
    recommended_action,
  };
}