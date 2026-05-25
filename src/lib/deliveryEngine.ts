import { supabase } from "@/integrations/supabase/client";

export interface DeliverySnapshot {
  total_orders: number;
  active_orders: number;
  blocked_orders: number;
  overdue_orders: number;
  open_tasks: number;
  blocked_tasks: number;
  approval_required_tasks: number;
  capacity_at_risk: number;
  recommended_action: string;
}

export async function computeDeliverySnapshot(): Promise<DeliverySnapshot> {
  const [ordersRes, tasksRes, capRes] = await Promise.all([
    supabase.from("delivery_orders").select("id,order_status,due_date,completed_at"),
    supabase.from("delivery_tasks").select("id,task_status,founder_approval_required,due_at"),
    supabase.from("delivery_capacity").select("id,capacity_status"),
  ]);
  const orders = ordersRes.data || [];
  const tasks = tasksRes.data || [];
  const cap = capRes.data || [];
  const now = Date.now();

  const active_orders = orders.filter((o: any) => ["active", "pending"].includes(o.order_status)).length;
  const blocked_orders = orders.filter((o: any) => o.order_status === "blocked").length;
  const overdue_orders = orders.filter((o: any) => o.due_date && new Date(o.due_date).getTime() < now && !o.completed_at && !["completed", "delivered", "cancelled", "refunded"].includes(o.order_status)).length;
  const open_tasks = tasks.filter((t: any) => !["completed", "cancelled"].includes(t.task_status)).length;
  const blocked_tasks = tasks.filter((t: any) => t.task_status === "blocked").length;
  const approval_required_tasks = tasks.filter((t: any) => t.task_status === "approval_required" || t.founder_approval_required).length;
  const capacity_at_risk = cap.filter((c: any) => ["watch", "full", "over_capacity"].includes(c.capacity_status)).length;

  let recommended_action = "Fulfilment is on pace. Keep tasks moving and verify completion proof on delivery.";
  if (blocked_orders > 0) recommended_action = `Unblock ${blocked_orders} blocked order(s) — fulfilment cannot advance.`;
  else if (overdue_orders > 0) recommended_action = `Resolve ${overdue_orders} overdue delivery(s). Escalate or reschedule with founder approval.`;
  else if (approval_required_tasks > 0) recommended_action = `Founder approval needed on ${approval_required_tasks} task(s) before any customer-facing action.`;
  else if (capacity_at_risk > 0) recommended_action = `Capacity at risk in ${capacity_at_risk} window(s). Pace new orders or expand capacity.`;

  return {
    total_orders: orders.length,
    active_orders,
    blocked_orders,
    overdue_orders,
    open_tasks,
    blocked_tasks,
    approval_required_tasks,
    capacity_at_risk,
    recommended_action,
  };
}