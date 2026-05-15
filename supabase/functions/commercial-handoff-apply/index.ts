import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Disabled-by-default writer for commercial_handoff_reviews.
// Requires:
//   COMMERCIAL_HANDOFF_APPLY_ENABLED=true (env)
//   confirmation_phrase === "APPLY COMMERCIAL HANDOFF"
//   dry_run === false
// Even when enabled, only writes commercial_handoff_reviews rows.
// NEVER creates proposals/demos/deals/invoices. NEVER sends email.
// NEVER calls Apollo or Smartlead.

const CONFIRMATION_PHRASE = "APPLY COMMERCIAL HANDOFF";

async function authPriv(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", data.claims.sub);
  if (!(roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder")) {
    return { error: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  return { admin };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authPriv(req);
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false;
    const phrase = String(body?.confirmation_phrase ?? "");
    const enabled = (Deno.env.get("COMMERCIAL_HANDOFF_APPLY_ENABLED") ?? "").toLowerCase() === "true";

    const baseAudit = {
      handoff_reviews_created: 0,
      proposals_created: 0,
      demos_created: 0,
      deals_created: 0,
      invoices_created: 0,
      emails_sent: 0,
      provider_calls: 0,
    };

    if (!enabled) {
      return new Response(JSON.stringify({
        ok: true, blocked: true,
        reason: "commercial_handoff_apply_disabled",
        feature_flag_name: "COMMERCIAL_HANDOFF_APPLY_ENABLED",
        ...baseAudit,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (phrase !== CONFIRMATION_PHRASE) {
      return new Response(JSON.stringify({
        ok: true, blocked: true, reason: "missing_confirmation_phrase",
        required_phrase: CONFIRMATION_PHRASE, ...baseAudit,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (dryRun) {
      return new Response(JSON.stringify({
        ok: true, blocked: true, reason: "dry_run_only", ...baseAudit,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      ok: true, blocked: true,
      reason: "handoff_writer_not_yet_implemented",
      ...baseAudit,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});