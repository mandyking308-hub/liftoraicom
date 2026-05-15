import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Business-live writer (founder-approved internal record creation only).
// Requires: founder/admin auth, business-live setting "revenue_review_creation_enabled" enabled,
// confirmation_phrase === "CREATE REVENUE REVIEW", and dry_run === false.
// NEVER sends email. NEVER calls Apollo. NEVER POSTs to Smartlead.

const CONFIRMATION_PHRASE = "CREATE REVENUE REVIEW";
const SETTING_KEY = "revenue_review_creation_enabled";
const TARGET_TABLE = "revenue_operations_reviews";
const SOURCE_FUNCTION = "revenue-operations-apply";

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
  const userId = data.claims.sub as string;
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
  if (!(roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder")) {
    return { error: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  return { admin, userId };
}

async function logAudit(admin: any, userId: string, status: string, blockedReason: string | null, dryRun: boolean, phrase: string, targetId: string | null, metadata: any = {}) {
  await admin.from("agent_action_audit_log").insert({
    agent_key: "founder_console",
    action_type: SETTING_KEY,
    source_function: SOURCE_FUNCTION,
    target_table: TARGET_TABLE,
    target_id: targetId,
    founder_user_id: userId,
    confirmation_phrase: phrase,
    dry_run: dryRun,
    action_status: status,
    blocked_reason: blockedReason,
    external_provider_called: false,
    email_sent: false,
    apollo_called: false,
    smartlead_post_called: false,
    metadata,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authPriv(req);
    if ("error" in auth) return auth.error;
    const { admin, userId } = auth;

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false;
    const phrase = String(body?.confirmation_phrase ?? "");

    const { data: settingRow } = await admin.rpc("is_agent_live_setting_enabled", { _setting_key: SETTING_KEY });
    const enabled = settingRow === true;

    const baseAudit = { records_created: 0, emails_sent: 0, provider_calls: 0 };

    if (!enabled) {
      await logAudit(admin, userId, "blocked", "setting_disabled", dryRun, phrase, null, { body });
      return new Response(JSON.stringify({ ok: true, blocked: true, reason: "setting_disabled", setting_key: SETTING_KEY, ...baseAudit }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (phrase !== CONFIRMATION_PHRASE) {
      await logAudit(admin, userId, "blocked", "missing_confirmation_phrase", dryRun, phrase, null, { body });
      return new Response(JSON.stringify({ ok: true, blocked: true, reason: "missing_confirmation_phrase", required_phrase: CONFIRMATION_PHRASE, ...baseAudit }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (dryRun) {
      await logAudit(admin, userId, "preview", "dry_run", dryRun, phrase, null, { body });
      return new Response(JSON.stringify({ ok: true, blocked: true, reason: "dry_run_only", ...baseAudit }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return new Response(JSON.stringify({ ok: true, blocked: true, reason: "no_items_provided", ...baseAudit }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const rows = items.slice(0, 100).map((it: any) => ({
      business_id: it.business_id ?? null,
      contact_id: it.contact_id ?? null,
      deal_id: it.deal_id ?? null,
      invoice_id: it.invoice_id ?? null,
      payment_id: it.payment_id ?? null,
      assignment_id: it.assignment_id ?? null,
      supplier_id: it.supplier_id ?? null,
      review_type: String(it.review_type ?? "deal_needs_invoice"),
      priority_level: it.priority_level ?? "normal",
      summary: it.summary ?? null,
      recommended_action: it.recommended_action ?? null,
      apply_status: "preview",
      blockers: it.blockers ?? [],
      metadata: it.metadata ?? {},
    }));
    const { data: inserted, error } = await admin.from("revenue_operations_reviews").insert(rows).select("id");
    if (error) {
      await logAudit(admin, userId, "error", error.message, dryRun, phrase, null, { body });
      return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    for (const r of inserted ?? []) await logAudit(admin, userId, "applied", null, false, phrase, r.id, {});
    return new Response(JSON.stringify({ ok: true, blocked: false, records_created: inserted?.length ?? 0, ids: inserted?.map((r: any) => r.id) ?? [], emails_sent: 0, provider_calls: 0, invoices_created: 0, payments_created: 0, assignments_created: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
