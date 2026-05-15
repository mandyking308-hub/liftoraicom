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

const CONFIRMATION = "PUSH SMARTLEAD LEADS";

/**
 * Smartlead Lead Push APPLY — DISABLED BY DEFAULT.
 *
 * This function exists so the future apply path is wired, audited, and
 * gated behind:
 *   1. SMARTLEAD_LEAD_PUSH_ENABLED=true env flag
 *   2. dry_run=false
 *   3. confirmation_phrase exact match
 *   4. founder/admin auth
 * Without all four, NO Smartlead POST is made, NO leads pushed, NO
 * emails sent. Today this returns blocked.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const FEATURE_FLAG = (Deno.env.get("SMARTLEAD_LEAD_PUSH_ENABLED") ?? "").toLowerCase() === "true";

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
  try { body = await req.json(); } catch { /* */ }
  const dry_run: boolean = body.dry_run !== false; // default true
  const confirmation_phrase: string = String(body.confirmation_phrase ?? "");
  const campaign_mapping_id: string | null = body.campaign_mapping_id ?? null;
  const max_batch_size = Math.min(Math.max(Number(body.max_batch_size ?? 5), 1), 50);

  // Hard safety gates — ALL must pass before any external POST
  const gates = {
    feature_flag_on: FEATURE_FLAG,
    confirmation_match: confirmation_phrase === CONFIRMATION,
    not_dry_run: dry_run === false,
    has_mapping_id: !!campaign_mapping_id,
  };
  const allow_post =
    gates.feature_flag_on && gates.confirmation_match && gates.not_dry_run && gates.has_mapping_id;

  if (!allow_post) {
    return json({
      ok: true,
      blocked: true,
      reason: "smartlead_lead_push_disabled",
      gates,
      dry_run,
      provider_calls: 0,
      leads_pushed: 0,
      max_batch_size,
      notes:
        "No leads pushed. No Smartlead POST calls. No emails sent. Apply path is intentionally disabled.",
    });
  }

  // The block below intentionally never runs in current build because
  // SMARTLEAD_LEAD_PUSH_ENABLED is not configured. Kept for future wiring.
  return json({
    ok: false,
    blocked: true,
    reason: "post_path_not_implemented_yet",
    provider_calls: 0,
    leads_pushed: 0,
    notes:
      "Future apply path: would record provider_lead_id into outbound_provider_lead_mappings after a successful POST. Not implemented in this build.",
  });
});
