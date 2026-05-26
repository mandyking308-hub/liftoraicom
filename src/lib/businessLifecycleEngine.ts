import { supabase } from "@/integrations/supabase/client";

export type StageCode =
  | "idea" | "research" | "build" | "internal_live" | "customer_live"
  | "revenue_live" | "scaling" | "stable" | "paused" | "parked"
  | "exit_ready" | "sold_closed";

export type AssignmentStatus = "current" | "recommended" | "pending_approval" | "archived";

export type LifecycleStage = {
  id: string;
  stage_code: StageCode;
  stage_name: string;
  description: string | null;
  allowed_modules: string[];
  required_modules: string[];
  allowed_external_actions: string[];
  required_checks: string[];
  approval_required_for_entry: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Assignment = {
  id: string;
  business_id: string;
  stage_id: string;
  stage_status: AssignmentStatus;
  reason: string | null;
  founder_approved_at: string | null;
  entered_at: string;
  created_at: string;
  updated_at: string;
};

export type TransitionEvent = {
  id: string;
  business_id: string;
  from_stage: string | null;
  to_stage: string;
  transition_reason: string | null;
  approval_required: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  audit_metadata: Record<string, unknown>;
};

const sb = () => supabase as any;

export async function fetchStages(): Promise<LifecycleStage[]> {
  const { data, error } = await sb().from("business_lifecycle_stages").select("*").order("sort_order");
  if (error) throw error; return data ?? [];
}
export async function fetchAssignments(): Promise<Assignment[]> {
  const { data, error } = await sb().from("business_lifecycle_assignments").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function fetchTransitions(): Promise<TransitionEvent[]> {
  const { data, error } = await sb().from("business_stage_transition_events").select("*").order("created_at", { ascending: false });
  if (error) throw error; return data ?? [];
}

/** Stages that always require founder confirmation when entered. */
export const FOUNDER_CONFIRM_STAGES: StageCode[] = [
  "customer_live", "revenue_live", "scaling", "exit_ready", "paused", "parked", "sold_closed",
];

export function isMeaningfulTransition(from: StageCode | null, to: StageCode): boolean {
  if (!from) return FOUNDER_CONFIRM_STAGES.includes(to);
  if (from === to) return false;
  return FOUNDER_CONFIRM_STAGES.includes(to);
}

export async function requestTransition(input: {
  business_id: string; from_stage: StageCode | null; to_stage: StageCode;
  transition_reason?: string;
}): Promise<TransitionEvent> {
  const approval_required = isMeaningfulTransition(input.from_stage, input.to_stage);
  const row = {
    business_id: input.business_id,
    from_stage: input.from_stage,
    to_stage: input.to_stage,
    transition_reason: input.transition_reason ?? null,
    approval_required,
    audit_metadata: { source: "lifecycle_ui" },
  };
  const { data, error } = await sb().from("business_stage_transition_events").insert(row).select().single();
  if (error) throw error; return data as TransitionEvent;
}

export async function approveTransition(id: string, approverUserId: string): Promise<TransitionEvent> {
  const { data, error } = await sb().from("business_stage_transition_events")
    .update({ approved_by: approverUserId, approved_at: new Date().toISOString() })
    .eq("id", id).select().single();
  if (error) throw error; return data as TransitionEvent;
}

/** Latest current assignment per business */
export function currentByBusiness(asgs: Assignment[]): Map<string, Assignment> {
  const map = new Map<string, Assignment>();
  for (const a of asgs) {
    if (a.stage_status !== "current") continue;
    const existing = map.get(a.business_id);
    if (!existing || new Date(a.entered_at) > new Date(existing.entered_at)) map.set(a.business_id, a);
  }
  return map;
}

export function summarize(stages: LifecycleStage[], asgs: Assignment[], trs: TransitionEvent[]) {
  const byId = new Map(stages.map(s => [s.id, s]));
  const current = currentByBusiness(asgs);
  const counts: Record<string, number> = {};
  for (const a of current.values()) {
    const stage = byId.get(a.stage_id);
    if (stage) counts[stage.stage_code] = (counts[stage.stage_code] ?? 0) + 1;
  }
  const pending = trs.filter(t => t.approval_required && !t.approved_at).length;
  return {
    businesses_assigned: current.size,
    pending_transitions: pending,
    counts,
    stages_total: stages.length,
    stages_active: stages.filter(s => s.active).length,
  };
}

export function diagnose(stages: LifecycleStage[], asgs: Assignment[], trs: TransitionEvent[]) {
  const out: Array<{ business_id: string; severity: "info" | "warn" | "block"; message: string }> = [];
  const byId = new Map(stages.map(s => [s.id, s]));
  const current = currentByBusiness(asgs);
  for (const a of current.values()) {
    const stage = byId.get(a.stage_id);
    if (!stage) continue;
    if (stage.required_checks?.length && !a.founder_approved_at && stage.approval_required_for_entry) {
      out.push({ business_id: a.business_id, severity: "warn", message: `Stage "${stage.stage_name}" requires founder approval — not yet confirmed.` });
    }
    if (stage.stage_code === "idea" || stage.stage_code === "research") {
      out.push({ business_id: a.business_id, severity: "info", message: `Stage "${stage.stage_name}": external selling not permitted.` });
    }
  }
  for (const t of trs.filter(t => t.approval_required && !t.approved_at).slice(0, 50)) {
    out.push({ business_id: t.business_id, severity: "block", message: `Transition ${t.from_stage ?? "(new)"} → ${t.to_stage} awaiting founder approval.` });
  }
  return out;
}

export const STAGE_META: Record<StageCode, { label: string; cls: string }> = {
  idea:          { label: "Idea",          cls: "bg-muted text-muted-foreground border-border/50" },
  research:      { label: "Research",      cls: "bg-muted text-muted-foreground border-border/50" },
  build:         { label: "Build",         cls: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  internal_live: { label: "Internal live", cls: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  customer_live: { label: "Customer live", cls: "bg-primary/15 text-primary border-primary/30" },
  revenue_live:  { label: "Revenue live",  cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  scaling:       { label: "Scaling",       cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  stable:        { label: "Stable",        cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  paused:        { label: "Paused",        cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  parked:        { label: "Parked",        cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  exit_ready:    { label: "Exit ready",    cls: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  sold_closed:   { label: "Sold / closed", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};