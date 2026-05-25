import { supabase } from "@/integrations/supabase/client";

export interface IncidentSnapshot {
  total: number;
  live_open: number;
  critical_open: number;
  high_open: number;
  awaiting_customer_notice: number;
  awaiting_regulator_notice: number;
  resolved_no_postmortem: number;
  postmortems_open: number;
  continuity_plans_active: number;
  continuity_plans_untested: number;
  recommended_action: string;
}

const OPEN_STATUSES = ["detected", "investigating", "contained"];

export async function computeIncidentSnapshot(): Promise<IncidentSnapshot> {
  const sb: any = supabase as any;
  const [incRes, pmRes, planRes] = await Promise.all([
    sb.from("incident_records").select("id,severity,incident_status,customer_notification_required,regulator_notification_required,resolved_at"),
    sb.from("incident_postmortems").select("id,incident_id,completed_at"),
    sb.from("continuity_plans").select("id,active,last_tested_at"),
  ]);
  const incidents = incRes.data ?? [];
  const postmortems = pmRes.data ?? [];
  const plans = planRes.data ?? [];

  const live_open = incidents.filter((i: any) => OPEN_STATUSES.includes(i.incident_status)).length;
  const critical_open = incidents.filter((i: any) => i.severity === "critical" && OPEN_STATUSES.includes(i.incident_status)).length;
  const high_open = incidents.filter((i: any) => i.severity === "high" && OPEN_STATUSES.includes(i.incident_status)).length;
  const awaiting_customer_notice = incidents.filter((i: any) => i.customer_notification_required && i.incident_status !== "closed").length;
  const awaiting_regulator_notice = incidents.filter((i: any) => i.regulator_notification_required && i.incident_status !== "closed").length;

  const pmByIncident = new Map<string, any>();
  postmortems.forEach((p: any) => pmByIncident.set(p.incident_id, p));
  const resolved_no_postmortem = incidents.filter((i: any) =>
    ["resolved", "postmortem"].includes(i.incident_status) &&
    !pmByIncident.get(i.id)?.completed_at
  ).length;
  const postmortems_open = postmortems.filter((p: any) => !p.completed_at).length;

  const continuity_plans_active = plans.filter((p: any) => p.active).length;
  const ninetyAgo = Date.now() - 90 * 86400000;
  const continuity_plans_untested = plans.filter((p: any) => p.active && (!p.last_tested_at || new Date(p.last_tested_at).getTime() < ninetyAgo)).length;

  let recommended_action = "No live incidents. Continuity posture nominal.";
  if (critical_open > 0) recommended_action = `${critical_open} critical incident(s) live — contain and prepare approval-gated notifications.`;
  else if (awaiting_regulator_notice > 0) recommended_action = `${awaiting_regulator_notice} incident(s) require regulator notice — founder/legal approval needed.`;
  else if (awaiting_customer_notice > 0) recommended_action = `${awaiting_customer_notice} incident(s) require customer notice — draft prepared, awaiting approval.`;
  else if (high_open > 0) recommended_action = `${high_open} high-severity incident(s) open — keep investigating.`;
  else if (resolved_no_postmortem > 0) recommended_action = `${resolved_no_postmortem} resolved incident(s) without completed postmortem.`;
  else if (continuity_plans_untested > 0) recommended_action = `${continuity_plans_untested} continuity plan(s) not tested in 90 days.`;
  else if (live_open > 0) recommended_action = `${live_open} incident(s) under investigation.`;

  return {
    total: incidents.length,
    live_open,
    critical_open,
    high_open,
    awaiting_customer_notice,
    awaiting_regulator_notice,
    resolved_no_postmortem,
    postmortems_open,
    continuity_plans_active,
    continuity_plans_untested,
    recommended_action,
  };
}

export const INCIDENT_STATUS_TONE: Record<string, string> = {
  detected: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  investigating: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  contained: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  resolved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  postmortem: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  closed: "bg-muted text-muted-foreground border-border/50",
};

export const INCIDENT_SEVERITY_TONE: Record<string, string> = {
  low: "bg-muted text-muted-foreground border-border/50",
  medium: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
};

export const INCIDENT_TYPE_LABEL: Record<string, string> = {
  outage: "Outage",
  ai_failure: "AI failure",
  data_issue: "Data issue",
  security: "Security",
  customer_impact: "Customer impact",
  payment: "Payment",
  provider: "Provider",
  legal: "Legal",
  other: "Other",
};