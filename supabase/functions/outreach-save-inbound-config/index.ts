import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: cErr } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (cErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const {
      inbox_id, inbound_provider,
      imap_host, imap_port, imap_ssl, imap_username, imap_password,
      reuse_smtp_password, polling_enabled, monitored_mailbox,
    } = body ?? {};
    if (!inbox_id || !inbound_provider) return json({ error: "inbox_id and inbound_provider required" }, 400);
    if (!["none","ionos_imap"].includes(inbound_provider)) return json({ error: "invalid inbound_provider" }, 400);
    if (inbound_provider === "ionos_imap") {
      if (!imap_host || !imap_port || !imap_username) return json({ error: "imap host/port/username required" }, 400);
    }
    const encKey = Deno.env.get("INBOX_CREDENTIALS_KEY");
    if (!encKey) return json({ error: "encryption key not configured" }, 500);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data, error } = await admin.rpc("save_inbox_inbound_config", {
      _inbox_id: inbox_id,
      _inbound_provider: inbound_provider,
      _imap_host: imap_host ?? null,
      _imap_port: imap_port ?? null,
      _imap_ssl: imap_ssl ?? true,
      _imap_username: imap_username ?? null,
      _imap_password: imap_password ?? null,
      _reuse_smtp_password: reuse_smtp_password === true,
      _polling_enabled: polling_enabled === true,
      _monitored_mailbox: monitored_mailbox ?? null,
      _enc_key: encKey,
    });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true, data }, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status: number) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}