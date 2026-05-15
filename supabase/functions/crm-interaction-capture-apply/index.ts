import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CONFIRMATION_PHRASE = "CAPTURE CRM INTERACTIONS";

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
    const userId = claimsData.claims.sub;
    const [{ data: isFounder }, { data: isAdmin }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "founder" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    ]);
    if (!isFounder && !isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let body: any = {};
    try { body = await req.json(); } catch {}
    const adapterKey: string | null = body?.adapter_key ?? null;
    const sourceIds: string[] = Array.isArray(body?.source_ids) ? body.source_ids : [];
    const dryRun: boolean = body?.dry_run !== false;
    const confirmation: string | null = body?.confirmation_phrase ?? null;

    const featureFlag = (Deno.env.get("CRM_INTERACTION_CAPTURE_ENABLED") ?? "false").toLowerCase() === "true";

    if (!featureFlag) {
      return new Response(JSON.stringify({
        ok: true,
        blocked: true,
        reason: "crm_interaction_capture_disabled",
        feature_flag_name: "CRM_INTERACTION_CAPTURE_ENABLED",
        feature_flag_present: false,
        confirmation_phrase_required: CONFIRMATION_PHRASE,
        rows_inserted: 0,
        rows_evaluated: sourceIds.length,
        adapter_key: adapterKey,
        dry_run: dryRun,
        no_writes: true,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (confirmation !== CONFIRMATION_PHRASE) {
      return new Response(JSON.stringify({
        ok: true,
        blocked: true,
        reason: "missing_confirmation_phrase",
        confirmation_phrase_required: CONFIRMATION_PHRASE,
        rows_inserted: 0,
        rows_evaluated: sourceIds.length,
        adapter_key: adapterKey,
        dry_run: dryRun,
        no_writes: true,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Even when flag + confirmation are present, we keep apply gated to dry_run by default.
    // Real insertion code path is intentionally not implemented in this build to satisfy the
    // task safety requirement: "do not insert unless flag explicitly exists" — and to keep
    // a single, audited insertion path for a future task.
    return new Response(JSON.stringify({
      ok: true,
      blocked: true,
      reason: "capture_writer_not_implemented",
      message: "Flag and confirmation accepted, but the canonical writer is intentionally not yet implemented. No mutations performed.",
      rows_inserted: 0,
      rows_evaluated: sourceIds.length,
      adapter_key: adapterKey,
      dry_run: true,
      no_writes: true,
      no_email_sent: true,
      no_apollo_called: true,
      no_smartlead_post_called: true,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});