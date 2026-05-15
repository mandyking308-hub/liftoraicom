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
    const { business_id } = body;
    if (!business_id) return json({ error: "business_id required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1) Pending registry rows for this business
    const { count: pendingCount } = await admin
      .from("rehearsal_data_registry")
      .select("id", { head: true, count: "exact" })
      .eq("business_id", business_id)
      .eq("purge_status", "pending");

    // 2) Active rehearsal runs not reset
    const { count: liveRuns } = await admin
      .from("business_rehearsal_runs")
      .select("id", { head: true, count: "exact" })
      .eq("business_id", business_id)
      .neq("reset_status", "reset_completed");

    // 3) Active rehearsal scenarios still flagged as test
    const { count: testScenarios } = await admin
      .from("business_rehearsal_scenarios")
      .select("id", { head: true, count: "exact" })
      .eq("business_id", business_id)
      .eq("is_test_data", true);

    const test_records_remaining = (pendingCount ?? 0) + (testScenarios ?? 0);
    const suspicious_records = 0; // none stored outside safe tables today
    const affected_modules: string[] = [];
    if ((pendingCount ?? 0) > 0) affected_modules.push("rehearsal_data_registry");
    if ((liveRuns ?? 0) > 0) affected_modules.push("business_rehearsal_runs");
    if ((testScenarios ?? 0) > 0) affected_modules.push("business_rehearsal_scenarios");

    const blockers: string[] = [];
    if ((pendingCount ?? 0) > 0) blockers.push(`${pendingCount} test record(s) still pending in registry`);
    if ((liveRuns ?? 0) > 0) blockers.push(`${liveRuns} rehearsal run(s) not yet reset`);

    const real_mode_ready = test_records_remaining === 0 && (liveRuns ?? 0) === 0;
    const next_action = real_mode_ready
      ? "Clean Real Mode confirmed — safe to consider go-live gates"
      : "Run rehearsal-reset-preview then rehearsal-reset-apply (RESET REHEARSAL DATA)";

    const { data: row } = await admin.from("rehearsal_cleanliness_checks").insert({
      business_id,
      check_status: real_mode_ready ? "clean" : "dirty",
      test_records_remaining,
      suspicious_records,
      real_mode_ready,
      blockers,
      metadata: { affected_modules, pending_registry: pendingCount, live_runs: liveRuns, test_scenarios: testScenarios },
    }).select().single();

    return json({
      check_id: row?.id,
      clean_for_real_use: real_mode_ready,
      test_records_remaining,
      suspicious_records,
      affected_modules,
      blockers,
      next_action,
      external_actions: "locked",
    });
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}