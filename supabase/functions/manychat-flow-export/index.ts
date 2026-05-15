import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function renderBlueprint(b: any): string {
  const tags = Array.isArray(b.qualification_tags) ? b.qualification_tags.join(", ") : "";
  return [
    `MANYCHAT FLOW BLUEPRINT — MANUAL SETUP`,
    `Flow name: ${b.flow_name}`,
    `Flow key: ${b.flow_key}`,
    `Platform: ${b.platform_key}`,
    `Trigger keyword: ${b.trigger_keyword ?? "(none)"}`,
    ``,
    `STEP 1 — Public comment reply`,
    `  Reply: ${b.public_reply ?? "(none)"}`,
    ``,
    `STEP 2 — DM opening message`,
    `  Message: ${b.dm_opening ?? "(none)"}`,
    `  Button text: ${b.button_text ?? "(none)"}`,
    `  Button URL: ${b.button_url ?? "(none)"}`,
    ``,
    `STEP 3 — Followup question`,
    `  Question: ${b.followup_question ?? "(none)"}`,
    ``,
    `STEP 4 — Tagging / qualification`,
    `  Tags: ${tags || "(none)"}`,
    ``,
    `SAFETY`,
    `  This blueprint is for manual setup inside ManyChat by the founder.`,
    `  Liftor does not call the ManyChat API and does not send DMs automatically.`,
    `  Live status: ${b.live_in_manychat ? "live (set manually in ManyChat)" : "not live"}`,
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(url, service);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id);
    const isFounder = (roles ?? []).some((r: any) => r.role === "founder" || r.role === "admin");
    if (!isFounder) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const blueprint_id: string | undefined = body?.blueprint_id;
    const business_id: string | undefined = body?.business_id;

    let q = admin.from("manychat_flow_blueprints").select("*");
    if (blueprint_id) q = q.eq("id", blueprint_id);
    else if (business_id) q = q.eq("business_id", business_id);
    const { data, error } = await q;
    if (error) throw error;
    const blueprints = data ?? [];

    const exports = blueprints.map((b: any) => ({
      id: b.id,
      flow_key: b.flow_key,
      flow_name: b.flow_name,
      platform_key: b.platform_key,
      trigger_keyword: b.trigger_keyword,
      manual_setup_text: renderBlueprint(b),
    }));

    return new Response(JSON.stringify({
      status: "ok",
      count: exports.length,
      exports,
      safety_audit: { no_manychat_api_call: true, no_external_dm: true },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});