import { supabase } from "@/integrations/supabase/client";

export type Severity = "low" | "medium" | "high" | "critical";
export type ActionTaken = "allowed" | "warned" | "blocked" | "approval_required";
export type EventType =
  | "missing_business_id" | "conflicting_business_context" | "wrong_brand_voice"
  | "wrong_legal_entity" | "wrong_product" | "wrong_customer" | "wrong_policy"
  | "cross_contamination_prevented" | "warning";

export type ContextEvent = {
  id: string;
  business_id: string | null;
  source_module: string;
  source_record_id: string | null;
  event_type: EventType;
  severity: Severity;
  event_summary: string;
  action_taken: ActionTaken;
  audit_metadata: Record<string, any>;
  created_at: string;
};

export type ContextProfile = {
  id: string;
  business_id: string;
  brand_voice_summary: string | null;
  legal_entity_id: string | null;
  primary_domain: string | null;
  support_email: string | null;
  sales_email: string | null;
  default_currency: string | null;
  default_market: string | null;
  compliance_profile_id: string | null;
  approved_context_source_id: string | null;
};

const sb = () => supabase as any;

export async function fetchEvents(limit = 200): Promise<ContextEvent[]> {
  const { data, error } = await sb().from("context_guard_events")
    .select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error; return data ?? [];
}

export async function fetchProfiles(): Promise<ContextProfile[]> {
  const { data, error } = await sb().from("business_context_profiles")
    .select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}

export async function recordEvent(e: Omit<ContextEvent, "id" | "created_at">): Promise<ContextEvent> {
  const { data, error } = await sb().from("context_guard_events").insert(e).select().single();
  if (error) throw error; return data as ContextEvent;
}

export async function upsertProfile(p: Omit<ContextProfile, "id">): Promise<ContextProfile> {
  const { data, error } = await sb().from("business_context_profiles")
    .upsert(p, { onConflict: "business_id" }).select().single();
  if (error) throw error; return data as ContextProfile;
}

/* ---------- Context-Guard core logic ---------- */

export type GuardInput = {
  source_module: string;
  source_record_id?: string | null;
  business_id?: string | null;
  /** any extra business_ids referenced by the action (customer, product, entity, etc.) */
  referenced_business_ids?: Array<string | null | undefined>;
  /** explicit references for diagnostic detail */
  references?: {
    customer_business_id?: string | null;
    product_business_id?: string | null;
    legal_entity_id?: string | null;
    policy_business_id?: string | null;
    brand_voice_business_id?: string | null;
  };
  /** if the action would reach a customer/external surface */
  external_action?: boolean;
};

export type GuardDecision = {
  decision: ActionTaken;
  events: Array<Omit<ContextEvent, "id" | "created_at">>;
  reason: string;
  context?: ContextProfile;
};

/**
 * Run a guard check. Live-first: returns "allowed" when nothing is wrong.
 * Generates one or more events that should be persisted via recordEvent().
 */
export function evaluateGuard(input: GuardInput, profile: ContextProfile | null): GuardDecision {
  const events: GuardDecision["events"] = [];

  if (!input.business_id) {
    events.push({
      business_id: null, source_module: input.source_module,
      source_record_id: input.source_record_id ?? null,
      event_type: "missing_business_id",
      severity: input.external_action ? "high" : "medium",
      event_summary: input.external_action
        ? "Missing business_id on external action — blocked. Generic internal advice only."
        : "Missing business_id — only safe internal generic advice allowed.",
      action_taken: input.external_action ? "blocked" : "warned",
      audit_metadata: { input },
    });
    return {
      decision: input.external_action ? "blocked" : "warned",
      events,
      reason: "missing_business_id",
    };
  }

  // Detect conflicting referenced business_ids
  const refs = (input.referenced_business_ids ?? []).filter((x): x is string => !!x);
  const conflicting = refs.filter(b => b !== input.business_id);
  if (conflicting.length > 0) {
    events.push({
      business_id: input.business_id,
      source_module: input.source_module,
      source_record_id: input.source_record_id ?? null,
      event_type: "cross_contamination_prevented",
      severity: input.external_action ? "critical" : "high",
      event_summary: `Action mixes context across ${new Set([input.business_id, ...conflicting]).size} businesses.`,
      action_taken: input.external_action ? "blocked" : "approval_required",
      audit_metadata: { conflicting, input },
    });
    return {
      decision: input.external_action ? "blocked" : "approval_required",
      events,
      reason: "cross_business_context",
      context: profile ?? undefined,
    };
  }

  // Specific reference checks
  const r = input.references ?? {};
  function mismatch(field: string, refId?: string | null, eventType: EventType = "warning") {
    if (!refId || refId === input.business_id) return;
    events.push({
      business_id: input.business_id!, source_module: input.source_module,
      source_record_id: input.source_record_id ?? null,
      event_type: eventType, severity: "high",
      event_summary: `${field} (${refId.slice(0,8)}) does not match business (${input.business_id!.slice(0,8)}).`,
      action_taken: input.external_action ? "blocked" : "approval_required",
      audit_metadata: { field, refId, input },
    });
  }
  mismatch("customer", r.customer_business_id, "wrong_customer");
  mismatch("product", r.product_business_id, "wrong_product");
  mismatch("policy", r.policy_business_id, "wrong_policy");
  mismatch("brand voice", r.brand_voice_business_id, "wrong_brand_voice");
  if (profile && r.legal_entity_id && profile.legal_entity_id && r.legal_entity_id !== profile.legal_entity_id) {
    events.push({
      business_id: input.business_id!, source_module: input.source_module,
      source_record_id: input.source_record_id ?? null,
      event_type: "wrong_legal_entity", severity: "critical",
      event_summary: "Legal entity on action does not match business context profile.",
      action_taken: input.external_action ? "blocked" : "approval_required",
      audit_metadata: { provided: r.legal_entity_id, expected: profile.legal_entity_id, input },
    });
  }

  if (events.length > 0) {
    const decision: ActionTaken = input.external_action ? "blocked" : "approval_required";
    return { decision, events, reason: "context_mismatch", context: profile ?? undefined };
  }

  // All good — record a low-severity "allowed" event only for external actions (audit trail).
  if (input.external_action) {
    events.push({
      business_id: input.business_id!, source_module: input.source_module,
      source_record_id: input.source_record_id ?? null,
      event_type: "warning", severity: "low",
      event_summary: "Context check passed for external action.",
      action_taken: "allowed",
      audit_metadata: { input },
    });
  }
  return { decision: "allowed", events, reason: "ok", context: profile ?? undefined };
}

/** Convenience: evaluate + persist events. */
export async function runGuard(input: GuardInput): Promise<GuardDecision> {
  let profile: ContextProfile | null = null;
  if (input.business_id) {
    const { data } = await sb().from("business_context_profiles")
      .select("*").eq("business_id", input.business_id).maybeSingle();
    profile = (data ?? null) as ContextProfile | null;
  }
  const decision = evaluateGuard(input, profile);
  for (const ev of decision.events) {
    try { await recordEvent(ev); } catch { /* ignore log failure */ }
  }
  return decision;
}

export function summarize(events: ContextEvent[], profiles: ContextProfile[]) {
  const since = Date.now() - 24 * 3600 * 1000;
  const recent = events.filter(e => new Date(e.created_at).getTime() >= since);
  return {
    profiles: profiles.length,
    events_24h: recent.length,
    missing_24h: recent.filter(e => e.event_type === "missing_business_id").length,
    contamination_24h: recent.filter(e => e.event_type === "cross_contamination_prevented").length,
    blocked_24h: recent.filter(e => e.action_taken === "blocked").length,
    approvals_24h: recent.filter(e => e.action_taken === "approval_required").length,
  };
}