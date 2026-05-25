import { supabase } from "@/integrations/supabase/client";

export interface CapacitySnapshot {
  plans: number;
  available: number;
  watch: number;
  full: number;
  over: number;
  workload_total: number;
  workload_pending: number;
  workload_active: number;
  workload_blocked: number;
  workload_overdue: number;
  by_assignee_type: Record<string, number>;
  human_hours_committed: number;
  human_hours_capacity: number;
  ai_actions_committed: number;
  ai_actions_capacity: number;
  bottlenecks_open: number;
  bottlenecks_critical: number;
  bottlenecks_by_type: Record<string, number>;
  capacity_utilisation: number; // 0..1
  recommended_action: string;
}

export async function computeCapacitySnapshot(): Promise<CapacitySnapshot> {
  const sb: any = supabase as any;
  const [pRes, wRes, bRes] = await Promise.all([
    sb.from("capacity_plans").select("id,capacity_status,max_human_hours,current_human_hours,max_ai_actions,current_ai_actions"),
    sb.from("workload_items").select("id,workload_status,assigned_to_type,estimated_hours,due_at"),
    sb.from("bottleneck_alerts").select("id,bottleneck_type,severity,status"),
  ]);
  const plans = pRes.data ?? [];
  const workload = wRes.data ?? [];
  const alerts = bRes.data ?? [];

  const available = plans.filter((p: any) => p.capacity_status === "available").length;
  const watch = plans.filter((p: any) => p.capacity_status === "watch").length;
  const full = plans.filter((p: any) => p.capacity_status === "full").length;
  const over = plans.filter((p: any) => p.capacity_status === "over_capacity").length;

  const workload_pending = workload.filter((w: any) => w.workload_status === "pending").length;
  const workload_active = workload.filter((w: any) => w.workload_status === "active").length;
  const workload_blocked = workload.filter((w: any) => w.workload_status === "blocked").length;
  const now = Date.now();
  const workload_overdue = workload.filter((w: any) =>
    w.due_at && new Date(w.due_at).getTime() < now && !["completed", "cancelled"].includes(w.workload_status)
  ).length;

  const by_assignee_type: Record<string, number> = {};
  workload.forEach((w: any) => {
    if (["completed", "cancelled"].includes(w.workload_status)) return;
    by_assignee_type[w.assigned_to_type] = (by_assignee_type[w.assigned_to_type] ?? 0) + 1;
  });

  const human_hours_capacity = plans.reduce((s: number, p: any) => s + Number(p.max_human_hours ?? 0), 0);
  const human_hours_committed = plans.reduce((s: number, p: any) => s + Number(p.current_human_hours ?? 0), 0)
    + workload.filter((w: any) => w.assigned_to_type === "human" && !["completed", "cancelled"].includes(w.workload_status))
      .reduce((s: number, w: any) => s + Number(w.estimated_hours ?? 0), 0);

  const ai_actions_capacity = plans.reduce((s: number, p: any) => s + Number(p.max_ai_actions ?? 0), 0);
  const ai_actions_committed = plans.reduce((s: number, p: any) => s + Number(p.current_ai_actions ?? 0), 0);

  const bottlenecks_open = alerts.filter((a: any) => a.status === "open").length;
  const bottlenecks_critical = alerts.filter((a: any) => a.status === "open" && a.severity === "critical").length;
  const bottlenecks_by_type: Record<string, number> = {};
  alerts.filter((a: any) => a.status === "open").forEach((a: any) => {
    bottlenecks_by_type[a.bottleneck_type] = (bottlenecks_by_type[a.bottleneck_type] ?? 0) + 1;
  });

  const capacity_utilisation = human_hours_capacity > 0
    ? Math.min(1.5, human_hours_committed / human_hours_capacity)
    : 0;

  let recommended_action = "Capacity nominal. Sales can continue at current pace.";
  if (over > 0) recommended_action = `${over} business unit(s) over capacity — approval needed to pause sales or add capacity.`;
  else if (bottlenecks_critical > 0) recommended_action = `${bottlenecks_critical} critical bottleneck(s) — review recommended actions.`;
  else if (workload_blocked > 5) recommended_action = `${workload_blocked} workload item(s) blocked — clear blockers or reassign.`;
  else if (capacity_utilisation >= 1) recommended_action = `Human capacity at ${Math.round(capacity_utilisation * 100)}% — slow inbound or add capacity.`;
  else if (workload_overdue > 0) recommended_action = `${workload_overdue} overdue workload item(s) — re-prioritise.`;
  else if (full > 0) recommended_action = `${full} unit(s) at full capacity — watch closely.`;
  else if (capacity_utilisation >= 0.85) recommended_action = `Human capacity at ${Math.round(capacity_utilisation * 100)}% — entering watch zone.`;
  else if (bottlenecks_open > 0) recommended_action = `${bottlenecks_open} bottleneck(s) open — review.`;

  return {
    plans: plans.length,
    available, watch, full, over,
    workload_total: workload.length,
    workload_pending, workload_active, workload_blocked, workload_overdue,
    by_assignee_type,
    human_hours_committed, human_hours_capacity,
    ai_actions_committed, ai_actions_capacity,
    bottlenecks_open, bottlenecks_critical, bottlenecks_by_type,
    capacity_utilisation,
    recommended_action,
  };
}