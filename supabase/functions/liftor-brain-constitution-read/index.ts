import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(url, serviceKey);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: u } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!u?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const ok = (roles ?? []).some((r: any) => r.role === "founder" || r.role === "admin");
  if (!ok) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const version = body.version ?? null;
  const include_full_text = body.include_full_text !== false;

  let query = admin
    .from("liftor_brain_constitution_versions")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);
  if (version) {
    query = admin
      .from("liftor_brain_constitution_versions")
      .select("*")
      .eq("version", version)
      .order("created_at", { ascending: false })
      .limit(1);
  }
  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    return new Response(JSON.stringify({ error: "constitution_not_found", details: error?.message ?? null }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const c = data[0];

  return new Response(JSON.stringify({
    constitution_id: c.id,
    version: c.version,
    status: c.status,
    constitution_text: include_full_text ? c.constitution_text : null,
    identity_rules: c.identity_rules,
    operating_style_rules: c.operating_style_rules,
    safety_rules: c.safety_rules,
    forbidden_actions: c.forbidden_actions,
    allowed_actions: c.allowed_actions,
    email_reply_rules: c.email_reply_rules,
    tool_use_rules: c.tool_use_rules,
    output_style_rules: c.output_style_rules,
    founder_preferences: c.founder_preferences,
    created_at: c.created_at,
    no_external_action: true,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});