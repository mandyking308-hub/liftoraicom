import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  resolveProviderConnectionSecret,
  type ScopedProviderConnection,
} from "../_shared/providerConnectionResolver.ts";

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

async function getJson(path: string, apiKey: string, timeoutMs = 12_000) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${SMARTLEAD_BASE_URL}${path}${sep}api_key=${encodeURIComponent(apiKey)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "GET", signal: ctrl.signal });
    const text = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { /* */ }
    return { ok: res.ok, status: res.status, body: parsed, raw_excerpt: text.slice(0, 240) };
  } catch (e: any) {
    return { ok: false, status: 0, body: null, raw_excerpt: `fetch_error: ${e?.message ?? String(e)}` };
  } finally {
    clearTimeout(t);
  }
}

/** Per-Smartlead-campaign read-only discovery. No POST. No mutation. */
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

  const providerConnectionId = String(body.provider_connection_id ?? "").trim();
  let providerCampaignId = String(body.provider_campaign_id ?? "").trim();
  if (!providerConnectionId) {
    return json({ ok: false, blocked: true, reason: "provider_connection_id_required", blockers: ["provider_connection_unbound"] }, 400);
  }

  const { data: connectionRow } = await admin
    .from("outbound_provider_connections")
    .select("id,business_id,provider_type,connection_status,is_enabled,inbound_receiver_enabled,mutations_enabled,credential_secret_ref,webhook_secret_ref")
    .eq("id", providerConnectionId)
    .eq("provider_type", "smartlead")
    .eq("connection_status", "verified")
    .eq("is_enabled", true)
    .maybeSingle();
  if (!connectionRow) return json({ ok: false, blocked: true, reason: "provider_connection_not_found", blockers: ["provider_connection_unbound"] }, 404);
  const connection = connectionRow as ScopedProviderConnection;
  const apiKey = resolveProviderConnectionSecret(connection, "CREDENTIAL", (name) => Deno.env.get(name));
  if (!apiKey || apiKey.length < 8) {
    return json({ ok: false, blocked: true, reason: "provider_connection_credential_missing", blockers: ["provider_credential_missing"] }, 409);
  }

  // Fallback: resolve from active mapping when not supplied.
  if (!providerCampaignId) {
    const { data: mapping } = await admin
      .from("outbound_provider_campaign_mappings")
      .select("provider_campaign_id, is_active, mapping_status")
      .eq("business_id", connection.business_id)
      .eq("provider_connection_id", connection.id)
      .eq("provider_type", "smartlead")
      .eq("is_active", true)
      .eq("mapping_status", "mapped")
      .order("last_synced_at", { ascending: false })
      .limit(2);
    if ((mapping ?? []).length !== 1) {
      return json({ ok: false, blocked: true, reason: "campaign_mapping_missing_or_ambiguous", blockers: ["campaign_mapping_unbound"] }, 409);
    }
    providerCampaignId = String(mapping?.[0]?.provider_campaign_id ?? "");
  }

  if (!providerCampaignId) {
    return json({
      ok: false,
      blocked: true,
      reason: "no_campaign_id_supplied_and_no_active_mapping",
      blockers: ["no_campaign_mapping"],
    });
  }
  const { data: campaignMapping } = await admin
    .from("outbound_provider_campaign_mappings")
    .select("id")
    .eq("business_id", connection.business_id)
    .eq("provider_connection_id", connection.id)
    .eq("provider_type", "smartlead")
    .eq("provider_campaign_id", providerCampaignId)
    .eq("is_active", true)
    .eq("mapping_status", "mapped")
    .limit(2);
  if ((campaignMapping ?? []).length !== 1) {
    return json({ ok: false, blocked: true, reason: "campaign_mapping_missing_or_ambiguous", blockers: ["campaign_mapping_unbound"] }, 409);
  }

  const campaign = await getJson(`/campaigns/${encodeURIComponent(providerCampaignId)}`, apiKey);
  await new Promise((r) => setTimeout(r, 200));
  const sequences = await getJson(`/campaigns/${encodeURIComponent(providerCampaignId)}/sequences`, apiKey);
  await new Promise((r) => setTimeout(r, 200));
  const accounts = await getJson(`/campaigns/${encodeURIComponent(providerCampaignId)}/email-accounts`, apiKey);
  await new Promise((r) => setTimeout(r, 200));
  const analytics = await getJson(`/campaigns/${encodeURIComponent(providerCampaignId)}/analytics`, apiKey);

  const asArr = (b: any): any[] =>
    Array.isArray(b) ? b : Array.isArray(b?.data) ? b.data : Array.isArray(b?.results) ? b.results : [];

  const sequenceCount = sequences.ok ? asArr(sequences.body).length : null;
  const connectedAccountCount = accounts.ok ? asArr(accounts.body).length : null;
  const analyticsAvailable = analytics.ok && analytics.body != null;

  const blockers: string[] = [];
  if (!campaign.ok) blockers.push(`campaign_endpoint_http_${campaign.status}`);
  if (sequences.ok && (sequenceCount ?? 0) === 0) blockers.push("no_sequences_configured");
  if (accounts.ok && (connectedAccountCount ?? 0) === 0) blockers.push("no_sending_accounts_attached");

  return json({
    ok: campaign.ok,
    provider_campaign_id: providerCampaignId,
    endpoints: {
      campaign: { status: campaign.status, supported: campaign.ok },
      sequences: { status: sequences.status, supported: sequences.ok },
      email_accounts: { status: accounts.status, supported: accounts.ok },
      analytics: { status: analytics.status, supported: analytics.ok },
    },
    campaign_summary: campaign.ok
      ? {
          id: campaign.body?.id ?? campaign.body?.data?.id ?? providerCampaignId,
          name: campaign.body?.name ?? campaign.body?.data?.name ?? null,
          status: campaign.body?.status ?? campaign.body?.data?.status ?? null,
        }
      : null,
    sequence_count: sequenceCount,
    connected_account_count: connectedAccountCount,
    analytics_available: analyticsAvailable,
    blockers,
    notes: "Read-only GETs only. No POST, no mutation, no leads pushed, no emails sent.",
  });
});
