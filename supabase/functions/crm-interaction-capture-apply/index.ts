import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Business-live writer for crm_interaction_ledger.
// Requires founder/admin auth, business-live setting "crm_interaction_capture_enabled" enabled,
// confirmation_phrase === "CAPTURE CRM INTERACTIONS", dry_run === false.
// NEVER sends email. NEVER calls Apollo. NEVER POSTs to Smartlead.
// Idempotency: skips rows where a ledger entry already exists with the same provider_event_id.

const CONFIRMATION_PHRASE = "CAPTURE CRM INTERACTIONS";
const SETTING_KEY = "crm_interaction_capture_enabled";
const SOURCE_FUNCTION = "crm-interaction-capture-apply";
const TARGET_TABLE = "crm_interaction_ledger";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claimsData?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = claimsData.claims.sub as string;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false;
    const phrase = String(body?.confirmation_phrase ?? "");
    const interactions = Array.isArray(body?.interactions) ? body.interactions : [];

    const { data: enabled } = await admin.rpc("is_agent_live_setting_enabled", { _setting_key: SETTING_KEY });

    const logAudit = async (status: string, blockedReason: string | null, targetId: string | null, metadata: any = {}) => {
      await admin.from("agent_action_audit_log").insert({
        agent_key: "crm_capture",
        action_type: SETTING_KEY,
        source_function: SOURCE_FUNCTION,
        target_table: TARGET_TABLE,
        target_id: targetId,
        founder_user_id: userId,
        confirmation_phrase: phrase,
        dry_run: dryRun,
        action_status: status,
        blocked_reason: blockedReason,
        metadata,
      });
    };

    const baseAudit = { rows_inserted: 0, rows_skipped: 0, rows_evaluated: interactions.length, emails_sent: 0, provider_calls: 0 };

    if (enabled !== true) {
      await logAudit("blocked", "setting_disabled", null, { interactions_count: interactions.length });
      return new Response(JSON.stringify({ ok: true, blocked: true, reason: "setting_disabled", setting_key: SETTING_KEY, ...baseAudit }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (phrase !== CONFIRMATION_PHRASE) {
      await logAudit("blocked", "missing_confirmation_phrase", null, {});
      return new Response(JSON.stringify({ ok: true, blocked: true, reason: "missing_confirmation_phrase", required_phrase: CONFIRMATION_PHRASE, ...baseAudit }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (dryRun) {
      await logAudit("preview", "dry_run", null, {});
      return new Response(JSON.stringify({ ok: true, blocked: true, reason: "dry_run_only", ...baseAudit }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (interactions.length === 0) {
      return new Response(JSON.stringify({ ok: true, blocked: true, reason: "no_interactions_provided", ...baseAudit }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Idempotent: filter out any rows whose provider_event_id already exists.
    const providerIds = interactions.map((i: any) => i.provider_event_id).filter(Boolean);
    let existing = new Set<string>();
    if (providerIds.length > 0) {
      const { data: dups } = await admin.from("crm_interaction_ledger").select("provider_event_id").in("provider_event_id", providerIds);
      existing = new Set((dups ?? []).map((d: any) => d.provider_event_id));
    }
    const toInsert = interactions.filter((i: any) => !i.provider_event_id || !existing.has(i.provider_event_id)).slice(0, 200).map((i: any) => ({
      business_id: i.business_id ?? null,
      contact_id: i.contact_id ?? null,
      conversation_id: i.conversation_id ?? null,
      source_system: String(i.source_system ?? "unknown"),
      source_channel: String(i.source_channel ?? "email"),
      interaction_type: String(i.interaction_type ?? "event"),
      direction: i.direction ?? null,
      provider_type: i.provider_type ?? null,
      provider_message_id: i.provider_message_id ?? null,
      provider_event_id: i.provider_event_id ?? null,
      external_event_id: i.external_event_id ?? null,
    }));
    let inserted: any[] = [];
    if (toInsert.length > 0) {
      const { data, error } = await admin.from("crm_interaction_ledger").insert(toInsert).select("id");
      if (error) {
        await logAudit("error", error.message, null, { body });
        return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      inserted = data ?? [];
    }
    for (const r of inserted) await logAudit("applied", null, r.id, {});
    return new Response(JSON.stringify({
      ok: true, blocked: false,
      rows_inserted: inserted.length,
      rows_skipped: interactions.length - toInsert.length,
      rows_evaluated: interactions.length,
      ids: inserted.map((r: any) => r.id),
      emails_sent: 0, provider_calls: 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
