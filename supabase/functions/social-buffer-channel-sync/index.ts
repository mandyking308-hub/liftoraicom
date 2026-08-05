import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { bufferGraphQL, bufferKeyPresent, CHANNELS_QUERY, resolveOrganizationId } from "../_shared/bufferClient.ts";
import { audit, getConnection } from "../_shared/socialDistributionDb.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id } = body;
  const requested = body.organization_id;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  if (requested !== undefined && requested !== null &&
      (typeof requested !== "string" || requested.length > 128)) {
    return json({ ok: false, error: "organization_id_invalid" }, 400);
  }
  // Explicit founder-selected organisation first, then the stored connection
  // organisation, then the OPTIONAL secure BUFFER_ORGANIZATION_ID fallback.
  const existing = await getConnection(a.admin, business_id, "buffer");
  const organization_id = (typeof requested === "string" && requested.trim())
    ? requested.trim()
    : resolveOrganizationId(existing?.provider_organization_id);
  if (!organization_id) return json({ ok: false, error: "organization_id_required" }, 400);
  if (!bufferKeyPresent()) return json({ ok: false, error: "buffer_api_key_missing" });

  const res = await bufferGraphQL<{ channels: any[] }>(CHANNELS_QUERY, { organizationId: organization_id });
  if (!res.ok) {
    await audit(a.admin, { business_id, action: "buffer_channel_sync", result_json: { ok: false }, error_message: res.errorMessage });
    return json({ ok: false, error: res.errorMessage });
  }

  const conn = existing;

  const channels = res.data?.channels ?? [];
  const upserted: any[] = [];
  for (const c of channels) {
    const row = {
      provider: "buffer",
      provider_connection_id: conn?.id ?? null,
      provider_organization_id: organization_id,
      external_channel_id: String(c.id),
      name: c.name ?? null,
      display_name: c.displayName ?? null,
      service: c.service ?? null,
      avatar_url: c.avatar ?? null,
      external_link: c.externalLink ?? null,
      is_queue_paused: !!c.isQueuePaused,
      is_disconnected: !!c.isDisconnected,
      is_locked: !!c.isLocked,
      last_synced_at: new Date().toISOString(),
      raw_json: c ?? {},
    };
    const { data: up } = await a.admin.from("social_provider_channels")
      .upsert(row, { onConflict: "provider,provider_organization_id,external_channel_id" }).select().maybeSingle();
    if (up) upserted.push(up);
  }

  await a.admin.from("social_provider_connections")
    .update({ provider_organization_id: organization_id, last_channel_sync_at: new Date().toISOString() })
    .eq("business_id", business_id).eq("provider", "buffer");

  await audit(a.admin, { business_id, action: "buffer_channel_sync", result_json: { ok: true, channels: upserted.length } });
  return json({ ok: true, synced: upserted.length, channels: upserted, no_secrets_returned: true });
});
