import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONFIRMATION_PHRASE = "REQUEST AUTOPILOT ACTIVATION";

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
    const { gate_id, business_id, confirmation_phrase, justification } = body || {};

    if (confirmation_phrase !== CONFIRMATION_PHRASE) {
      return new Response(JSON.stringify({ error: "confirmation_phrase_required", expected: CONFIRMATION_PHRASE }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!gate_id) {
      return new Response(JSON.stringify({ error: "gate_id_required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: gate, error: gErr } = await admin.from("autopilot_activation_gates").select("*").eq("id", gate_id).maybeSingle();
    if (gErr || !gate) return new Response(JSON.stringify({ error: "gate_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Update gate state to requested (no enable yet)
    await admin.from("autopilot_activation_gates").update({
      current_state: gate.external_action ? "requested_high_risk" : "requested",
      metadata: { ...(gate.metadata || {}), last_request_by: user.id, last_request_at: new Date().toISOString(), justification: justification || null },
    }).eq("id", gate.id);

    // Create founder approval item
    const { data: approval, error: aErr } = await admin.from("founder_approval_items").insert({
      business_id: business_id || gate.business_id || null,
      approval_type: "autopilot_activation_request",
      source_system: "autopilot",
      source_table: "autopilot_activation_gates",
      source_id: gate.id,
      title: `Autopilot activation request: ${gate.gate_label}`,
      summary: justification || `Founder requested activation for gate ${gate.gate_key}.`,
      recommended_action: "Review eligibility and confirm with ACTIVATE RESTRICTED AUTOPILOT phrase.",
      priority_level: gate.external_action ? "high" : "normal",
      risk_flags: gate.external_action ? ["external_action", "high_risk"] : [],
      compliance_flags: [],
      status: "pending",
      execution_enabled: false,
      auto_execute_allowed: false,
      send_allowed: false,
      metadata: {
        gate_key: gate.gate_key,
        action_type: gate.action_type,
        external_action: gate.external_action,
        requested_by: user.id,
      },
    }).select().single();
    if (aErr) throw aErr;

    // Audit
    await admin.from("autonomy_action_audit").insert({
      business_id: business_id || gate.business_id || null,
      agent_key: "founder_copilot",
      action_type: "autopilot_activation_request",
      allowed: true,
      founder_approval_required: true,
      external_action: gate.external_action,
      email_sent: false,
      provider_mutation: false,
      credit_spend: false,
      source_table: "autopilot_activation_gates",
      source_id: gate.id,
      metadata: { gate_key: gate.gate_key, requested_by: user.id, approval_id: approval.id },
    });

    return new Response(JSON.stringify({ ok: true, approval_id: approval.id, gate_state: gate.external_action ? "requested_high_risk" : "requested" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});