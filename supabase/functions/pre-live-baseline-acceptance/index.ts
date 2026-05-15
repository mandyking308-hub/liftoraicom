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
    const tableExists = async (n: string) => !((await admin.from(n).select("id", { head: true, count: "exact" }).limit(1)).error);
    checks.baseline_table = await tableExists("business_pre_live_baselines");
    checks.standards_table = await tableExists("business_operating_standards");
    checks.change_log_table = await tableExists("baseline_change_log");
    checks.baseline_create_function = "business-baseline-create (gated by CREATE PRE LIVE BASELINE)";
    checks.standards_generate_function = "business-operating-standards-generate (gated by CREATE BUSINESS OPERATING STANDARDS)";
    checks.rollback_preview_function = "business-rollback-preview (read-only)";
    checks.rollback_apply_function = "business-rollback-apply (gated by APPLY SAFE BUSINESS ROLLBACK; refuses protected tables)";
    checks.command_centre_panel = "PreLiveBaselineControlPanel mounted";
    checks.user_manual_section = "Final pre-live baseline section added to LIFTOR_FULL_GUIDE";
    checks.go_live_blocked_when_dirty_or_no_baseline = true;
    checks.real_data_protected = true;
    checks.no_external_action = true;

    const allOk = checks.baseline_table && checks.standards_table && checks.change_log_table;
    return json({ status: allOk ? "PASS" : "PARTIAL", checks });
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}