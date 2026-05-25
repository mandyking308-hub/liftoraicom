import { supabase } from "@/integrations/supabase/client";

export interface ComplaintsSnapshot {
  total_open: number;
  critical: number;
  legal_or_dispute: number;
  refunds_pending_approval: number;
  refunds_pending_amount: number;
  refunds_processed_today: number;
  evidence_items: number;
  awaiting_response_draft: number;
  awaiting_customer_info: number;
  escalated: number;
  recommended_action: string;
}

const OPEN_STATUSES = new Set([
  "new",
  "investigating",
  "awaiting_info",
  "approval_required",
  "response_drafted",
  "escalated",
]);

export async function computeComplaintsSnapshot(): Promise<ComplaintsSnapshot> {
  const sb: any = supabase as any;
  const [casesRes, refundsRes, evidenceRes] = await Promise.all([
    sb.from("complaint_cases").select("id,complaint_type,complaint_status,severity"),
    sb.from("refund_requests").select("id,refund_status,amount_requested,amount_approved,processed_at"),
    sb.from("dispute_evidence").select("id"),
  ]);
  const cases = casesRes.data ?? [];
  const refunds = refundsRes.data ?? [];
  const evidence = evidenceRes.data ?? [];

  const open = cases.filter((c: any) => OPEN_STATUSES.has(c.complaint_status));
  const critical = open.filter((c: any) => c.severity === "critical").length;
  const legal_or_dispute = open.filter((c: any) =>
    ["dispute", "chargeback", "legal"].includes(c.complaint_type),
  ).length;
  const escalated = open.filter((c: any) => c.complaint_status === "escalated").length;
  const awaiting_response_draft = open.filter((c: any) => c.complaint_status === "investigating").length;
  const awaiting_customer_info = open.filter((c: any) => c.complaint_status === "awaiting_info").length;

  const refundsPending = refunds.filter((r: any) =>
    ["requested", "reviewing", "approval_required"].includes(r.refund_status),
  );
  const refunds_pending_amount = refundsPending.reduce(
    (s: number, r: any) => s + Number(r.amount_requested ?? 0),
    0,
  );
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const refunds_processed_today = refunds.filter(
    (r: any) => r.processed_at && new Date(r.processed_at).getTime() >= todayStart.getTime(),
  ).length;

  let recommended_action = "Complaints queue is calm.";
  if (legal_or_dispute > 0) recommended_action = `${legal_or_dispute} legal/dispute case(s) need founder review now.`;
  else if (critical > 0) recommended_action = `Handle ${critical} critical complaint(s) immediately.`;
  else if (refundsPending.length > 0) recommended_action = `${refundsPending.length} refund request(s) await founder approval.`;
  else if (escalated > 0) recommended_action = `${escalated} escalated case(s) awaiting decision.`;
  else if (awaiting_response_draft > 0) recommended_action = `Draft replies for ${awaiting_response_draft} open complaint(s).`;

  return {
    total_open: open.length,
    critical,
    legal_or_dispute,
    refunds_pending_approval: refundsPending.length,
    refunds_pending_amount,
    refunds_processed_today,
    evidence_items: evidence.length,
    awaiting_response_draft,
    awaiting_customer_info,
    escalated,
    recommended_action,
  };
}