import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import {
  VIRAL_CONFIRMATIONS, VIRAL_SAFETY_FLAGS, confirmationAccepted, resolveProviderStatus,
} from "../_shared/socialViralLogic.ts";
import { getViralProvider, listViralProviders, sanitiseProviderMessage } from "../_shared/socialViralProvider.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const ad = a.admin as any;
  const b = await req.json().catch(() => ({} as any));
  const business_id = b.business_id;
  const action = b.action ?? "status";
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);

  const loadRows = async () => {
    const { data } = await ad.from("social_viral_provider_connections")
      .select("*").eq("business_id", business_id);
    return data ?? [];
  };

  const describe = (row: any, slug: string) => {
    const p = getViralProvider(slug);
    const contract_confirmed = (p as any).contractConfirmed ? (p as any).contractConfirmed() : true;
    const resolved = resolveProviderStatus({
      configured: p.isConfigured(),
      contract_confirmed,
      last_successful_sync_at: row?.last_successful_sync_at ?? null,
      consecutive_failures: row?.consecutive_failures ?? 0,
      paused: row?.connection_status === "paused",
      manual_mode: slug === "manual_import",
    });
    return {
      provider_slug: slug,
      display_name: p.displayName,
      configured: p.isConfigured(),
      contract_confirmed,
      capabilities: p.capabilities(),
      capability_verification: p.capabilityVerification(),
      supported_platforms: p.supportedPlatforms(),
      missing_secrets: (p as any).missingSecrets ? (p as any).missingSecrets() : [],
      resolved_status: resolved.status,
      reason: resolved.reason,
      is_live: resolved.is_live,
      connection_row: row
        ? {
            id: row.id, connection_status: row.connection_status,
            last_tested_at: row.last_tested_at, last_test_result: row.last_test_result,
            last_successful_sync_at: row.last_successful_sync_at,
            consecutive_failures: row.consecutive_failures,
          }
        : null,
    };
  };

  if (action === "status" || action === "capabilities") {
    const rows = await loadRows();
    const registry = listViralProviders();
    const providers = registry.map((r) => describe(rows.find((x: any) => x.provider_slug === r.slug), r.slug));
    return json({
      ok: true, business_id, providers,
      any_provider_live: providers.some((p) => p.is_live),
      note: "A provider is only reported live after a real authenticated sync succeeds.",
      ...VIRAL_SAFETY_FLAGS,
    });
  }

  if (action === "test") {
    const slug = String(b.provider_slug ?? "manual_import");
    const p = getViralProvider(slug);
    let result;
    try {
      result = await p.test();
    } catch (e) {
      result = { ok: false, provider_slug: slug, status: "degraded" as const, code: "PROVIDER_ERROR", message: sanitiseProviderMessage(e), provider_calls: 0, signals: [], errors: [], warnings: [] };
    }
    const rows = await loadRows();
    const row = rows.find((x: any) => x.provider_slug === slug);
    if (row) {
      await ad.from("social_viral_provider_connections").update({
        last_tested_at: new Date().toISOString(),
        last_test_result: `${result.code ?? (result.ok ? "OK" : "FAILED")}: ${sanitiseProviderMessage(result.message ?? "")}`,
      }).eq("id", row.id).eq("business_id", business_id);
    }
    await ad.from("social_viral_audit").insert({
      business_id, actor_user_id: a.user.id, action: "provider_tested",
      entity_type: "provider_connection", entity_id: row?.id ?? null,
      provider_calls: result.provider_calls, notes: sanitiseProviderMessage(result.message ?? ""),
    });
    return json({ ok: true, test: { ...result, message: sanitiseProviderMessage(result.message ?? "") }, provider: describe(row, slug), ...VIRAL_SAFETY_FLAGS });
  }

  if (action === "configure") {
    const slug = String(b.provider_slug ?? "manual_import");
    const p = getViralProvider(slug);
    const dry_run = b.dry_run !== false;
    const contract_confirmed = (p as any).contractConfirmed ? (p as any).contractConfirmed() : true;
    const desired = slug === "manual_import"
      ? "manual_mode"
      : p.isConfigured() && contract_confirmed ? "not_configured" : "not_configured";
    const payload = {
      business_id,
      provider_slug: slug,
      display_name: p.displayName,
      connection_status: b.pause === true ? "paused" : desired,
      capabilities: p.capabilities(),
      capability_verification: p.capabilityVerification(),
      secret_ref_name: slug === "tubular" ? "TUBULAR_API_KEY" : null,
      config_notes: b.config_notes ? String(b.config_notes).slice(0, 500) : null,
      is_test_data: !!b.is_test_data,
    };
    if (dry_run) {
      return json({ ok: true, dry_run: true, no_records_mutated: true, preview: payload, phrase_required: VIRAL_CONFIRMATIONS.configure_provider, ...VIRAL_SAFETY_FLAGS });
    }
    if (!confirmationAccepted(b.confirmation_phrase, VIRAL_CONFIRMATIONS.configure_provider)) {
      return json({ ok: false, error: `confirmation_phrase_required:${VIRAL_CONFIRMATIONS.configure_provider}` }, 400);
    }
    const { data, error } = await ad.from("social_viral_provider_connections")
      .upsert(payload, { onConflict: "business_id,provider_slug" }).select().maybeSingle();
    if (error) return json({ ok: false, error: sanitiseProviderMessage(error.message) }, 500);
    await ad.from("social_viral_audit").insert({
      business_id, actor_user_id: a.user.id, action: "provider_configured",
      entity_type: "provider_connection", entity_id: data?.id ?? null, after_json: payload,
      is_test_data: !!b.is_test_data,
    });
    return json({ ok: true, provider: describe(data, slug), ...VIRAL_SAFETY_FLAGS });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
});