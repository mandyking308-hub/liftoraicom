import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROTECTED_TABLES = new Set([
  "contacts", "organisations", "crm_interactions", "conversations", "communications",
  "proposals", "deals", "invoices", "payments", "subscriptions", "suppliers",
  "supplier_assignments", "customer_memory", "documents", "data_room",
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
    const { business_id, baseline_id, change_ids = [], confirm } = body;
    if (!business_id || !baseline_id) return json({ error: "business_id and baseline_id required" }, 400);
    if (confirm !== "APPLY SAFE BUSINESS ROLLBACK") {
      return json({ error: "confirmation phrase required: APPLY SAFE BUSINESS ROLLBACK" }, 400);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let q = admin.from("baseline_change_log").select("*").eq("business_id", business_id).eq("baseline_id", baseline_id);
    if (change_ids.length > 0) q = q.in("id", change_ids);
    const { data: changes } = await q;
    const rows = (changes ?? []) as any[];

    const refused: any[] = [];
    const applied: any[] = [];

    for (const c of rows) {
      if (PROTECTED_TABLES.has(c.source_table) || !c.rollback_possible || c.change_risk === "high") {
        refused.push({ id: c.id, source_table: c.source_table, reason: "protected or not rollback-eligible" });
        continue;
      }
      // Restore "before_snapshot" by writing it back via update on the source row
      try {
        if (c.source_id && c.before_snapshot && Object.keys(c.before_snapshot).length > 0) {
          await admin.from(c.source_table).update(c.before_snapshot).eq("id", c.source_id);
        }
        applied.push({ id: c.id, source_table: c.source_table });
        await admin.from("baseline_change_log").insert({
          business_id,
          baseline_id,
          change_type: "rollback_applied",
          source_table: c.source_table,
          source_id: c.source_id,
          change_summary: `Rolled back change ${c.id}`,
          before_snapshot: c.after_snapshot ?? {},
          after_snapshot: c.before_snapshot ?? {},
          changed_by: user.email ?? user.id,
          change_risk: "low",
          rollback_possible: false,
        });
      } catch (err: any) {
        refused.push({ id: c.id, source_table: c.source_table, reason: err?.message ?? "error" });
      }
    }

    return json({
      applied_count: applied.length,
      refused_count: refused.length,
      applied,
      refused,
      protected_tables: Array.from(PROTECTED_TABLES),
      external_actions: "locked",
    });
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}