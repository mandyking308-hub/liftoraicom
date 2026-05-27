import { supabase } from "@/integrations/supabase/client";

/**
 * Business Activation Control
 * --------------------------------------------------------------
 * Monday-safe activation: only 3 controlled businesses (NeonCandy,
 * ServiceOpsDemo, InternalOps) may be activated. Everything else is
 * forcibly isolated from runtime orchestration, queues, and outbound.
 */

/** Canonical allowlist matched case-insensitively against business.name. */
export const MONDAY_SAFE_ALLOWLIST = [
  { key: "neoncandy", display: "NeonCandy", aliases: ["neon candy", "neoncandy"] },
  { key: "serviceopsdemo", display: "ServiceOpsDemo", aliases: ["serviceopsdemo", "service ops demo", "live_internal_test · service / agency test business"] },
  { key: "internalops", display: "InternalOps", aliases: ["internalops", "internal ops", "liftor rehearsal business — internal test", "live_internal_test · saas test business"] },
] as const;

export type AllowlistKey = (typeof MONDAY_SAFE_ALLOWLIST)[number]["key"];

export type RuntimeState =
  | "live"        // activated, can execute
  | "isolated"    // disabled, no runtime touch
  | "quarantined" // disabled + flagged
  | "warming";    // pre-activation

export type RiskLevel = "low" | "medium" | "high" | "unknown";

export interface BusinessRow {
  id: string;
  name: string;
}

export interface ActivationRow {
  id: string;
  business_id: string;
  activated: boolean;
  risk_level: RiskLevel;
  runtime_state: RuntimeState;
  outbound_allowed: boolean;
  queue_allowed: boolean;
  ai_orchestration_allowed: boolean;
  notes: string | null;
  activated_by: string | null;
  activated_at: string | null;
  deactivated_at: string | null;
  updated_at: string;
}

export interface ActivationLogRow {
  id: string;
  business_id: string;
  action: string;
  prev_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  actor_id: string | null;
  reason: string | null;
  created_at: string;
}

export interface CombinedBusiness {
  business: BusinessRow;
  activation: ActivationRow | null;
  allowed: boolean;
  allowKey: AllowlistKey | null;
  effectiveState: RuntimeState;
  riskLevel: RiskLevel;
  outboundAllowed: boolean;
  queueAllowed: boolean;
  aiAllowed: boolean;
}

/** Lookup allowlist entry by business name. Pure / unit-testable. */
export function matchAllowlist(name: string): { key: AllowlistKey; display: string } | null {
  const n = name.trim().toLowerCase();
  for (const entry of MONDAY_SAFE_ALLOWLIST) {
    if (entry.aliases.some((a) => n === a || n.includes(a))) {
      return { key: entry.key, display: entry.display };
    }
  }
  return null;
}

/**
 * Compute effective runtime state — even if a row in the DB says
 * "activated", a business that is NOT on the allowlist is forcibly
 * downgraded to "isolated". This is the kill-switch the panel enforces.
 */
export function deriveEffectiveState(
  business: BusinessRow,
  activation: ActivationRow | null,
): CombinedBusiness {
  const match = matchAllowlist(business.name);
  const allowed = !!match;
  const dbActive = !!activation?.activated;
  const live = allowed && dbActive;

  return {
    business,
    activation,
    allowed,
    allowKey: match?.key ?? null,
    effectiveState: live
      ? "live"
      : allowed
        ? (activation?.runtime_state === "warming" ? "warming" : "isolated")
        : "isolated",
    riskLevel: activation?.risk_level ?? (allowed ? "low" : "high"),
    outboundAllowed: live && !!activation?.outbound_allowed,
    queueAllowed: live && !!activation?.queue_allowed,
    aiAllowed: live && !!activation?.ai_orchestration_allowed,
  };
}

/**
 * Hard runtime gate. Every queue / outbound / AI dispatcher should call this
 * before executing on behalf of a business. Returns reason when blocked.
 */
export function canExecute(
  c: CombinedBusiness,
  channel: "queue" | "outbound" | "ai",
): { allowed: boolean; reason?: string } {
  if (!c.allowed) return { allowed: false, reason: "business_not_in_monday_allowlist" };
  if (c.effectiveState !== "live") return { allowed: false, reason: `runtime_state:${c.effectiveState}` };
  if (channel === "queue" && !c.queueAllowed) return { allowed: false, reason: "queue_disabled" };
  if (channel === "outbound" && !c.outboundAllowed) return { allowed: false, reason: "outbound_disabled" };
  if (channel === "ai" && !c.aiAllowed) return { allowed: false, reason: "ai_orchestration_disabled" };
  return { allowed: true };
}

/* ----------------------------- Data access ----------------------------- */

export async function listBusinesses(): Promise<BusinessRow[]> {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name")
    .order("name");
  if (error) throw error;
  return (data ?? []) as BusinessRow[];
}

export async function listActivations(): Promise<ActivationRow[]> {
  const { data, error } = await supabase
    .from("business_runtime_activation")
    .select("*");
  if (error) throw error;
  return (data ?? []) as ActivationRow[];
}

export async function listLog(limit = 100): Promise<ActivationLogRow[]> {
  const { data, error } = await supabase
    .from("business_runtime_activation_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ActivationLogRow[];
}

export async function loadCombined(): Promise<CombinedBusiness[]> {
  const [businesses, activations] = await Promise.all([listBusinesses(), listActivations()]);
  const byId = new Map(activations.map((a) => [a.business_id, a]));
  return businesses.map((b) => deriveEffectiveState(b, byId.get(b.id) ?? null));
}

async function getActorId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function writeLog(
  business_id: string,
  action: string,
  prev_state: Record<string, unknown> | null,
  new_state: Record<string, unknown> | null,
  reason?: string,
) {
  const actor_id = await getActorId();
  await supabase.from("business_runtime_activation_log").insert({
    business_id, action, prev_state, new_state, actor_id, reason: reason ?? null,
  });
}

export async function activateBusiness(
  c: CombinedBusiness,
  opts: { reason?: string } = {},
): Promise<{ ok: boolean; error?: string }> {
  if (!c.allowed) {
    return { ok: false, error: "Business is not on the Monday-safe allowlist." };
  }
  const actor_id = await getActorId();
  const prev = c.activation;
  const payload = {
    business_id: c.business.id,
    activated: true,
    risk_level: prev?.risk_level ?? "low",
    runtime_state: "live" as RuntimeState,
    outbound_allowed: true,
    queue_allowed: true,
    ai_orchestration_allowed: true,
    activated_by: actor_id,
    activated_at: new Date().toISOString(),
    deactivated_at: null as string | null,
    notes: prev?.notes ?? null,
  };
  const { error } = await supabase
    .from("business_runtime_activation")
    .upsert(payload, { onConflict: "business_id" });
  if (error) return { ok: false, error: error.message };
  await writeLog(c.business.id, "activate", prev as any, payload, opts.reason);
  return { ok: true };
}

export async function deactivateBusiness(
  c: CombinedBusiness,
  opts: { reason?: string; quarantine?: boolean } = {},
): Promise<{ ok: boolean; error?: string }> {
  const prev = c.activation;
  const payload = {
    business_id: c.business.id,
    activated: false,
    risk_level: prev?.risk_level ?? (c.allowed ? "low" : "high"),
    runtime_state: (opts.quarantine ? "quarantined" : "isolated") as RuntimeState,
    outbound_allowed: false,
    queue_allowed: false,
    ai_orchestration_allowed: false,
    deactivated_at: new Date().toISOString(),
    activated_by: prev?.activated_by ?? null,
    activated_at: prev?.activated_at ?? null,
    notes: prev?.notes ?? null,
  };
  const { error } = await supabase
    .from("business_runtime_activation")
    .upsert(payload, { onConflict: "business_id" });
  if (error) return { ok: false, error: error.message };
  await writeLog(
    c.business.id,
    opts.quarantine ? "quarantine" : "deactivate",
    prev as any,
    payload,
    opts.reason,
  );
  return { ok: true };
}

/**
 * Force every non-allowlisted business into an isolated row so the
 * runtime gate has an authoritative record. Idempotent.
 */
export async function enforceMondaySafeBaseline(): Promise<{
  ok: boolean;
  isolated: number;
  error?: string;
}> {
  try {
    const combined = await loadCombined();
    let isolated = 0;
    for (const c of combined) {
      if (c.allowed) continue;
      if (c.activation && !c.activation.activated && c.activation.runtime_state === "isolated") continue;
      const res = await deactivateBusiness(c, { reason: "monday_safe_baseline" });
      if (res.ok) isolated += 1;
    }
    return { ok: true, isolated };
  } catch (e: any) {
    return { ok: false, isolated: 0, error: e?.message ?? String(e) };
  }
}

/* -------------------------------- Metrics ------------------------------ */

export interface ActivationSummary {
  total: number;
  active: number;
  isolated: number;
  quarantined: number;
  allowlisted: number;
  outboundEnabled: number;
  queueEnabled: number;
  aiEnabled: number;
}

export function summarise(rows: CombinedBusiness[]): ActivationSummary {
  const s: ActivationSummary = {
    total: rows.length,
    active: 0, isolated: 0, quarantined: 0, allowlisted: 0,
    outboundEnabled: 0, queueEnabled: 0, aiEnabled: 0,
  };
  for (const r of rows) {
    if (r.allowed) s.allowlisted += 1;
    if (r.effectiveState === "live") s.active += 1;
    else if (r.effectiveState === "quarantined") s.quarantined += 1;
    else s.isolated += 1;
    if (r.outboundAllowed) s.outboundEnabled += 1;
    if (r.queueAllowed) s.queueEnabled += 1;
    if (r.aiAllowed) s.aiEnabled += 1;
  }
  return s;
}

export const STATE_CLS: Record<RuntimeState, string> = {
  live: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  warming: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  isolated: "bg-slate-500/15 text-slate-300 border-slate-400/30",
  quarantined: "bg-rose-500/15 text-rose-300 border-rose-400/30",
};

export const RISK_CLS: Record<RiskLevel, string> = {
  low: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  medium: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  high: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  unknown: "bg-slate-500/15 text-slate-300 border-slate-400/30",
};