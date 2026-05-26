import { supabase } from "@/integrations/supabase/client";

export type HandoffType = "ai_to_founder"|"ai_to_human"|"human_to_ai"|"founder_to_human"|"agent_to_agent"|"adviser_review"|"technical_review";
export type HandoffStatus = "created"|"accepted"|"in_progress"|"blocked"|"completed"|"overdue"|"cancelled";
export type HandoffPriority = "low"|"normal"|"high"|"urgent"|"critical";
export type BreachType = "response_overdue"|"completion_overdue"|"blocked_too_long"|"unassigned"|"stale_approval";
export type BreachSeverity = "low"|"medium"|"high"|"critical";
export type BreachStatus = "open"|"acknowledged"|"resolved"|"ignored";

export interface HandoffRecord {
  id: string;
  business_id: string | null;
  source_module: string;
  source_table: string | null;
  source_record_id: string | null;
  handoff_type: HandoffType;
  from_actor_type: string | null;
  from_actor_id: string | null;
  to_actor_type: string | null;
  to_actor_id: string | null;
  handoff_status: HandoffStatus;
  handoff_summary: string | null;
  due_at: string | null;
  priority: HandoffPriority;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  audit_metadata: Record<string, any>;
}

export interface SlaPolicy {
  id: string;
  policy_name: string;
  source_module: string | null;
  handoff_type: HandoffType | null;
  priority: HandoffPriority | null;
  response_time_minutes: number | null;
  completion_time_minutes: number | null;
  escalation_after_minutes: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SlaBreach {
  id: string;
  handoff_record_id: string;
  breach_type: BreachType;
  severity: BreachSeverity;
  breach_summary: string | null;
  escalation_created: boolean;
  status: BreachStatus;
  created_at: string;
  updated_at: string;
}

const sb: any = supabase as any;

export async function listHandoffs(filters?: { status?: HandoffStatus; handoff_type?: HandoffType; to_actor_type?: string; from_actor_type?: string; limit?: number }) {
  let q = sb.from("internal_handoff_records").select("*").order("created_at", { ascending: false }).limit(filters?.limit ?? 300);
  if (filters?.status) q = q.eq("handoff_status", filters.status);
  if (filters?.handoff_type) q = q.eq("handoff_type", filters.handoff_type);
  if (filters?.to_actor_type) q = q.eq("to_actor_type", filters.to_actor_type);
  if (filters?.from_actor_type) q = q.eq("from_actor_type", filters.from_actor_type);
  const { data } = await q;
  return (data ?? []) as HandoffRecord[];
}

export async function listBreaches(filters?: { status?: BreachStatus; limit?: number }) {
  let q = sb.from("internal_sla_breaches").select("*").order("created_at", { ascending: false }).limit(filters?.limit ?? 300);
  if (filters?.status) q = q.eq("status", filters.status);
  const { data } = await q;
  return (data ?? []) as SlaBreach[];
}

export async function listPolicies() {
  const { data } = await sb.from("internal_sla_policies").select("*").order("policy_name");
  return (data ?? []) as SlaPolicy[];
}

export function isOverdue(h: HandoffRecord): boolean {
  if (h.handoff_status === "completed" || h.handoff_status === "cancelled") return false;
  if (!h.due_at) return false;
  return new Date(h.due_at).getTime() < Date.now();
}

export interface SlaSummary {
  totalHandoffs: number;
  open: number;
  inProgress: number;
  blocked: number;
  overdue: number;
  unassigned: number;
  awaitingFounder: number;
  awaitingHuman: number;
  completed: number;
  breaches: number;
  openBreaches: number;
  criticalBreaches: number;
  watchItems: string[];
}

export async function summariseInternalSla(): Promise<SlaSummary> {
  const [hs, bs] = await Promise.all([
    sb.from("internal_handoff_records").select("handoff_status,handoff_type,to_actor_type,to_actor_id,due_at,priority").limit(2000),
    sb.from("internal_sla_breaches").select("severity,status").limit(2000),
  ]);
  const h = (hs.data ?? []) as Array<Pick<HandoffRecord, "handoff_status"|"handoff_type"|"to_actor_type"|"to_actor_id"|"due_at"|"priority">>;
  const b = (bs.data ?? []) as Array<Pick<SlaBreach, "severity"|"status">>;
  const open = h.filter(x => x.handoff_status === "created" || x.handoff_status === "accepted").length;
  const inProgress = h.filter(x => x.handoff_status === "in_progress").length;
  const blocked = h.filter(x => x.handoff_status === "blocked").length;
  const completed = h.filter(x => x.handoff_status === "completed").length;
  const overdue = h.filter(x => x.handoff_status === "overdue" || (x.due_at && new Date(x.due_at).getTime() < Date.now() && x.handoff_status !== "completed" && x.handoff_status !== "cancelled")).length;
  const unassigned = h.filter(x => !x.to_actor_id && x.handoff_status !== "completed" && x.handoff_status !== "cancelled").length;
  const awaitingFounder = h.filter(x => x.handoff_type === "ai_to_founder" && x.handoff_status !== "completed" && x.handoff_status !== "cancelled").length;
  const awaitingHuman = h.filter(x => (x.handoff_type === "ai_to_human" || x.handoff_type === "founder_to_human") && x.handoff_status !== "completed" && x.handoff_status !== "cancelled").length;
  const openBreaches = b.filter(x => x.status === "open").length;
  const criticalBreaches = b.filter(x => x.severity === "critical" && x.status === "open").length;
  const watch: string[] = [];
  if (criticalBreaches > 0) watch.push(`${criticalBreaches} critical SLA breach(es)`);
  if (overdue > 0) watch.push(`${overdue} overdue handoff(s)`);
  if (unassigned > 0) watch.push(`${unassigned} unassigned handoff(s)`);
  if (awaitingFounder > 0) watch.push(`${awaitingFounder} awaiting founder review`);
  return { totalHandoffs: h.length, open, inProgress, blocked, overdue, unassigned, awaitingFounder, awaitingHuman, completed, breaches: b.length, openBreaches, criticalBreaches, watchItems: watch };
}