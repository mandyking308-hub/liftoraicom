import { supabase } from "@/integrations/supabase/client";

/**
 * Liftor Event Bus + Workflow Orchestrator (internal-only execution).
 *
 * Live-first by design. Internal steps execute and log immediately.
 * Any step marked `external: true` is parked as a `waiting_approval`
 * step (and a founder approval row in the master work queue) — the
 * orchestrator never performs sends, payments, refunds, payouts,
 * invites, exports or other external mutations on its own.
 */

export type EventCategory =
  | "sales" | "payment" | "delivery" | "support" | "marketplace"
  | "finance" | "compliance" | "privacy" | "incident" | "ai"
  | "system" | "manual" | "other";

export type EventStatus = "new"|"processing"|"processed"|"failed"|"ignored"|"cancelled";
export type RunStatus = "queued"|"running"|"completed"|"failed"|"cancelled"|"waiting_approval";
export type StepStatus = "queued"|"running"|"completed"|"failed"|"skipped"|"waiting_approval";
export type FailureType = "validation"|"missing_data"|"permission"|"provider"|"schema"|"duplicate"|"timeout"|"unknown";
export type Severity = "low"|"medium"|"high"|"critical";

export interface LiftorEvent {
  id: string;
  business_id: string | null;
  event_type: string;
  event_category: EventCategory;
  source_module: string;
  source_table: string | null;
  source_record_id: string | null;
  event_payload: Record<string, unknown>;
  event_status: EventStatus;
  idempotency_key: string | null;
  is_test_data: boolean;
  created_at: string;
  processed_at: string | null;
  audit_metadata: Record<string, unknown>;
}

export interface WorkflowStep {
  name: string;
  target_module?: string;
  source_module?: string;
  external?: boolean;
  description?: string;
}

export interface WorkflowDefinition {
  id: string;
  workflow_name: string;
  workflow_code: string;
  trigger_event_type: string;
  workflow_category: string;
  description: string | null;
  steps: WorkflowStep[];
  active: boolean;
  external_action_possible: boolean;
  requires_founder_approval_for_external: boolean;
}

export interface WorkflowRun {
  id: string;
  workflow_definition_id: string;
  triggering_event_id: string | null;
  business_id: string | null;
  run_status: RunStatus;
  started_at: string | null;
  completed_at: string | null;
  failure_reason: string | null;
  retry_count: number;
  audit_metadata: Record<string, unknown>;
  created_at: string;
}

export interface WorkflowStepRun {
  id: string;
  workflow_run_id: string;
  step_name: string;
  step_order: number;
  step_status: StepStatus;
  source_module: string | null;
  target_module: string | null;
  output_summary: string | null;
  failure_reason: string | null;
  created_at: string;
  audit_metadata: Record<string, unknown>;
}

export interface WorkflowFailureEvent {
  id: string;
  workflow_run_id: string;
  workflow_step_run_id: string | null;
  failure_type: FailureType;
  failure_summary: string;
  severity: Severity;
  recommended_action: string | null;
  status: "open"|"acknowledged"|"resolved"|"ignored";
  created_at: string;
}

const MAX_RETRIES = 2;

/** Emit an event onto the Liftor bus. Idempotent via `idempotency_key`. */
export async function emitLiftorEvent(input: {
  business_id?: string | null;
  event_type: string;
  event_category?: EventCategory;
  source_module: string;
  source_table?: string | null;
  source_record_id?: string | null;
  event_payload?: Record<string, unknown>;
  idempotency_key?: string;
  is_test_data?: boolean;
  audit_metadata?: Record<string, unknown>;
}): Promise<{ event: LiftorEvent | null; deduped: boolean; error?: string }> {
  const row = {
    business_id: input.business_id ?? null,
    event_type: input.event_type,
    event_category: input.event_category ?? "other",
    source_module: input.source_module,
    source_table: input.source_table ?? null,
    source_record_id: input.source_record_id ?? null,
    event_payload: input.event_payload ?? {},
    idempotency_key: input.idempotency_key ?? null,
    is_test_data: input.is_test_data ?? false,
    audit_metadata: input.audit_metadata ?? {},
  };
  const { data, error } = await (supabase as any)
    .from("liftor_events")
    .insert(row)
    .select()
    .single();
  if (error) {
    // Unique violation on idempotency_key → treat as deduped.
    if (String((error as any).code) === "23505" && input.idempotency_key) {
      const { data: prior } = await (supabase as any)
        .from("liftor_events")
        .select("*")
        .eq("idempotency_key", input.idempotency_key)
        .maybeSingle();
      return { event: prior as LiftorEvent, deduped: true };
    }
    return { event: null, deduped: false, error: error.message };
  }
  return { event: data as LiftorEvent, deduped: false };
}

/** Look up active workflows whose trigger matches an event type. */
async function workflowsForEvent(eventType: string): Promise<WorkflowDefinition[]> {
  const { data } = await (supabase as any)
    .from("workflow_definitions")
    .select("*")
    .eq("trigger_event_type", eventType)
    .eq("active", true);
  return (data ?? []) as WorkflowDefinition[];
}

async function logFailure(args: {
  run_id: string;
  step_run_id?: string | null;
  failure_type: FailureType;
  failure_summary: string;
  severity?: Severity;
  recommended_action?: string;
}) {
  await (supabase as any).from("workflow_failure_events").insert({
    workflow_run_id: args.run_id,
    workflow_step_run_id: args.step_run_id ?? null,
    failure_type: args.failure_type,
    failure_summary: args.failure_summary,
    severity: args.severity ?? "medium",
    recommended_action: args.recommended_action ?? null,
  });
  // Create master work queue row so failures surface in the Control Fabric.
  await (supabase as any).from("master_work_items").insert({
    source_module: "event_bus",
    work_type: "incident",
    title: `Workflow failure: ${args.failure_summary}`.slice(0, 200),
    priority: args.severity === "critical" ? "critical" : args.severity === "high" ? "high" : "normal",
    status: "new",
    audit_metadata: {
      origin: "event_bus",
      failure_type: args.failure_type,
      workflow_run_id: args.run_id,
    },
  });
}

/**
 * Execute a workflow definition against an event.
 * Internal steps mark `completed`. External steps mark `waiting_approval`.
 * If any required internal step fails, a failure event + master work item is logged.
 */
export async function runWorkflow(def: WorkflowDefinition, event: LiftorEvent): Promise<WorkflowRun | null> {
  const { data: runRow, error: runErr } = await (supabase as any)
    .from("workflow_runs")
    .insert({
      workflow_definition_id: def.id,
      triggering_event_id: event.id,
      business_id: event.business_id,
      run_status: "running",
      started_at: new Date().toISOString(),
      audit_metadata: { is_test_data: event.is_test_data, event_type: event.event_type },
    })
    .select()
    .single();
  if (runErr || !runRow) return null;
  const run = runRow as WorkflowRun;

  let sawExternal = false;
  let sawFailure = false;
  const steps: WorkflowStep[] = Array.isArray(def.steps) ? def.steps : [];

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const isExternal = !!s.external;
    const status: StepStatus = isExternal ? "waiting_approval" : "completed";
    const output = isExternal
      ? `External action parked — founder approval required before any send/publish/charge to ${s.target_module ?? "external"}.`
      : `Internal step recorded for ${s.target_module ?? def.workflow_category}. No external side effect.`;
    const { error: stepErr } = await (supabase as any).from("workflow_step_runs").insert({
      workflow_run_id: run.id,
      step_name: s.name,
      step_order: i,
      step_status: status,
      source_module: s.source_module ?? "event_bus",
      target_module: s.target_module ?? null,
      output_summary: output,
      audit_metadata: { external: isExternal, is_test_data: event.is_test_data },
    });
    if (stepErr) {
      sawFailure = true;
      await logFailure({
        run_id: run.id,
        failure_type: "schema",
        failure_summary: `Step "${s.name}" failed: ${stepErr.message}`,
        severity: "high",
        recommended_action: "Review workflow_step_runs schema and step definition.",
      });
      break;
    }
    if (isExternal) sawExternal = true;
  }

  const finalStatus: RunStatus = sawFailure ? "failed" : sawExternal ? "waiting_approval" : "completed";
  await (supabase as any)
    .from("workflow_runs")
    .update({
      run_status: finalStatus,
      completed_at: new Date().toISOString(),
      failure_reason: sawFailure ? "One or more steps failed; see workflow_failure_events." : null,
    })
    .eq("id", run.id);
  return { ...run, run_status: finalStatus };
}

/** Process an event: dispatch to all matching active workflows. */
export async function processEvent(event: LiftorEvent): Promise<WorkflowRun[]> {
  const defs = await workflowsForEvent(event.event_type);
  if (defs.length === 0) {
    await (supabase as any)
      .from("liftor_events")
      .update({ event_status: "ignored", processed_at: new Date().toISOString() })
      .eq("id", event.id);
    return [];
  }
  await (supabase as any)
    .from("liftor_events")
    .update({ event_status: "processing" })
    .eq("id", event.id);
  const runs: WorkflowRun[] = [];
  for (const def of defs) {
    const r = await runWorkflow(def, event);
    if (r) runs.push(r);
  }
  const anyFailed = runs.some((r) => r.run_status === "failed");
  await (supabase as any)
    .from("liftor_events")
    .update({
      event_status: anyFailed ? "failed" : "processed",
      processed_at: new Date().toISOString(),
    })
    .eq("id", event.id);
  return runs;
}

/** Emit + immediately process. Returns the event and the workflow runs spawned. */
export async function emitAndRun(input: Parameters<typeof emitLiftorEvent>[0]) {
  const emitted = await emitLiftorEvent(input);
  if (!emitted.event) return { event: null, runs: [] as WorkflowRun[], error: emitted.error };
  if (emitted.deduped) return { event: emitted.event, runs: [], deduped: true };
  const runs = await processEvent(emitted.event);
  return { event: emitted.event, runs };
}

export interface EventBusSummary {
  events_today: number;
  runs_today: number;
  failed_runs_open: number;
  waiting_approval: number;
  critical_failures: number;
  top_recommended_action: string;
}

export async function summarizeEventBus(): Promise<EventBusSummary> {
  const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
  const iso = startOfDay.toISOString();
  const [ev, runs, failed, waiting, crit, fail] = await Promise.all([
    (supabase as any).from("liftor_events").select("id", { count: "exact", head: true }).gte("created_at", iso),
    (supabase as any).from("workflow_runs").select("id", { count: "exact", head: true }).gte("created_at", iso),
    (supabase as any).from("workflow_runs").select("id", { count: "exact", head: true }).eq("run_status","failed"),
    (supabase as any).from("workflow_runs").select("id", { count: "exact", head: true }).eq("run_status","waiting_approval"),
    (supabase as any).from("workflow_failure_events").select("id", { count: "exact", head: true }).eq("severity","critical").eq("status","open"),
    (supabase as any).from("workflow_failure_events").select("recommended_action,severity").eq("status","open").order("created_at",{ ascending: false }).limit(1),
  ]);
  const recommended = (fail.data?.[0]?.recommended_action as string) || "All clear — no open workflow failures.";
  return {
    events_today: ev.count ?? 0,
    runs_today: runs.count ?? 0,
    failed_runs_open: failed.count ?? 0,
    waiting_approval: waiting.count ?? 0,
    critical_failures: crit.count ?? 0,
    top_recommended_action: recommended,
  };
}

export const STATUS_TONE: Record<string, string> = {
  new: "bg-muted text-muted-foreground border-border",
  processing: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  processed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  ignored: "bg-muted text-muted-foreground border-border",
  failed: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  waiting_approval: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  queued: "bg-muted text-muted-foreground border-border",
  running: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  skipped: "bg-muted text-muted-foreground border-border",
  open: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  acknowledged: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  resolved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};