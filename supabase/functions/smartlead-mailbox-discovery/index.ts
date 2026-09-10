import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const WHITELISTED_FIELDS = [
  "id",
  "email",
  "from_name",
  "is_smtp_success",
  "is_imap_success",
  "warmup_enabled",
  "status",
  "daily_limit",
  "created_at",
  "updated_at",
];

/**
 * Smartlead Mailbox Discovery — READ-ONLY GET /email-accounts.
 *
 * Reads the Smartlead account list with the stored server-side key. By default
 * returns a preview only. With apply=true it updates already-registered
 * non-Neon-Candy inboxes with provider readiness fields. No mailboxes are
 * created or deleted here.
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
  const roleSet = new Set((roles ?? []).map((r: any) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* */ }
  const apply: boolean = body.apply === true;

  // Fetch provider credentials
  const { data: provider } = await admin
    .from("outbound_providers")
    .select("id, api_key_encrypted, api_key, config")
    .eq("provider_type", "smartlead")
    .eq("connected", true)
    .limit(1)
    .single();

  if (!provider) {
    return json({ ok: false, error: "smartlead_provider_not_connected" }, 400);
  }

  const apiKey = provider.api_key ?? provider.api_key_encrypted ?? "";
  if (!apiKey) {
    return json({ ok: false, error: "smartlead_api_key_missing" }, 400);
  }

  const url = `https://server.smartlead.ai/api/v1/email-accounts?api_key=${encodeURIComponent(apiKey)}`;
  const resp = await fetch(url, { method: "GET" });
  const status = resp.status;
  let raw: any = {};
  try { raw = await resp.json(); } catch { /* */ }

  const accounts: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
  const sanitized = accounts.map((a) => {
    const out: Record<string, unknown> = {};
    for (const k of WHITELISTED_FIELDS) {
      if (k in a) out[k] = a[k];
    }
    return out;
  });

  if (!apply) {
    return json({
      ok: resp.ok,
      http_status: status,
      apply: false,
      account_count: sanitized.length,
      accounts: sanitized,
      notes: "Preview only. Set apply=true to update registered inboxes.",
    });
  }

  // Apply: update already-registered inboxes by provider_mailbox_id or email.
  const providerIds = sanitized.map((a) => String(a.id)).filter(Boolean);
  const providerEmails = sanitized.map((a) => String(a.email).toLowerCase()).filter(Boolean);

  const { data: registered } = await admin
    .from("inboxes")
    .select("id, email_address, provider_mailbox_id, estate_key")
    .or(`provider_mailbox_id.in."${providerIds.join(",")}",email_address.in."${providerEmails.join(",")}"`);

  const byProviderId = new Map((registered ?? []).map((r: any) => [String(r.provider_mailbox_id), r]));
  const byEmail = new Map((registered ?? []).map((r: any) => [String(r.email_address).toLowerCase(), r]));

  const updates: { id: string; patch: Record<string, unknown> }[] = [];
  for (const a of sanitized) {
    const reg = byProviderId.get(String(a.id)) ?? byEmail.get(String(a.email).toLowerCase());
    if (!reg) continue;
    if ((reg.estate_key ?? "").toLowerCase() === "neon-candy-legacy") continue;
    updates.push({
      id: reg.id,
      patch: {
        provider_mailbox_id: String(a.id),
        email_address: String(a.email).toLowerCase(),
        from_name: a.from_name ?? null,
        smtp_ready: a.is_smtp_success === true,
        imap_ready: a.is_imap_success === true,
        provider_ready: a.is_smtp_success === true && a.is_imap_success === true,
        warmup_ready: a.warmup_enabled === true,
        daily_send_limit: Number.isFinite(Number(a.daily_limit)) ? Number(a.daily_limit) : 25,
        last_provider_sync_at: new Date().toISOString(),
      },
    });
  }

  const nowIso = new Date().toISOString();
  for (const u of updates) {
    await admin.from("inboxes").update({ ...u.patch, updated_at: nowIso }).eq("id", u.id);
  }

  return json({
    ok: resp.ok,
    http_status: status,
    apply: true,
    account_count: sanitized.length,
    matched_registered: updates.length,
    updated: updates.map((u) => ({ id: u.id, email_address: byEmail.get(String(u.id))?.email_address ?? null })),
    notes: "Only matched, non-Neon-Candy registered inboxes were updated. No new inboxes created.",
  });
});
