import { supabase } from "@/integrations/supabase/client";

export interface SupportSnapshot {
  total_open: number;
  critical: number;
  high: number;
  escalated: number;
  sla_overdue: number;
  sla_at_risk: number;
  vulnerable_or_angry: number;
  awaiting_customer: number;
  awaiting_internal: number;
  recommended_action: string;
}

export async function computeSupportSnapshot(): Promise<SupportSnapshot> {
  const { data } = await supabase.from("support_tickets").select("id,ticket_status,severity,sentiment,sla_due_at,resolved_at");
  const rows = data || [];
  const now = Date.now();
  const open = rows.filter((r: any) => !["resolved", "closed", "cancelled"].includes(r.ticket_status));
  const critical = open.filter((r: any) => r.severity === "critical").length;
  const high = open.filter((r: any) => r.severity === "high").length;
  const escalated = open.filter((r: any) => r.ticket_status === "escalated").length;
  const sla_overdue = open.filter((r: any) => r.sla_due_at && new Date(r.sla_due_at).getTime() < now).length;
  const sla_at_risk = open.filter((r: any) => {
    if (!r.sla_due_at) return false;
    const t = new Date(r.sla_due_at).getTime();
    return t >= now && t - now < 1000 * 60 * 60; // within 1h
  }).length;
  const vulnerable_or_angry = open.filter((r: any) => ["vulnerable", "angry"].includes(r.sentiment)).length;
  const awaiting_customer = open.filter((r: any) => r.ticket_status === "waiting_customer").length;
  const awaiting_internal = open.filter((r: any) => r.ticket_status === "waiting_internal").length;

  let recommended_action = "Support queue is calm.";
  if (critical > 0) recommended_action = `Handle ${critical} critical ticket(s) immediately.`;
  else if (vulnerable_or_angry > 0) recommended_action = `Escalate ${vulnerable_or_angry} vulnerable/angry ticket(s) for founder review.`;
  else if (sla_overdue > 0) recommended_action = `Resolve or reassign ${sla_overdue} SLA-breached ticket(s).`;
  else if (escalated > 0) recommended_action = `Founder action needed on ${escalated} escalated ticket(s).`;
  else if (sla_at_risk > 0) recommended_action = `${sla_at_risk} ticket(s) within 1h of SLA breach — accelerate draft reply approvals.`;

  return {
    total_open: open.length,
    critical,
    high,
    escalated,
    sla_overdue,
    sla_at_risk,
    vulnerable_or_angry,
    awaiting_customer,
    awaiting_internal,
    recommended_action,
  };
}