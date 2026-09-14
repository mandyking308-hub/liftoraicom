import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  WINNR_LIST_PAGE_SIZE,
  winnrCall,
  winnrTokenConfigured,
} from "../_shared/winnrClient.ts";
import {
  GHAT_DOMAINS,
  GHAT_ESTATE_KEY,
  GHAT_OWNER_LEGAL_ENTITY,
  isGhatEstateEmail,
} from "../_shared/senderEstates.ts";

/**
 * GHAT ↔ Smartlead mailbox onboarding. Founder/admin only.
 *
 * Connects the Global Health Access Trust mailboxes (globalhealthaccesstrust.org)
 * to the existing Smartlead account so they can later be used for outbound.
 *
 * Hard rules:
 *  - GHAT only. A non-GHAT address can never be touched by this endpoint, so
 *    the GSM commercial estate and legacy Neon Candy are structurally out of scope.
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

const APPLY_CONFIRMATION = "CONNECT GHAT MAILBOXES TO SMARTLEAD";
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

  const base = {
    ok: true,
    estate: GHAT_ESTATE_KEY,
    owner_legal_entity: GHAT_OWNER_LEGAL_ENTITY,
    domain: GHAT_DOMAINS[0],
    smartlead_key_configured: SMARTLEAD_API_KEY.length > 0,
    winnr_token_configured: winnrTokenConfigured(WINNR_TOKEN),
    checked_at: new Date().toISOString(),
  };

  if (!SMARTLEAD_API_KEY) {
    return json({ ...base, ok: false, blocker: "SMARTLEAD_API_KEY_missing", mode: "blocked" });
  }

  // --- read-only Smartlead inventory -------------------------------------
  const listUrl = `${SMARTLEAD_BASE}/email-accounts/?api_key=${encodeURIComponent(SMARTLEAD_API_KEY)}&offset=0&limit=100`;
  const listResp = await fetch(listUrl, { headers: { Accept: "application/json" } });
  if (!listResp.ok) {
    return json({ ...base, ok: false, mode: "blocked", blocker: "smartlead_list_failed", http_status: listResp.status }, 502);
  }
  const listRaw = await listResp.json().catch(() => []);
  const accounts: Record<string, unknown>[] = Array.isArray(listRaw) ? listRaw : [];
  const accountByEmail = new Map(
    accounts
      .map((a) => [String(a.from_email ?? "").trim().toLowerCase(), a] as const)
      .filter(([e]) => e.length > 0),
  );

  const { data: registry } = await admin
    .from("gsm_mailboxes")
    .select("id, email, smartlead_email_account_id, smartlead_status, smtp_status, imap_status, warmup_status, configured_daily_limit, sender_name, estate_classification")
    .eq("estate_classification", GHAT_ESTATE_KEY);

  const ghatRegistry = (registry ?? []).filter((r) => isGhatEstateEmail(String(r.email)));
  const alreadyConnected = ghatRegistry.filter((r) => accountByEmail.has(String(r.email).toLowerCase()));
  const missing = ghatRegistry.filter((r) => !accountByEmail.has(String(r.email).toLowerCase()));

  const inventory = {
    smartlead_accounts_seen: accounts.length,
    smartlead_ghat_accounts: Array.from(accountByEmail.keys()).filter(isGhatEstateEmail).length,
    ghat_registry_mailboxes: ghatRegistry.length,
    already_connected: alreadyConnected.length,
    missing_from_smartlead: missing.length,
    missing_emails: missing.map((r) => String(r.email)),
  };

  if (!apply || confirmation !== APPLY_CONFIRMATION) {
    return json({
      ...base,
      mode: "preview",
      executed: false,
      ...inventory,
      ...(apply ? { blocker: "external_action_confirmation_required", expected_confirmation: APPLY_CONFIRMATION } : {}),
      message: "Read-only preview. No Smartlead account was created and no email was sent.",
    });
  }

  if (ghatRegistry.length === 0) {
    return json({ ...base, ok: false, mode: "blocked", executed: false, ...inventory, blocker: "no_ghat_mailboxes_in_registry" }, 409);
  }

  // --- credentials: fetched server-side, used once, never persisted -------
  if (!winnrTokenConfigured(WINNR_TOKEN)) {
    return json({ ...base, ok: false, mode: "blocked", executed: false, ...inventory, blocker: "WINNR_API_TOKEN_missing" }, 409);
  }

  const created: string[] = [];
  const failed: { email: string; reason: string }[] = [];
  let credentialRows: ExportRow[] = [];

  if (missing.length > 0) {
    const exportCall = await winnrCall<{ data?: { download_url?: string } }>("exportCredentials", {
      token: WINNR_TOKEN,
      allowMutation: true,
      body: { domains: [GHAT_DOMAINS[0]] },
    });
    const downloadUrl = exportCall.data?.data?.download_url;
    if (!exportCall.ok || !downloadUrl) {
      return json({
        ...base,
        ok: false,
        mode: "blocked",
        executed: false,
        ...inventory,
        blocker: "winnr_credential_export_failed",
        error_code: exportCall.error_code,
        http_status: exportCall.http_status,
      }, 502);
    }
    const csvResp = await fetch(downloadUrl);
    const csvText = await csvResp.text();
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
      .filter((r) => isGhatEstateEmail(r.from_email));

    const credByEmail = new Map(credentialRows.map((r) => [r.from_email, r]));

    for (const row of missing) {
      const email = String(row.email).toLowerCase();
      const cred = credByEmail.get(email);
      if (!cred || !cred.password) {
        failed.push({ email, reason: "credentials_not_available_from_provider_export" });
        continue;
      }
      const saveResp = await fetch(
        `${SMARTLEAD_BASE}/email-accounts/save?api_key=${encodeURIComponent(SMARTLEAD_API_KEY)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: null,
            from_name: cred.from_name || String(row.sender_name ?? "Global Health Access Trust"),
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
    }
    // Credentials go out of scope here. Nothing above is stored or returned.
    credentialRows = [];
  }

  // --- reconcile Smartlead state back into the GHAT registry --------------
  const refreshResp = await fetch(listUrl, { headers: { Accept: "application/json" } });
  const refreshRaw = refreshResp.ok ? await refreshResp.json().catch(() => []) : [];
  const refreshed: Record<string, unknown>[] = Array.isArray(refreshRaw) ? refreshRaw : [];
  const refreshedByEmail = new Map(
    refreshed.map((a) => [String(a.from_email ?? "").trim().toLowerCase(), a] as const),
  );

  let updated = 0;
  for (const row of ghatRegistry) {
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
      .eq("id", row.id);
    updated += 1;
  }

  await admin.from("gsm_provider_sync_runs").insert({
    provider: "smartlead",
    run_mode: "ghat_onboard_apply",
    status: failed.length === 0 ? "succeeded" : "partial",
    mailboxes_seen: ghatRegistry.length,
    mailboxes_upserted: updated,
    summary: { estate: GHAT_ESTATE_KEY, created: created.length, failed: failed.length },
    finished_at: new Date().toISOString(),
  });

  return json({
    ...base,
    mode: "apply",
    executed: true,
    ...inventory,
    smartlead_accounts_created: created.length,
    created_emails: created,
    failed_count: failed.length,
    failed,
    registry_rows_reconciled: updated,
    message:
      "GHAT mailboxes were connected to Smartlead as sending accounts only. No campaign was created, no lead was pushed, no email was sent, and no credential was stored.",
  });
});
