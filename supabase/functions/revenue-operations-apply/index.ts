import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Revenue Operations APPLY — DISABLED BY DEFAULT.
// Requires REVENUE_OPERATIONS_APPLY_ENABLED=true AND confirmation_phrase
// "APPLY REVENUE OPERATION". Defaults to dry_run=true.
// Even if enabled, this never sends email and never creates invoice/payment/
// assignment unless future explicit per-action flags exist.

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

const ALLOWED_ACTIONS = new Set([
  "create_invoice_for_deal",
  "record_payment",
  "assign_supplier",
  "mark_delivery_complete",
  "flag_overdue_invoice",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authPriv(req);
    if ("error" in auth) return auth.error;

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const dryRun = body?.dry_run !== false; // default true
    const phrase: string = body?.confirmation_phrase ?? "";
    const action: string = body?.action ?? "";

    const enabled = (Deno.env.get("REVENUE_OPERATIONS_APPLY_ENABLED") ?? "").toLowerCase() === "true";

    if (!enabled) {
      return new Response(JSON.stringify({
        ok: true,
        blocked: true,
        reason: "revenue_operations_apply_disabled",
        dry_run: true,
        emails_sent: 0,
        invoices_created: 0,
        payments_created: 0,
        assignments_created: 0,
        provider_calls: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (phrase !== "APPLY REVENUE OPERATION") {
      return new Response(JSON.stringify({
        ok: true,
        blocked: true,
        reason: "missing_confirmation_phrase",
        expected_phrase: "APPLY REVENUE OPERATION",
        dry_run: true,
        emails_sent: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!ALLOWED_ACTIONS.has(action)) {
      return new Response(JSON.stringify({
        ok: true,
        blocked: true,
        reason: "unknown_action",
        allowed_actions: [...ALLOWED_ACTIONS],
        dry_run: true,
        emails_sent: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Even when env-enabled and phrase matches, downstream operational mutations
    // require a per-action future flag. None exist yet, so always block with
    // dry_run preview.
    const perActionFlag = `REVENUE_OPS_${action.toUpperCase()}_ENABLED`;
    const perActionEnabled = (Deno.env.get(perActionFlag) ?? "").toLowerCase() === "true";
    if (!perActionEnabled || dryRun) {
      return new Response(JSON.stringify({
        ok: true,
        blocked: true,
        reason: dryRun ? "dry_run" : "per_action_flag_disabled",
        action,
        per_action_flag: perActionFlag,
        dry_run: true,
        emails_sent: 0,
        invoices_created: 0,
        payments_created: 0,
        assignments_created: 0,
        provider_calls: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // No live execution path is implemented in this build.
    return new Response(JSON.stringify({
      ok: true,
      blocked: true,
      reason: "no_live_execution_path",
      action,
      dry_run: true,
      emails_sent: 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});