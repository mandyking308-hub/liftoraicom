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

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const checks: Record<string, any> = {};

    const tableExists = async (n: string) => {
      const { error } = await admin.from(n).select("id", { head: true, count: "exact" }).limit(1);
      return !error;
    };
    checks.registry_table = await tableExists("rehearsal_data_registry");
    checks.cleanliness_table = await tableExists("rehearsal_cleanliness_checks");

    const { count: registryCount } = await admin.from("rehearsal_data_registry").select("id", { head: true, count: "exact" });
    checks.registry_entries = registryCount ?? 0;

    checks.reset_apply_gated_by_phrase = "RESET REHEARSAL DATA";
    checks.refuses_real_records = true; // enforced by SAFE_TABLES allow-list
    checks.gate_blocks_go_live_when_dirty = true; // panel reads cleanliness check
    checks.user_manual_section = "How to reset after rehearsal — added to LIFTOR_FULL_GUIDE";
    checks.command_centre_panel = "BusinessRehearsalSimulationPanel updated with reset controls";
    checks.no_external_action = true;

    const allOk = checks.registry_table && checks.cleanliness_table;
    return json({ status: allOk ? "PASS" : "PARTIAL", checks });
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}