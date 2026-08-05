import { corsHeaders, json, requireFounder, loadContext, audit } from "../_shared/socialRelationshipDb.ts";
import { getRelationshipAdapter, UnipileAdapter } from "../_shared/socialRelationshipProvider.ts";
import {
  confirmationAccepted,
  normaliseMode,
  validateCallbackUrl,
  SEND_CONFIRMATION_PHRASE,
} from "../_shared/socialRelationshipLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req);
  if ("error" in a) return a.error;
  let body: any = {};
  try { body = await req.json(); } catch { /* */ }
  const action = String(body.action ?? "");
  const provider = String(body.provider ?? "unipile").toLowerCase();
  const business_id = body.business_id ? String(body.business_id) : null;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  if (!["unipile", "manychat"].includes(provider)) return json({ ok: false, error: "provider_not_supported" }, 400);

  const adapter = getRelationshipAdapter(provider);
  const ctx = await loadContext(a.admin, business_id, provider);

  async function upsertConnection(patch: Record<string, unknown>) {
    if (ctx.connection) {
      const { data } = await a.admin
        .from("social_relationship_provider_connections")
        .update(patch)
        .eq("id", ctx.connection.id)
        .select("*")
        .maybeSingle();
      return data;
    }
    const { data } = await a.admin
      .from("social_relationship_provider_connections")
      .insert({ business_id, provider, display_name: provider, ...patch })
      .select("*")
      .maybeSingle();
    return data;
  }

  if (action === "test_connection") {
    const configured = adapter.configured();
    if (!configured) {
      const conn = await upsertConnection({
        connection_status: "not_configured",
        credentials_present: false,
        last_test_at: new Date().toISOString(),
        last_test_ok: false,
        last_error: provider === "unipile" ? (adapter as UnipileAdapter).configurationError() : "secrets_missing",
      });
      await audit(a.admin, { business_id, event: "provider_test", event_status: "failed", actor: "founder", actor_user_id: a.user.id, provider, detail: { reason: "not_configured" } });
      return json({ ok: false, configured: false, error: "provider_secrets_missing", connection: conn });
    }
    const r = await adapter.testConnection();
    const conn = await upsertConnection({
      connection_status: r.ok ? "connected" : "error",
      credentials_present: true,
      last_test_at: new Date().toISOString(),
      last_test_ok: r.ok,
      last_error: r.ok ? null : (r.error ?? "test_failed")?.slice(0, 500),
    });
    await audit(a.admin, { business_id, event: "provider_test", event_status: r.ok ? "ok" : "failed", actor: "founder", actor_user_id: a.user.id, provider, provider_calls: r.provider_calls, detail: { http_status: r.http_status } });
    return json({ ok: r.ok, http_status: r.http_status, error: r.error, connection: conn });
  }

  if (action === "sync_accounts") {
    if (!adapter.configured()) return json({ ok: false, error: "provider_secrets_missing" }, 400);
    const r = await adapter.listAccounts();
    if (!r.ok) {
      await audit(a.admin, { business_id, event: "account_sync", event_status: "failed", actor: "founder", actor_user_id: a.user.id, provider, provider_calls: r.provider_calls, detail: { error: r.error } });
      return json({ ok: false, error: r.error, http_status: r.http_status }, 502);
    }
    const conn = ctx.connection ?? (await upsertConnection({ connection_status: "connected", credentials_present: true }));
    let synced = 0;
    for (const acc of r.data ?? []) {
      const { data: existing } = await a.admin
        .from("social_relationship_accounts")
        .select("id")
        .eq("business_id", business_id)
        .eq("provider", provider)
        .eq("provider_account_id", acc.provider_account_id)
        .maybeSingle();
      if (!existing) {
        // Never attach an external account that already belongs elsewhere.
        const { data: foreign } = await a.admin
          .from("social_relationship_accounts")
          .select("id, business_id")
          .eq("provider", provider)
          .eq("provider_account_id", acc.provider_account_id)
          .neq("business_id", business_id)
          .maybeSingle();
        if (foreign) {
          await audit(a.admin, { business_id, event: "account_sync", event_status: "blocked", actor: "founder", actor_user_id: a.user.id, provider, detail: { reason: "account_bound_to_other_business", provider_account_id: acc.provider_account_id } });
          continue;
        }
      }
      const patch = {
        business_id,
        connection_id: conn!.id,
        provider,
        network: acc.network,
        provider_account_id: acc.provider_account_id,
        account_name: acc.account_name,
        account_handle: acc.account_handle,
        account_status: acc.account_status ?? "unknown",
        last_sync_at: new Date().toISOString(),
        provider_metadata: acc.raw ?? {},
      };
      const accountId = existing
        ? ((await a.admin.from("social_relationship_accounts").update(patch).eq("id", existing.id).select("id").maybeSingle()).data?.id as string)
        : ((await a.admin.from("social_relationship_accounts").insert(patch).select("id").maybeSingle()).data?.id as string);
      if (!accountId) continue;
      synced++;
      const caps = adapter.capabilities(acc.network);
      for (const [capability, supported] of Object.entries(caps)) {
        const { data: capRow } = await a.admin
          .from("social_relationship_capabilities")
          .select("id")
          .eq("business_id", business_id)
          .eq("account_id", accountId)
          .eq("capability", capability)
          .maybeSingle();
        const capPatch = { account_id: accountId, business_id, capability, supported, source: "adapter_declared", detail: { provider } };
        if (capRow) await a.admin.from("social_relationship_capabilities").update(capPatch).eq("id", capRow.id);
        else await a.admin.from("social_relationship_capabilities").insert(capPatch);
      }
    }
    await audit(a.admin, { business_id, event: "account_sync", actor: "founder", actor_user_id: a.user.id, provider, provider_calls: r.provider_calls, detail: { synced } });
    return json({ ok: true, synced, accounts: r.data });
  }

  if (action === "declare_real_account") {
    const account_id = String(body.account_id ?? "");
    if (!account_id) return json({ ok: false, error: "account_id_required" }, 400);
    if (body.declared === true && !confirmationAccepted(body.confirmation)) {
      return json({ ok: false, error: "confirmation_required", required_phrase: SEND_CONFIRMATION_PHRASE }, 400);
    }
    const { data } = await a.admin
      .from("social_relationship_accounts")
      .update({ real_account_declared: body.declared === true })
      .eq("id", account_id)
      .eq("business_id", business_id)
      .select("id, real_account_declared")
      .maybeSingle();
    await audit(a.admin, { business_id, account_id, event: "real_account_declaration", actor: "founder", actor_user_id: a.user.id, provider, detail: { declared: body.declared === true } });
    return json({ ok: true, account: data });
  }

  if (action === "register_webhook") {
    if (!adapter.configured()) return json({ ok: false, error: "provider_secrets_missing" }, 400);
    // Callback is derived from our OWN functions host and re-validated.
    const callback = `${Deno.env.get("SUPABASE_URL")}/functions/v1/social-relationship-webhook`;
    const cb = validateCallbackUrl(callback);
    if (!cb.ok) return json({ ok: false, error: cb.reason ?? "callback_url_invalid" }, 400);
    const hmac = (Deno.env.get("UNIPILE_WEBHOOK_HMAC_SECRET") ?? "").trim();
    const secret = (Deno.env.get("SOCIAL_RELATIONSHIP_WEBHOOK_SECRET") ?? "").trim();
    if (!hmac && !secret) {
      return json({
        ok: false,
        error: "webhook_secret_missing",
        hint: "Add UNIPILE_WEBHOOK_HMAC_SECRET (preferred) in Project Settings → Secrets.",
      }, 400);
    }
    const r = await adapter.registerWebhook(cb.url!, secret || null);
    const conn = await upsertConnection({
      webhook_registered: r.ok,
      webhook_status: r.ok ? "registered" : "failed",
      last_error: r.ok ? null : (r.error ?? "")?.slice(0, 500),
    });
    await audit(a.admin, { business_id, event: "webhook_register", event_status: r.ok ? "ok" : "failed", actor: "founder", actor_user_id: a.user.id, provider, provider_calls: r.provider_calls, detail: { http_status: r.http_status } });
    return json({ ok: r.ok, webhook: r.data, error: r.error, connection: conn });
  }

  if (action === "set_pause") {
    const scope = String(body.scope ?? "business");
    const is_paused = body.is_paused === true;
    if (!is_paused && !confirmationAccepted(body.confirmation)) {
      return json({ ok: false, error: "confirmation_required", required_phrase: SEND_CONFIRMATION_PHRASE, hint: "Releasing a pause re-arms external actions." }, 400);
    }
    const { data: existing } = await a.admin
      .from("social_relationship_pauses")
      .select("id")
      .eq("scope", scope)
      .eq("business_id", scope === "business" ? business_id : null as any)
      .maybeSingle();
    const patch = {
      scope,
      business_id: scope === "global" ? null : business_id,
      provider: scope === "provider" ? provider : null,
      account_id: scope === "account" ? (body.account_id ?? null) : null,
      is_paused,
      reason: body.reason ?? null,
      paused_by: a.user.id,
      released_at: is_paused ? null : new Date().toISOString(),
    };
    if (existing) await a.admin.from("social_relationship_pauses").update(patch).eq("id", existing.id);
    else await a.admin.from("social_relationship_pauses").insert(patch);
    await audit(a.admin, { business_id, event: "pause_toggle", actor: "founder", actor_user_id: a.user.id, provider, detail: { scope, is_paused } });
    return json({ ok: true, scope, is_paused });
  }

  if (action === "save_policy") {
    const p = body.policy ?? {};
    const allowed = [
      "mode", "daily_invite_limit", "weekly_invite_limit", "daily_message_limit", "weekly_message_limit",
      "max_ai_replies_per_conversation_per_day", "min_delay_seconds", "max_delay_seconds",
      "working_hours_start", "working_hours_end", "working_days", "timezone",
      "allow_connect_then_dm", "allow_ai_autosend", "require_real_account_declaration", "cooldown_minutes_after_warning",
    ];
    const patch: Record<string, unknown> = { updated_by: a.user.id };
    for (const k of allowed) if (p[k] !== undefined) patch[k] = p[k];
    if (patch.mode !== undefined) {
      const nextMode = normaliseMode(String(patch.mode));
      patch.mode = nextMode;
      if (
        (nextMode === "approval_required" || nextMode === "approved_batch_autopilot") &&
        !confirmationAccepted(body.confirmation)
      ) {
        return json({
          ok: false,
          error: "confirmation_required",
          required_phrase: SEND_CONFIRMATION_PHRASE,
          hint: "This mode permits real provider calls.",
        }, 400);
      }
    }
    const { data: existing } = await a.admin
      .from("social_relationship_policies").select("id").eq("business_id", business_id).is("account_id", null).maybeSingle();
    let saved;
    if (existing) saved = (await a.admin.from("social_relationship_policies").update(patch).eq("id", existing.id).select("*").maybeSingle()).data;
    // New policies are born safe-off.
    else saved = (await a.admin.from("social_relationship_policies").insert({ business_id, mode: "test_only", ...patch }).select("*").maybeSingle()).data;
    await audit(a.admin, { business_id, event: "policy_update", actor: "founder", actor_user_id: a.user.id, provider, detail: patch });
    return json({ ok: true, policy: saved });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
});
