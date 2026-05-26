import { supabase } from "@/integrations/supabase/client";
import { emitLiftorEvent } from "./eventBusEngine";

export type VerificationStatus = "not_required"|"verified"|"failed"|"missing"|"unknown";
export type ProcessingStatus = "received"|"normalised"|"duplicate"|"failed"|"ignored"|"parked";
export type EventCategory = "payment"|"call"|"email_reply"|"signature"|"booking"|"seller"|"support"|"form"|"social"|"other";

export interface InboxEvent {
  id: string; connector_id: string | null; business_id: string | null;
  provider_name: string; webhook_event_type: string; provider_event_id: string | null;
  raw_payload_summary: any; payload_hash: string | null;
  signature_verified: boolean; verification_status: VerificationStatus;
  processing_status: ProcessingStatus;
  received_at: string; processed_at: string | null; error_message: string | null;
  audit_metadata: any;
}
export interface NormalisedEvent {
  id: string; webhook_inbox_event_id: string | null; business_id: string | null;
  event_type: string; event_category: EventCategory;
  related_contact_id: string | null; related_customer_id: string | null; related_seller_id: string | null;
  related_record_table: string | null; related_record_id: string | null;
  confidence_score: number | null; normalised_payload: any;
  liftor_event_id: string | null; created_at: string; audit_metadata: any;
}
export interface ProcessingRule {
  id: string; provider_name: string; webhook_event_type: string;
  normalised_event_type: string; event_category: EventCategory;
  required_signature: boolean; idempotency_field: string | null;
  business_mapping_strategy: string | null; active: boolean;
  created_at: string; updated_at: string;
}

export async function fetchInbox(limit = 200): Promise<InboxEvent[]> {
  const { data } = await (supabase as any).from("webhook_inbox_events").select("*")
    .order("received_at", { ascending: false }).limit(limit);
  return (data ?? []) as InboxEvent[];
}
export async function fetchNormalised(limit = 200): Promise<NormalisedEvent[]> {
  const { data } = await (supabase as any).from("normalised_external_events").select("*")
    .order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as NormalisedEvent[];
}
export async function fetchRules(): Promise<ProcessingRule[]> {
  const { data } = await (supabase as any).from("webhook_processing_rules").select("*")
    .order("provider_name").order("webhook_event_type");
  return (data ?? []) as ProcessingRule[];
}

/** Simple browser-safe hex SHA-256. */
async function sha256Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Generate a safe summary: top-level scalar fields only, mask anything that looks secret. */
export function safeSummary(payload: any): any {
  if (!payload || typeof payload !== "object") return { _value: String(payload).slice(0, 80) };
  const out: Record<string, any> = {};
  const RISK = /(secret|token|key|password|signature|authorization|cvv|card|account_number|iban|ssn)/i;
  for (const [k, v] of Object.entries(payload)) {
    if (RISK.test(k)) { out[k] = "[REDACTED]"; continue; }
    if (v === null || typeof v === "number" || typeof v === "boolean") out[k] = v;
    else if (typeof v === "string") out[k] = v.length > 200 ? v.slice(0, 200) + "…" : v;
    else out[k] = `[${Array.isArray(v) ? "array" : "object"}]`;
  }
  return out;
}

/**
 * Internal simulated ingestion. No external action, no provider mutation.
 * Use for LIVE_INTERNAL_TEST and any internally-emitted webhook-shaped event.
 */
export async function ingestWebhookInternal(input: {
  provider_name: string;
  webhook_event_type: string;
  provider_event_id?: string;
  payload: any;
  business_id?: string | null;
  signature_present?: boolean;
  signature_valid?: boolean;
  test?: boolean;
}): Promise<{ inbox: InboxEvent | null; normalised: NormalisedEvent | null; status: ProcessingStatus; reason?: string }> {
  // Find rule
  const { data: ruleRow } = await (supabase as any).from("webhook_processing_rules")
    .select("*").eq("provider_name", input.provider_name).eq("webhook_event_type", input.webhook_event_type)
    .eq("active", true).maybeSingle();
  const rule = ruleRow as ProcessingRule | null;

  // Verification
  let verification_status: VerificationStatus = "unknown";
  let signature_verified = false;
  if (!rule || !rule.required_signature) {
    verification_status = "not_required"; signature_verified = false;
  } else if (input.signature_present === false) {
    verification_status = "missing";
  } else if (input.signature_valid === false) {
    verification_status = "failed";
  } else if (input.signature_valid === true) {
    verification_status = "verified"; signature_verified = true;
  } else {
    verification_status = "missing";
  }

  // Hash for dedupe — include provider + provider_event_id or canonical payload
  const dedupeBase = JSON.stringify({
    p: input.provider_name, t: input.webhook_event_type,
    id: input.provider_event_id ?? input.payload?.[rule?.idempotency_field ?? "id"] ?? null,
    body: input.payload,
  });
  const payload_hash = await sha256Hex(dedupeBase);

  const tag = input.test ? { live_internal_test: true, tag: "LIVE_INTERNAL_TEST" } : {};
  const safe_summary = safeSummary(input.payload);

  // Try insert; rely on UNIQUE(payload_hash) for dedupe
  const insertRow = {
    provider_name: input.provider_name,
    webhook_event_type: input.webhook_event_type,
    provider_event_id: input.provider_event_id ?? null,
    raw_payload_summary: safe_summary,
    payload_hash,
    signature_verified,
    verification_status,
    processing_status: "received" as ProcessingStatus,
    business_id: input.business_id ?? null,
    audit_metadata: { read_only: true, ingest_path: "internal", ...tag },
  };
  let { data: inboxRow, error } = await (supabase as any).from("webhook_inbox_events").insert(insertRow).select().single();

  if (error) {
    if (String((error as any).code) === "23505") {
      // duplicate — fetch existing and mark a fresh row as duplicate (without payload_hash collision)
      const { data: prior } = await (supabase as any).from("webhook_inbox_events")
        .select("*").eq("payload_hash", payload_hash).maybeSingle();
      const { data: dup } = await (supabase as any).from("webhook_inbox_events").insert({
        ...insertRow, payload_hash: null, processing_status: "duplicate",
        error_message: `Duplicate of ${prior?.id}`,
        audit_metadata: { ...insertRow.audit_metadata, duplicate_of: prior?.id },
        processed_at: new Date().toISOString(),
      }).select().single();
      return { inbox: dup as InboxEvent, normalised: null, status: "duplicate", reason: "Duplicate payload hash" };
    }
    return { inbox: null, normalised: null, status: "failed", reason: error.message };
  }
  const inbox = inboxRow as InboxEvent;

  // Verification failure → mark failed and stop
  if (verification_status === "failed" || verification_status === "missing") {
    await (supabase as any).from("webhook_inbox_events").update({
      processing_status: "failed",
      processed_at: new Date().toISOString(),
      error_message: `Signature ${verification_status}`,
    }).eq("id", inbox.id);
    return { inbox, normalised: null, status: "failed", reason: `Signature ${verification_status}` };
  }

  // No rule → park
  if (!rule) {
    await (supabase as any).from("webhook_inbox_events").update({
      processing_status: "parked",
      processed_at: new Date().toISOString(),
      error_message: "No mapping rule",
    }).eq("id", inbox.id);
    return { inbox, normalised: null, status: "parked", reason: "No mapping rule" };
  }

  // Normalise
  const { data: normRow } = await (supabase as any).from("normalised_external_events").insert({
    webhook_inbox_event_id: inbox.id,
    business_id: input.business_id ?? null,
    event_type: rule.normalised_event_type,
    event_category: rule.event_category,
    confidence_score: 0.9,
    normalised_payload: safe_summary,
    audit_metadata: { source: "webhook_inbox", ...tag },
  }).select().single();
  const normalised = normRow as NormalisedEvent;

  // Emit to Event Bus (internal only — workflow engine remains gated for external steps)
  const emit = await emitLiftorEvent({
    business_id: input.business_id ?? null,
    event_type: rule.normalised_event_type,
    event_category: rule.event_category as any,
    source_module: "webhook_inbox",
    source_table: "normalised_external_events",
    source_record_id: normalised?.id ?? null,
    event_payload: safe_summary,
    idempotency_key: `webhook:${payload_hash}`,
    is_test_data: !!input.test,
    audit_metadata: { read_only: true, ...tag },
  });

  if (normalised && emit.event) {
    await (supabase as any).from("normalised_external_events").update({ liftor_event_id: emit.event.id }).eq("id", normalised.id);
  }

  await (supabase as any).from("webhook_inbox_events").update({
    processing_status: "normalised",
    processed_at: new Date().toISOString(),
  }).eq("id", inbox.id);

  return { inbox: { ...inbox, processing_status: "normalised" }, normalised, status: "normalised" };
}

export interface InboxSummary {
  received_today: number;
  failed_today: number;
  unverified_today: number;
  duplicates_today: number;
  normalised_today: number;
  parked_total: number;
  top_provider_failing: { provider: string; count: number } | null;
  top_alert: { kind: string; summary: string; severity: "low"|"medium"|"high"|"critical" } | null;
}
export function summarize(events: InboxEvent[]): InboxSummary {
  const dayAgo = Date.now() - 86_400_000;
  const todays = events.filter(e => new Date(e.received_at).getTime() > dayAgo);
  const failed = todays.filter(e => e.processing_status === "failed");
  const unverified = todays.filter(e => e.verification_status === "failed" || e.verification_status === "missing");
  const duplicates = todays.filter(e => e.processing_status === "duplicate");
  const normalised = todays.filter(e => e.processing_status === "normalised");
  const parked = events.filter(e => e.processing_status === "parked");

  const byProvider = new Map<string, number>();
  failed.forEach(e => byProvider.set(e.provider_name, (byProvider.get(e.provider_name) ?? 0) + 1));
  const top = [...byProvider.entries()].sort((a,b) => b[1]-a[1])[0];

  let alert: InboxSummary["top_alert"] = null;
  if (unverified.length > 0) alert = { kind: "unverified", summary: `${unverified.length} unverified webhook attempt(s) today.`, severity: "high" };
  else if (failed.length > 0) alert = { kind: "failed", summary: `${failed.length} failed webhook(s) today.`, severity: "high" };
  else if (parked.length > 0) alert = { kind: "parked", summary: `${parked.length} webhook(s) parked — no mapping rule.`, severity: "medium" };

  return {
    received_today: todays.length,
    failed_today: failed.length,
    unverified_today: unverified.length,
    duplicates_today: duplicates.length,
    normalised_today: normalised.length,
    parked_total: parked.length,
    top_provider_failing: top ? { provider: top[0], count: top[1] } : null,
    top_alert: alert,
  };
}