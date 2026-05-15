import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder");
    if (!allowed) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const { business_id, rehearsal_run_id } = body;
    if (!business_id && !rehearsal_run_id) return json({ error: "business_id or rehearsal_run_id required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let q = admin.from("rehearsal_data_registry").select("*").eq("purge_status", "pending");
    if (rehearsal_run_id) q = q.eq("rehearsal_run_id", rehearsal_run_id);
    if (business_id) q = q.eq("business_id", business_id);
    const { data: registry } = await q;
    const rows = (registry ?? []) as any[];

    const byTable: Record<string, { count: number; delete: number; archive: number; preserve: number }> = {};
    for (const r of rows) {
      const t = r.source_table;
      byTable[t] ??= { count: 0, delete: 0, archive: 0, preserve: 0 };
      byTable[t].count++;
      if (r.purge_action === "archive") byTable[t].archive++;
      else if (r.purge_action === "preserve") byTable[t].preserve++;
      else byTable[t].delete++;
    }

    // Suspicious: anything in registry that points at a table NOT in the safe rehearsal allow-list
    const safeTables = new Set([
      "business_rehearsal_runs",
      "business_rehearsal_scenarios",
      "operator_training_checklists",
    ]);
    const suspicious = rows.filter((r) => !safeTables.has(r.source_table));

    return json({
      total_test_records: rows.length,
      records_by_table: byTable,
      safe_to_purge: suspicious.length === 0 && rows.length > 0,
      suspicious_records: suspicious.length,
      blockers: suspicious.length > 0 ? ["registry contains entries outside safe rehearsal tables"] : [],
      recommended_action: rows.length === 0
        ? "no test data to purge — already clean"
        : (suspicious.length > 0
          ? "review suspicious records before applying reset"
          : "safe to apply reset (RESET REHEARSAL DATA)"),
      external_actions: "locked",
    });
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}