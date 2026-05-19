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

  // Auth
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
  const provider_key = body.provider_key ?? "openai";
  const write_audit = body.write_audit !== false;

  // Ensure config row
  let { data: cfg } = await admin
    .from("liftor_brain_provider_config")
    .select("*")
    .eq("provider_key", provider_key)
    .maybeSingle();

  if (!cfg) {
    const { data: inserted } = await admin
      .from("liftor_brain_provider_config")
      .insert({
        provider_key,
        provider_name: provider_key === "openai" ? "OpenAI" : provider_key,
        provider_status: "not_configured",
        secret_name: "OPENAI_API_KEY",
        default_model: "gpt-5.5",
        secret_value_stored: false,
      })
      .select("*")
      .maybeSingle();
    cfg = inserted ?? null;
  }

  const secret_name = cfg?.secret_name ?? "OPENAI_API_KEY";
  const secret_present = Boolean(Deno.env.get(secret_name) && Deno.env.get(secret_name)!.length > 0);

  let provider_status = "not_configured";
  try {
    provider_status = secret_present ? "configured" : "not_configured";
    await admin
      .from("liftor_brain_provider_config")
      .update({
        provider_status,
        secret_value_stored: false,
        last_checked_at: new Date().toISOString(),
      })
      .eq("provider_key", provider_key);
  } catch (_e) {
    provider_status = "error";
  }

  if (write_audit) {
    await admin.from("liftor_brain_audit").insert({
      action: secret_present ? "provider_configured" : "provider_missing",
      action_status: "recorded",
      details: { provider_key, provider_status, secret_present, secret_value_returned: false, secret_value_stored: false },
    });
  }

  const next_action = secret_present
    ? "Provider configured. Proceed to Prompt 21D context builder or 21F chat only after context/tool safety layers are complete."
    : "Add OPENAI_API_KEY as a Supabase Edge Function secret, then rerun provider check.";

  return new Response(JSON.stringify({
    provider_key,
    provider_name: cfg?.provider_name ?? "OpenAI",
    provider_status,
    secret_name,
    secret_present,
    secret_value_returned: false,
    secret_value_stored: false,
    can_call_ai: secret_present,
    default_model: cfg?.default_model ?? "gpt-5.5",
    max_context_tokens: cfg?.max_context_tokens ?? null,
    max_output_tokens: cfg?.max_output_tokens ?? null,
    temperature: cfg?.temperature ?? null,
    last_checked_at: new Date().toISOString(),
    fail_closed_if_missing: true,
    next_action,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});