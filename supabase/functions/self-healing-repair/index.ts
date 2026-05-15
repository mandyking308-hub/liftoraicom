import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONFIRMATION = "APPLY SAFE REPAIR";

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
    const findingId: string = body?.finding_id;
    const confirm: string = body?.confirmation || "";
    if (!findingId) return new Response(JSON.stringify({ error: "finding_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: finding, error: fErr } = await admin.from("self_healing_findings").select("*").eq("id", findingId).maybeSingle();
    if (fErr || !finding) return new Response(JSON.stringify({ error: "finding not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: rule } = await admin.from("self_healing_rules").select("*").eq("rule_key", finding.rule_key).maybeSingle();

    const safe = finding.repair_safe === true && rule?.safe_auto_repair_allowed === true;

    if (!safe) {
      // Escalate — never apply
      await admin.from("self_healing_findings").update({
        repair_status: "awaiting_founder_approval",
        founder_approval_required: true,
        metadata: { ...(finding.metadata || {}), escalated_at: new Date().toISOString(), escalated_by: user.id },
      }).eq("id", findingId);
      return new Response(JSON.stringify({
        ok: true, applied: false, escalated: true,
        reason: "Repair not marked safe — founder approval required.",
        no_external_action: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (confirm !== CONFIRMATION) {
      return new Response(JSON.stringify({
        ok: false, applied: false,
        error: `Confirmation phrase required: "${CONFIRMATION}"`,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Safe internal-only repair: mark as repaired and log. No external mutation.
    await admin.from("self_healing_findings").update({
      repair_status: "repaired_internal",
      metadata: {
        ...(finding.metadata || {}),
        repaired_at: new Date().toISOString(),
        repaired_by: user.id,
        repair_action_type: rule?.repair_action_type || "internal_flag",
        no_external_action: true,
      },
    }).eq("id", findingId);

    return new Response(JSON.stringify({
      ok: true, applied: true, escalated: false,
      repair_action_type: rule?.repair_action_type || "internal_flag",
      no_external_action: true, no_provider_call: true, no_email_sent: true, no_delete: true,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as any)?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});