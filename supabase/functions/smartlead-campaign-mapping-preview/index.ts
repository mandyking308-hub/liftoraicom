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
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

/** Read-only Smartlead discovery, always scoped to an explicit business connection. */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceKey || !anonKey) return json({ ok: false, error: "preview_unavailable" }, 503);

  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ ok: false, error: "auth_missing" }, 401);
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(authorization.slice(7));
  if (userError || !userData?.user) return json({ ok: false, error: "auth_invalid" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id);
  const roles = new Set((roleRows ?? []).map((row: { role: string }) => row.role));
  if (!roles.has("founder") && !roles.has("admin")) return json({ ok: false, error: "forbidden" }, 403);

  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = await req.json();
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
  } catch {
    // An empty body is the safe connection-selection response.
  }
  const providerConnectionId = String(body.provider_connection_id ?? "").trim();

  const { data: connectionRows, error: connectionsError } = await admin
    .from("outbound_provider_connections")
    .select("id,business_id,display_name,provider_type,connection_status,is_enabled,inbound_receiver_enabled,mutations_enabled,credential_secret_ref,webhook_secret_ref")
    .eq("provider_type", "smartlead")
    .eq("connection_status", "verified")
    .eq("is_enabled", true);
  if (connectionsError) return json({ ok: false, error: "connection_lookup_failed" }, 503);

  const connections = (connectionRows ?? []).map((row: Record<string, unknown>) => ({
    id: row.id,
    business_id: row.business_id,
    display_name: row.display_name,
  }));
  if (!providerConnectionId) {
    return json({
      ok: false,
      blocked: true,
      reason: "provider_connection_id_required",
      provider_connections: connections,
      smartlead_campaigns: [],
      liftor_campaigns: [],
      suggested_mappings: [],
      existing_mappings: [],
      next_action: "Select an enabled Smartlead connection owned by the campaign business.",
    });
  }

  const { data: connectionRow } = await admin
    .from("outbound_provider_connections")
    .select("id,business_id,provider_type,connection_status,is_enabled,inbound_receiver_enabled,mutations_enabled,credential_secret_ref,webhook_secret_ref")
    .eq("id", providerConnectionId)
    .eq("provider_type", "smartlead")
    .eq("connection_status", "verified")
    .eq("is_enabled", true)
    .maybeSingle();
  if (!connectionRow) return json({ ok: false, error: "provider_connection_not_found" }, 404);

  const connection = connectionRow as ScopedProviderConnection;
  const apiKey = resolveProviderConnectionSecret(connection, "CREDENTIAL", (name) => Deno.env.get(name));
  const selectedConnection = connections.find((item: { id: unknown }) => item.id === connection.id);
  if (!apiKey || !selectedConnection) {
    return json({
      ok: false,
      blocked: true,
      reason: "provider_connection_credential_missing",
      provider_connections: connections,
      smartlead_campaigns: [],
      liftor_campaigns: [],
      suggested_mappings: [],
      existing_mappings: [],
    }, 409);
  }

  const { data: provider } = await admin
    .from("outbound_providers")
    .select("id,provider_type")
    .eq("provider_type", "smartlead")
    .maybeSingle();
  if (!provider) return json({ ok: false, error: "smartlead_provider_catalog_missing" }, 404);

  const response = await fetch(
    `${SMARTLEAD_BASE_URL}/campaigns/?include_tags=true&api_key=${encodeURIComponent(apiKey)}`,
    { method: "GET", signal: AbortSignal.timeout(12_000) },
  );
  const rawText = await response.text();
  let parsed: unknown = null;
  try { parsed = JSON.parse(rawText); } catch { /* provider returned non-JSON */ }
  const smartleadCampaigns: Record<string, unknown>[] = response.ok
    ? Array.isArray(parsed)
      ? parsed as Record<string, unknown>[]
      : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { data?: unknown }).data)
        ? (parsed as { data: Record<string, unknown>[] }).data
        : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { results?: unknown }).results)
          ? (parsed as { results: Record<string, unknown>[] }).results
          : []
    : [];

  const { data: liftorCampaigns, error: campaignsError } = await admin
    .from("outreach_campaigns")
    .select("id,business_id,campaign_name,business_name,status,created_at")
    .eq("business_id", connection.business_id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (campaignsError) return json({ ok: false, error: "liftor_campaign_lookup_failed" }, 503);

  const { data: existingMappings, error: mappingsError } = await admin
    .from("outbound_provider_campaign_mappings")
    .select("id,provider_id,provider_connection_id,provider_campaign_id,provider_campaign_name,mapping_status,is_active,liftor_campaign_id,last_synced_at")
    .eq("business_id", connection.business_id)
    .eq("provider_connection_id", connection.id)
    .eq("provider_type", "smartlead")
    .eq("provider_id", provider.id);
  if (mappingsError) return json({ ok: false, error: "mapping_lookup_failed" }, 503);

  const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const suggested: Record<string, unknown>[] = [];
  for (const campaign of smartleadCampaigns) {
    const smartleadName = String(campaign.name ?? campaign.campaign_name ?? "").trim();
    if (!smartleadName) continue;
    const match = (liftorCampaigns ?? []).find((candidate: Record<string, unknown>) =>
      norm(String(candidate.campaign_name ?? "")) === norm(smartleadName)
    );
    if (match) {
      suggested.push({
        provider_campaign_id: String(campaign.id ?? campaign.campaign_id ?? ""),
        provider_campaign_name: smartleadName,
        provider_campaign_status: campaign.status ?? null,
        liftor_campaign_id: match.id,
        liftor_campaign_name: match.campaign_name,
        match_reason: "name_normalized_equal",
      });
    }
  }

  const blocked = smartleadCampaigns.length === 0 || !response.ok;
  return json({
    ok: response.ok,
    blocked,
    reason: !response.ok ? `smartlead_campaigns_http_${response.status}` : blocked ? "no_smartlead_campaigns_exist" : null,
    provider_id: provider.id,
    provider_connection: selectedConnection,
    provider_connections: connections,
    smartlead_campaign_count: smartleadCampaigns.length,
    liftor_campaign_count: (liftorCampaigns ?? []).length,
    smartlead_campaigns: smartleadCampaigns.slice(0, 50).map((campaign) => ({
      id: campaign.id ?? campaign.campaign_id ?? null,
      name: campaign.name ?? campaign.campaign_name ?? null,
      status: campaign.status ?? null,
      created_at: campaign.created_at ?? null,
    })),
    liftor_campaigns: liftorCampaigns ?? [],
    suggested_mappings: suggested,
    existing_mappings: existingMappings ?? [],
    next_action: blocked ? "Check the selected Smartlead connection and provider campaign inventory." : "Review mapping suggestions before persisting.",
    notes: "Read-only provider GET only. No Smartlead write, lead push, or email send.",
  });
});
