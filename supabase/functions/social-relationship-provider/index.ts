import { corsHeaders, json, requireFounder, loadContext, audit } from "../_shared/socialRelationshipDb.ts";
import { getRelationshipAdapter, UnipileAdapter } from "../_shared/socialRelationshipProvider.ts";

const DECLARE_PHRASE = "CONFIRM REAL SOCIAL ACCOUNT";
const ENABLE_PHRASE = "ENABLE SOCIAL RELATIONSHIP ACTIONS";
const RELEASE_PAUSE_PHRASE = "RELEASE SOCIAL RELATIONSHIP PAUSE";
const REGISTER_WEBHOOK_PHRASE = "REGISTER SOCIAL RELATIONSHIP WEBHOOK";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const action = String(body.action ?? "");
  const provider = String(body.provider ?? "unipile").toLowerCase();
  const business_id = body.business_id ? String(body.business_id) : "";
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  if (!["unipile", "manychat"].includes(provider)) return json({ ok: false, error: "provider_not_supported" }, 400);

  const adapter = getRelationshipAdapter(provider);
  const { data: exactConnection } = await auth.admin.from("social_relationship_provider_connections")
    .select("*").eq("business_id", business_id).eq("provider", provider).maybeSingle();
  async function upsertConnection(patch: Record<string, unknown>) {
    if (exactConnection) {
      return (await auth.admin.from("social_relationship_provider_connections").update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", exactConnection.id).eq("business_id", business_id).select("*").maybeSingle()).data;
    }
    return (await auth.admin.from("social_relationship_provider_connections").insert({
      business_id, provider, display_name: provider, ...patch,
    }).select("*").maybeSingle()).data;
  }

  if (action === "test_connection") {
    if (!adapter.configured()) {
      const connection = await upsertConnection({
        connection_status: "not_configured", credentials_present: false,
        last_test_at: new Date().toISOString(), last_test_ok: false,
        last_error: provider === "unipile" ? (adapter as UnipileAdapter).configurationError() : "secrets_missing",
      });
      await audit(auth.admin, { business_id, event: "provider_test", event_status: "failed", actor: "founder", actor_user_id: auth.user.id, provider, detail: { reason: "not_configured" } });
      return json({ ok: false, configured: false, error: "provider_secrets_missing", connection });
    }
    const result = await adapter.testConnection();
    const connection = await upsertConnection({
      connection_status: result.ok ? "connected" : "error", credentials_present: true,
      last_test_at: new Date().toISOString(), last_test_ok: result.ok,
      last_error: result.ok ? null : String(result.error ?? "test_failed").slice(0, 500),
    });
    await audit(auth.admin, { business_id, event: "provider_test", event_status: result.ok ? "ok" : "failed", actor: "founder", actor_user_id: auth.user.id, provider, provider_calls: result.provider_calls, detail: { http_status: result.http_status } });
    return json({ ok: result.ok, http_status: result.http_status, error: result.error, connection, secrets_exposed: false });
  }

  if (action === "sync_accounts") {
    if (!adapter.configured()) return json({ ok: false, error: "provider_secrets_missing" }, 400);
    const result = await adapter.listAccounts();
    if (!result.ok) {
      await audit(auth.admin, { business_id, event: "account_sync", event_status: "failed", actor: "founder", actor_user_id: auth.user.id, provider, provider_calls: result.provider_calls, detail: { error: result.error } });
      return json({ ok: false, error: result.error, http_status: result.http_status }, 502);
    }
    const connection = exactConnection ?? await upsertConnection({ connection_status: "connected", credentials_present: true, last_test_ok: true, last_test_at: new Date().toISOString() });
    if (!connection?.id) return json({ ok: false, error: "connection_record_missing" }, 500);
    let synced = 0;
    const safeAccounts: any[] = [];
    for (const external of result.data ?? []) {
      const { data: existing } = await auth.admin.from("social_relationship_accounts").select("*")
        .eq("business_id", business_id).eq("connection_id", connection.id)
        .eq("provider_account_id", external.provider_account_id).maybeSingle();
      const patch = {
        business_id, connection_id: connection.id, provider, network: external.network,
        provider_account_id: external.provider_account_id, account_name: external.account_name,
        account_handle: external.account_handle, account_status: external.account_status ?? "unknown",
        last_sync_at: new Date().toISOString(), provider_metadata: external.raw ?? {},
        real_account_declared: existing?.real_account_declared ?? false,
        cooldown_until: existing?.cooldown_until ?? null,
      };
      const account = existing
        ? (await auth.admin.from("social_relationship_accounts").update(patch).eq("id", existing.id).eq("business_id", business_id).select("*").maybeSingle()).data
        : (await auth.admin.from("social_relationship_accounts").insert(patch).select("*").maybeSingle()).data;
      if (!account?.id) continue;
      synced++;
      const capabilities = adapter.capabilities(external.network);
      for (const [capability, supported] of Object.entries(capabilities)) {
        const capPatch = { account_id: account.id, business_id, capability, supported, source: "provider", detail: { provider, implemented: supported } };
        const { data: cap } = await auth.admin.from("social_relationship_capabilities").select("id")
          .eq("business_id", business_id).eq("account_id", account.id).eq("capability", capability).maybeSingle();
        if (cap) await auth.admin.from("social_relationship_capabilities").update(capPatch).eq("id", cap.id).eq("business_id", business_id);
        else await auth.admin.from("social_relationship_capabilities").insert(capPatch);
      }
      safeAccounts.push({ id: account.id, network: account.network, account_name: account.account_name, account_handle: account.account_handle, account_status: account.account_status, real_account_declared: account.real_account_declared });
    }
    await audit(auth.admin, { business_id, event: "account_sync", actor: "founder", actor_user_id: auth.user.id, provider, provider_calls: result.provider_calls, detail: { synced } });
    return json({ ok: true, synced, accounts: safeAccounts, safe_off: true });
  }

  if (action === "declare_real_account") {
    if (body.confirmation_phrase !== DECLARE_PHRASE) return json({ ok: false, error: "confirmation_required", confirmation_phrase: DECLARE_PHRASE }, 400);
    const account_id = String(body.account_id ?? "");
    if (!account_id) return json({ ok: false, error: "account_id_required" }, 400);
    const { data } = await auth.admin.from("social_relationship_accounts")
      .update({ real_account_declared: body.declared === true, updated_at: new Date().toISOString() })
      .eq("id", account_id).eq("business_id", business_id)
      .select("id,network,account_name,real_account_declared").maybeSingle();
    if (!data) return json({ ok: false, error: "account_not_found_or_cross_business" }, 404);
    await audit(auth.admin, { business_id, account_id, event: "real_account_declaration", event_status: "approval", actor: "founder", actor_user_id: auth.user.id, provider, detail: { declared: body.declared === true } });
    return json({ ok: true, account: data });
  }

  if (action === "register_webhook") {
    if (body.confirmation_phrase !== REGISTER_WEBHOOK_PHRASE) return json({ ok: false, error: "confirmation_required", confirmation_phrase: REGISTER_WEBHOOK_PHRASE }, 400);
    if (!adapter.configured()) return json({ ok: false, error: "provider_secrets_missing" }, 400);
    if (!(Deno.env.get("UNIPILE_WEBHOOK_SECRET") ?? Deno.env.get("SOCIAL_RELATIONSHIP_WEBHOOK_SECRET") ?? "").trim()) {
      return json({ ok: false, error: "webhook_verification_secret_missing" }, 400);
    }
    const callback = (Deno.env.get("SOCIAL_RELATIONSHIP_WEBHOOK_CALLBACK_URL") ?? `${Deno.env.get("SUPABASE_URL")}/functions/v1/social-relationship-webhook`).trim();
    const result = await adapter.registerWebhook(callback, null);
    const connection = await upsertConnection({
      webhook_registered: result.ok, webhook_status: result.ok ? "registered" : "failed",
      last_error: result.ok ? null : String(result.error ?? "webhook_registration_failed").slice(0, 500),
    });
    await audit(auth.admin, { business_id, event: "webhook_register", event_status: result.ok ? "ok" : "failed", actor: "founder", actor_user_id: auth.user.id, provider, provider_calls: result.provider_calls, detail: { http_status: result.http_status } });
    return json({ ok: result.ok, webhook_registered: result.ok, error: result.error, connection, secrets_exposed: false });
  }

  if (action === "set_pause") {
    const scope = String(body.scope ?? "business");
    if (!["global","business","provider","account"].includes(scope)) return json({ ok: false, error: "pause_scope_invalid" }, 400);
    const is_paused = body.is_paused === true;
    if (!is_paused && body.confirmation_phrase !== RELEASE_PAUSE_PHRASE) return json({ ok: false, error: "confirmation_required", confirmation_phrase: RELEASE_PAUSE_PHRASE }, 400);
    const account_id = scope === "account" ? String(body.account_id ?? "") : null;
    if (account_id) {
      const { data: account } = await auth.admin.from("social_relationship_accounts").select("id").eq("id", account_id).eq("business_id", business_id).maybeSingle();
      if (!account) return json({ ok: false, error: "account_not_found_or_cross_business" }, 404);
    }
    let query = auth.admin.from("social_relationship_pauses").select("id").eq("scope", scope);
    if (scope === "global") query = query.is("business_id", null);
    else query = query.eq("business_id", business_id);
    if (scope === "provider") query = query.eq("provider", provider);
    if (scope === "account") query = query.eq("account_id", account_id);
    const { data: existing } = await query.maybeSingle();
    const patch = {
      scope, business_id: scope === "global" ? null : business_id,
      provider: scope === "provider" ? provider : null, account_id,
      is_paused, reason: body.reason ?? null, paused_by: auth.user.id,
      paused_at: is_paused ? new Date().toISOString() : undefined,
      released_at: is_paused ? null : new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    if (existing) await auth.admin.from("social_relationship_pauses").update(patch).eq("id", existing.id);
    else await auth.admin.from("social_relationship_pauses").insert(patch);
    await audit(auth.admin, { business_id, event: "pause_toggle", event_status: is_paused ? "blocked" : "override", actor: "founder", actor_user_id: auth.user.id, provider, detail: { scope, is_paused } });
    return json({ ok: true, scope, is_paused });
  }

  if (action === "save_policy") {
    const policy = body.policy ?? {};
    const account_id = policy.account_id ? String(policy.account_id) : null;
    if (account_id) {
      const { data: account } = await auth.admin.from("social_relationship_accounts").select("id").eq("id", account_id).eq("business_id", business_id).maybeSingle();
      if (!account) return json({ ok: false, error: "account_not_found_or_cross_business" }, 404);
    }
    const requestedMode = String(policy.mode ?? "test_only");
    if (!["test_only","draft_actions","approval_required","approved_batch_autopilot","paused"].includes(requestedMode)) return json({ ok: false, error: "policy_mode_invalid" }, 400);
    if (!["test_only","draft_actions","paused"].includes(requestedMode) && body.confirmation_phrase !== ENABLE_PHRASE) {
      return json({ ok: false, error: "confirmation_required", confirmation_phrase: ENABLE_PHRASE }, 400);
    }
    const allowed = [
      "mode","daily_invite_limit","weekly_invite_limit","daily_message_limit","weekly_message_limit",
      "max_ai_replies_per_conversation_per_day","min_delay_seconds","max_delay_seconds",
      "working_hours_start","working_hours_end","working_days","timezone",
      "allow_connect_then_dm","allow_ai_autosend","require_real_account_declaration","cooldown_minutes_after_warning",
    ];
    const patch: Record<string, unknown> = { updated_by: auth.user.id, mode: requestedMode, updated_at: new Date().toISOString() };
    for (const key of allowed) if (policy[key] !== undefined) patch[key] = policy[key];
    let existingQuery = auth.admin.from("social_relationship_policies").select("id").eq("business_id", business_id);
    existingQuery = account_id ? existingQuery.eq("account_id", account_id) : existingQuery.is("account_id", null);
    const { data: existing } = await existingQuery.maybeSingle();
    const saved = existing
      ? (await auth.admin.from("social_relationship_policies").update(patch).eq("id", existing.id).eq("business_id", business_id).select("*").maybeSingle()).data
      : (await auth.admin.from("social_relationship_policies").insert({ business_id, account_id, ...patch }).select("*").maybeSingle()).data;
    await audit(auth.admin, { business_id, account_id, event: "policy_update", event_status: "approval", actor: "founder", actor_user_id: auth.user.id, provider, detail: { mode: requestedMode, account_id } });
    return json({ ok: true, policy: saved });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
});
