import { supabase } from "@/integrations/supabase/client";

export interface ReportingSnapshot {
  // periods covered
  generated_at: string;
  // revenue / pipeline
  confirmed_revenue_7d: number;
  confirmed_revenue_30d: number;
  estimated_revenue_30d: number;
  // ai
  ai_spend_7d: number;
  ai_spend_30d: number;
  ai_roi_7d: number;
  // approvals / alerts
  approvals_pending: number;
  // incidents / privacy
  incidents_open: number;
  incidents_critical: number;
  breaches_open: number;
  dsar_overdue: number;
  // support / complaints
  complaints_open: number;
  // vendor
  vendor_monthly_cost: number;
  // reports posture
  reports_total: number;
  reports_draft: number;
  reports_review_required: number;
  reports_approved: number;
  decisions_open: number;
  // narrative
  recommended_action: string;
}

async function safe(p: Promise<{ data: any[] | null }>): Promise<any[]> {
  try { const r = await p; return (r?.data ?? []) as any[]; } catch { return []; }
}

export async function computeReportingSnapshot(): Promise<ReportingSnapshot> {
  const sb: any = supabase as any;
  const now = Date.now();
  const d7 = new Date(now - 7 * 86400000).toISOString();
  const d30 = new Date(now - 30 * 86400000).toISOString();

  const [pays7, pays30, ai7, ai30, reports, items, incs, breaches, dsars, complaints, vendors, approvals] = await Promise.all([
    safe(sb.from("qtc_payments").select("amount,confirmed_revenue,payment_status,created_at").gte("created_at", d7).limit(2000)),
    safe(sb.from("qtc_payments").select("amount,confirmed_revenue,payment_status,created_at").gte("created_at", d30).limit(2000)),
    safe(sb.from("ai_usage_ledger").select("estimated_cost,actual_cost_gbp,revenue_linked_amount,created_at").gte("created_at", d7).limit(5000)),
    safe(sb.from("ai_usage_ledger").select("estimated_cost,actual_cost_gbp,created_at").gte("created_at", d30).limit(5000)),
    safe(sb.from("founder_reports").select("id,report_status,report_type,period_end")),
    safe(sb.from("founder_report_items").select("id,action_required,item_type")),
    safe(sb.from("incident_records").select("id,severity,incident_status")),
    safe(sb.from("privacy_breach_events").select("id,breach_status")),
    safe(sb.from("privacy_requests").select("id,request_status,due_date")),
    safe(sb.from("complaint_records").select("id,case_status")),
    safe(sb.from("vendor_subscriptions").select("monthly_cost,subscription_status").eq("subscription_status", "active").limit(500)),
    safe(sb.from("approval_requests").select("id,approval_status").in("approval_status", ["pending", "awaiting_founder", "review_required"]).limit(500)),
  ]);

  const isConfirmed = (r: any) => r.confirmed_revenue === true || String(r.payment_status ?? "").toLowerCase() === "completed";
  const sumAmt = (rows: any[], pred: (r: any) => boolean) => rows.filter(pred).reduce((s, r) => s + Number(r.amount || 0), 0);
  const sumAi = (rows: any[]) => rows.reduce((s, r) => s + Number(r.estimated_cost || r.actual_cost_gbp || 0), 0);

  const confirmed_revenue_7d = sumAmt(pays7, isConfirmed);
  const confirmed_revenue_30d = sumAmt(pays30, isConfirmed);
  const estimated_revenue_30d = sumAmt(pays30, r => !isConfirmed(r));
  const ai_spend_7d = sumAi(ai7);
  const ai_spend_30d = sumAi(ai30);
  const ai_revenue_linked_7d = ai7.reduce((s: number, r: any) => s + Number(r.revenue_linked_amount || 0), 0);
  const ai_roi_7d = ai_spend_7d > 0 ? ai_revenue_linked_7d / ai_spend_7d : 0;

  const incidents_open = incs.filter((i: any) => !["closed"].includes(i.incident_status)).length;
  const incidents_critical = incs.filter((i: any) => i.severity === "critical" && !["closed"].includes(i.incident_status)).length;
  const breaches_open = breaches.filter((b: any) => b.breach_status !== "closed").length;
  const dsar_overdue = dsars.filter((d: any) => d.due_date && new Date(d.due_date).getTime() < now && !["completed", "rejected"].includes(d.request_status)).length;
  const complaints_open = complaints.filter((c: any) => !["resolved", "closed"].includes(String(c.case_status ?? "").toLowerCase())).length;
  const vendor_monthly_cost = vendors.reduce((s: number, r: any) => s + Number(r.monthly_cost || 0), 0);

  const reports_draft = reports.filter((r: any) => r.report_status === "draft").length;
  const reports_review_required = reports.filter((r: any) => r.report_status === "review_required").length;
  const reports_approved = reports.filter((r: any) => r.report_status === "approved").length;
  const decisions_open = items.filter((i: any) => i.action_required).length;

  let recommended_action = "Operating posture clean. Generate this week's report.";
  if (incidents_critical > 0) recommended_action = `${incidents_critical} critical incident(s) open — escalate in this week's report.`;
  else if (reports_review_required > 0) recommended_action = `${reports_review_required} report(s) awaiting founder review.`;
  else if (decisions_open > 0) recommended_action = `${decisions_open} report decision(s) flagged action_required.`;
  else if (breaches_open > 0) recommended_action = `${breaches_open} privacy breach(es) open — include in next report.`;
  else if (dsar_overdue > 0) recommended_action = `${dsar_overdue} overdue DSAR(s) — surface as risk.`;
  else if (reports.length === 0) recommended_action = "No reports yet — generate the first weekly draft.";

  return {
    generated_at: new Date().toISOString(),
    confirmed_revenue_7d,
    confirmed_revenue_30d,
    estimated_revenue_30d,
    ai_spend_7d,
    ai_spend_30d,
    ai_roi_7d,
    approvals_pending: approvals.length,
    incidents_open,
    incidents_critical,
    breaches_open,
    dsar_overdue,
    complaints_open,
    vendor_monthly_cost,
    reports_total: reports.length,
    reports_draft,
    reports_review_required,
    reports_approved,
    decisions_open,
    recommended_action,
  };
}

export const REPORT_STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border/50",
  review_required: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  archived: "bg-muted text-muted-foreground border-border/50",
};

export const REPORT_ITEM_LABEL: Record<string, string> = {
  revenue: "Revenue", cost: "Cost", ai_spend: "AI spend", approval: "Approval", alert: "Alert",
  delivery: "Delivery", support: "Support", sales: "Sales", upgrade: "Upgrade", risk: "Risk",
  decision: "Decision", milestone: "Milestone",
};

export function fmtMoney(n: number, ccy = "GBP") {
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(n || 0); }
  catch { return `${ccy} ${Math.round(n || 0)}`; }
}