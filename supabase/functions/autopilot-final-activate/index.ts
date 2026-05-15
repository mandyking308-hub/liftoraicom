import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STANDARD_PHRASE = "ACTIVATE RESTRICTED AUTOPILOT";
const HIGH_RISK_PHRASE = "ACTIVATE HIGH RISK EXTERNAL AUTOPILOT";

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
    const { gate_id, approval_id, confirmation_phrase, high_risk_confirmation_phrase } = body || {};

    if (confirmation_phrase !== STANDARD_PHRASE) {
      return new Response(JSON.stringify({ error: "confirmation_phrase_required", expected: STANDARD_PHRASE }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!gate_id || !approval_id) {
      return new Response(JSON.stringify({ error: "gate_id_and_approval_id_required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: gate } = await admin.from("autopilot_activation_gates").select("*").eq("id", gate_id).maybeSingle();
    if (!gate) return new Response(JSON.stringify({ error: "gate_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: approval } = await admin.from("founder_approval_items").select("*").eq("id", approval_id).maybeSingle();
    if (!approval) return new Response(JSON.stringify({ error: "approval_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (approval.status !== "approved") {
      return new Response(JSON.stringify({ error: "approval_not_approved", status: approval.status }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check eligibility via embedded logic
    const blockers: string[] = [];
    if (gate.external_action && high_risk_confirmation_phrase !== HIGH_RISK_PHRASE) {
      blockers.push("external_gate_requires_high_risk_phrase");
    }
    if (gate.requires_no_critical_findings) {
      const { count } = await admin.from("self_healing_findings")
        .select("*", { count: "exact", head: true })
        .eq("severity", "critical").eq("repair_status", "open");
      if ((count || 0) > 0) blockers.push(`critical_findings_open:${count}`);
    }
    const { count: testRuns } = await admin.from("autonomy_action_audit")
      .select("*", { count: "exact", head: true })
      .eq("action_type", gate.action_type).eq("allowed", true);
    if ((testRuns || 0) < (gate.requires_successful_test_runs || 0)) {
      blockers.push(`needs_${gate.requires_successful_test_runs}_test_runs (have ${testRuns || 0})`);
    }

    if (blockers.length > 0) {
      await admin.from("autonomy_action_audit").insert({
        business_id: gate.business_id,
        action_type: "autopilot_final_activate_blocked",
        allowed: false,
        founder_approval_required: true,
        external_action: gate.external_action,
        email_sent: false, provider_mutation: false, credit_spend: false,
        source_table: "autopilot_activation_gates", source_id: gate.id,
        blocked_reason: blockers.join(";"),
        metadata: { gate_key: gate.gate_key, approval_id, blockers },
      });
      return new Response(JSON.stringify({ ok: false, blocked: true, blockers }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only enable internal low-risk gates by default. External gates require explicit high-risk phrase.
    const willEnable = !gate.external_action || (gate.external_action && high_risk_confirmation_phrase === HIGH_RISK_PHRASE);
    if (!willEnable) {
      return new Response(JSON.stringify({ ok: false, blocked: true, blockers: ["external_gate_requires_high_risk_phrase"] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("autopilot_activation_gates").update({
      enabled: true,
      current_state: "active",
      metadata: {
        ...(gate.metadata || {}),
        activated_by: user.id,
        activated_at: new Date().toISOString(),
        approval_id,
      },
    }).eq("id", gate.id);

    await admin.from("autonomy_action_audit").insert({
      business_id: gate.business_id,
      action_type: "autopilot_final_activate",
      allowed: true,
      founder_approval_required: false,
      external_action: gate.external_action,
      email_sent: false, provider_mutation: false, credit_spend: false,
      source_table: "autopilot_activation_gates", source_id: gate.id,
      metadata: { gate_key: gate.gate_key, approval_id, activated_by: user.id },
    });

    return new Response(JSON.stringify({ ok: true, gate_id: gate.id, gate_key: gate.gate_key, enabled: true, state: "active" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});