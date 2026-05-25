import { supabase } from "@/integrations/supabase/client";

export interface PeopleSnapshot {
  operators_total: number;
  operators_active: number;
  operators_proposed: number;
  operators_missing_nda: number;
  operators_missing_contract: number;
  tasks_total: number;
  tasks_open: number;
  tasks_blocked: number;
  tasks_overdue: number;
  tasks_pending_approval: number;
  access_requested: number;
  access_active: number;
  access_expiring_30d: number;
  quality_reviews_30d: number;
  recommended_action: string;
}

export async function computePeopleSnapshot(): Promise<PeopleSnapshot> {
  const sb: any = supabase as any;
  const [opsRes, tasksRes, accessRes, qRes] = await Promise.all([
    sb.from("human_operators").select("id,status,nda_status,contract_status"),
    sb.from("human_operator_tasks").select("id,task_status,due_at,approval_required,completed_at"),
    sb.from("human_operator_access").select("id,access_status,expires_at"),
    sb.from("human_operator_quality_reviews").select("id,created_at"),
  ]);
  const ops = opsRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const access = accessRes.data ?? [];
  const reviews = qRes.data ?? [];

  const now = Date.now();
  const in30 = now + 30 * 24 * 3600 * 1000;
  const past30 = now - 30 * 24 * 3600 * 1000;

  const operators_active = ops.filter((o: any) => o.status === "active").length;
  const operators_proposed = ops.filter((o: any) => o.status === "proposed").length;
  const operators_missing_nda = ops.filter((o: any) => o.status === "active" && !["signed", "in_place", "not_required"].includes(o.nda_status)).length;
  const operators_missing_contract = ops.filter((o: any) => o.status === "active" && !["signed", "in_place", "not_required"].includes(o.contract_status)).length;

  const openStatuses = ["drafted", "assigned", "in_progress", "blocked"];
  const tasks_open = tasks.filter((t: any) => openStatuses.includes(t.task_status)).length;
  const tasks_blocked = tasks.filter((t: any) => t.task_status === "blocked").length;
  const tasks_overdue = tasks.filter((t: any) => openStatuses.includes(t.task_status) && t.due_at && new Date(t.due_at).getTime() < now).length;
  const tasks_pending_approval = tasks.filter((t: any) => t.task_status === "drafted" && t.approval_required).length;

  const access_requested = access.filter((a: any) => a.access_status === "requested").length;
  const access_active = access.filter((a: any) => a.access_status === "active").length;
  const access_expiring_30d = access.filter((a: any) => a.access_status === "active" && a.expires_at && new Date(a.expires_at).getTime() <= in30 && new Date(a.expires_at).getTime() >= now).length;

  const quality_reviews_30d = reviews.filter((r: any) => new Date(r.created_at).getTime() >= past30).length;

  let recommended_action = "People operations calm. No overdue tasks or access gaps.";
  if (tasks_overdue > 0) recommended_action = `${tasks_overdue} overdue task(s) — escalate or reassign.`;
  else if (tasks_blocked > 0) recommended_action = `${tasks_blocked} blocked task(s) — clear blockers.`;
  else if (access_requested > 0) recommended_action = `${access_requested} access request(s) waiting for founder grant.`;
  else if (operators_missing_nda + operators_missing_contract > 0) recommended_action = `${operators_missing_nda + operators_missing_contract} active operator(s) missing NDA/contract.`;
  else if (tasks_pending_approval > 0) recommended_action = `${tasks_pending_approval} drafted task(s) awaiting approval before assignment.`;

  return {
    operators_total: ops.length,
    operators_active,
    operators_proposed,
    operators_missing_nda,
    operators_missing_contract,
    tasks_total: tasks.length,
    tasks_open,
    tasks_blocked,
    tasks_overdue,
    tasks_pending_approval,
    access_requested,
    access_active,
    access_expiring_30d,
    quality_reviews_30d,
    recommended_action,
  };
}