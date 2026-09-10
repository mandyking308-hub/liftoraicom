import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { LEGACY_NEON_CANDY_ESTATE } from "../_shared/mailboxRegistrationParser.ts";

const SMARTLEAD_BASE_URL = "https://server.smartlead.ai/api/v1";
const CONFIRMATION = "SYNC MAILBOX READINESS";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Read-only Smartlead mailbox discovery, with an explicit apply gate.
 *
 * Uses ONLY GET /email-accounts. Never creates, edits, pauses, warms up or
 * deletes a Smartlead mailbox. Never sends.
 *
 * mode="discover" (default): reports what Smartlead has versus what Liftor has
 *   registered. No writes.
 * mode="apply": requires the confirmation phrase and writes provider readiness
 *   (SMTP/IMAP/warm-up/daily cap/provider ids) onto mailboxes ALREADY registered
 *   in Liftor. It never creates a Liftor mailbox from provider data, and never
 *   touches the legacy Neon Candy estate.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SMARTLEAD_API_KEY = Deno.env.get("SMARTLEAD_API_KEY") ?? null;

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
  if (!roleSet.has("founder") && !roleSet.has("admin")) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  if (!SMARTLEAD_API_KEY || SMARTLEAD_API_KEY.length < 8) {
    return json({ ok: false, error: "smartlead_api_key_missing" }, 400);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch { /* discover by default */ }
  const mode = String(body.mode ?? "discover").toLowerCase() === "apply" ? "apply" : "discover";
  const confirmation = String(body.confirmation ?? "").trim();

  // ---- Read-only GET ----
  const url = `${SMARTLEAD_BASE_URL}/email-accounts/?api_key=${encodeURIComponent(SMARTLEAD_API_KEY)}&limit=200&offset=0`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  let providerAccounts: Record<string, unknown>[] = [];
  let httpStatus = 0;
  try {
    const res = await fetch(url, { method: "GET", signal: ctrl.signal });
    httpStatus = res.status;
    const text = await res.text();
    if (!res.ok) return json({ ok: false, error: `smartlead_http_${res.status}` }, 502);
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      return json({ ok: false, error: "smartlead_response_unparsable" }, 502);
    }
    providerAccounts = Array.isArray(parsed)
      ? (parsed as Record<string, unknown>[])
      : Array.isArray((parsed as { data?: unknown })?.data)
        ? ((parsed as { data: Record<string, unknown>[] }).data)
        : [];
  } catch {
    return json({ ok: false, error: "smartlead_fetch_failed" }, 502);
  } finally {
    clearTimeout(timer);
  }

  // Whitelisted fields only — never echo raw provider objects or credentials.
  const safe = providerAccounts.map((a) => ({
    provider_mailbox_id: a.id !== undefined && a.id !== null ? String(a.id) : null,
    email_address: String(a.from_email ?? a.email ?? "").toLowerCase() || null,
    from_name: a.from_name ? String(a.from_name) : null,
    smtp_ready: a.is_smtp_success === true,
    imap_ready: a.is_imap_success === true,
    warmup_status: a.warmup_details ? "configured" : String(a.warmup_status ?? "not_running"),
    warmup_active:
      (a as { warmup_details?: { status?: string } })?.warmup_details?.status?.toLowerCase() === "active",
    daily_limit: Number(a.message_per_day ?? a.daily_limit ?? 0) || null,
  }));

  const { data: liftorInboxes } = await admin
    .from("inboxes")
    .select("id, email_address, estate_key, provider_mailbox_id, provider_ready, warmup_ready");
  const byEmail = new Map(
    (liftorInboxes ?? []).map((i) => [String(i.email_address).toLowerCase(), i]),
  );

  const comparison = safe.map((p) => {
    const hit = p.email_address ? byEmail.get(p.email_address) : undefined;
    return {
      ...p,
      registered_in_liftor: !!hit,
      liftor_inbox_id: hit?.id ?? null,
      estate_key: hit?.estate_key ?? null,
      protected_legacy: (hit?.estate_key ?? "") === LEGACY_NEON_CANDY_ESTATE,
    };
  });

  const inLiftorNotProvider = (liftorInboxes ?? [])
    .filter((i) => !safe.some((p) => p.email_address === String(i.email_address).toLowerCase()))
    .map((i) => ({ email_address: i.email_address, estate_key: i.estate_key }));

  if (mode === "discover") {
    return json({
      ok: true,
      mode: "discover",
      http_status: httpStatus,
      provider_mailbox_count: safe.length,
      liftor_mailbox_count: (liftorInboxes ?? []).length,
      comparison,
      registered_in_liftor_but_not_in_smartlead: inLiftorNotProvider,
      apply_instructions: `Re-send with mode="apply" and confirmation="${CONFIRMATION}" to write provider readiness onto already-registered mailboxes.`,
      notes: "Read-only GET. No Smartlead object created, changed, paused or warmed. No email sent.",
    });
  }

  if (confirmation !== CONFIRMATION) {
    return json({ ok: false, error: "confirmation_phrase_mismatch", expected: CONFIRMATION }, 400);
  }

  let updated = 0;
  const skipped: { email_address: string | null; reason: string }[] = [];
  for (const row of comparison) {
    if (!row.email_address) continue;
    if (!row.registered_in_liftor || !row.liftor_inbox_id) {
      skipped.push({ email_address: row.email_address, reason: "not_registered_in_liftor" });
      continue;
    }
    if (row.protected_legacy) {
      skipped.push({ email_address: row.email_address, reason: "legacy_neon_candy_protected" });
      continue;
    }
    const { error } = await admin
      .from("inboxes")
      .update({
        provider_mailbox_id: row.provider_mailbox_id,
        smtp_ready: row.smtp_ready,
        imap_ready: row.imap_ready,
        provider_ready: row.smtp_ready && row.imap_ready,
        warmup_status: row.warmup_status,
        // Warm-up readiness is only true when Smartlead reports it complete.
        warmup_ready: String(row.warmup_status).toLowerCase() === "completed",
        daily_send_limit: row.daily_limit ?? undefined,
        last_provider_sync_at: new Date().toISOString(),
      })
      .eq("id", row.liftor_inbox_id);
    if (error) skipped.push({ email_address: row.email_address, reason: "update_failed" });
    else updated += 1;
  }

  return json({
    ok: true,
    mode: "apply",
    http_status: httpStatus,
    updated,
    skipped,
    notes:
      "Readiness copied from Smartlead into Liftor. Nothing was created or changed inside Smartlead. No email sent.",
  });
});
