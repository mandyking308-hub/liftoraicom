import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Disabled-by-default writer for ai_agent_task_queue.
// Requires:
//   AI_AGENT_TASK_QUEUE_ENABLED=true (env)
//   confirmation_phrase === "QUEUE AI AGENT TASKS"
// Even when enabled, only writes into ai_agent_task_queue.
// NEVER sends emails, calls Apollo, or POSTs to Smartlead.

const CONFIRMATION_PHRASE = "QUEUE AI AGENT TASKS";

async function authPriv(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", data.claims.sub);
  if (!(roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder")) {
    return { error: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  return { admin };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authPriv(req);
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false; // default true
    const phrase = String(body?.confirmation_phrase ?? "");

    const enabled = (Deno.env.get("AI_AGENT_TASK_QUEUE_ENABLED") ?? "").toLowerCase() === "true";
    if (!enabled) {
      return new Response(
        JSON.stringify({
          ok: true,
          blocked: true,
          reason: "ai_agent_task_queue_disabled",
          feature_flag_name: "AI_AGENT_TASK_QUEUE_ENABLED",
          tasks_created: 0,
          emails_sent: 0,
          provider_calls: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (phrase !== CONFIRMATION_PHRASE) {
      return new Response(
        JSON.stringify({
          ok: true,
          blocked: true,
          reason: "missing_confirmation_phrase",
          required_phrase: CONFIRMATION_PHRASE,
          tasks_created: 0,
          emails_sent: 0,
          provider_calls: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (dryRun) {
      return new Response(
        JSON.stringify({
          ok: true,
          blocked: true,
          reason: "dry_run_only",
          tasks_created: 0,
          emails_sent: 0,
          provider_calls: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    // Writer not implemented yet — keep disabled.
    return new Response(
      JSON.stringify({
        ok: true,
        blocked: true,
        reason: "task_queue_writer_not_yet_implemented",
        tasks_created: 0,
        emails_sent: 0,
        provider_calls: 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});