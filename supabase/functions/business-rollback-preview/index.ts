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
    const { business_id, baseline_id } = body;
    if (!business_id || !baseline_id) return json({ error: "business_id and baseline_id required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: changes } = await admin.from("baseline_change_log")
      .select("*").eq("business_id", business_id).eq("baseline_id", baseline_id).order("created_at");
    const rows = (changes ?? []) as any[];

    const safe_internal_config: any[] = [];
    const customer_data_changes: any[] = [];
    const external_action_records: any[] = [];
    const financial_records: any[] = [];
    const risky_changes: any[] = [];

    for (const c of rows) {
      const t = c.source_table ?? "";
      const isProtected = PROTECTED_TABLES.has(t);
      if (["external_send", "external_publish", "external_dm", "external_push"].includes(c.change_type)) external_action_records.push(c);
      else if (["invoice", "payment", "money_movement", "filing"].includes(c.change_type) || ["invoices","payments"].includes(t)) financial_records.push(c);
      else if (isProtected) customer_data_changes.push(c);
      else if (c.change_risk === "high") risky_changes.push(c);
      else if (c.rollback_possible) safe_internal_config.push(c);
      else risky_changes.push(c);
    }

    return json({
      total_changes: rows.length,
      safe_internal_config_count: safe_internal_config.length,
      customer_data_changes_count: customer_data_changes.length,
      external_action_records_count: external_action_records.length,
      financial_records_count: financial_records.length,
      risky_changes_count: risky_changes.length,
      rollback_candidates: safe_internal_config.map((c) => ({
        id: c.id, source_table: c.source_table, source_id: c.source_id, summary: c.change_summary,
      })),
      refused_categories: {
        customer_data: "never auto-rolled back",
        financial_records: "never auto-rolled back",
        external_actions: "external sends cannot be reversed by rollback",
      },
      external_actions: "locked",
    });
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}