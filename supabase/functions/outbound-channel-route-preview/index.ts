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

/**
 * Outbound Channel Route Preview — read-only.
 * Returns which lane (Smartlead scale vs native Liftor/IONOS) should
 * handle a given communication_type for an optional business / contact.
 * No sends, no Smartlead writes, no DB mutations.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SMARTLEAD_API_KEY = Deno.env.get("SMARTLEAD_API_KEY") ?? null;
  const SMARTLEAD_WEBHOOK_SECRET = Deno.env.get("SMARTLEAD_WEBHOOK_SECRET") ?? null;

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
  const communication_type: string = String(body.communication_type ?? "").trim();
  const business_id: string | null = body.business_id ?? null;
  const contact_id: string | null = body.contact_id ?? null;
  const campaign_id: string | null = body.campaign_id ?? null;

  if (!communication_type) {
    return json({ ok: false, error: "communication_type_required" }, 400);
  }

  // Pull policy: business-specific row first, then global default.
  let policy: any = null;
  if (business_id) {
    const { data } = await admin
      .from("outbound_channel_policies")
      .select("*")
      .eq("business_id", business_id)
      .eq("communication_type", communication_type)
      .maybeSingle();
    policy = data ?? null;
  }
  if (!policy) {
    const { data } = await admin
      .from("outbound_channel_policies")
      .select("*")
      .is("business_id", null)
      .eq("communication_type", communication_type)
      .maybeSingle();
    policy = data ?? null;
  }

  if (!policy) {
    return json({
      ok: true,
      read_only: true,
      communication_type,
      recommended_channel: null,
      provider_type: null,
      smartlead_allowed: false,
      native_allowed: false,
      requires_founder_approval: true,
      auto_send_allowed: false,
      scale_allowed: false,
      blockers: ["no_policy_found"],
      notes: "No matching policy. Founder must define one before routing.",
    });
  }

  // Provider readiness (Smartlead) — read-only.
  const { data: smartleadProvider } = await admin
    .from("outbound_providers")
    .select("id, mode, status, credentials_present, webhook_configured, sending_domain, provider_health, warmup_status, last_test_at")
    .eq("provider_type", "smartlead")
    .maybeSingle();

  // Compliance state for the contact, if supplied.
  let contactCompliance: any = null;
  if (contact_id) {
    const { data } = await admin
      .from("contacts")
      .select("id, status, unsubscribed_at, lawful_basis, do_not_contact, bounced_at")
      .eq("id", contact_id)
      .maybeSingle();
    contactCompliance = data ?? null;
  }

  const blockers: string[] = [];

  // Lane B (Smartlead) readiness
  const smartleadReady =
    !!SMARTLEAD_API_KEY &&
    !!smartleadProvider &&
    !!smartleadProvider.credentials_present;
  if (policy.recommended_channel === "smartlead") {
    if (!SMARTLEAD_API_KEY) blockers.push("smartlead_api_key_missing");
    if (!smartleadProvider) blockers.push("smartlead_provider_row_missing");
    if (smartleadProvider && !smartleadProvider.webhook_configured) blockers.push("no_webhook_configured");
    if (!SMARTLEAD_WEBHOOK_SECRET) blockers.push("smartlead_webhook_secret_missing");
    blockers.push("no_campaign_mapping_confirmed");
    blockers.push("lead_push_not_ready");
    blockers.push("scale_sending_disabled");
  }

  // Lane A (native IONOS) is currently SAFE_BLOCKED at the system level.
  if (policy.recommended_channel === "native" || policy.recommended_channel === "native_manual" || policy.recommended_channel === "liftor_conversation") {
    blockers.push("native_lane_safe_blocked");
    blockers.push("auto_send_disabled");
    blockers.push("manual_send_apply_not_built");
  }

  // Compliance blockers, if a contact was supplied.
  if (contactCompliance) {
    if (contactCompliance.unsubscribed_at) blockers.push("contact_unsubscribed");
    if (contactCompliance.do_not_contact) blockers.push("contact_do_not_contact");
    if (contactCompliance.bounced_at) blockers.push("contact_previously_bounced");
    if (!contactCompliance.lawful_basis) blockers.push("contact_missing_lawful_basis");
  }

  return json({
    ok: true,
    read_only: true,
    communication_type,
    business_id,
    contact_id,
    campaign_id,
    recommended_channel: policy.recommended_channel,
    provider_type: policy.provider_type,
    smartlead_allowed: !!policy.smartlead_allowed,
    native_allowed: !!policy.native_allowed,
    requires_founder_approval: !!policy.requires_founder_approval,
    auto_send_allowed: !!policy.auto_send_allowed,
    scale_allowed: !!policy.scale_allowed,
    smartlead_ready: smartleadReady,
    smartlead_webhook_configured: !!smartleadProvider?.webhook_configured,
    blockers,
    policy_source: business_id ? (policy.business_id ? "business" : "global_fallback") : "global",
    notes:
      policy.notes ??
      "Read-only routing preview. No emails sent, no Smartlead writes, no DB mutations.",
  });
});
