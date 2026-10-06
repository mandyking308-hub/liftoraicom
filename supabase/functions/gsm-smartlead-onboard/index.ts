import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  WINNR_LIST_PAGE_SIZE,
  winnrCall,
  winnrTokenConfigured,
} from "../_shared/winnrClient.ts";
import { GSM_ESTATE_KEY, isGsmEstateEmail } from "../_shared/senderEstates.ts";
import {
  GSM_EXPORT_DOMAIN_CHUNK,
  GSM_ONBOARD_CONFIRMATION,
  GSM_ONBOARD_MAX_EMAILS,
  chunk,
  domainsOf,
  isOnboardApplyAuthorized,
  normalizeRequestedEmails,
  partitionAgainstSmartlead,
  scopeRequestedGsmRegistry,
  selectGsmRegistry,
} from "../_shared/gsmSmartleadOnboard.ts";

/**
 * GSM ↔ Smartlead mailbox onboarding. Founder/admin only.
 *
 * Connects the GSM commercial-estate mailboxes to the existing Smartlead account so they can later be used for outbound.
 *
 * Hard rules:
 *  - GSM only (registry estate_classification=gsm AND isGsmEstateEmail). GHAT and
 *    external_non_gsm / Neon Candy addresses can never be selected.
 *  - Mailbox credentials are fetched server-side from Winnr's export endpoint,
 *    held in memory for the single Smartlead call, and NEVER persisted,
 *    returned, or logged.
 *  - No campaign is created, no lead is pushed, and no email is sent.
 *  - Warm-up is left provider-native (Winnr); Smartlead warm-up is not enabled here.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SMARTLEAD_BASE = "https://server.smartlead.ai/api/v1";

interface ExportRow {
  from_email: string;
  from_name: string;
  user_name: string;
  password: string;
  smtp_host: string;
  smtp_port: number;
  imap_host: string;
  imap_port: number;
  imap_username: string;
  imap_password: string;
}

/** Minimal RFC4180-ish CSV parser (provider export has no embedded newlines). */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
        else if (ch === '"') quoted = false;
        else cur += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ",") { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const header = split(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = split(line);
    const row: Record<string, string> = {};
    header.forEach((h, i) => { row[h] = (cells[i] ?? "").trim(); });
    return row;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const WINNR_TOKEN = Deno.env.get("WINNR_API_TOKEN");
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
  try { body = await req.json(); } catch { /* empty body allowed */ }
  const apply = body.apply === true;
  const confirmation = String(body.external_action_confirmation ?? "");
  const requestedEmails = normalizeRequestedEmails(body.emails);

  const base = {
    ok: true,
    estate: GSM_ESTATE_KEY,
    smartlead_key_configured: SMARTLEAD_API_KEY.length > 0,
    winnr_token_configured: winnrTokenConfigured(WINNR_TOKEN),
    checked_at: new Date().toISOString(),
  };

  if (!SMARTLEAD_API_KEY) {
    return json({ ...base, ok: false, blocker: "SMARTLEAD_API_KEY_missing", mode: "blocked" });
  }

  // --- read-only Smartlead inventory (paginated) --------------------------
  const listPage = async (offset: number) =>
    fetch(`${SMARTLEAD_BASE}/email-accounts/?api_key=${encodeURIComponent(SMARTLEAD_API_KEY)}&offset=${offset}&limit=100`, {
      headers: { Accept: "application/json" },
    });
  const listAll = async (): Promise<{ ok: boolean; status: number; accounts: Record<string, unknown>[] }> => {
    const all: Record<string, unknown>[] = [];
    for (let offset = 0; offset < 5000; offset += 100) {
      const r = await listPage(offset);
      if (!r.ok) return { ok: false, status: r.status, accounts: all };
      const raw = await r.json().catch(() => []);
      const page: Record<string, unknown>[] = Array.isArray(raw) ? raw : [];
      all.push(...page);
      if (page.length < 100) break;
    }
    return { ok: true, status: 200, accounts: all };
  };
  const inventoryResp = await listAll();
  if (!inventoryResp.ok) {
    return json({ ...base, ok: false, mode: "blocked", blocker: "smartlead_list_failed", http_status: inventoryResp.status }, 502);
  }
  const accounts = inventoryResp.accounts;
  const smartleadEmails = new Set(
    accounts.map((a) => String(a.from_email ?? "").trim().toLowerCase()).filter((e) => e.length > 0),
  );

  const { data: registry } = await admin
    .from("gsm_mailboxes")
    .select("id, email, smartlead_email_account_id, smartlead_status, smtp_status, imap_status, warmup_status, configured_daily_limit, sender_name, estate_classification")
    .eq("estate_classification", GSM_ESTATE_KEY);

  const gsmRegistry = selectGsmRegistry((registry ?? []) as { email: string; estate_classification: string; [k: string]: unknown }[]);
  const { scoped: scopedRegistry, invalid: invalidRequestedEmails } =
    scopeRequestedGsmRegistry(gsmRegistry, requestedEmails);
  const { alreadyConnected, missing } = partitionAgainstSmartlead(scopedRegistry, smartleadEmails);

  const inventory = {
    smartlead_accounts_seen: accounts.length,
    gsm_registry_mailboxes: gsmRegistry.length,
    requested_count: requestedEmails.length,
    scoped_registry_mailboxes: scopedRegistry.length,
    already_connected: alreadyConnected.length,
    missing_from_smartlead: missing.length,
  };

  if (apply && requestedEmails.length === 0) {
    return json({
      ...base,
      ok: false,
      mode: "blocked",
      executed: false,
      ...inventory,
      blocker: "requested_emails_required",
      message: "Apply requires an explicit mailbox canary list. No Smartlead account was created.",
    }, 400);
  }

  if (requestedEmails.length > GSM_ONBOARD_MAX_EMAILS) {
    return json({
      ...base,
      ok: false,
      mode: "blocked",
      executed: false,
      ...inventory,
      blocker: "requested_email_limit_exceeded",
      max_requested_emails: GSM_ONBOARD_MAX_EMAILS,
      message: "At most 10 GSM mailboxes may be onboarded in one call.",
    }, 400);
  }

  if (invalidRequestedEmails.length > 0) {
    return json({
      ...base,
      ok: false,
      mode: "blocked",
      executed: false,
      ...inventory,
      blocker: "invalid_requested_email",
      invalid_requested_count: invalidRequestedEmails.length,
      message: "One or more requested mailboxes are outside the safe GSM registry. Nothing was changed.",
    }, 400);
  }

  if (!isOnboardApplyAuthorized(apply, confirmation)) {
    return json({
      ...base,
      mode: "preview",
      executed: false,
      ...inventory,
      ...(apply ? { blocker: "external_action_confirmation_required", expected_confirmation: GSM_ONBOARD_CONFIRMATION } : {}),
      message: "Read-only preview. No Smartlead account was created and no email was sent.",
    });
  }

  if (scopedRegistry.length === 0) {
    return json({ ...base, ok: false, mode: "blocked", executed: false, ...inventory, blocker: "no_gsm_mailboxes_in_scope" }, 409);
  }
  if (!winnrTokenConfigured(WINNR_TOKEN)) {
    return json({ ...base, ok: false, mode: "blocked", executed: false, ...inventory, blocker: "WINNR_API_TOKEN_missing" }, 409);
  }

  const created: string[] = [];
  const failed: { email: string; reason: string }[] = [];

  // Re-check immediately before mutation so a rerun never duplicates accounts.
  const recheck = await listAll();
  if (!recheck.ok) {
    return json({ ...base, ok: false, mode: "blocked", executed: false, ...inventory, blocker: "smartlead_list_failed", http_status: recheck.status }, 502);
  }
  const liveEmails = new Set(recheck.accounts.map((a) => String(a.from_email ?? "").trim().toLowerCase()));
  const toCreate = missing.filter((r) => !liveEmails.has(String(r.email).toLowerCase()));

  for (const domainBatch of chunk(domainsOf(toCreate), GSM_EXPORT_DOMAIN_CHUNK)) {
    const batchRows = toCreate.filter((r) => domainBatch.includes(String(r.email).split("@").pop()!.toLowerCase()));
    const exportCall = await winnrCall<{ data?: { download_url?: string } }>("exportCredentials", {
      token: WINNR_TOKEN,
      allowMutation: true,
      body: { domains: domainBatch },
    });
    const downloadUrl = exportCall.data?.data?.download_url;
    if (!exportCall.ok || !downloadUrl) {
      for (const row of batchRows) failed.push({ email: String(row.email).toLowerCase(), reason: "winnr_credential_export_failed" });
      continue;
    }
    let credentialRows: ExportRow[] = [];
    try {
      const csvText = await (await fetch(downloadUrl)).text();
      credentialRows = parseCsv(csvText)
        .map((r) => ({
          from_email: String(r.from_email ?? "").trim().toLowerCase(),
          from_name: String(r.from_name ?? "").trim(),
          user_name: String(r.user_name ?? "").trim(),
          password: String(r.password ?? ""),
          smtp_host: String(r.smtp_host ?? "").trim(),
          smtp_port: Number(r.smtp_port ?? 465),
          imap_host: String(r.imap_host ?? "").trim(),
          imap_port: Number(r.imap_port ?? 993),
          imap_username: String(r.imap_username ?? r.user_name ?? "").trim(),
          imap_password: String(r.imap_password ?? r.password ?? ""),
        }))
        .filter((r) => isGsmEstateEmail(r.from_email));
    } catch {
      for (const row of batchRows) failed.push({ email: String(row.email).toLowerCase(), reason: "winnr_credential_download_failed" });
      continue;
    }
    const credByEmail = new Map(credentialRows.map((r) => [r.from_email, r]));

    for (const row of batchRows) {
      const email = String(row.email).toLowerCase();
      const cred = credByEmail.get(email);
      if (!cred || !cred.password) {
        failed.push({ email, reason: "credentials_not_available_from_provider_export" });
        continue;
      }
      try {
        const saveResp = await fetch(
          `${SMARTLEAD_BASE}/email-accounts/save?api_key=${encodeURIComponent(SMARTLEAD_API_KEY)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: null,
              from_name: cred.from_name || String(row.sender_name ?? ""),
              from_email: cred.from_email,
              user_name: cred.user_name,
              password: cred.password,
              smtp_host: cred.smtp_host,
              smtp_port: cred.smtp_port,
              imap_host: cred.imap_host,
              imap_port: cred.imap_port,
              max_email_per_day: Number(row.configured_daily_limit ?? 50),
              custom_tracking_url: "",
              bcc: "",
              signature: "",
              warmup_enabled: false,
              total_warmup_per_day: 0,
              daily_rampup: 0,
              reply_rate_percentage: 0,
              client_id: null,
            }),
          },
        );
        const saveText = await saveResp.text();
        if (!saveResp.ok) {
          failed.push({ email, reason: `smartlead_http_${saveResp.status}` });
          continue;
        }
        let parsed: Record<string, unknown> = {};
        try { parsed = JSON.parse(saveText) as Record<string, unknown>; } catch { /* tolerate */ }
        if (parsed.ok === false || String(parsed.error ?? "").length > 0) {
          failed.push({ email, reason: "smartlead_rejected" });
          continue;
        }
        created.push(email);
      } catch {
        failed.push({ email, reason: "smartlead_request_failed" });
      }
    }
    // credentials fall out of scope per batch; never stored, returned or logged
    credentialRows = [];
  }

  // --- reconcile Smartlead state back into the GSM registry ---------------
  const refreshed = await listAll();
  const refreshedByEmail = new Map(
    refreshed.accounts.map((a) => [String(a.from_email ?? "").trim().toLowerCase(), a] as const),
  );

  let updated = 0;
  for (const row of scopedRegistry) {
    const acct = refreshedByEmail.get(String(row.email).toLowerCase());
    if (!acct) continue;
    const warmupDetails = acct.warmup_details as Record<string, unknown> | null;
    const warmupStatus = warmupDetails ? "warming" : String(row.warmup_status ?? "not_started");
    await admin
      .from("gsm_mailboxes")
      .update({
        smartlead_email_account_id: acct.id != null ? String(acct.id) : null,
        smartlead_status: "connected",
        smtp_status: acct.is_smtp_success === true ? "ok" : "failed",
        imap_status: acct.is_imap_success === true ? "ok" : "failed",
        configured_daily_limit: Number(acct.message_per_day ?? row.configured_daily_limit ?? 50),
        warmup_status: warmupStatus,
        last_provider_check_at: new Date().toISOString(),
      })
      .eq("id", row.id as string);
    updated += 1;
  }

  await admin.from("gsm_provider_sync_runs").insert({
    provider: "smartlead",
    run_mode: "gsm_onboard_apply",
    status: failed.length === 0 ? "succeeded" : "partial",
    mailboxes_seen: scopedRegistry.length,
    mailboxes_upserted: updated,
    summary: { estate: GSM_ESTATE_KEY, created: created.length, failed: failed.length },
    finished_at: new Date().toISOString(),
  });

  return json({
    ...base,
    mode: "apply",
    executed: true,
    ...inventory,
    smartlead_accounts_created: created.length,
    failed_count: failed.length,
    registry_rows_reconciled: updated,
    message:
      "GSM mailboxes were connected to Smartlead as sending accounts only. No campaign was created, no lead was pushed, no email was sent, and no credential was stored.",
  });
});
