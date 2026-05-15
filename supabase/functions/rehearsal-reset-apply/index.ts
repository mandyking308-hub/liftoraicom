import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SAFE_TABLES = new Set([
  "business_rehearsal_runs",
  "business_rehearsal_scenarios",
  "operator_training_checklists",
]);

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
    const { business_id, rehearsal_run_id, confirm, dry_run = true } = body;
    if (!business_id && !rehearsal_run_id) return json({ error: "business_id or rehearsal_run_id required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let q = admin.from("rehearsal_data_registry").select("*").eq("purge_status", "pending");
    if (rehearsal_run_id) q = q.eq("rehearsal_run_id", rehearsal_run_id);
    if (business_id) q = q.eq("business_id", business_id);
    const { data: registry } = await q;
    const rows = (registry ?? []) as any[];

    const refused = rows.filter((r) => !SAFE_TABLES.has(r.source_table));
    if (refused.length > 0) {
      return json({
        error: "refused: registry contains entries outside safe rehearsal tables",
        refused_count: refused.length,
        external_actions: "locked",
      }, 400);
    }

    if (dry_run || confirm !== "RESET REHEARSAL DATA") {
      return json({
        dry_run: true,
        planned_purge: rows.length,
        confirmation_required: "RESET REHEARSAL DATA",
        external_actions: "locked",
      });
    }

    // Process: delete from source table, then mark registry entry purged.
    // Order matters — delete child scenarios before parent runs.
    const order = ["business_rehearsal_scenarios", "operator_training_checklists", "business_rehearsal_runs"];
    let deleted = 0;
    let archived = 0;
    for (const table of order) {
      const subset = rows.filter((r) => r.source_table === table);
      for (const r of subset) {
        if (r.purge_action === "archive") {
          await admin.from(table).update({ metadata: { ...(r.metadata ?? {}), archived_by_reset: true } }).eq("id", r.source_id);
          await admin.from("rehearsal_data_registry").update({ purge_status: "archived", archived_at: new Date().toISOString() }).eq("id", r.id);
          archived++;
        } else {
          // Verify it really is a test record before deletion
          if (table === "business_rehearsal_runs") {
            const { data: rr } = await admin.from("business_rehearsal_runs").select("test_data_only,environment_mode").eq("id", r.source_id).maybeSingle();
            if (rr && (rr.test_data_only !== true || rr.environment_mode !== "simulation")) continue;
          }
          if (table === "business_rehearsal_scenarios") {
            const { data: rs } = await admin.from("business_rehearsal_scenarios").select("is_test_data,created_by_rehearsal").eq("id", r.source_id).maybeSingle();
            if (rs && (rs.is_test_data !== true || rs.created_by_rehearsal !== true)) continue;
          }
          await admin.from(table).delete().eq("id", r.source_id);
          await admin.from("rehearsal_data_registry").update({ purge_status: "deleted", purged_at: new Date().toISOString() }).eq("id", r.id);
          deleted++;
        }
      }
    }

    // Mark rehearsal runs reset
    if (rehearsal_run_id) {
      await admin.from("business_rehearsal_runs").update({ reset_status: "reset_completed", reset_completed_at: new Date().toISOString() }).eq("id", rehearsal_run_id);
    } else if (business_id) {
      await admin.from("business_rehearsal_runs").update({ reset_status: "reset_completed", reset_completed_at: new Date().toISOString() }).eq("business_id", business_id);
    }

    // Reset business activation profile back to sandbox/internal mode (still no external action)
    if (business_id) {
      await admin.from("business_activation_profiles").update({
        operating_mode: "sandbox",
      }).eq("business_id", business_id);
    }

    return json({
      deleted,
      archived,
      registry_processed: rows.length,
      reset_completed: true,
      operating_mode: "sandbox",
      external_actions: "locked",
    });
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}