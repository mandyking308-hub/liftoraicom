import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  EXTERNAL_NON_GSM,
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
 * GSM ↔ Smartlead mailbox sync. Founder/admin only.
 *
 * READ-ONLY against Smartlead (GET /email-accounts). Maps Smartlead email
 * accounts onto existing gsm_mailboxes rows by Smartlead account id or email,
 * capturing SMTP / IMAP / warmup / account status.
 *
 * Never creates campaigns, never sends mail, never touches Chat 2 campaign
 * mapping / reply / event paths. hello@neoncandy.online is classified
 * external_non_gsm and is never inserted or allocated as a GSM mailbox.
 */
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
  const roleSet = new Set((roles ?? []).map((r: { role: string }) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) return json({ ok: false, error: "forbidden" }, 403);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch { /* empty body allowed */ }
  const apply = body.apply === true;

  const { data: provider } = await admin
    .from("outbound_providers")
    .select("id, api_key, api_key_encrypted")
    .eq("provider_type", "smartlead")
    .eq("connected", true)
    .limit(1)
    .maybeSingle();

  if (!provider) return json({ ok: false, error: "smartlead_provider_not_connected", connection_state: "disconnected" }, 400);
  const apiKey = provider.api_key ?? provider.api_key_encrypted ?? "";
  if (!apiKey) return json({ ok: false, error: "smartlead_api_key_missing", connection_state: "disconnected" }, 400);

  const url = `https://server.smartlead.ai/api/v1/email-accounts?api_key=${encodeURIComponent(apiKey)}`;
  let resp: Response;
  try {
    resp = await fetch(url, { method: "GET" });
  } catch (e) {
    return json({
      ok: false,
      connection_state: "error",
      error_code: "network_error",
      error_message: e instanceof Error ? e.message : "network failure",
    }, 502);
  }

  if (!resp.ok) {
    return json({
      ok: false,
      connection_state: "error",
      error_code:
        resp.status === 401 ? "unauthorized" : resp.status === 403 ? "forbidden" : resp.status === 429 ? "rate_limited" : "provider_error",
      http_status: resp.status,
      error_message: `Smartlead GET /email-accounts failed with HTTP ${resp.status}.`,
    }, resp.status);
  }

  let payload: unknown = null;
  try {
    payload = JSON.parse(await resp.text());
  } catch {
    return json({ ok: false, connection_state: "error", error_code: "unparsable_response" }, 502);
  }

  const accounts: Record<string, unknown>[] = Array.isArray(payload)
    ? (payload as Record<string, unknown>[])
    : Array.isArray((payload as Record<string, unknown>)?.data)
      ? ((payload as Record<string, unknown>).data as Record<string, unknown>[])
      : [];

  const observed = accounts.map((a) => {
    const email = String(a.email ?? "").trim().toLowerCase();
    return {
      smartlead_email_account_id: a.id != null ? String(a.id) : null,
      email,
      sender_name: a.from_name != null ? String(a.from_name) : null,
      smtp_status: a.is_smtp_success === true ? "ok" : a.is_smtp_success === false ? "failed" : "unknown",
      imap_status: a.is_imap_success === true ? "ok" : a.is_imap_success === false ? "failed" : "unknown",
      smartlead_status: "connected",
      warmup_status: a.warmup_enabled === true ? "warming" : "not_started",
      configured_daily_limit: Number.isFinite(Number(a.daily_limit)) ? Number(a.daily_limit) : 0,
      estate_classification: classifyEstate(email),
    };
  });

  const gsmCandidates = observed.filter((o) => o.estate_classification !== EXTERNAL_NON_GSM);
  const excluded = observed.filter((o) => o.estate_classification === EXTERNAL_NON_GSM);

  let updated = 0;
  const unmatched: string[] = [];

  if (apply) {
    for (const o of gsmCandidates) {
      if (isExcludedFromGsmEstate(o.email)) continue;
      const { data: existing } = await admin
        .from("gsm_mailboxes")
        .select("id")
        .ilike("email", o.email)
        .maybeSingle();
      if (!existing?.id) {
        unmatched.push(o.email);
        continue;
      }
      const { estate_classification: _drop, ...rest } = o;
      await admin
        .from("gsm_mailboxes")
        .update(stripSecretFields({ ...rest, last_provider_check_at: new Date().toISOString() }))
        .eq("id", existing.id);
      updated += 1;
    }
    await admin.from("gsm_provider_sync_runs").insert({
      provider: "smartlead",
      run_mode: "apply",
      status: "succeeded",
      http_status: resp.status,
      mailboxes_seen: observed.length,
      mailboxes_upserted: updated,
      excluded_non_gsm: excluded.length,
      finished_at: new Date().toISOString(),
    });
  } else {
    unmatched.push(...gsmCandidates.map((o) => o.email));
  }

  return json({
    ok: true,
    connection_state: "connected",
    mode: apply ? "apply" : "preview",
    accounts_seen: observed.length,
    gsm_candidates: gsmCandidates.length,
    excluded_non_gsm: excluded.map((e) => ({ email: e.email, classification: EXTERNAL_NON_GSM })),
    updated_gsm_mailboxes: updated,
    unmatched_not_in_gsm_registry: unmatched,
    message:
      "Read-only Smartlead account read. No campaign was created, no email was sent and no credential was stored. Existing mailboxes are only updated, never created here.",
    checked_at: new Date().toISOString(),
  });
});
