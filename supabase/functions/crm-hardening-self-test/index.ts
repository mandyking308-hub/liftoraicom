import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// CRM Hardening Self-Test
// Read-only diagnostic. Verifies presence/seed of CRM hardening tables,
// confirms apply functions are gated/disabled, and writes a single row
// into crm_hardening_test_runs. NO emails, NO Apollo, NO Smartlead POSTs,
// NO operational mutation.

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
  const { data: claims, error } = await supabase.auth.getClaims(token);
  if (error || !claims?.claims) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", claims.claims.sub);
  if (!(roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder")) {
    return { error: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  return { admin, userId: claims.claims.sub as string };
}

const headCount = async (admin: any, table: string) => {
  try {
    const { count, error } = await admin.from(table).select("*", { count: "exact", head: true });
    if (error) return { table, ok: false, count: 0, error: error.message };
    return { table, ok: true, count: count ?? 0 };
  } catch (e: any) {
    return { table, ok: false, count: 0, error: e?.message ?? String(e) };
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authPriv(req);
    if ("error" in auth) return auth.error;
    const { admin, userId } = auth;

    const tables = [
      "crm_interaction_ledger",
      "crm_interaction_types",
      "crm_match_candidates",
      "crm_interaction_source_adapters",
      "crm_conversation_bridge_reviews",
      "crm_lifecycle_stages",
      "crm_next_action_rules",
      "crm_founder_review_queue",
      "crm_integrity_findings",
      "crm_hardening_test_runs",
    ];
    const tableChecks = await Promise.all(tables.map((t) => headCount(admin, t)));

    const seedExpect: Record<string, number> = {
      crm_interaction_types: 1,
      crm_interaction_source_adapters: 1,
      crm_lifecycle_stages: 1,
      crm_next_action_rules: 1,
    };
    const seedFindings = tableChecks
      .filter((c) => c.ok && (seedExpect[c.table] ?? 0) > 0 && c.count < (seedExpect[c.table] ?? 0))
      .map((c) => ({ table: c.table, expected_min: seedExpect[c.table], actual: c.count }));

    // Confirm apply functions are gated/disabled. We do NOT actually invoke them
    // server-to-server; we just record the expected gate envvar names so the
    // founder can see the disable surface explicitly.
    const applyGates = [
      { fn: "crm-interaction-capture-apply", flag: "CRM_INTERACTION_CAPTURE_ENABLED", phrase: "APPLY CRM INTERACTION CAPTURE" },
      { fn: "crm-conversation-bridge-apply", flag: "CRM_CONVERSATION_BRIDGE_ENABLED", phrase: "APPLY CRM CONVERSATION BRIDGE" },
      { fn: "crm-next-action-apply", flag: "CRM_NEXT_ACTION_APPLY_ENABLED", phrase: "APPLY CRM NEXT ACTION" },
      { fn: "crm-repair-apply", flag: "CRM_REPAIR_APPLY_ENABLED", phrase: "APPLY CRM REPAIR" },
    ].map((g) => ({
      ...g,
      flag_env_present: Boolean(Deno.env.get(g.flag)),
      flag_env_enabled: (Deno.env.get(g.flag) ?? "").toLowerCase() === "true",
    }));

    const allTablesOk = tableChecks.every((t) => t.ok);
    const seedsOk = seedFindings.length === 0;
    const allGatesDisabled = applyGates.every((g) => !g.flag_env_enabled);

    const status =
      allTablesOk && seedsOk && allGatesDisabled ? "pass"
      : allTablesOk && allGatesDisabled ? "warn"
      : "fail";

    const summary = {
      tables_checked: tableChecks.length,
      tables_ok: tableChecks.filter((t) => t.ok).length,
      tables_failed: tableChecks.filter((t) => !t.ok).map((t) => t.table),
      seed_gaps: seedFindings,
      apply_gates_disabled: allGatesDisabled,
      no_send: true,
      no_apollo_calls: true,
      no_smartlead_post_calls: true,
      no_queue_mutation: true,
    };

    const details = { table_checks: tableChecks, apply_gates: applyGates };

    const { data: inserted, error: insErr } = await admin
      .from("crm_hardening_test_runs")
      .insert({
        run_label: `self_test_${new Date().toISOString()}`,
        status,
        summary,
        details,
        finished_at: new Date().toISOString(),
        triggered_by: userId,
      })
      .select("id")
      .maybeSingle();

    return new Response(
      JSON.stringify({
        ok: true,
        run_id: inserted?.id ?? null,
        run_insert_error: insErr?.message ?? null,
        status,
        summary,
        details,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});