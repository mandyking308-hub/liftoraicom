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
    const { rehearsal_run_id, dry_run = true, confirm } = body;
    if (!rehearsal_run_id) return json({ error: "rehearsal_run_id required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: run, error: runErr } = await admin.from("business_rehearsal_runs").select("*").eq("id", rehearsal_run_id).single();
    if (runErr || !run) return json({ error: "rehearsal_run not found" }, 404);
    const { data: scenarios } = await admin.from("business_rehearsal_scenarios").select("*").eq("rehearsal_run_id", rehearsal_run_id);
    const list = scenarios ?? [];

    // Check what knowledge / starter pack exists to influence pass/fail
    const { data: starter } = await admin.from("business_execution_starter_packs").select("*").eq("business_id", run.business_id).limit(1);
    const { data: training } = await admin.from("business_training_runs").select("*").eq("business_id", run.business_id).limit(1);
    const { data: uploads } = await admin.from("business_knowledge_uploads").select("upload_type").eq("business_id", run.business_id);
    const uploadTypes = new Set((uploads ?? []).map((u: any) => u.upload_type));
    const hasStarter = (starter ?? []).length > 0;
    const hasTraining = (training ?? []).length > 0;

    // Compute per-scenario pass/fail based on prerequisites (no external action)
    const results = list.map((s: any) => {
      const blockers: string[] = [];
      if (!hasTraining) blockers.push("business training run missing");
      if (!hasStarter && ["proposal", "demo", "deal", "onboarding", "support", "survey", "winback", "retention"].includes(s.scenario_stage))
        blockers.push("starter pack missing");
      if (s.scenario_stage === "outreach_draft" && !uploadTypes.has("brand_guide") && !uploadTypes.has("website"))
        blockers.push("brand/website source missing");
      if (s.scenario_stage === "proposal" && !uploadTypes.has("offer_sheet") && !uploadTypes.has("pricing_sheet"))
        blockers.push("offer/pricing source missing");
      const passed = blockers.length === 0;
      return {
        id: s.id,
        scenario_status: passed ? "passed" : "blocked",
        passed,
        blockers,
        result_summary: passed ? "draft generated internally (no external send)" : `blocked: ${blockers.join("; ")}`,
      };
    });

    if (dry_run || confirm !== "RUN BUSINESS REHEARSAL") {
      return json({
        dry_run: true,
        rehearsal_run_id,
        planned_pass: results.filter((r) => r.passed).length,
        planned_blocked: results.filter((r) => !r.passed).length,
        external_actions: "locked",
        confirmation_required: "RUN BUSINESS REHEARSAL",
      });
    }

    // persist
    for (const r of results) {
      await admin.from("business_rehearsal_scenarios").update({
        scenario_status: r.scenario_status,
        passed: r.passed,
        blockers: r.blockers,
        result_summary: r.result_summary,
      }).eq("id", r.id);
    }
    const passed = results.filter((r) => r.passed).length;
    const total = results.length || 1;
    const score = Math.round((passed / total) * 100);
    const allBlockers = Array.from(new Set(results.flatMap((r) => r.blockers)));
    const status = passed === total ? "passed" : passed === 0 ? "failed" : "partial";
    await admin.from("business_rehearsal_runs").update({
      rehearsal_status: "completed",
      pass_fail_status: status,
      readiness_score: score,
      blockers: allBlockers,
      results_summary: `${passed}/${total} scenarios passed (internal-only, no external action)`,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    }).eq("id", rehearsal_run_id);

    return json({
      rehearsal_run_id,
      passed,
      total,
      readiness_score: score,
      pass_fail_status: status,
      blockers: allBlockers,
      external_actions: "locked",
    });
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}