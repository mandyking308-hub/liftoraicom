import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Disabled-by-default writer for founder_approval_items decisions.
// Requires:
//   FOUNDER_APPROVAL_RECORDING_ENABLED=true (env)
//   confirmation_phrase === "RECORD FOUNDER DECISION"
//   dry_run === false
// Even when enabled, only records the decision in founder_approval_items.
// NEVER sends email. NEVER calls Apollo or Smartlead. NEVER creates
// proposals/deals/invoices automatically.

const CONFIRMATION_PHRASE = "RECORD FOUNDER DECISION";

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
  return { admin, userId: data.claims.sub as string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authPriv(req);
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false;
    const phrase = String(body?.confirmation_phrase ?? "");
    const enabled = (Deno.env.get("FOUNDER_APPROVAL_RECORDING_ENABLED") ?? "").toLowerCase() === "true";

    const baseAudit = {
      decisions_recorded: 0,
      downstream_actions_executed: 0,
      emails_sent: 0,
      provider_calls: 0,
      proposals_created: 0,
      deals_created: 0,
      invoices_created: 0,
    };

    if (!enabled) {
      return new Response(JSON.stringify({
        ok: true, blocked: true,
        reason: "founder_approval_apply_disabled",
        feature_flag_name: "FOUNDER_APPROVAL_RECORDING_ENABLED",
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

    // Decision recorder is intentionally not implemented yet — keep blocked.
    return new Response(JSON.stringify({
      ok: true, blocked: true,
      reason: "decision_recorder_not_yet_implemented",
      ...baseAudit,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});