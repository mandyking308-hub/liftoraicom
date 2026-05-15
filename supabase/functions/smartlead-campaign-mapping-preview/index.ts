import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SMARTLEAD_BASE_URL = "https://server.smartlead.ai/api/v1";

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
 * Smartlead Campaign Mapping Preview — read-only.
 *
 * Reads:
 *  - GET /campaigns/?include_tags=true (Smartlead)
 *  - public.outreach_campaigns (Liftor)
 *  - public.outbound_provider_campaign_mappings (Liftor)
 *
 * Returns suggested mappings (name match) without writing anything.
 * No Smartlead mutation. No campaign creation. No DB writes.
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

  const { data: provider } = await admin
    .from("outbound_providers")
    .select("id, provider_type, status")
    .eq("provider_type", "smartlead")
    .maybeSingle();

  if (!provider) return json({ ok: false, error: "smartlead_provider_row_missing" }, 404);

  if (!SMARTLEAD_API_KEY || SMARTLEAD_API_KEY.length < 8) {
    return json({
      ok: false,
      blocked: true,
      reason: "credentials_missing",
      smartlead_campaigns: [],
      liftor_campaigns: [],
      suggested_mappings: [],
      existing_mappings: [],
      next_action: "Add SMARTLEAD_API_KEY secret, rerun readiness, then retry.",
    });
  }

  // Smartlead read-only fetch
  const url = `${SMARTLEAD_BASE_URL}/campaigns/?include_tags=true&api_key=${encodeURIComponent(
    SMARTLEAD_API_KEY,
  )}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12_000);
  let smartleadCampaigns: any[] = [];
  let httpStatus = 0;
  let lastError: string | null = null;
  try {
    const res = await fetch(url, { method: "GET", signal: ctrl.signal });
    httpStatus = res.status;
    const txt = await res.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(txt);
    } catch {
      /* */
    }
    if (res.ok) {
      smartleadCampaigns = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.data)
          ? parsed.data
          : Array.isArray(parsed?.results)
            ? parsed.results
            : [];
    } else {
      lastError = `campaigns_http_${res.status}`;
    }
  } catch (e: any) {
    lastError = `fetch_error: ${e?.message ?? String(e)}`;
  } finally {
    clearTimeout(t);
  }

  const { data: liftorCampaigns } = await admin
    .from("outreach_campaigns")
    .select("id, campaign_name, business_name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: existingMappings } = await admin
    .from("outbound_provider_campaign_mappings")
    .select(
      "id, provider_id, provider_campaign_id, provider_campaign_name, mapping_status, is_active, liftor_campaign_id, last_synced_at",
    )
    .eq("provider_id", provider.id);

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const suggested: any[] = [];
  for (const sc of smartleadCampaigns) {
    const slName = String(sc?.name ?? sc?.campaign_name ?? "").trim();
    if (!slName) continue;
    const match = (liftorCampaigns ?? []).find(
      (lc: any) => norm(lc.campaign_name ?? "") === norm(slName),
    );
    if (match) {
      suggested.push({
        provider_campaign_id: String(sc.id ?? sc.campaign_id ?? ""),
        provider_campaign_name: slName,
        provider_campaign_status: sc?.status ?? null,
        liftor_campaign_id: match.id,
        liftor_campaign_name: match.campaign_name,
        match_reason: "name_normalized_equal",
      });
    }
  }

  const blocked = smartleadCampaigns.length === 0;

  return json({
    ok: !lastError,
    blocked,
    reason: blocked
      ? "no_smartlead_campaigns_exist"
      : lastError
        ? "smartlead_fetch_failed"
        : null,
    http_status: { campaigns: httpStatus },
    provider_id: provider.id,
    smartlead_campaign_count: smartleadCampaigns.length,
    liftor_campaign_count: (liftorCampaigns ?? []).length,
    smartlead_campaigns: smartleadCampaigns.slice(0, 50).map((c: any) => ({
      id: c?.id ?? c?.campaign_id ?? null,
      name: c?.name ?? c?.campaign_name ?? null,
      status: c?.status ?? null,
      created_at: c?.created_at ?? null,
    })),
    liftor_campaigns: (liftorCampaigns ?? []).slice(0, 50),
    suggested_mappings: suggested,
    existing_mappings: existingMappings ?? [],
    next_action: blocked
      ? "Create a draft campaign in Smartlead, then rerun this preview."
      : suggested.length === 0
        ? "No name-matched mappings — review manually before persisting."
        : "Review suggested mappings; persisting them is a separate (not-yet-built) action.",
    notes:
      "Read-only: no Smartlead writes, no campaigns created, no leads pushed, no mapping rows persisted.",
  });
});