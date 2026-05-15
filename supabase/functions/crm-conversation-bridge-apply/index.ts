import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CONFIRMATION_PHRASE = "CREATE CRM CONVERSATION BRIDGE";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const uid = claims.claims.sub;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", uid);
    const isPriv = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder");
    if (!isPriv) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const dryRun = body?.dry_run !== false;
    const phrase = body?.confirmation_phrase ?? "";
    const flagEnabled = (Deno.env.get("CRM_CONVERSATION_BRIDGE_ENABLED") ?? "").toLowerCase() === "true";

    if (!flagEnabled) {
      return new Response(JSON.stringify({
        ok: true,
        blocked: true,
        reason: "crm_conversation_bridge_disabled",
        communications_created: 0,
        conversations_created: 0,
        bridge_reviews_created: 0,
        dry_run: dryRun,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (phrase !== CONFIRMATION_PHRASE) {
      return new Response(JSON.stringify({
        ok: true,
        blocked: true,
        reason: "missing_confirmation_phrase",
        required_phrase: CONFIRMATION_PHRASE,
        communications_created: 0,
        conversations_created: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Even when flag + phrase pass, this initial release intentionally stays preview-only.
    // Real apply logic (idempotent by interaction_id) will be wired up in the next build step.
    return new Response(JSON.stringify({
      ok: true,
      blocked: true,
      reason: "apply_logic_not_yet_implemented",
      communications_created: 0,
      conversations_created: 0,
      bridge_reviews_created: 0,
      dry_run: dryRun,
      note: "Bridge plumbing ready; canonical writers must be reviewed before activation.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});