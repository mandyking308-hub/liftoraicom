/**
 * Daily Driver Polish Pass 2 — Manual Handoff Connectors
 *
 * Founder/admin-only helpers that create *internal* records, links, drafts
 * or attention items between modules. They never send email, publish,
 * activate providers, or perform external actions. Every successful call
 * writes a low-sensitivity entry into `global_audit_events` so the handoff
 * is traceable from the Command Centre.
 *
 * Each helper is intentionally small and tolerant of optional columns —
 * the underlying tables are large and we only set the fields we are sure
 * exist in the current schema (verified before writing this module).
 */

import { supabase } from "@/integrations/supabase/client";

type Json = Record<string, unknown>;

/** Best-effort audit write — never throws, never blocks the caller. */
export async function logHandoffAudit(opts: {
  event_type: string;
  source_module: string;
  source_table?: string | null;
  source_record_id?: string | null;
  action_summary: string;
  business_id?: string | null;
  before?: Json;
  after?: Json;
  audit_metadata?: Json;
}): Promise<void> {
  try {
    const sb = supabase as any;
    await sb.from("global_audit_events").insert({
      event_type: opts.event_type,
      event_category: "handoff",
      source_module: opts.source_module,
      source_table: opts.source_table ?? null,
      source_record_id: opts.source_record_id ?? null,
      action_summary: opts.action_summary,
      business_id: opts.business_id ?? null,
      before_summary: opts.before ?? {},
      after_summary: opts.after ?? {},
      sensitivity_level: "low",
      external_side_effect: false,
      audit_metadata: {
        pack: "daily-driver-polish-pass-2",
        ...(opts.audit_metadata ?? {}),
      },
    });
  } catch {
    // Audit best-effort — UI flow must continue even if the insert fails.
  }
}

/* -------------------------------------------------------------------- */
/* Handoff: Quarterly Production Machine → Business Onboarding Factory  */
/* -------------------------------------------------------------------- */

export type DraftBusinessShellInput = {
  candidate_name: string;
  production_pack_ref?: string | null;
};

/**
 * Creates a *draft* business shell from a production pack. The new row in
 * `businesses` is name-stamped `[Draft] <candidate>` so it can never be
 * confused with a live business; activation still requires founder review
 * via the existing Business Internal Activation flow.
 */
export async function createDraftBusinessShellFromPack(
  input: DraftBusinessShellInput,
): Promise<{ id: string; name: string }> {
  const sb = supabase as any;
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const draftName = `[Draft] ${input.candidate_name} · ${stamp}`;
  const { data, error } = await sb
    .from("businesses")
    .insert({ name: draftName })
    .select("id,name")
    .single();
  if (error) throw new Error(error.message);
  await logHandoffAudit({
    event_type: "business_shell_drafted",
    source_module: "quarterly_production_machine",
    source_table: "businesses",
    source_record_id: data.id,
    action_summary: `Draft business shell created from production pack for "${input.candidate_name}".`,
    business_id: data.id,
    after: { production_pack_ref: input.production_pack_ref ?? null, status: "draft" },
  });
  return { id: data.id, name: data.name };
}

/* -------------------------------------------------------------------- */
/* Handoff: Release Workflow → Marketing / Support (internal review)    */
/* -------------------------------------------------------------------- */

/**
 * Marks a release item as "founder_review" so its customer comms draft is
 * picked up by the Marketing Hub awaiting-review panel. Internal status
 * change only — no email, no publishing.
 */
export async function markReleaseCommsReadyForReview(itemId: string): Promise<void> {
  const sb = supabase as any;
  const { error } = await sb
    .from("release_workflow_items")
    .update({ release_status: "founder_review" })
    .eq("id", itemId);
  if (error) throw new Error(error.message);
  await logHandoffAudit({
    event_type: "release_comms_ready_for_review",
    source_module: "release_workflow",
    source_table: "release_workflow_items",
    source_record_id: itemId,
    action_summary: "Release customer-comms draft flagged for founder review (internal only).",
    after: { release_status: "founder_review" },
  });
}

export type AwaitingCommsReview = {
  id: string;
  release_title: string;
  release_type: string;
  customer_comms_draft: string | null;
  updated_at: string;
};

/** Fetches releases currently awaiting founder review with a non-empty
 *  customer comms draft — used by the Marketing Hub panel. Read-only. */
export async function fetchReleasesAwaitingCommsReview(): Promise<AwaitingCommsReview[]> {
  const sb = supabase as any;
  const { data, error } = await sb
    .from("release_workflow_items")
    .select("id,release_title,release_type,customer_comms_draft,updated_at")
    .eq("release_status", "founder_review")
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return ((data ?? []) as AwaitingCommsReview[]).filter(
    (r) => (r.customer_comms_draft ?? "").trim().length > 0,
  );
}

/* -------------------------------------------------------------------- */
/* Handoff: CRM Interaction → Founder Decisions                         */
/* -------------------------------------------------------------------- */

/**
 * Creates a founder decision item rooted in a CRM contact. Always pending
 * and founder-click only — never auto-created.
 */
export async function createDecisionFromCrmContact(opts: {
  contact_id: string;
  contact_label: string;
  decision_title: string;
  decision_summary?: string;
}): Promise<{ id: string }> {
  const sb = supabase as any;
  const payload: Json = {
    decision_type: "crm_relationship",
    title: opts.decision_title,
    finding: opts.decision_summary ?? null,
    status: "pending",
    decision_status: "needed",
    source_module: "crm",
    source_table: "contacts",
    source_record_id: opts.contact_id,
    decision_title: opts.decision_title,
    decision_summary: opts.decision_summary ?? null,
    related_ids: { contact_id: opts.contact_id, contact_label: opts.contact_label },
  };
  const { data, error } = await sb
    .from("founder_decisions")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await logHandoffAudit({
    event_type: "founder_decision_drafted_from_crm",
    source_module: "crm",
    source_table: "founder_decisions",
    source_record_id: data.id,
    action_summary: `Founder decision drafted from CRM contact "${opts.contact_label}".`,
    after: { decision_title: opts.decision_title },
  });
  return { id: data.id };
}

/* -------------------------------------------------------------------- */
/* Handoff: Wind-down → Data Room exclusion warning                     */
/* -------------------------------------------------------------------- */

export type WindDownSummary = {
  total: number;
  active: number;
  business_names: string[];
};

/** Read-only summary used to render a warning banner on the Data Room. */
export async function fetchWindDownSummary(): Promise<WindDownSummary> {
  const sb = supabase as any;
  const { data } = await sb
    .from("winddown_plans")
    .select("business_name,status")
    .neq("status", "cancelled")
    .limit(50);
  const rows = (data ?? []) as Array<{ business_name: string; status: string }>;
  const active = rows.filter((r) => r.status !== "complete" && r.status !== "draft").length;
  const business_names = Array.from(new Set(rows.map((r) => r.business_name))).slice(0, 8);
  return { total: rows.length, active, business_names };
}

/* -------------------------------------------------------------------- */
/* Handoff: Video Library training → People oversight (read-only)       */
/* -------------------------------------------------------------------- */

export type TrainingAssignmentSummary = {
  id: string;
  status: string;
  due_at: string | null;
  completed_at: string | null;
  assigned_to_role: string | null;
  video_title: string | null;
};

/** Read-only feed of training assignments for the People / Human Workforce
 *  oversight tab. Surfaces evidence; no actions, no completion writes. */
export async function fetchTrainingAssignmentsForPeople(limit = 25): Promise<TrainingAssignmentSummary[]> {
  const sb = supabase as any;
  const { data, error } = await sb
    .from("video_library_training_assignments")
    .select("id,status,due_at,completed_at,assigned_to_role,video_id, video_library_items(title)")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((r: any) => ({
    id: r.id,
    status: r.status,
    due_at: r.due_at,
    completed_at: r.completed_at,
    assigned_to_role: r.assigned_to_role,
    video_title: r.video_library_items?.title ?? null,
  }));
}