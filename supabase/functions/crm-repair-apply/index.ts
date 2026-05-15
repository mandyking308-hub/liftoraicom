import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CONFIRMATION_PHRASE = "APPLY CRM REPAIR";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", claims.claims.sub);
    if (!(roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const dryRun = body?.dry_run !== false;
    const phrase = body?.confirmation_phrase ?? "";
    const flagEnabled = (Deno.env.get("CRM_REPAIR_APPLY_ENABLED") ?? "").toLowerCase() === "true";

    if (!flagEnabled) {
      return new Response(JSON.stringify({
        ok: true, blocked: true, reason: "crm_repair_apply_disabled",
        ledger_rows_inserted: 0, integrity_findings_inserted: 0,
        contact_status_changes: 0, compliance_changes: 0, dry_run: dryRun,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (phrase !== CONFIRMATION_PHRASE) {
      return new Response(JSON.stringify({
        ok: true, blocked: true, reason: "missing_confirmation_phrase",
        required_phrase: CONFIRMATION_PHRASE,
        ledger_rows_inserted: 0, integrity_findings_inserted: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      ok: true, blocked: true, reason: "repair_writer_not_yet_implemented",
      note: "When activated, only crm_interaction_ledger and crm_integrity_findings will be written. Compliance, contacts, BCRs, queues and outreach approvals are never mutated by this function.",
      ledger_rows_inserted: 0, integrity_findings_inserted: 0,
      contact_status_changes: 0, compliance_changes: 0, dry_run: dryRun,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});