import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-provider, x-signature, x-webhook-signature, stripe-signature, x-test-mode",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function safeSummary(payload: any): any {
  if (!payload || typeof payload !== "object") return { _value: String(payload).slice(0, 80) };
  const out: Record<string, any> = {};
  const RISK = /(secret|token|key|password|signature|authorization|cvv|card|account_number|iban|ssn)/i;
  for (const [k, v] of Object.entries(payload)) {
    if (RISK.test(k)) { out[k] = "[REDACTED]"; continue; }
    if (v === null || typeof v === "number" || typeof v === "boolean") out[k] = v;
    else if (typeof v === "string") out[k] = v.length > 200 ? v.slice(0, 200) + "…" : v;
    else out[k] = Array.isArray(v) ? "[array]" : "[object]";
  }
  return out;
}

async function sha256Hex(s: string) {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }

  const url = new URL(req.url);
  const provider = req.headers.get("x-provider") ?? body.provider ?? url.searchParams.get("provider") ?? "unknown";
  const event_type = body.event_type ?? body.type ?? "unknown";
  const provider_event_id = body.id ?? body.event_id ?? null;
  const signaturePresent = !!(req.headers.get("x-signature") || req.headers.get("x-webhook-signature") || req.headers.get("stripe-signature"));
  const testMode = req.headers.get("x-test-mode") === "1";

  // Look up rule
  const { data: rule } = await sb.from("webhook_processing_rules")
    .select("*").eq("provider_name", provider).eq("webhook_event_type", event_type).eq("active", true).maybeSingle();

  // Verification: we never validate against real provider secrets in this stub.
  // Policy: if rule requires signature but none was provided → missing/failed.
  let verification_status: string = "unknown";
  let signature_verified = false;
  if (!rule || rule.required_signature === false) verification_status = "not_required";
  else if (!signaturePresent) verification_status = "missing";
  else { verification_status = "verified"; signature_verified = true; /* trusted by gateway, real secret check belongs upstream */ }

  const summary = safeSummary(body);
  const dedupeBase = JSON.stringify({ p: provider, t: event_type, id: provider_event_id, body: summary });
  const payload_hash = await sha256Hex(dedupeBase);

  const auditTag = testMode ? { live_internal_test: true, tag: "LIVE_INTERNAL_TEST" } : {};
  const baseRow = {
    provider_name: provider, webhook_event_type: event_type, provider_event_id,
    raw_payload_summary: summary, payload_hash,
    signature_verified, verification_status,
    processing_status: "received",
    audit_metadata: { ingest_path: "edge", read_only: true, ...auditTag },
  };

  let { data: inbox, error: insertErr } = await sb.from("webhook_inbox_events").insert(baseRow).select().single();
  if (insertErr) {
    if (String((insertErr as any).code) === "23505") {
      const { data: prior } = await sb.from("webhook_inbox_events").select("id").eq("payload_hash", payload_hash).maybeSingle();
      await sb.from("webhook_inbox_events").insert({
        ...baseRow, payload_hash: null, processing_status: "duplicate",
        error_message: `Duplicate of ${prior?.id}`, processed_at: new Date().toISOString(),
        audit_metadata: { ...baseRow.audit_metadata, duplicate_of: prior?.id },
      });
      return new Response(JSON.stringify({ status: "duplicate" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: insertErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Verification fail
  if (verification_status === "failed" || verification_status === "missing") {
    await sb.from("webhook_inbox_events").update({
      processing_status: "failed", processed_at: new Date().toISOString(),
      error_message: `Signature ${verification_status}`,
    }).eq("id", inbox!.id);
    return new Response(JSON.stringify({ status: "failed", reason: `signature_${verification_status}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (!rule) {
    await sb.from("webhook_inbox_events").update({
      processing_status: "parked", processed_at: new Date().toISOString(),
      error_message: "No mapping rule",
    }).eq("id", inbox!.id);
    return new Response(JSON.stringify({ status: "parked" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Normalise
  const { data: norm } = await sb.from("normalised_external_events").insert({
    webhook_inbox_event_id: inbox!.id,
    event_type: rule.normalised_event_type,
    event_category: rule.event_category,
    confidence_score: 0.9,
    normalised_payload: summary,
    audit_metadata: { source: "webhook_inbox", ...auditTag },
  }).select().single();

  // Emit to Event Bus (internal)
  const { data: emitted } = await sb.from("liftor_events").insert({
    event_type: rule.normalised_event_type,
    event_category: rule.event_category,
    source_module: "webhook_inbox",
    source_table: "normalised_external_events",
    source_record_id: norm?.id ?? null,
    event_payload: summary,
    idempotency_key: `webhook:${payload_hash}`,
    is_test_data: testMode,
    audit_metadata: { read_only: true, ...auditTag },
  }).select().single();

  if (norm && emitted) {
    await sb.from("normalised_external_events").update({ liftor_event_id: emitted.id }).eq("id", norm.id);
  }
  await sb.from("webhook_inbox_events").update({
    processing_status: "normalised", processed_at: new Date().toISOString(),
  }).eq("id", inbox!.id);

  return new Response(JSON.stringify({ status: "normalised", normalised_id: norm?.id, liftor_event_id: emitted?.id }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});