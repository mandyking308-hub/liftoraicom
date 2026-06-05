import { supabase } from "@/integrations/supabase/client";

export type PortalType = "operator" | "oversight";
export type WorkerRole =
  | "technical_operator"
  | "dubai_oversight"
  | "professional_reviewer"
  | "legal_research"
  | "admin_support";

export const OPERATOR_ROLES: WorkerRole[] = ["technical_operator"];
export const OVERSIGHT_ROLES: WorkerRole[] = ["dubai_oversight", "professional_reviewer"];

export function rolesForPortal(portal: PortalType): WorkerRole[] {
  return portal === "operator" ? OPERATOR_ROLES : OVERSIGHT_ROLES;
}

export function portalForRole(role: WorkerRole | string): PortalType | null {
  if (OPERATOR_ROLES.includes(role as WorkerRole)) return "operator";
  if (OVERSIGHT_ROLES.includes(role as WorkerRole)) return "oversight";
  return null;
}

export interface AccessWindow {
  id: string;
  worker_id: string;
  portal_type: PortalType;
  start_time: string;
  end_time: string;
  max_session_minutes: number;
  status: string;
}

export function isWindowActive(w: AccessWindow, now: Date = new Date()): boolean {
  if (!["scheduled", "active"].includes(w.status)) return false;
  const start = new Date(w.start_time).getTime();
  const end = new Date(w.end_time).getTime();
  const n = now.getTime();
  return n >= start && n <= end;
}

export function sessionExpiresAt(loginAt: Date, window: AccessWindow): Date {
  const winEnd = new Date(window.end_time).getTime();
  const maxEnd = loginAt.getTime() + window.max_session_minutes * 60_000;
  return new Date(Math.min(winEnd, maxEnd));
}

export interface WorkforceContext {
  killSwitchActive: boolean;
  window: AccessWindow | null;
}

export function canAccessPortal(ctx: WorkforceContext, portal: PortalType, now: Date = new Date()): boolean {
  if (ctx.killSwitchActive) return false;
  if (!ctx.window) return false;
  if (ctx.window.portal_type !== portal) return false;
  return isWindowActive(ctx.window, now);
}

/** External actions are always blocked unless the founder has explicitly cleared them. */
export function externalActionAllowed(task: { external_action_blocked: boolean; requires_founder_approval: boolean; status: string }): boolean {
  if (task.external_action_blocked) return false;
  if (task.requires_founder_approval && task.status !== "completed") return false;
  return true;
}

// ===== fetchers =====

export async function fetchKillSwitch(): Promise<{ active: boolean; reason: string | null }> {
  const { data } = await (supabase as any)
    .from("worker_kill_switch")
    .select("active, reason")
    .eq("id", true)
    .maybeSingle();
  return { active: !!data?.active, reason: data?.reason ?? null };
}

export async function fetchMyWorkerProfile() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await (supabase as any)
    .from("worker_profiles")
    .select("*")
    .eq("user_id", u.user.id)
    .maybeSingle();
  return data;
}

export async function fetchActiveWindow(workerId: string, portal: PortalType): Promise<AccessWindow | null> {
  const nowIso = new Date().toISOString();
  const { data } = await (supabase as any)
    .from("worker_access_windows")
    .select("*")
    .eq("worker_id", workerId)
    .eq("portal_type", portal)
    .in("status", ["scheduled", "active"])
    .lte("start_time", nowIso)
    .gte("end_time", nowIso)
    .order("end_time", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as AccessWindow) ?? null;
}

export async function startSession(workerId: string, windowId: string) {
  const { data } = await (supabase as any)
    .from("worker_sessions")
    .insert({ worker_id: workerId, access_window_id: windowId, status: "active" })
    .select()
    .single();
  return data;
}

export async function endSession(sessionId: string, kind: "logout" | "forced_logout" | "expired") {
  const patch: any = { status: kind === "logout" ? "active" : kind };
  if (kind === "logout") patch.logout_at = new Date().toISOString();
  else if (kind === "forced_logout") {
    patch.forced_logout_at = new Date().toISOString();
    patch.status = "forced_logout";
  } else {
    patch.logout_at = new Date().toISOString();
    patch.status = "expired";
  }
  await (supabase as any).from("worker_sessions").update(patch).eq("id", sessionId);
}

export async function logAuditEvent(opts: {
  workerId?: string | null;
  eventType: string;
  portalType?: PortalType;
  relatedTaskId?: string;
  metadata?: Record<string, unknown>;
}) {
  await (supabase as any).from("worker_audit_events").insert({
    worker_id: opts.workerId ?? null,
    event_type: opts.eventType,
    portal_type: opts.portalType ?? null,
    related_task_id: opts.relatedTaskId ?? null,
    metadata: opts.metadata ?? {},
  });
}

export async function fetchAssignedTasks(workerId: string) {
  const { data } = await (supabase as any)
    .from("worker_tasks")
    .select("*")
    .eq("assigned_to", workerId)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function fetchOversightQueue() {
  const { data } = await (supabase as any)
    .from("worker_tasks")
    .select("*")
    .in("status", ["submitted", "needs_changes"])
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export async function fetchAllWorkers() {
  const { data } = await (supabase as any)
    .from("worker_profiles")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function fetchTodayWindows() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const { data } = await (supabase as any)
    .from("worker_access_windows")
    .select("*")
    .gte("start_time", start.toISOString())
    .lte("start_time", end.toISOString())
    .order("start_time", { ascending: true });
  return data ?? [];
}

export async function fetchActiveSessions() {
  const { data } = await (supabase as any)
    .from("worker_sessions")
    .select("*")
    .eq("status", "active")
    .order("login_at", { ascending: false });
  return data ?? [];
}

export async function fetchAuditEvents(limit = 100) {
  const { data } = await (supabase as any)
    .from("worker_audit_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function setKillSwitch(active: boolean, reason?: string) {
  const { data: u } = await supabase.auth.getUser();
  await (supabase as any)
    .from("worker_kill_switch")
    .update({ active, reason: reason ?? null, toggled_by: u.user?.id, toggled_at: new Date().toISOString() })
    .eq("id", true);
  await logAuditEvent({ eventType: active ? "kill_switch_on" : "kill_switch_off", metadata: { reason } });
}

export async function createAccessWindow(opts: {
  workerId: string;
  portalType: PortalType;
  startTime: Date;
  endTime: Date;
  maxSessionMinutes?: number;
}) {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await (supabase as any)
    .from("worker_access_windows")
    .insert({
      worker_id: opts.workerId,
      portal_type: opts.portalType,
      window_date: opts.startTime.toISOString().slice(0, 10),
      start_time: opts.startTime.toISOString(),
      end_time: opts.endTime.toISOString(),
      max_session_minutes: opts.maxSessionMinutes ?? 240,
      status: "scheduled",
      created_by: u.user?.id,
    })
    .select()
    .single();
  if (!error) await logAuditEvent({ workerId: opts.workerId, eventType: "window_created", portalType: opts.portalType, metadata: { window_id: data?.id } });
  return { data, error };
}

export async function revokeWindow(windowId: string) {
  await (supabase as any).from("worker_access_windows").update({ status: "revoked" }).eq("id", windowId);
  await (supabase as any)
    .from("worker_sessions")
    .update({ status: "revoked", forced_logout_at: new Date().toISOString() })
    .eq("access_window_id", windowId)
    .eq("status", "active");
  await logAuditEvent({ eventType: "window_revoked", metadata: { window_id: windowId } });
}

export async function extendWindow(windowId: string, minutes: number) {
  const { data: w } = await (supabase as any).from("worker_access_windows").select("end_time").eq("id", windowId).single();
  if (!w) return;
  const newEnd = new Date(new Date(w.end_time).getTime() + minutes * 60_000).toISOString();
  await (supabase as any).from("worker_access_windows").update({ end_time: newEnd }).eq("id", windowId);
  await logAuditEvent({ eventType: "window_extended", metadata: { window_id: windowId, minutes } });
}

export async function forceLogoutSession(sessionId: string) {
  await (supabase as any)
    .from("worker_sessions")
    .update({ status: "forced_logout", forced_logout_at: new Date().toISOString() })
    .eq("id", sessionId);
  await logAuditEvent({ eventType: "session_forced_logout", metadata: { session_id: sessionId } });
}