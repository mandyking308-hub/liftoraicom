import { supabase } from "@/integrations/supabase/client";

export type AuditActorType = "founder" | "user" | "ai_agent" | "system" | "provider" | "webhook" | "human_operator" | "unknown";
export type AuditEventCategory = "ai" | "approval" | "external_action" | "data_change" | "access" | "finance" | "privacy" | "security" | "configuration" | "workflow" | "provider" | "document" | "decision" | "other";
export type AuditSensitivity = "low" | "medium" | "high" | "critical";

export interface LogGlobalAuditEventInput {
  business_id?: string | null;
  actor_type: AuditActorType;
  actor_id?: string | null;
  actor_label?: string | null;
  event_type: string;
  event_category: AuditEventCategory;
  source_module: string;
  source_table?: string | null;
  source_record_id?: string | null;
  action_summary: string;
  before_summary?: Record<string, any>;
  after_summary?: Record<string, any>;
  sensitivity_level?: AuditSensitivity;
  external_side_effect?: boolean;
  approval_item_id?: string | null;
  trace_id?: string | null;
  is_test_data?: boolean;
  audit_metadata?: Record<string, any>;
}

export interface GlobalAuditEvent extends LogGlobalAuditEventInput {
  id: string;
  created_at: string;
}

const SECRET_PATTERN = /(secret|token|key|password|passwd|api_key|apikey|authorization|bearer|cvv|card|ssn|sin|iban|account_number|routing)/i;

/** Redact obvious secret-bearing fields from a payload before it ever reaches the ledger. */
export function redactForAudit(value: any, depth = 0): any {
  if (value == null || depth > 6) return value;
  if (Array.isArray(value)) return value.slice(0, 100).map(v => redactForAudit(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_PATTERN.test(k)) { out[k] = "[REDACTED]"; continue; }
      if (typeof v === "string" && v.length > 1024) { out[k] = v.slice(0, 1024) + "…[truncated]"; continue; }
      out[k] = redactForAudit(v, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" && value.length > 2048) return value.slice(0, 2048) + "…[truncated]";
  return value;
}

/** Append-only writer. Never throws; audit must never break the calling flow. */
export async function logGlobalAuditEvent(input: LogGlobalAuditEventInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const row = {
      business_id: input.business_id ?? null,
      actor_type: input.actor_type,
      actor_id: input.actor_id ?? null,
      actor_label: input.actor_label ?? null,
      event_type: String(input.event_type).slice(0, 200),
      event_category: input.event_category,
      source_module: String(input.source_module).slice(0, 200),
      source_table: input.source_table ?? null,
      source_record_id: input.source_record_id ?? null,
      action_summary: String(input.action_summary).slice(0, 1000),
      before_summary: redactForAudit(input.before_summary ?? {}),
      after_summary: redactForAudit(input.after_summary ?? {}),
      sensitivity_level: input.sensitivity_level ?? "low",
      external_side_effect: !!input.external_side_effect,
      approval_item_id: input.approval_item_id ?? null,
      trace_id: input.trace_id ?? null,
      is_test_data: !!input.is_test_data,
      audit_metadata: redactForAudit(input.audit_metadata ?? {}),
    };
    const { data, error } = await (supabase as any)
      .from("global_audit_events")
      .insert(row)
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

export interface FetchAuditFilters {
  limit?: number;
  business_id?: string | null;
  actor_id?: string | null;
  source_module?: string | null;
  event_category?: AuditEventCategory | null;
  sensitivity_level?: AuditSensitivity | null;
  external_only?: boolean;
  trace_id?: string | null;
  include_test?: boolean;
  since?: string | null;
}

export async function fetchAuditEvents(f: FetchAuditFilters = {}): Promise<GlobalAuditEvent[]> {
  let q: any = (supabase as any).from("global_audit_events").select("*").order("created_at", { ascending: false }).limit(f.limit ?? 200);
  if (f.business_id) q = q.eq("business_id", f.business_id);
  if (f.actor_id) q = q.eq("actor_id", f.actor_id);
  if (f.source_module) q = q.eq("source_module", f.source_module);
  if (f.event_category) q = q.eq("event_category", f.event_category);
  if (f.sensitivity_level) q = q.eq("sensitivity_level", f.sensitivity_level);
  if (f.external_only) q = q.eq("external_side_effect", true);
  if (f.trace_id) q = q.eq("trace_id", f.trace_id);
  if (!f.include_test) q = q.eq("is_test_data", false);
  if (f.since) q = q.gte("created_at", f.since);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as GlobalAuditEvent[];
}

export interface AuditSummary {
  events_today: number;
  high_sensitivity_today: number;
  external_side_effect_today: number;
  blocked_external_today: number;
  access_changes_today: number;
  configuration_changes_today: number;
  privacy_events_today: number;
  ai_events_today: number;
  approval_events_today: number;
  test_events_today: number;
  recommended_review: string;
  top_modules: Array<{ source_module: string; count: number }>;
}

export function summarizeAudit(events: GlobalAuditEvent[]): AuditSummary {
  const dayAgo = Date.now() - 24 * 3600 * 1000;
  const today = events.filter(e => new Date(e.created_at).getTime() >= dayAgo);
  const high = today.filter(e => e.sensitivity_level === "high" || e.sensitivity_level === "critical").length;
  const external = today.filter(e => e.external_side_effect).length;
  const blocked = today.filter(e => (e.audit_metadata as any)?.blocked === true && (e.event_category === "external_action" || e.event_type.includes("external"))).length;
  const access = today.filter(e => e.event_category === "access").length;
  const config = today.filter(e => e.event_category === "configuration").length;
  const privacy = today.filter(e => e.event_category === "privacy").length;
  const ai = today.filter(e => e.event_category === "ai").length;
  const approval = today.filter(e => e.event_category === "approval").length;
  const tests = today.filter(e => e.is_test_data).length;
  const moduleCounts = new Map<string, number>();
  for (const e of today) moduleCounts.set(e.source_module, (moduleCounts.get(e.source_module) ?? 0) + 1);
  const top_modules = [...moduleCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([source_module, count]) => ({ source_module, count }));
  const reasons: string[] = [];
  if (high > 0) reasons.push(`${high} high-sensitivity event${high === 1 ? "" : "s"}`);
  if (blocked > 0) reasons.push(`${blocked} blocked external action${blocked === 1 ? "" : "s"}`);
  if (config > 0) reasons.push(`${config} configuration change${config === 1 ? "" : "s"}`);
  if (access > 0) reasons.push(`${access} access change${access === 1 ? "" : "s"}`);
  const recommended_review = reasons.length ? `Review: ${reasons.join(", ")}.` : "All clear — no high-risk audit signals in the last 24h.";
  return {
    events_today: today.length,
    high_sensitivity_today: high,
    external_side_effect_today: external,
    blocked_external_today: blocked,
    access_changes_today: access,
    configuration_changes_today: config,
    privacy_events_today: privacy,
    ai_events_today: ai,
    approval_events_today: approval,
    test_events_today: tests,
    recommended_review,
    top_modules,
  };
}

/** Test-only seeder used by the LIVE_INTERNAL_TEST evidence run. Marks rows is_test_data=true. */
export async function seedAuditTestEvents(): Promise<{ ok: boolean; ids: string[]; errors: string[] }> {
  const traceId = `LIVE_INTERNAL_TEST-${Date.now()}`;
  const samples: LogGlobalAuditEventInput[] = [
    {
      actor_type: "ai_agent", actor_label: "Liftor Brain", event_type: "ai_action_executed",
      event_category: "ai", source_module: "ai_gateway", action_summary: "LIVE_INTERNAL_TEST — AI summarisation run",
      sensitivity_level: "low", trace_id: traceId, is_test_data: true,
      audit_metadata: { model: "google/gemini-2.5-flash", tokens: 1280 },
    },
    {
      actor_type: "founder", actor_label: "Founder", event_type: "approval_decision_recorded",
      event_category: "approval", source_module: "approval_queue", action_summary: "LIVE_INTERNAL_TEST — Approved outbound proposal draft",
      sensitivity_level: "medium", approval_item_id: null, trace_id: traceId, is_test_data: true,
      audit_metadata: { decision: "approved" },
    },
    {
      actor_type: "system", actor_label: "External action gate", event_type: "external_send_blocked",
      event_category: "external_action", source_module: "external_action_gate", action_summary: "LIVE_INTERNAL_TEST — Outbound email blocked (flag disabled)",
      sensitivity_level: "high", external_side_effect: false, trace_id: traceId, is_test_data: true,
      audit_metadata: { blocked: true, reason: "feature_flag_disabled", flag_key: "external_email_send_enabled" },
    },
    {
      actor_type: "founder", actor_label: "Founder", event_type: "feature_flag_changed",
      event_category: "configuration", source_module: "system_config", source_table: "feature_flags",
      action_summary: "LIVE_INTERNAL_TEST — Toggled internal module flag",
      before_summary: { enabled: false }, after_summary: { enabled: true },
      sensitivity_level: "medium", trace_id: traceId, is_test_data: true,
    },
    {
      actor_type: "user", actor_label: "Operator", event_type: "access_request_submitted",
      event_category: "access", source_module: "access_governance", action_summary: "LIVE_INTERNAL_TEST — Access elevation requested",
      sensitivity_level: "high", trace_id: traceId, is_test_data: true,
      audit_metadata: { requested_role: "operator_finance" },
    },
    {
      actor_type: "webhook", actor_label: "Stripe (test)", event_type: "provider_event_received",
      event_category: "provider", source_module: "webhook_inbox", source_table: "webhook_inbox_events",
      action_summary: "LIVE_INTERNAL_TEST — Simulated payment_intent.succeeded normalised",
      sensitivity_level: "medium", trace_id: traceId, is_test_data: true,
      audit_metadata: { provider: "stripe", normalized_type: "payment.succeeded" },
    },
    {
      actor_type: "system", actor_label: "Document vault", event_type: "external_document_share_blocked",
      event_category: "document", source_module: "document_vault", action_summary: "LIVE_INTERNAL_TEST — External document share blocked pending approval",
      sensitivity_level: "high", external_side_effect: false, trace_id: traceId, is_test_data: true,
      audit_metadata: { blocked: true, reason: "approval_required" },
    },
  ];
  const ids: string[] = []; const errors: string[] = [];
  for (const s of samples) {
    const r = await logGlobalAuditEvent(s);
    if (r.ok && r.id) ids.push(r.id); else if (r.error) errors.push(r.error);
  }
  return { ok: errors.length === 0, ids, errors };
}