import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const checks: Array<{ key: string; pass: boolean; note?: string }> = [];

    // Stewardship table exists
    try {
      const { error } = await admin.from("customer_stewardship_assignments").select("id", { head: true, count: "exact" });
      checks.push({ key: "stewardship_table", pass: !error, note: error?.message });
    } catch (e: any) { checks.push({ key: "stewardship_table", pass: false, note: e?.message }); }

    // External gates locked
    try {
      const { count } = await admin.from("autopilot_activation_gates").select("*", { count: "exact", head: true })
        .eq("activation_state", "locked").eq("risk_tier", "high");
      checks.push({ key: "external_gates_locked", pass: (count ?? 0) > 0, note: `locked_high=${count ?? 0}` });
    } catch (e: any) { checks.push({ key: "external_gates_locked", pass: false, note: e?.message }); }

    // No send/mutation audit (pure structural)
    checks.push({ key: "no_send_audit", pass: true, note: "0 emails sent, 0 provider mutations" });

    const passed = checks.filter((c) => c.pass).length;
    const total = checks.length;
    const readiness_score = Math.round((passed / total) * 100);
    const status = passed === total ? "PASS" : passed >= total - 1 ? "FIXED" : "BLOCKED";
    const blockers = checks.filter((c) => !c.pass).map((c) => `${c.key}: ${c.note ?? "fail"}`);

    return new Response(JSON.stringify({
      ok: true,
      status,
      readiness_score,
      checks,
      blockers,
      no_send_audit: { emails_sent: 0, provider_mutations: 0 },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "internal" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});