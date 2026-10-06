import { winnrTokenConfigured } from "../_shared/winnrClient.ts";
import type { winnrCall } from "../_shared/winnrClient.ts";
import {
  GHAT_DOMAINS,
  GHAT_ESTATE_KEY,
  GHAT_OWNER_LEGAL_ENTITY,
  isGhatEstateEmail,
} from "../_shared/senderEstates.ts";

/**
 * GHAT ↔ Smartlead mailbox onboarding. Founder/admin only.
 *
 * Connects the Global Health Access Trust mailboxes (all registered GHAT domains)
 * to the existing Smartlead account so they can later be used for outbound.
 *
 * Hard rules:
 *  - GHAT only. A non-GHAT address can never be touched by this endpoint, so
 *    the GSM commercial estate and legacy Neon Candy are structurally out of scope.
 *  - Mailbox credentials are fetched server-side from Winnr's export endpoint,
 *    held in memory for the single Smartlead call, and NEVER persisted,
 *    returned, or logged.
 *  - Apply requires an explicit 1–10 allowlist of exact registered GHAT addresses.
 *  - Smartlead inventory is fully paginated; already-connected accounts are never re-created.
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

export const APPLY_CONFIRMATION = "CONNECT GHAT MAILBOXES TO SMARTLEAD";
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

export const GHAT_ONBOARD_MAX_EMAILS = 10;
const SMARTLEAD_PAGE = 100;

export interface GhatOnboardDeps {
  env: (key: string) => string | undefined;
  // deno-lint-ignore no-explicit-any
  createClient: (url: string, key: string, opts?: any) => any;
  fetch: typeof fetch;
  winnrCall: typeof winnrCall;
}

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
const domainOf = (e: string) => e.split("@").pop() ?? "";

export function normalizeGhatEmails(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(norm).filter(Boolean)));
}

export async function handleGhatSmartleadOnboard(req: Request, deps: GhatOnboardDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = deps.env("SUPABASE_URL")!;
  const SERVICE_KEY = deps.env("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = deps.env("SUPABASE_ANON_KEY")!;
  const WINNR_TOKEN = deps.env("WINNR_API_TOKEN");
  const SMARTLEAD_API_KEY = deps.env("SMARTLEAD_API_KEY") ?? "";

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "auth_missing" }, 401);

  const userClient = deps.createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: u, error: ue } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (ue || !u?.user) return json({ ok: false, error: "auth_invalid" }, 401);

  const admin = deps.createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const roleSet = new Set((roles ?? []).map((r: { role: string }) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) return json({ ok: false, error: "forbidden" }, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body allowed */ }
  const apply = body.apply === true;
  const confirmation = String(body.external_action_confirmation ?? "");
  const requested = normalizeGhatEmails(body.emails);
  const ghatDomains = GHAT_DOMAINS.map(norm);

  const base = {
    ok: true,
    estate: GHAT_ESTATE_KEY,
    owner_legal_entity: GHAT_OWNER_LEGAL_ENTITY,
    domains: ghatDomains,
    smartlead_key_configured: SMARTLEAD_API_KEY.length > 0,
    winnr_token_configured: winnrTokenConfigured(WINNR_TOKEN),
    checked_at: new Date().toISOString(),
  };

  if (!SMARTLEAD_API_KEY) {
    return json({ ...base, ok: false, blocker: "SMARTLEAD_API_KEY_missing", mode: "blocked" });
  }

  // --- read-only Smartlead inventory (fully paginated) --------------------
  const listAll = async (): Promise<{ ok: boolean; status: number; accounts: Record<string, unknown>[] }> => {
    const all: Record<string, unknown>[] = [];
    for (let offset = 0; offset < 5000; offset += SMARTLEAD_PAGE) {
      const r = await deps.fetch(
        `${SMARTLEAD_BASE}/email-accounts/?api_key=${encodeURIComponent(SMARTLEAD_API_KEY)}&offset=${offset}&limit=${SMARTLEAD_PAGE}`,
        { headers: { Accept: "application/json" } },
      );
      if (!r.ok) return { ok: false, status: r.status, accounts: all };
      const raw = await r.json().catch(() => []);
      const page: Record<string, unknown>[] = Array.isArray(raw) ? raw : [];
      all.push(...page);
      if (page.length < SMARTLEAD_PAGE) break;
    }
    return { ok: true, status: 200, accounts: all };
  };
  const inv = await listAll();
  if (!inv.ok) {
    return json({ ...base, ok: false, mode: "blocked", blocker: "smartlead_list_failed", http_status: inv.status }, 502);
  }
  const smartleadEmails = new Set(inv.accounts.map((a) => norm(a.from_email)).filter(Boolean));

  const { data: registry } = await admin
    .from("gsm_mailboxes")
    .select("id, email, smartlead_email_account_id, smartlead_status, smtp_status, imap_status, warmup_status, configured_daily_limit, sender_name, estate_classification")
    .eq("estate_classification", GHAT_ESTATE_KEY);

  // GHAT only: registry classification AND address-level estate AND a registered GHAT domain.
  // deno-lint-ignore no-explicit-any
  const ghatRegistry = ((registry ?? []) as any[]).filter((r) =>
    r.estate_classification === GHAT_ESTATE_KEY &&
    isGhatEstateEmail(String(r.email)) &&
    ghatDomains.includes(domainOf(norm(r.email)))
  );
  const byEmail = new Map(ghatRegistry.map((r) => [norm(r.email), r] as const));
  const invalid = requested.filter((e) => !byEmail.has(e));
  const scoped = requested.length ? requested.map((e) => byEmail.get(e)).filter(Boolean) : ghatRegistry;
  const alreadyConnected = scoped.filter((r) => smartleadEmails.has(norm(r.email)));
  const missing = scoped.filter((r) => !smartleadEmails.has(norm(r.email)));

  const inventory = {
    smartlead_accounts_seen: inv.accounts.length,
    smartlead_ghat_accounts: Array.from(smartleadEmails).filter(isGhatEstateEmail).length,
    ghat_registry_mailboxes: ghatRegistry.length,
    requested_count: requested.length,
    scoped_registry_mailboxes: scoped.length,
    already_connected: alreadyConnected.length,
    missing_from_smartlead: missing.length,
    missing_by_domain: Object.fromEntries(
      ghatDomains.map((d) => [d, missing.filter((r) => domainOf(norm(r.email)) === d).length]),
    ),
  };
  const blocked = (blocker: string, extra: Record<string, unknown> = {}, status = 400) =>
    json({ ...base, ok: false, mode: "blocked", executed: false, ...inventory, blocker, ...extra }, status);

  if (apply && requested.length === 0) return blocked("requested_emails_required");
  if (requested.length > GHAT_ONBOARD_MAX_EMAILS) {
    return blocked("requested_email_limit_exceeded", { max_requested_emails: GHAT_ONBOARD_MAX_EMAILS });
  }
  if (invalid.length > 0) return blocked("invalid_requested_email", { invalid_requested_count: invalid.length });

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

  if (scoped.length === 0) return blocked("no_ghat_mailboxes_in_scope", {}, 409);
  if (!winnrTokenConfigured(WINNR_TOKEN)) return blocked("WINNR_API_TOKEN_missing", {}, 409);

  // Re-check immediately before mutation so a rerun never duplicates accounts.
  const recheck = await listAll();
  if (!recheck.ok) return blocked("smartlead_list_failed", { http_status: recheck.status }, 502);
  const live = new Set(recheck.accounts.map((a) => norm(a.from_email)));
  const toCreate = missing.filter((r) => !live.has(norm(r.email)));

  const created: string[] = [];
  const failed: { reason: string }[] = [];

  if (toCreate.length > 0) {
    // Only registered GHAT domains that actually have a mailbox to create.
    const exportDomains = Array.from(new Set(toCreate.map((r) => domainOf(norm(r.email)))))
      .filter((d) => ghatDomains.includes(d)).sort();
    const exportCall = await deps.winnrCall<{ data?: { download_url?: string } }>("exportCredentials", {
      token: WINNR_TOKEN,
      allowMutation: true,
      body: { domains: exportDomains },
    });
    const downloadUrl = exportCall.data?.data?.download_url;
    if (!exportCall.ok || !downloadUrl) {
      return blocked("winnr_credential_export_failed", { error_code: exportCall.error_code, http_status: exportCall.http_status }, 502);
    }
    let credentialRows: ExportRow[] = parseCsv(await (await deps.fetch(downloadUrl)).text())
      .map((r) => ({
        from_email: norm(r.from_email),
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
      .filter((r) => isGhatEstateEmail(r.from_email) && ghatDomains.includes(domainOf(r.from_email)));
    const credByEmail = new Map(credentialRows.map((r) => [r.from_email, r]));

    for (const row of toCreate) {
      const email = norm(row.email);
      const cred = credByEmail.get(email);
      if (!cred || !cred.password) { failed.push({ reason: "credentials_not_available_from_provider_export" }); continue; }
      const saveResp = await deps.fetch(
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
      if (!saveResp.ok) { failed.push({ reason: `smartlead_http_${saveResp.status}` }); continue; }
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(saveText) as Record<string, unknown>; } catch { /* tolerate */ }
      if (parsed.ok === false || String(parsed.error ?? "").length > 0) { failed.push({ reason: "smartlead_rejected" }); continue; }
      created.push(email);
    }
    credentialRows = []; // credentials leave scope; never stored, returned or logged
  }

  // --- reconcile Smartlead state back into the scoped GHAT rows ----------
  const refreshed = await listAll();
  const refreshedByEmail = new Map(refreshed.accounts.map((a) => [norm(a.from_email), a] as const));
  let updated = 0;
  for (const row of scoped) {
    const acct = refreshedByEmail.get(norm(row.email));
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
    mailboxes_seen: scoped.length,
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
    failed_count: failed.length,
    failed_reasons: failed.map((f) => f.reason),
    registry_rows_reconciled: updated,
    message:
      "GHAT mailboxes were connected to Smartlead as sending accounts only. No campaign was created, no lead was pushed, no email was sent, warm-up was not enabled, and no credential was stored.",
  });
}
