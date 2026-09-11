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

const APPLY_CONFIRMATION = "SYNC GSM SMARTLEAD REGISTRY";

type ExistingGsmMailbox = {
  id: string;
  email: string;
  smartlead_email_account_id: string | null;
};

/**
 * GSM ↔ Smartlead mailbox sync. Founder/admin only.
 *
 * READ-ONLY against Smartlead (GET /email-accounts). Maps Smartlead email
 * accounts onto existing gsm_mailboxes rows by Smartlead account id or email,
 * capturing SMTP / IMAP / warmup / account status.
 *
 * The canonical Smartlead credential is the server-side SMARTLEAD_API_KEY
 * secret used by the rest of Liftor. It is never returned or persisted here.
 *
 * Never creates campaigns, never sends mail, never touches campaign mapping /
 * reply / event paths. Neon Candy is external_non_gsm and excluded.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SMARTLEAD_API_KEY = Deno.env.get("SMARTLEAD_API_KEY") ?? "";

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
  const confirmation = String(body.external_action_confirmation ?? "");

  if (!SMARTLEAD_API_KEY.trim()) {
    return json({
      ok: false,
      error: "smartlead_api_key_missing",
      connection_state: "not_configured",
      blocker: "SMARTLEAD_API_KEY_missing",
    }, 400);
  }

  const url = `https://server.smartlead.ai/api/v1/email-accounts?api_key=${encodeURIComponent(SMARTLEAD_API_KEY)}&offset=0&limit=100`;
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
    const email = String(a.from_email ?? a.email ?? "").trim().toLowerCase();
    return {
      smartlead_email_account_id: a.id != null ? String(a.id) : null,
      email,
      sender_name: a.from_name != null ? String(a.from_name) : null,
      smtp_status: a.is_smtp_success === true ? "ok" : a.is_smtp_success === false ? "failed" : "unknown",
      imap_status: a.is_imap_success === true ? "ok" : a.is_imap_success === false ? "failed" : "unknown",
      smartlead_status: "connected",
      // Smartlead's boolean says warmup is enabled, not that warming has completed.
      warmup_status: a.warmup_enabled === true ? "warming" : "not_started",
      configured_daily_limit: Number.isFinite(Number(a.daily_limit)) ? Number(a.daily_limit) : 0,
      estate_classification: classifyEstate(email),
    };
  });

  const gsmCandidates = observed.filter((o) => o.email && o.estate_classification !== EXTERNAL_NON_GSM);
  const excluded = observed.filter((o) => o.email && o.estate_classification === EXTERNAL_NON_GSM);

  // Resolve registry matches before both preview and apply so preview is truthful.
  const { data: registryRows, error: registryError } = await admin
    .from("gsm_mailboxes")
    .select("id,email,smartlead_email_account_id")
    .eq("estate_classification", "gsm");
  if (registryError) {
    return json({
      ok: false,
      connection_state: "error",
      error_code: "gsm_registry_read_failed",
      error_message: registryError.message,
    }, 500);
  }

  const registry = (registryRows ?? []) as ExistingGsmMailbox[];
  const byEmail = new Map(registry.map((m) => [String(m.email ?? "").trim().toLowerCase(), m]));
  const bySmartleadId = new Map(
    registry
      .filter((m) => m.smartlead_email_account_id)
      .map((m) => [String(m.smartlead_email_account_id), m]),
  );

  const findExisting = (o: (typeof gsmCandidates)[number]) =>
    (o.smartlead_email_account_id ? bySmartleadId.get(o.smartlead_email_account_id) : undefined) ?? byEmail.get(o.email);

  const matched = gsmCandidates
    .map((o) => ({ observed: o, existing: findExisting(o) }))
    .filter((x) => Boolean(x.existing));
  const unmatched = gsmCandidates
    .filter((o) => !findExisting(o))
    .map((o) => o.email)
    .filter(Boolean);

  if (apply && confirmation !== APPLY_CONFIRMATION) {
    return json({
      ok: true,
      connection_state: "connected",
      mode: "preview",
      executed: false,
      blocker: "external_action_confirmation_required",
      expected_confirmation: APPLY_CONFIRMATION,
      accounts_seen: observed.length,
      gsm_candidates: gsmCandidates.length,
      excluded_non_gsm: excluded.map((e) => ({ email: e.email, classification: EXTERNAL_NON_GSM })),
      matched_existing_gsm_count: matched.length,
      unmatched_not_in_gsm_registry: unmatched,
      message: "No GSM registry rows were updated. Founder confirmation is required to apply the Smartlead reconciliation.",
      checked_at: new Date().toISOString(),
    });
  }

  let updated = 0;
  const updateErrors: Array<{ email: string; error: string }> = [];

  if (apply) {
    for (const { observed: o, existing } of matched) {
      if (!existing || isExcludedFromGsmEstate(o.email)) continue;
      const { estate_classification: _drop, ...rest } = o;
      const { error } = await admin
        .from("gsm_mailboxes")
        .update(stripSecretFields({ ...rest, last_provider_check_at: new Date().toISOString() }))
        .eq("id", existing.id);
      if (error) updateErrors.push({ email: o.email, error: error.message });
      else updated += 1;
    }

    await admin.from("gsm_provider_sync_runs").insert({
      provider: "smartlead",
      run_mode: "apply",
      status: updateErrors.length ? "partial" : "succeeded",
      http_status: resp.status,
      mailboxes_seen: observed.length,
      mailboxes_upserted: updated,
      excluded_non_gsm: excluded.length,
      error_code: updateErrors.length ? "mailbox_update_failed" : null,
      error_message: updateErrors.length ? `${updateErrors.length} GSM mailbox update(s) failed.` : null,
      finished_at: new Date().toISOString(),
    });
  }

  return json({
    ok: updateErrors.length === 0,
    connection_state: "connected",
    mode: apply ? "apply" : "preview",
    accounts_seen: observed.length,
    gsm_candidates: gsmCandidates.length,
    excluded_non_gsm: excluded.map((e) => ({ email: e.email, classification: EXTERNAL_NON_GSM })),
    matched_existing_gsm: matched.map(({ observed, existing }) => ({
      mailbox_id: existing?.id ?? null,
      email: observed.email,
      smartlead_email_account_id: observed.smartlead_email_account_id,
    })),
    matched_existing_gsm_count: matched.length,
    updated_gsm_mailboxes: updated,
    unmatched_not_in_gsm_registry: unmatched,
    update_errors: updateErrors,
    message:
      "Read-only Smartlead account read. No campaign was created, no email was sent and no credential was stored. Apply mode updates existing GSM registry rows only; Smartlead never creates GSM mailboxes.",
    checked_at: new Date().toISOString(),
  }, updateErrors.length ? 207 : 200);
});
