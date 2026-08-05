import { corsHeaders, json, requireFounder } from "../_shared/socialRelationshipAuth.ts";
import { providerAdapter } from "../_shared/socialRelationshipProvider.ts";
import { relationshipAudit } from "../_shared/socialRelationshipDb.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const provider = String(body.provider ?? "unipile").toLowerCase();
  const adapter = providerAdapter(provider);
  if (!adapter) return json({ ok: false, error: "provider_unsupported" }, 400);

  const result = await adapter.testConnection();
  const now = new Date().toISOString();
  const existing = await auth.admin.from("social_relationship_provider_connections")
    .select("connection_mode").eq("provider", provider).maybeSingle();
  const connectionMode = existing.data?.connection_mode ?? "test_only";
  const accountCount = result.ok ? result.data?.accounts.length ?? 0 : 0;

  await auth.admin.from("social_relationship_provider_connections").upsert({
    provider,
    connection_status: result.ok ? "connected" : "degraded",
    connection_mode: connectionMode,
    last_tested_at: now,
    sanitised_metadata: { account_count: accountCount, api_version: "configured_server_side" },
    last_error: result.ok ? null : result.errorCode ?? result.errorMessage ?? "connection_failed",
    updated_at: now,
  }, { onConflict: "provider" });

  await relationshipAudit(auth.admin, {
    provider,
    actor_type: "founder",
    actor_id: auth.user.id,
    action: "provider_connection_test",
    action_status: result.ok ? "passed" : "failed",
    after_json: { account_count: accountCount, status: result.status, error_code: result.errorCode ?? null },
  });

  if (!result.ok) {
    return json({ ok: false, provider, error: result.errorCode ?? "connection_failed", message: result.errorMessage, status: result.status }, result.status >= 400 ? result.status : 502);
  }
  return json({ ok: true, provider, account_count: accountCount, configured: adapter.configured(), secrets_exposed: false });
});
