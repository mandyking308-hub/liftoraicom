import { supabase } from "@/integrations/supabase/client";

export type SnapshotScope =
  | "database"
  | "workflow"
  | "prompt"
  | "config"
  | "memory"
  | "runtime_state";

export const SNAPSHOT_SCOPES: SnapshotScope[] = [
  "database", "workflow", "prompt", "config", "memory", "runtime_state",
];

export type SnapshotStatus = "ready" | "failed" | "expired";

export type Snapshot = {
  id: string;
  scope: SnapshotScope;
  label: string;
  taken_by: string | null;
  payload: any;
  byte_size: number;
  integrity_hash: string;
  status: SnapshotStatus;
  error_message: string | null;
  created_at: string;
};

export type RecoveryAction = {
  id: string;
  snapshot_id: string | null;
  action: "restore_simulate" | "restore_apply" | "rollback" | "snapshot_create" | "snapshot_verify";
  target_scope: string | null;
  confirmed: boolean;
  dry_run: boolean;
  success: boolean;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
};

/** Pure: synchronous FNV-1a-ish hash for snapshot integrity. */
export function integrityHash(payload: unknown): string {
  const str = JSON.stringify(payload ?? {});
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return `fnv1a-${h.toString(16).padStart(8, "0")}-${str.length}`;
}

export function verifyIntegrity(snapshot: { payload: unknown; integrity_hash: string }): boolean {
  return integrityHash(snapshot.payload) === snapshot.integrity_hash;
}

/** Dangerous restores require confirmation. */
export function isDangerousRestore(scope: SnapshotScope): boolean {
  return scope === "database" || scope === "runtime_state" || scope === "config";
}

export type SnapshotHealth = "healthy" | "stale" | "missing" | "failed";

const STALE_THRESHOLD_MS: Record<SnapshotScope, number> = {
  database: 24 * 60 * 60 * 1000,
  workflow: 7 * 24 * 60 * 60 * 1000,
  prompt: 7 * 24 * 60 * 60 * 1000,
  config: 7 * 24 * 60 * 60 * 1000,
  memory: 24 * 60 * 60 * 1000,
  runtime_state: 6 * 60 * 60 * 1000,
};

export function scopeHealth(latest: Snapshot | null, scope: SnapshotScope, now = Date.now()): SnapshotHealth {
  if (!latest) return "missing";
  if (latest.status === "failed") return "failed";
  const age = now - new Date(latest.created_at).getTime();
  return age > STALE_THRESHOLD_MS[scope] ? "stale" : "healthy";
}

/** Take a one-click snapshot: gather payload, hash, insert immutable row. */
export async function takeSnapshot(scope: SnapshotScope, label: string): Promise<{ ok: boolean; snapshot?: Snapshot; error?: string }> {
  const payload = await gatherPayload(scope);
  const serialized = JSON.stringify(payload);
  const hash = integrityHash(payload);
  const { data, error } = await supabase
    .from("liftor_snapshots")
    .insert({
      scope, label,
      payload,
      byte_size: serialized.length,
      integrity_hash: hash,
      status: "ready",
      audit_metadata: { source: "founder_one_click", browser: true },
    })
    .select("*")
    .single();
  if (error) {
    await supabase.from("liftor_recovery_actions").insert({
      action: "snapshot_create", target_scope: scope, success: false, dry_run: false,
      notes: error.message,
    });
    return { ok: false, error: error.message };
  }
  await supabase.from("liftor_recovery_actions").insert({
    snapshot_id: data.id, action: "snapshot_create", target_scope: scope,
    success: true, dry_run: false, notes: `Snapshot ${label}`,
  });
  return { ok: true, snapshot: data as Snapshot };
}

async function gatherPayload(scope: SnapshotScope): Promise<any> {
  // Lightweight, browser-safe snapshots: counts + recent rows per scope.
  // Real database snapshots are taken by Lovable Cloud automatic backups.
  switch (scope) {
    case "database": {
      const [biz, env] = await Promise.all([
        supabase.from("businesses").select("id,name").limit(500),
        supabase.from("business_context_envelopes").select("id,brand_name,business_id,context_status").limit(500),
      ]);
      return { businesses: biz.data ?? [], envelopes: env.data ?? [] };
    }
    case "workflow": {
      const r = await supabase.from("ai_action_queue").select("id,action_type,status,business_id").limit(1000);
      return { actions: r.data ?? [] };
    }
    case "prompt": {
      const r = await supabase.from("ai_agent_registry").select("id,name,system_prompt").limit(500);
      return { prompts: r.data ?? [] };
    }
    case "config": {
      const r = await supabase.from("ai_agent_cost_controls").select("*").limit(500);
      return { controls: r.data ?? [] };
    }
    case "memory": {
      const r = await supabase.from("business_context_envelopes").select("*").limit(500);
      return { envelopes: r.data ?? [] };
    }
    case "runtime_state": {
      const r = await supabase.from("system_runtime_state").select("*").limit(10);
      return { state: r.data ?? [] };
    }
  }
}

export async function listSnapshots(limit = 100): Promise<Snapshot[]> {
  const { data } = await supabase
    .from("liftor_snapshots")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Snapshot[];
}

export async function listRecoveryActions(limit = 100): Promise<RecoveryAction[]> {
  const { data } = await supabase
    .from("liftor_recovery_actions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as RecoveryAction[];
}

/** Simulate restore: verify integrity + diff size, never writes target tables. */
export async function simulateRestore(snapshot: Snapshot, notes = "Simulated restore"): Promise<{ ok: boolean; integrityOk: boolean; error?: string }> {
  const integrityOk = verifyIntegrity(snapshot);
  await supabase.from("liftor_recovery_actions").insert({
    snapshot_id: snapshot.id,
    action: "restore_simulate",
    target_scope: snapshot.scope,
    confirmed: false,
    dry_run: true,
    success: integrityOk,
    notes: integrityOk ? notes : `Integrity check FAILED: ${snapshot.integrity_hash}`,
  });
  return { ok: integrityOk, integrityOk };
}

/** Apply restore: requires explicit confirmation. Logs the action — does NOT auto-mutate
 * production tables; that requires an edge function with service role.
 * Use this to record the founder decision and gate the actual restore script. */
export async function applyRestore(snapshot: Snapshot, confirmationPhrase: string): Promise<{ ok: boolean; error?: string }> {
  if (!verifyIntegrity(snapshot)) return { ok: false, error: "Integrity check failed — refusing to restore." };
  if (isDangerousRestore(snapshot.scope) && confirmationPhrase !== "RESTORE NOW") {
    return { ok: false, error: "Dangerous restore requires phrase: RESTORE NOW" };
  }
  const { error } = await supabase.from("liftor_recovery_actions").insert({
    snapshot_id: snapshot.id,
    action: "restore_apply",
    target_scope: snapshot.scope,
    confirmed: true,
    dry_run: false,
    success: true,
    notes: `Apply restore: ${snapshot.label}`,
  });
  return { ok: !error, error: error?.message };
}

export type StorageUsage = {
  totalSnapshots: number;
  totalBytes: number;
  byScope: Record<SnapshotScope, { count: number; bytes: number; latest: Snapshot | null; health: SnapshotHealth }>;
  failedCount: number;
};

export function computeUsage(snapshots: Snapshot[], now = Date.now()): StorageUsage {
  const byScope = {} as StorageUsage["byScope"];
  for (const s of SNAPSHOT_SCOPES) byScope[s] = { count: 0, bytes: 0, latest: null, health: "missing" };
  let totalBytes = 0;
  let failedCount = 0;
  for (const snap of snapshots) {
    const b = byScope[snap.scope];
    if (!b) continue;
    b.count += 1;
    b.bytes += snap.byte_size;
    totalBytes += snap.byte_size;
    if (snap.status === "failed") failedCount += 1;
    if (!b.latest || new Date(snap.created_at) > new Date(b.latest.created_at)) b.latest = snap;
  }
  for (const s of SNAPSHOT_SCOPES) byScope[s].health = scopeHealth(byScope[s].latest, s, now);
  return { totalSnapshots: snapshots.length, totalBytes, byScope, failedCount };
}

export const HEALTH_CLS: Record<SnapshotHealth, string> = {
  healthy: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10",
  stale: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  missing: "text-muted-foreground border-border bg-muted/10",
  failed: "text-destructive border-destructive/40 bg-destructive/10",
};