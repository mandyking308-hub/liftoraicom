import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  WINNR_BASE_URL,
  WINNR_CLIENT_VERSION,
  normaliseWinnrDomain,
  normaliseWinnrMailbox,
  winnrCall,
  winnrTokenConfigured,
} from "../_shared/winnrClient.ts";
import {
  GSM_OWNER_LEGAL_ENTITY,
  classifyEstate,
  isExcludedFromGsmEstate,
  stripSecretFields,
} from "../_shared/gsmSenderEstate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const WARMUP_CONFIRMATION = "START GSM WINNR WARMUP";

/**
 * GSM ↔ Winnr post-purchase sync. Founder/admin only.
 *
 * actions:
 *   test        — read-only connection test
 *   sync        — idempotent read + upsert of GSM domains/mailboxes (apply=true persists)
 *   warmup      — founder-confirmed warming for already-synced GSM mailboxes only
 *   provision   — deliberately disabled: this workflow never purchases new infrastructure
 *
 * No SMTP/IMAP/API credentials are ever persisted or returned.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const TOKEN = Deno.env.get("WINNR_API_TOKEN");

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
  const roleSet = new Set((roles ?? []).map((r: { role: string }) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) return json({ ok: false, error: "forbidden" }, 403);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch { /* empty body allowed */ }

  const action = String(body.action ?? "test");
  const apply = body.apply === true;
  const confirmation = String(body.external_action_confirmation ?? "");
  const tokenConfigured = winnrTokenConfigured(TOKEN);

  const base = {
    provider: "winnr",
    base_url: WINNR_BASE_URL,
    client_version: WINNR_CLIENT_VERSION,
    winnr_token_configured: tokenConfigured,
    owner_legal_entity: GSM_OWNER_LEGAL_ENTITY,
    checked_at: new Date().toISOString(),
  };

  if (!tokenConfigured) {
    return json({
      ...base,
      ok: false,
      action,
      connection_state: "not_configured",
      blocker: "WINNR_API_TOKEN_missing",
      next_action:
        "The Winnr account and mailbox estate have been purchased. Add WINNR_API_TOKEN as a server-side Edge Function secret, then run Winnr test and sync. Do not paste the token into chat or client code.",
    });
  }

  if (action === "provision") {
    return json({
      ...base,
      ok: false,
      action,
      mode: "blocked",
      executed: false,
      blocker: "provisioning_not_part_of_post_purchase_sync",
      message: "The mailbox estate is already purchased. This endpoint will not buy domains or create additional mailboxes.",
    }, 409);
  }

  const asArray = (d: unknown): Record<string, unknown>[] => {
    if (Array.isArray(d)) return d as Record<string, unknown>[];
    if (d && typeof d === "object") {
      const o = d as Record<string, unknown>;
      for (const k of ["data", "results", "items", "domains", "email_users", "users"]) {
        if (Array.isArray(o[k])) return o[k] as Record<string, unknown>[];
      }
    }
    return [];
  };

  // Warm-up is an explicit post-purchase external action. It only ever targets
  // mailboxes that are already present in BOTH Winnr and the GSM registry.
  if (action === "warmup") {
    if (confirmation !== WARMUP_CONFIRMATION) {
      return json({
        ...base,
        ok: true,
        action,
        mode: "preview",
        executed: false,
        blocker: "external_action_confirmation_required",
        expected_confirmation: WARMUP_CONFIRMATION,
        message: "No warming was started. Founder confirmation is required.",
      });
    }

    const mailboxCall = await winnrCall<unknown>("listEmailUsers", { token: TOKEN });
    if (!mailboxCall.ok) {
      return json({
        ...base,
        ok: false,
        action,
        connection_state: "error",
        error_code: mailboxCall.error_code,
        http_status: mailboxCall.http_status,
        error_message: mailboxCall.error_message,
      }, mailboxCall.http_status && mailboxCall.http_status >= 400 ? mailboxCall.http_status : 502);
    }

    const providerMailboxes = asArray(mailboxCall.data)
      .map(normaliseWinnrMailbox)
      .filter((m) => m.email && !isExcludedFromGsmEstate(m.email) && m.provider_mailbox_id);

    const { data: registry } = await admin
      .from("gsm_mailboxes")
      .select("id, email, provider_mailbox_id, estate_classification, active, retired")
      .eq("estate_classification", "gsm")
      .eq("active", true)
      .eq("retired", false);

    const registryByEmail = new Map((registry ?? []).map((r) => [String(r.email).toLowerCase(), r]));
    const registryByProviderId = new Map(
      (registry ?? []).filter((r) => r.provider_mailbox_id).map((r) => [String(r.provider_mailbox_id), r]),
    );

    const matched = providerMailboxes
      .map((m) => ({
        observed: m,
        registry:
          registryByProviderId.get(String(m.provider_mailbox_id)) ?? registryByEmail.get(String(m.email).toLowerCase()),
      }))
      .filter((x) => x.registry);

    const userIds = Array.from(new Set(matched.map((x) => String(x.observed.provider_mailbox_id)).filter(Boolean)));
    if (userIds.length === 0) {
      return json({
        ...base,
        ok: false,
        action,
        mode: "blocked",
        executed: false,
        blocker: "no_synced_gsm_mailboxes",
        message: "Sync the purchased Winnr estate into gsm_mailboxes before enabling warming.",
      }, 409);
    }

    // New domains: use Winnr's safest documented ramp profile.
    const warmup = await winnrCall<unknown>("startWarmingAsync", {
      token: TOKEN,
      allowMutation: true,
      body: {
        user_ids: userIds,
        settings: { emails_per_day: 15, rampup_speed: "slow" },
      },
    });

    if (!warmup.ok) {
      await admin.from("gsm_provider_sync_runs").insert({
        provider: "winnr",
        run_mode: "warmup_apply",
        status: "failed",
        http_status: warmup.http_status,
        mailboxes_seen: userIds.length,
        error_code: warmup.error_code,
        error_message: warmup.error_message,
        finished_at: new Date().toISOString(),
      });
      return json({
        ...base,
        ok: false,
        action,
        mode: "apply",
        executed: false,
        error_code: warmup.error_code,
        http_status: warmup.http_status,
        error_message: warmup.error_message,
      }, warmup.http_status && warmup.http_status >= 400 ? warmup.http_status : 502);
    }

    const now = new Date().toISOString();
    for (const x of matched) {
      await admin
        .from("gsm_mailboxes")
        .update({ warmup_status: "warming", warmup_started_at: now, last_provider_check_at: now })
        .eq("id", x.registry!.id);
    }
    await admin.from("gsm_provider_sync_runs").insert({
      provider: "winnr",
      run_mode: "warmup_apply",
      status: "succeeded",
      http_status: warmup.http_status,
      mailboxes_seen: userIds.length,
      mailboxes_upserted: matched.length,
      excluded_non_gsm: providerMailboxes.length - matched.length,
      summary: { emails_per_day: 15, rampup_speed: "slow", warming_started: matched.length },
      finished_at: now,
    });

    return json({
      ...base,
      ok: true,
      action,
      mode: "apply",
      executed: true,
      warming_started: matched.length,
      emails_per_day: 15,
      rampup_speed: "slow",
      message: "Winnr warming was started for the synced GSM estate only. Warming does not mean campaign-ready.",
    });
  }

  const domainsCall = await winnrCall<unknown>("listDomains", { token: TOKEN });
  const mailboxCall = await winnrCall<unknown>("listEmailUsers", { token: TOKEN });

  if (!domainsCall.ok || !mailboxCall.ok) {
    const failed = !domainsCall.ok ? domainsCall : mailboxCall;
    await admin.from("gsm_provider_sync_runs").insert({
      provider: "winnr",
      run_mode: apply ? "apply" : "preview",
      status: "failed",
      http_status: failed.http_status,
      error_code: failed.error_code,
      error_message: failed.error_message,
      finished_at: new Date().toISOString(),
    });
    return json({
      ...base,
      ok: false,
      action,
      connection_state: "error",
      error_code: failed.error_code,
      http_status: failed.http_status,
      error_message: failed.error_message,
    }, failed.http_status && failed.http_status >= 400 ? failed.http_status : 502);
  }

  const rawDomains = asArray(domainsCall.data).map(normaliseWinnrDomain).filter((d) => d.domain);
  const rawMailboxes = asArray(mailboxCall.data).map(normaliseWinnrMailbox).filter((m) => m.email);
  const gsmMailboxes = rawMailboxes.filter((m) => !isExcludedFromGsmEstate(m.email));
  const excluded = rawMailboxes.length - gsmMailboxes.length;

  if (action === "test" || !apply) {
    return json({
      ...base,
      ok: true,
      action,
      mode: "preview",
      connection_state: "connected",
      domains_seen: rawDomains.length,
      mailboxes_seen: rawMailboxes.length,
      excluded_non_gsm: excluded,
      would_upsert_domains: rawDomains.length,
      would_upsert_mailboxes: gsmMailboxes.length,
      message: "Read-only. Nothing was written and no credentials were stored.",
    });
  }

  // Idempotent upsert keyed on lower(email|domain). Provider credentials are
  // stripped before persistence; only ids/status/health metadata are stored.
  let domainsUpserted = 0;
  const domainIdByName = new Map<string, string>();
  for (const d of rawDomains) {
    const { data: existing } = await admin
      .from("gsm_sending_domains")
      .select("id")
      .ilike("domain", d.domain)
      .maybeSingle();
    const row = stripSecretFields({
      ...d,
      owner_legal_entity: GSM_OWNER_LEGAL_ENTITY,
      last_synced_at: new Date().toISOString(),
    });
    if (existing?.id) {
      await admin.from("gsm_sending_domains").update(row).eq("id", existing.id);
      domainIdByName.set(d.domain, existing.id);
    } else {
      const { data: ins } = await admin.from("gsm_sending_domains").insert(row).select("id").maybeSingle();
      if (ins?.id) domainIdByName.set(d.domain, ins.id);
    }
    domainsUpserted += 1;
  }

  let mailboxesUpserted = 0;
  for (const m of gsmMailboxes) {
    const { domain, ...rest } = m;
    const row = stripSecretFields({
      ...rest,
      sending_domain_id: domain ? (domainIdByName.get(domain) ?? null) : null,
      estate_classification: classifyEstate(m.email),
      last_provider_check_at: new Date().toISOString(),
    });
    const { data: existing } = await admin
      .from("gsm_mailboxes")
      .select("id")
      .ilike("email", m.email)
      .maybeSingle();
    if (existing?.id) await admin.from("gsm_mailboxes").update(row).eq("id", existing.id);
    else await admin.from("gsm_mailboxes").insert(row);
    mailboxesUpserted += 1;
  }

  await admin.from("gsm_provider_sync_runs").insert({
    provider: "winnr",
    run_mode: "apply",
    status: "succeeded",
    http_status: domainsCall.http_status,
    domains_seen: rawDomains.length,
    mailboxes_seen: rawMailboxes.length,
    domains_upserted: domainsUpserted,
    mailboxes_upserted: mailboxesUpserted,
    excluded_non_gsm: excluded,
    finished_at: new Date().toISOString(),
  });

  return json({
    ...base,
    ok: true,
    action,
    mode: "apply",
    connection_state: "connected",
    domains_upserted: domainsUpserted,
    mailboxes_upserted: mailboxesUpserted,
    excluded_non_gsm: excluded,
    message: "Purchased Winnr estate synchronised into the GSM registry. No credentials were stored and no email was sent.",
  });
});
