import { supabase } from "@/integrations/supabase/client";

export interface PrivacySnapshot {
  dsar_total: number;
  dsar_open: number;
  dsar_overdue: number;
  dsar_due_7d: number;
  dsar_unverified_in_progress: number;
  dsar_pending_approval: number;
  retention_rules_active: number;
  consent_unknown_marketing: number;
  consent_withdrawn_marketing: number;
  processors_total: number;
  processors_missing_dpa: number;
  processors_high_risk: number;
  breaches_open: number;
  breaches_report_required: number;
  breaches_critical: number;
  recommended_action: string;
}

const OPEN_DSAR = ["received", "verifying_identity", "in_progress", "approval_required", "escalated"];

export async function computePrivacySnapshot(): Promise<PrivacySnapshot> {
  const sb: any = supabase as any;
  const [dsarRes, retRes, conRes, procRes, brRes] = await Promise.all([
    sb.from("privacy_requests").select("id,request_status,due_date,identity_verified,founder_approval_required"),
    sb.from("data_retention_rules").select("id,active"),
    sb.from("consent_records").select("id,consent_type,consent_status"),
    sb.from("processor_register").select("id,dpa_status,risk_level,review_status"),
    sb.from("privacy_breach_events").select("id,breach_status,severity,reported_at"),
  ]);
  const dsars = dsarRes.data ?? [];
  const rets = retRes.data ?? [];
  const cons = conRes.data ?? [];
  const procs = procRes.data ?? [];
  const breaches = brRes.data ?? [];

  const now = Date.now();
  const in7 = now + 7 * 86400000;

  const dsar_open = dsars.filter((d: any) => OPEN_DSAR.includes(d.request_status)).length;
  const dsar_overdue = dsars.filter((d: any) => OPEN_DSAR.includes(d.request_status) && d.due_date && new Date(d.due_date).getTime() < now).length;
  const dsar_due_7d = dsars.filter((d: any) => OPEN_DSAR.includes(d.request_status) && d.due_date && new Date(d.due_date).getTime() >= now && new Date(d.due_date).getTime() <= in7).length;
  const dsar_unverified_in_progress = dsars.filter((d: any) => ["in_progress", "approval_required"].includes(d.request_status) && !d.identity_verified).length;
  const dsar_pending_approval = dsars.filter((d: any) => d.request_status === "approval_required").length;

  const retention_rules_active = rets.filter((r: any) => r.active).length;

  const consent_unknown_marketing = cons.filter((c: any) => c.consent_type === "marketing" && c.consent_status === "unknown").length;
  const consent_withdrawn_marketing = cons.filter((c: any) => c.consent_type === "marketing" && c.consent_status === "withdrawn").length;

  const processors_missing_dpa = procs.filter((p: any) => !["in_place", "signed"].includes(p.dpa_status)).length;
  const processors_high_risk = procs.filter((p: any) => ["high", "critical"].includes(p.risk_level)).length;

  const breaches_open = breaches.filter((b: any) => !["closed"].includes(b.breach_status)).length;
  const breaches_report_required = breaches.filter((b: any) => b.breach_status === "report_required").length;
  const breaches_critical = breaches.filter((b: any) => ["high", "critical"].includes(b.severity) && b.breach_status !== "closed").length;

  let recommended_action = "Privacy posture clean. No overdue DSARs, no open breaches.";
  if (breaches_report_required > 0) recommended_action = `${breaches_report_required} breach(es) require regulator/customer notice — founder approval needed before sending.`;
  else if (breaches_critical > 0) recommended_action = `${breaches_critical} critical/high breach event(s) open — investigate and contain.`;
  else if (dsar_overdue > 0) recommended_action = `${dsar_overdue} DSAR(s) overdue — escalate.`;
  else if (dsar_pending_approval > 0) recommended_action = `${dsar_pending_approval} DSAR(s) await founder approval before response.`;
  else if (dsar_unverified_in_progress > 0) recommended_action = `${dsar_unverified_in_progress} DSAR(s) progressing without verified identity — verify before any export/deletion.`;
  else if (processors_missing_dpa > 0) recommended_action = `${processors_missing_dpa} processor(s) missing a DPA.`;
  else if (dsar_due_7d > 0) recommended_action = `${dsar_due_7d} DSAR(s) due in next 7 days.`;

  return {
    dsar_total: dsars.length,
    dsar_open,
    dsar_overdue,
    dsar_due_7d,
    dsar_unverified_in_progress,
    dsar_pending_approval,
    retention_rules_active,
    consent_unknown_marketing,
    consent_withdrawn_marketing,
    processors_total: procs.length,
    processors_missing_dpa,
    processors_high_risk,
    breaches_open,
    breaches_report_required,
    breaches_critical,
    recommended_action,
  };
}

/** Returns true if a contact is safe to be marketed to (granted marketing consent and not withdrawn). */
export async function isMarketingAllowed(contactId: string): Promise<boolean> {
  const sb: any = supabase as any;
  const { data } = await sb.from("consent_records")
    .select("consent_status,consented_at,withdrawn_at")
    .eq("contact_id", contactId)
    .eq("consent_type", "marketing")
    .order("created_at", { ascending: false })
    .limit(1);
  const latest = (data ?? [])[0];
  if (!latest) return false;
  return latest.consent_status === "granted" && !latest.withdrawn_at;
}