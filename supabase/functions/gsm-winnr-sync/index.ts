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

/**
 * GSM ↔ Winnr sync. Founder/admin only.
 *
 * actions:
 *   test        — read-only connection test
 *   sync        — idempotent read + upsert of GSM domains/mailboxes (apply=true persists)
 *   provision   — future provisioning path; preview only unless an explicit
 *                 external-action confirmation phrase is supplied. Nothing is
 *                 purchased or provisioned today.
 *
 * No credentials are ever persisted or returned.
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
        "Create the GSM Winnr account, then add WINNR_API_TOKEN as a server secret. No provider call was attempted.",
    });
  }

  if (action === "provision") {
    // Hard gate. Nothing is purchased or provisioned by this deployment.
    if (confirmation !== "GSM PROVISION CONFIRMED") {
      return json({
        ...base,
        ok: true,
        action,
        mode: "preview",
        executed: false,
        blocker: "external_action_confirmation_required",
        message: "Provisioning is preview-only. No domain, mailbox or warmup was created.",
        requested: stripSecretFields((body.payload as Record<string, unknown>) ?? {}),
      });
    }
    return json({
      ...base,
      ok: false,
      action,
      mode: "blocked",
      executed: false,
      blocker: "provisioning_disabled_in_this_release",
      message: "Provisioning remains disabled until the GSM Winnr account is live and founder-enabled.",
    }, 409);
  }

  const domainsCall = await winnrCall<unknown>("listDomains", { token: TOKEN });
  const mailboxCall = await winnrCall<unknown>("listEmailUsers", { token: TOKEN });

  const asArray = (d: unknown): Record<string, unknown>[] => {
    if (Array.isArray(d)) return d as Record<string, unknown>[];
    if (d && typeof d === "object") {
      const o = d as Record<string, unknown>;
      for (const k of ["data", "results", "items", "domains", "email_users"]) {
        if (Array.isArray(o[k])) return o[k] as Record<string, unknown>[];
      }
    }
    return [];
  };

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

  // Idempotent upsert keyed on provider ids / lower(email|domain).
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
    message: "Registry synchronised. No mailbox was created and no credentials were stored.",
  });
});
