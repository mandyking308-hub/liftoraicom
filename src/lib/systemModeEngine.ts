import { supabase } from "@/integrations/supabase/client";

export type SystemMode =
  | "LIVE_INTERNAL_TEST"
  | "APPROVAL_REQUIRED"
  | "MONDAY_WATCH"
  | "EMERGENCY_PAUSE"
  | "READ_ONLY_RECOVERY";

export const ALL_MODES: SystemMode[] = [
  "LIVE_INTERNAL_TEST",
  "APPROVAL_REQUIRED",
  "MONDAY_WATCH",
  "EMERGENCY_PAUSE",
  "READ_ONLY_RECOVERY",
];

export type RuntimeState = {
  mode: SystemMode;
  reason: string | null;
  changed_by: string | null;
  changed_at: string;
};

export type LedgerEntry = {
  id: string;
  previous_mode: SystemMode | null;
  new_mode: SystemMode;
  reason: string | null;
  changed_by: string | null;
  created_at: string;
};

/** Per-mode runtime behavior. Pure — safe to import in tests. */
export type ModeBehavior = {
  externalActionsAllowed: boolean;
  requiresApproval: boolean;
  writesAllowed: boolean;
  queuesFrozen: boolean;
  enhancedLogging: boolean;
  escalationSensitivity: "normal" | "elevated" | "max";
  label: string;
  tone: "info" | "watch" | "danger" | "ok";
  summary: string;
};

export const MODE_BEHAVIOR: Record<SystemMode, ModeBehavior> = {
  LIVE_INTERNAL_TEST: {
    externalActionsAllowed: false,
    requiresApproval: true,
    writesAllowed: true,
    queuesFrozen: false,
    enhancedLogging: true,
    escalationSensitivity: "normal",
    label: "Live Internal Test",
    tone: "info",
    summary: "No external side effects. All outbound actions queued for review.",
  },
  APPROVAL_REQUIRED: {
    externalActionsAllowed: true,
    requiresApproval: true,
    writesAllowed: true,
    queuesFrozen: false,
    enhancedLogging: true,
    escalationSensitivity: "elevated",
    label: "Approval Required",
    tone: "watch",
    summary: "External actions allowed only after explicit founder approval.",
  },
  MONDAY_WATCH: {
    externalActionsAllowed: true,
    requiresApproval: false,
    writesAllowed: true,
    queuesFrozen: false,
    enhancedLogging: true,
    escalationSensitivity: "elevated",
    label: "Monday Watch",
    tone: "watch",
    summary: "Supervised live operation. Enhanced logging and escalation sensitivity.",
  },
  EMERGENCY_PAUSE: {
    externalActionsAllowed: false,
    requiresApproval: true,
    writesAllowed: true,
    queuesFrozen: true,
    enhancedLogging: true,
    escalationSensitivity: "max",
    label: "Emergency Pause",
    tone: "danger",
    summary: "Queues frozen, outbound disabled. Reads preserved.",
  },
  READ_ONLY_RECOVERY: {
    externalActionsAllowed: false,
    requiresApproval: true,
    writesAllowed: false,
    queuesFrozen: true,
    enhancedLogging: true,
    escalationSensitivity: "max",
    label: "Read-Only Recovery",
    tone: "danger",
    summary: "All writes disabled. Reporting and diagnostics only.",
  },
};

/** Dangerous transitions surface a confirmation dialog. */
export const DANGEROUS_TRANSITIONS: Array<[SystemMode, SystemMode]> = [
  ["MONDAY_WATCH", "EMERGENCY_PAUSE"],
  ["APPROVAL_REQUIRED", "EMERGENCY_PAUSE"],
  ["LIVE_INTERNAL_TEST", "EMERGENCY_PAUSE"],
  ["MONDAY_WATCH", "READ_ONLY_RECOVERY"],
  ["APPROVAL_REQUIRED", "READ_ONLY_RECOVERY"],
  ["EMERGENCY_PAUSE", "MONDAY_WATCH"],
  ["READ_ONLY_RECOVERY", "MONDAY_WATCH"],
  ["LIVE_INTERNAL_TEST", "MONDAY_WATCH"],
];

export function isDangerousTransition(from: SystemMode, to: SystemMode): boolean {
  return DANGEROUS_TRANSITIONS.some(([a, b]) => a === from && b === to);
}

/** Gate an attempted action against the current mode. */
export function canPerform(
  mode: SystemMode,
  action: "external_send" | "internal_write" | "queue_drain" | "read"
): { allowed: boolean; reason?: string } {
  const b = MODE_BEHAVIOR[mode];
  if (action === "read") return { allowed: true };
  if (action === "internal_write" && !b.writesAllowed) return { allowed: false, reason: "writes_disabled_in_mode" };
  if (action === "queue_drain" && b.queuesFrozen) return { allowed: false, reason: "queues_frozen" };
  if (action === "external_send" && !b.externalActionsAllowed) return { allowed: false, reason: "external_disabled" };
  if (action === "external_send" && b.requiresApproval) return { allowed: false, reason: "founder_approval_required" };
  return { allowed: true };
}

export async function fetchRuntimeState(): Promise<RuntimeState | null> {
  const { data } = await supabase
    .from("system_runtime_state")
    .select("mode,reason,changed_by,changed_at")
    .eq("id", "singleton")
    .maybeSingle();
  return (data as RuntimeState | null) ?? null;
}

export async function fetchModeLedger(limit = 100): Promise<LedgerEntry[]> {
  const { data } = await supabase
    .from("system_mode_ledger")
    .select("id,previous_mode,new_mode,reason,changed_by,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as LedgerEntry[];
}

export async function setRuntimeMode(mode: SystemMode, reason: string): Promise<{ ok: boolean; error?: string }> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id ?? null;
  const { error } = await supabase
    .from("system_runtime_state")
    .update({ mode, reason, changed_by: uid, changed_at: new Date().toISOString() })
    .eq("id", "singleton");
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}