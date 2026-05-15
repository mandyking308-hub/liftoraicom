import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SMARTLEAD_BASE_URL = "https://server.smartlead.ai/api/v1";
const CONFIRMATION_PHRASE = "MAP SMARTLEAD CAMPAIGN";

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
 * Smartlead Campaign Mapping Apply — founder-gated, idempotent insert/update
 * to public.outbound_provider_campaign_mappings ONLY.
 *
 * Hard-blocked from any Smartlead mutation, lead push, or sending.
 * Validates the Smartlead campaign exists via read-only GET before persisting.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SMARTLEAD_API_KEY = Deno.env.get("SMARTLEAD_API_KEY") ?? null;

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
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_body" }, 400);
  }

  const liftorCampaignId = String(body.liftor_campaign_id ?? "").trim();
  const providerCampaignId = String(body.provider_campaign_id ?? "").trim();
  const confirmation = String(body.confirmation ?? "").trim();

  if (!liftorCampaignId) return json({ ok: false, error: "liftor_campaign_id_required" }, 400);
  if (!providerCampaignId) return json({ ok: false, error: "provider_campaign_id_required" }, 400);
  if (confirmation !== CONFIRMATION_PHRASE) {
    return json({ ok: false, error: "confirmation_phrase_mismatch", expected: CONFIRMATION_PHRASE }, 400);
  }
  if (!SMARTLEAD_API_KEY || SMARTLEAD_API_KEY.length < 8) {
    return json({ ok: false, error: "smartlead_api_key_missing" }, 400);
  }

  // Provider row
  const { data: provider } = await admin
    .from("outbound_providers")
    .select("id, provider_type")
    .eq("provider_type", "smartlead")
    .maybeSingle();
  if (!provider) return json({ ok: false, error: "smartlead_provider_row_missing" }, 404);

  // Liftor campaign must exist
  const { data: liftorCampaign } = await admin
    .from("outreach_campaigns")
    .select("id, campaign_name, business_id, business_name")
    .eq("id", liftorCampaignId)
    .maybeSingle();
  if (!liftorCampaign) return json({ ok: false, error: "liftor_campaign_not_found" }, 404);

  // Server-side validation: read Smartlead campaign list and confirm provider campaign exists
  const listUrl = `${SMARTLEAD_BASE_URL}/campaigns/?include_tags=true&api_key=${encodeURIComponent(
    SMARTLEAD_API_KEY,
  )}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12_000);
  let smartleadCampaign: any = null;
  let httpStatus = 0;
  try {
    const res = await fetch(listUrl, { method: "GET", signal: ctrl.signal });
    httpStatus = res.status;
    const txt = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(txt); } catch { /* */ }
    if (!res.ok) return json({ ok: false, error: `smartlead_list_http_${res.status}` }, 502);
    const list: any[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.data)
        ? parsed.data
        : Array.isArray(parsed?.results)
          ? parsed.results
          : [];
    smartleadCampaign = list.find(
      (c) => String(c?.id ?? c?.campaign_id ?? "") === providerCampaignId,
    );
  } catch (e: any) {
    return json({ ok: false, error: "smartlead_fetch_failed", detail: e?.message ?? String(e) }, 502);
  } finally {
    clearTimeout(t);
  }
  if (!smartleadCampaign) {
    return json({ ok: false, error: "smartlead_campaign_not_found", provider_campaign_id: providerCampaignId, http_status: httpStatus }, 404);
  }

  const providerCampaignName = String(
    smartleadCampaign?.name ?? smartleadCampaign?.campaign_name ?? "",
  );
  const providerCampaignStatus = smartleadCampaign?.status ?? null;

  // Idempotent upsert keyed on (provider_id, liftor_campaign_id)
  const { data: existing } = await admin
    .from("outbound_provider_campaign_mappings")
    .select("id")
    .eq("provider_id", provider.id)
    .eq("liftor_campaign_id", liftorCampaignId)
    .maybeSingle();

  const nowIso = new Date().toISOString();
  const payload = {
    business_id: liftorCampaign.business_id,
    liftor_campaign_id: liftorCampaignId,
    provider_id: provider.id,
    provider_type: "smartlead",
    provider_campaign_id: providerCampaignId,
    provider_campaign_name: providerCampaignName,
    provider_campaign_status: providerCampaignStatus ? String(providerCampaignStatus) : null,
    mapping_status: "mapped",
    is_active: true,
    last_synced_at: nowIso,
    last_error: null as string | null,
    metadata: {
      mapped_by_user_id: u.user.id,
      mapped_at: nowIso,
      confirmation_phrase: CONFIRMATION_PHRASE,
      liftor_campaign_name: liftorCampaign.campaign_name,
      smartlead_campaign_status: providerCampaignStatus,
    },
    updated_at: nowIso,
  };

  let mappingId: string | null = null;
  if (existing?.id) {
    const { data, error } = await admin
      .from("outbound_provider_campaign_mappings")
      .update(payload)
      .eq("id", existing.id)
      .select("id")
      .maybeSingle();
    if (error) return json({ ok: false, error: "mapping_update_failed", detail: error.message }, 500);
    mappingId = data?.id ?? existing.id;
  } else {
    const { data, error } = await admin
      .from("outbound_provider_campaign_mappings")
      .insert(payload)
      .select("id")
      .maybeSingle();
    if (error) return json({ ok: false, error: "mapping_insert_failed", detail: error.message }, 500);
    mappingId = data?.id ?? null;
  }

  return json({
    ok: true,
    action: existing?.id ? "updated" : "inserted",
    mapping_id: mappingId,
    provider_id: provider.id,
    liftor_campaign_id: liftorCampaignId,
    provider_campaign_id: providerCampaignId,
    provider_campaign_name: providerCampaignName,
    provider_campaign_status: providerCampaignStatus,
    mapping_status: "mapped",
    is_active: true,
    notes:
      "Mapping persisted. NO Smartlead mutation. NO lead push. NO email sent. Sending remains hard-disabled.",
  });
});