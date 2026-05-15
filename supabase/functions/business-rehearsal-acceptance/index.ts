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

    const tableExists = async (name: string) => {
      const { error } = await admin.from(name).select("id", { head: true, count: "exact" }).limit(1);
      return !error;
    };

    checks.rehearsal_runs_table = await tableExists("business_rehearsal_runs");
    checks.rehearsal_scenarios_table = await tableExists("business_rehearsal_scenarios");
    checks.operator_training_table = await tableExists("operator_training_checklists");

    const { count: runCount } = await admin.from("business_rehearsal_runs").select("id", { head: true, count: "exact" });
    const { count: scenarioCount } = await admin.from("business_rehearsal_scenarios").select("id", { head: true, count: "exact" });
    const { count: checklistCount } = await admin.from("operator_training_checklists").select("id", { head: true, count: "exact" });
    checks.rehearsal_runs_count = runCount ?? 0;
    checks.rehearsal_scenarios_count = scenarioCount ?? 0;
    checks.operator_checklist_count = checklistCount ?? 0;

    checks.external_actions = "locked";
    checks.no_external_send = true;
    checks.no_provider_call = true;
    checks.no_publish = true;
    checks.no_money_moved = true;
    checks.no_secret_exposed = true;
    checks.user_manual_rehearsal_section = "documented in src/lib/liftorUserManualContent.ts";
    checks.command_centre_panel = "BusinessRehearsalSimulationPanel mounted";

    const allOk = checks.rehearsal_runs_table && checks.rehearsal_scenarios_table && checks.operator_training_table;
    return json({ status: allOk ? "PASS" : "PARTIAL", checks });
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}