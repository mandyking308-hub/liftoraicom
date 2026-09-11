import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { EXTERNAL_NON_GSM, stripSecretFields } from "../_shared/gsmSenderEstate.ts";
import {
  buildMailboxUpdate,
  extractSmartleadAccounts,
  mapSmartleadAccount,
  reconcileSmartleadAccounts,
  type GsmRegistryRow,
} from "../_shared/gsmSmartleadSync.ts";

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
 * READ-ONLY against Smartlead (GET /email-accounts). The Smartlead credential is
 * the canonical server-side secret SMARTLEAD_API_KEY read from the Deno env; it is
 * never returned, logged or persisted.
 *
 * Maps Smartlead email accounts onto EXISTING gsm_mailboxes rows by Smartlead
 * account id or email. Never creates a GSM mailbox, never creates campaigns,
 * never sends mail. hello@neoncandy.online is external_non_gsm and is always
 * excluded.
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

  const apiKey = (Deno.env.get("SMARTLEAD_API_KEY") ?? "").trim();
  if (!apiKey) {
    return json({
      ok: false,
      connection_state: "disconnected",
      error: "smartlead_api_key_missing",
      error_message:
        "Server secret SMARTLEAD_API_KEY is not configured. No provider call was made.",
    }, 400);
  }

  const url = `https://server.smartlead.ai/api/v1/email-accounts?api_key=${encodeURIComponent(apiKey)}&offset=0&limit=100`;
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

  const observed = extractSmartleadAccounts(payload).map(mapSmartleadAccount);

  const emails = observed.map((o) => o.email).filter(Boolean);
  const providerIds = observed.map((o) => o.smartlead_email_account_id).filter(Boolean) as string[];

  let registry: GsmRegistryRow[] = [];
  if (emails.length > 0) {
    const { data: byEmail } = await admin
      .from("gsm_mailboxes")
      .select("id, email, smartlead_email_account_id")
      .in("email", emails);
    registry = registry.concat((byEmail ?? []) as GsmRegistryRow[]);
  }
  if (providerIds.length > 0) {
    const { data: byId } = await admin
      .from("gsm_mailboxes")
      .select("id, email, smartlead_email_account_id")
      .in("smartlead_email_account_id", providerIds);
    for (const row of (byId ?? []) as GsmRegistryRow[]) {
      if (!registry.some((r) => r.id === row.id)) registry.push(row);
    }
  }

  const rec = reconcileSmartleadAccounts(observed, registry);

  let updated = 0;
  if (apply) {
    for (const m of rec.matched) {
      // Update only. There is no insert path in this function by design.
      await admin
        .from("gsm_mailboxes")
        .update(stripSecretFields(buildMailboxUpdate(m.observed)))
        .eq("id", m.registry_id);
      updated += 1;
    }
    await admin.from("gsm_provider_sync_runs").insert({
      provider: "smartlead",
      run_mode: "apply",
      status: "succeeded",
      http_status: resp.status,
      mailboxes_seen: observed.length,
      mailboxes_upserted: updated,
      excluded_non_gsm: rec.excluded.length,
      finished_at: new Date().toISOString(),
    });
  }

  return json({
    ok: true,
    connection_state: "connected",
    mode: apply ? "apply" : "preview",
    accounts_seen: observed.length,
    gsm_candidates: rec.gsm_candidates.length,
    excluded_non_gsm: rec.excluded.map((e) => ({ email: e.email, classification: EXTERNAL_NON_GSM })),
    unidentified_accounts: rec.unidentified.map((o) => o.smartlead_email_account_id),
    matched_existing_gsm_mailboxes: rec.matched.map((m) => ({
      registry_id: m.registry_id,
      email: m.email,
      smtp_status: m.observed.smtp_status,
      imap_status: m.observed.imap_status,
      warmup_signal: m.observed.warmup_signal,
      configured_daily_limit: m.observed.configured_daily_limit,
    })),
    matched_count: rec.matched.length,
    unmatched_not_in_gsm_registry: rec.unmatched.map((o) => o.email),
    unmatched_count: rec.unmatched.length,
    updated_gsm_mailboxes: updated,
    message:
      "Read-only Smartlead account read. No campaign was created, no email was sent and no credential was stored or returned. Existing GSM mailboxes are only updated, never created here. Warmup enabled means warming, not warmed or campaign ready.",
    checked_at: new Date().toISOString(),
  });
});
