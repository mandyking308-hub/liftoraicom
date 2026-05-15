import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SOURCES = [
  { source: "outbound_provider_events", target_type: "smartlead_provider_event", id_col: "id", contact_col: "contact_id" },
  { source: "communications", target_type: "communication", id_col: "id", contact_col: "contact_id" },
  { source: "email_events", target_type: "email_event", id_col: "id", contact_col: "contact_id" },
  { source: "ai_actions", target_type: "ai_action", id_col: "id", contact_col: "contact_id" },
  { source: "ai_drafts", target_type: "ai_draft", id_col: "id", contact_col: "contact_id" },
  { source: "internal_proposals", target_type: "proposal", id_col: "id", contact_col: "contact_id" },
  { source: "demo_access", target_type: "demo_access", id_col: "id", contact_col: "contact_id" },
  { source: "deals", target_type: "deal", id_col: "id", contact_col: "contact_id" },
  { source: "invoices", target_type: "invoice", id_col: "id", contact_col: null },
  { source: "payments", target_type: "payment", id_col: "id", contact_col: null },
];

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

    const sources: any[] = [];
    for (const s of SOURCES) {
      try {
        const total = await admin.from(s.source).select("id", { count: "exact", head: true });
        // already_captured = ledger rows referencing this source via metadata.source_table
        const captured = await admin.from("crm_interaction_ledger").select("id", { count: "exact", head: true }).eq("source_system", s.target_type);
        const eligible = Math.max(0, (total.count ?? 0) - (captured.count ?? 0));
        sources.push({
          source: s.source,
          target_type: s.target_type,
          rows_total: total.count ?? 0,
          rows_already_captured: captured.count ?? 0,
          rows_eligible: eligible,
          rows_blocked: 0,
          proposed_dedupe_key_format: `${s.target_type}:<id>`,
          proposed_match_method: s.contact_col ? "contact_id_passthrough" : "business_id_passthrough",
          warnings: [],
        });
      } catch (e) {
        sources.push({ source: s.source, error: String((e as Error).message ?? e), rows_eligible: 0, rows_blocked: 0 });
      }
    }

    const ledgerUnmatched = await admin.from("crm_interaction_ledger").select("id", { count: "exact", head: true }).eq("matched_status", "unmatched");
    const timelineGapContacts = await admin.from("contacts").select("id", { count: "exact", head: true }).is("last_contacted_at", null);

    return new Response(JSON.stringify({
      ok: true,
      mode: "preview",
      apply_disabled: true,
      sources,
      unmatched_ledger_rows: ledgerUnmatched.count ?? 0,
      contacts_with_timeline_gap: timelineGapContacts.count ?? 0,
      total_eligible: sources.reduce((a, s) => a + (s.rows_eligible ?? 0), 0),
      warnings: ["Backfill apply is disabled — preview only."],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});