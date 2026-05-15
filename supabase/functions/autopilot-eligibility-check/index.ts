import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function safeCount(admin: any, table: string, filter?: (q: any) => any): Promise<number> {
  try {
    let q = admin.from(table).select("*", { count: "exact", head: true });
    if (filter) q = filter(q);
    const { count, error } = await q;
    if (error) return 0;
    return count || 0;
  } catch { return 0; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles || []).some((r: any) => r.role === "founder" || r.role === "admin");
    if (!allowed) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const gateId: string | undefined = body?.gate_id;
    const businessId: string | undefined = body?.business_id;

    let gatesQ = admin.from("autopilot_activation_gates").select("*");
    if (gateId) gatesQ = gatesQ.eq("id", gateId);
    const { data: gates, error: gErr } = await gatesQ;
    if (gErr) throw gErr;

    const results: any[] = [];
    for (const g of gates || []) {
      const blockers: string[] = [];

      // Test runs (count of recent successful audit entries for this action_type)
      const recentRuns = await safeCount(admin, "autonomy_action_audit", (q: any) => {
        let qq = q.eq("action_type", g.action_type).eq("allowed", true);
        if (businessId) qq = qq.eq("business_id", businessId);
        return qq;
      });
      if (recentRuns < (g.requires_successful_test_runs || 0)) {
        blockers.push(`needs_${g.requires_successful_test_runs}_test_runs (have ${recentRuns})`);
      }

      // Critical findings open
      if (g.requires_no_critical_findings) {
        const critical = await safeCount(admin, "self_healing_findings", (q: any) =>
          q.eq("severity", "critical").eq("repair_status", "open"));
        if (critical > 0) blockers.push(`critical_findings_open:${critical}`);
      }

      // Compliance pass: any open critical compliance audits
      if (g.requires_compliance_pass) {
        const blocked = await safeCount(admin, "autonomy_action_audit", (q: any) =>
          q.eq("action_type", g.action_type).eq("allowed", false));
        if (blocked > 5) blockers.push(`recent_compliance_blocks:${blocked}`);
      }

      // External actions are always blocked from auto-eligibility
      if (g.external_action) blockers.push("external_action_locked_by_default");

      // Readiness: portfolio score
      let readiness = 0;
      if (businessId) {
        const { data: scoreRow } = await admin
          .from("portfolio_intelligence_scores")
          .select("overall_priority_score")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        readiness = Number(scoreRow?.overall_priority_score || 0);
      } else {
        readiness = 100; // no per-business gate
      }
      if (readiness < Number(g.required_readiness_score || 0)) {
        blockers.push(`readiness_below_threshold:${readiness}/${g.required_readiness_score}`);
      }

      // Founder approval flag
      if (g.requires_founder_final_approval) blockers.push("requires_founder_final_approval");

      results.push({
        gate_id: g.id,
        gate_key: g.gate_key,
        gate_label: g.gate_label,
        external_action: g.external_action,
        current_state: g.current_state,
        readiness,
        recent_test_runs: recentRuns,
        eligible: blockers.length === 0,
        blockers,
      });
    }

    return new Response(JSON.stringify({ ok: true, count: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});