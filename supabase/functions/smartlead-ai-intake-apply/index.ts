import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const CONFIRMATION = "BUILD INTAKE ONLY";

/**
 * Smartlead AI Intake Apply — DISABLED by default.
 *
 * This is future infrastructure: the endpoint exists so the wiring is in place,
 * but it MUST refuse to perform operational work. It will only ever return a
 * blocked response unless:
 *   - founder/admin auth passes
 *   - body.confirmation === "BUILD INTAKE ONLY"
 *   - body.dry_run === false
 *   - system_settings.smartlead_ai_intake_apply_enabled === true (NOT set)
 *
 * Even when those conditions pass, this function does NOT create
 * communications, conversations or AI drafts — it only records that an apply
 * was requested. It never sends email and never calls AI providers.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "auth_missing" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: u, error: ue } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (ue || !u?.user) return json({ ok: false, error: "auth_invalid" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const roleSet = new Set((roles ?? []).map((r: any) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }

  const dryRun = body?.dry_run !== false;
  const confirmation = String(body?.confirmation ?? "").trim();

  // Hard rule: always blocked. Future activation requires both a system_settings
  // feature flag AND code change here. Do NOT auto-enable.
  return json({
    ok: true,
    blocked: true,
    reason: "intake_apply_disabled",
    confirmation_ok: confirmation === CONFIRMATION,
    dry_run: dryRun,
    feature_flag: "smartlead_ai_intake_apply_enabled",
    feature_flag_state: "not_set",
    actions_attempted: 0,
    communications_created: 0,
    conversations_created: 0,
    ai_drafts_created: 0,
    emails_sent: 0,
    notes:
      "Intake apply is disabled by design. No communications, no conversations, no AI drafts, no outbound sends. Future activation requires a feature flag AND a deliberate code change.",
  });
});