import { supabase } from "@/integrations/supabase/client";

export type QueueStatus =
  | "queued" | "running" | "completed" | "failed"
  | "blocked" | "cancelled" | "requires_approval" | "duplicate_prevented";

export type QueueScope = {
  business_id?: string | null;
  agent_id?: string | null;
  campaign_id?: string | null;
  task_id?: string | null;
  workflow_id?: string | null;
};

export type EnqueueInput = QueueScope & {
  action_type: string;
  task_category: string;
  requested_model_tier?: string | null;
  estimated_cost?: number;
  priority?: "low" | "normal" | "high" | "urgent";
  idempotency_key?: string;
  content_hash?: string;
  scheduled_for?: string | null;
  audit_metadata?: Record<string, unknown>;
};

/** Stable, deterministic idempotency key from semantic action shape. */
export function buildIdempotencyKey(input: EnqueueInput): string {
  if (input.idempotency_key) return input.idempotency_key;
  const parts = [
    input.business_id ?? "-",
    input.agent_id ?? "-",
    input.task_id ?? "-",
    input.workflow_id ?? "-",
    input.campaign_id ?? "-",
    input.action_type,
    input.task_category,
    input.content_hash ?? "-",
  ];
  return parts.join("|");
}

export type EnforcementResult = {
  allowed: boolean;
  reason?: string;
  code?:
    | "global_paused" | "business_paused" | "agent_paused" | "campaign_paused"
    | "rate_limited_hour" | "rate_limited_day" | "duplicate" | "loop_detected";
  linked_ledger_id?: string | null;
  existing_queue_id?: string | null;
};

/** Pull the singleton kill switch state. */
export async function getKillSwitchState() {
  const { data, error } = await supabase
    .from("ai_kill_switch_state")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function pauseAll(reason: string, userId?: string | null) {
  return updateKillSwitch({
    global_ai_paused: true,
    pause_reason: reason,
    paused_by: userId ?? null,
    paused_at: new Date().toISOString(),
  });
}

export async function resumeAll(userId?: string | null) {
  return updateKillSwitch({
    global_ai_paused: false,
    resumed_by: userId ?? null,
    resumed_at: new Date().toISOString(),
  });
}

export async function pauseScope(
  kind: "business" | "agent" | "campaign",
  id: string,
  reason: string,
  userId?: string | null,
) {
  const state = await getKillSwitchState();
  const col =
    kind === "business" ? "paused_business_ids"
    : kind === "agent" ? "paused_agent_ids"
    : "paused_campaign_ids";
  const current: string[] = ((state as any)?.[col] ?? []) as string[];
  const next = Array.from(new Set([...current, id]));
  return updateKillSwitch({
    [col]: next,
    pause_reason: reason,
    paused_by: userId ?? null,
    paused_at: new Date().toISOString(),
  } as any);
}

export async function resumeScope(
  kind: "business" | "agent" | "campaign",
  id: string,
  userId?: string | null,
) {
  const state = await getKillSwitchState();
  const col =
    kind === "business" ? "paused_business_ids"
    : kind === "agent" ? "paused_agent_ids"
    : "paused_campaign_ids";
  const current: string[] = ((state as any)?.[col] ?? []) as string[];
  const next = current.filter((x) => x !== id);
  return updateKillSwitch({
    [col]: next,
    resumed_by: userId ?? null,
    resumed_at: new Date().toISOString(),
  } as any);
}

async function updateKillSwitch(patch: Record<string, unknown>) {
  const state = await getKillSwitchState();
  if (!state) throw new Error("kill switch state row missing");
  const { error } = await supabase
    .from("ai_kill_switch_state")
    .update(patch as any)
    .eq("id", (state as any).id);
  if (error) throw error;
}

/** Check rate limit for a single scope key (most-specific rule wins). */
async function checkRateLimitFor(
  scope_type: "global" | "business" | "agent" | "campaign" | "task_category",
  scope_id: string | null,
  task_category: string | null,
): Promise<EnforcementResult | null> {
  const q = supabase.from("ai_rate_limits").select("*").eq("scope_type", scope_type).eq("enabled", true);
  const { data, error } = await (scope_id == null ? q.is("scope_id", null) : q.eq("scope_id", scope_id));
  if (error || !data?.length) return null;
  const rule = data.find((r: any) => (r.task_category ?? null) === task_category) ?? data.find((r: any) => !r.task_category);
  if (!rule) return null;

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const baseQuery = (since: string) => {
    let qb = supabase
      .from("ai_action_queue")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since)
      .in("status", ["queued", "running", "completed", "requires_approval"]);
    if (scope_type === "business" && scope_id) qb = qb.eq("business_id", scope_id);
    if (scope_type === "agent" && scope_id) qb = qb.eq("agent_id", scope_id);
    if (scope_type === "campaign" && scope_id) qb = qb.eq("campaign_id", scope_id);
    if (task_category) qb = qb.eq("task_category", task_category);
    return qb;
  };

  if (rule.per_hour_limit != null) {
    const { count } = await baseQuery(hourAgo);
    if ((count ?? 0) >= rule.per_hour_limit) {
      return { allowed: false, code: "rate_limited_hour",
        reason: `Hourly limit reached (${rule.per_hour_limit}) for ${scope_type}${task_category ? ` / ${task_category}` : ""}` };
    }
  }
  if (rule.per_day_limit != null) {
    const { count } = await baseQuery(dayAgo);
    if ((count ?? 0) >= rule.per_day_limit) {
      return { allowed: false, code: "rate_limited_day",
        reason: `Daily limit reached (${rule.per_day_limit}) for ${scope_type}${task_category ? ` / ${task_category}` : ""}` };
    }
  }
  return null;
}

/** Detect a tight repeat loop on the same idempotency family. */
async function detectLoop(input: EnqueueInput): Promise<boolean> {
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  let qb = supabase
    .from("ai_action_queue")
    .select("id", { count: "exact", head: true })
    .gte("created_at", tenMinAgo)
    .eq("action_type", input.action_type)
    .eq("task_category", input.task_category);
  if (input.agent_id) qb = qb.eq("agent_id", input.agent_id);
  if (input.task_id) qb = qb.eq("task_id", input.task_id);
  const { count } = await qb;
  return (count ?? 0) >= 15;
}

/**
 * Full pre-flight enforcement check. Run BEFORE any AI call or queue insert.
 * Order: global pause -> scoped pause -> idempotency -> rate limits -> loop.
 */
export async function checkEnforcement(input: EnqueueInput): Promise<EnforcementResult> {
  const state = await getKillSwitchState();
  if (state?.global_ai_paused) {
    return { allowed: false, code: "global_paused", reason: state.pause_reason ?? "Global AI is paused" };
  }
  if (input.business_id && state?.paused_business_ids?.includes(input.business_id)) {
    return { allowed: false, code: "business_paused", reason: "Business is paused" };
  }
  if (input.agent_id && state?.paused_agent_ids?.includes(input.agent_id)) {
    return { allowed: false, code: "agent_paused", reason: "Agent is paused" };
  }
  if (input.campaign_id && state?.paused_campaign_ids?.includes(input.campaign_id)) {
    return { allowed: false, code: "campaign_paused", reason: "Campaign is paused" };
  }

  const idem = buildIdempotencyKey(input);
  const { data: dup } = await supabase
    .from("ai_action_queue")
    .select("id, status, linked_ledger_id, created_at")
    .eq("idempotency_key", idem)
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (dup && ["queued", "running", "requires_approval", "completed"].includes((dup as any).status)) {
    return {
      allowed: false,
      code: "duplicate",
      reason: "Identical action already exists in last 24h",
      existing_queue_id: (dup as any).id,
      linked_ledger_id: (dup as any).linked_ledger_id ?? null,
    };
  }

  for (const scope of [
    { t: "global" as const, id: null, cat: null },
    { t: "global" as const, id: null, cat: input.task_category },
    { t: "business" as const, id: input.business_id ?? null, cat: null },
    { t: "business" as const, id: input.business_id ?? null, cat: input.task_category },
    { t: "agent" as const, id: input.agent_id ?? null, cat: null },
    { t: "campaign" as const, id: input.campaign_id ?? null, cat: null },
    { t: "task_category" as const, id: null, cat: input.task_category },
  ]) {
    if (scope.t !== "global" && scope.t !== "task_category" && !scope.id) continue;
    const res = await checkRateLimitFor(scope.t, scope.id, scope.cat);
    if (res && !res.allowed) return res;
  }

  if (await detectLoop(input)) {
    return { allowed: false, code: "loop_detected", reason: "Same agent/task repeated too often in last 10 minutes" };
  }

  return { allowed: true };
}

/**
 * Enqueue an AI action after running enforcement. Returns the row plus
 * the enforcement decision. If blocked, the row is still recorded with the
 * appropriate status for full auditability.
 */
export async function enqueueAIAction(input: EnqueueInput) {
  const decision = await checkEnforcement(input);
  const idem = buildIdempotencyKey(input);
  let status: QueueStatus = "queued";
  let block_reason: string | null = null;
  if (!decision.allowed) {
    block_reason = decision.reason ?? null;
    if (decision.code === "duplicate") status = "duplicate_prevented";
    else status = "blocked";
  }

  const row = {
    business_id: input.business_id ?? null,
    agent_id: input.agent_id ?? null,
    campaign_id: input.campaign_id ?? null,
    task_id: input.task_id ?? null,
    workflow_id: input.workflow_id ?? null,
    action_type: input.action_type,
    task_category: input.task_category,
    requested_model_tier: input.requested_model_tier ?? null,
    estimated_cost: input.estimated_cost ?? 0,
    priority: input.priority ?? "normal",
    status,
    idempotency_key: status === "duplicate_prevented" ? `${idem}#${Date.now()}` : idem,
    linked_ledger_id: decision.linked_ledger_id ?? null,
    block_reason,
    scheduled_for: input.scheduled_for ?? null,
    audit_metadata: {
      ...(input.audit_metadata ?? {}),
      enforcement_code: decision.code ?? null,
      duplicate_of: decision.existing_queue_id ?? null,
    },
  };

  const { data, error } = await supabase
    .from("ai_action_queue")
    .insert(row as any)
    .select("*")
    .single();

  return { row: data, decision, error };
}

export async function markQueueStatus(
  id: string,
  status: QueueStatus,
  patch: Partial<{ linked_ledger_id: string; block_reason: string; error_message: string }> = {},
) {
  const now = new Date().toISOString();
  const update: any = { status, ...patch };
  if (status === "running") update.started_at = now;
  if (["completed", "failed", "cancelled", "blocked"].includes(status)) update.completed_at = now;
  const { error } = await supabase.from("ai_action_queue").update(update).eq("id", id);
  return { error };
}