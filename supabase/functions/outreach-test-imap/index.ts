import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ImapFlow } from "npm:imapflow@1.0.164";

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
    const { data: claims, error: cErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (cErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

    const { inbox_id } = (await req.json().catch(() => ({}))) as { inbox_id?: string };
    if (!inbox_id) return json({ error: "inbox_id required" }, 400);

    const encKey = Deno.env.get("INBOX_CREDENTIALS_KEY");
    if (!encKey) return json({ error: "encryption key not configured" }, 500);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: creds, error: credErr } = await admin.rpc("get_inbox_imap_credentials", {
      _inbox_id: inbox_id, _enc_key: encKey,
    });
    if (credErr) return json({ error: `creds: ${credErr.message}` }, 400);
    const c = creds as {
      imap_host: string | null; imap_port: number | null; imap_ssl: boolean | null;
      imap_username: string | null; imap_password: string | null;
    };
    if (!c?.imap_host || !c?.imap_username || !c?.imap_password) {
      return json({ error: "IMAP credentials missing — save them first" }, 400);
    }

    const client = new ImapFlow({
      host: c.imap_host,
      port: c.imap_port ?? 993,
      secure: c.imap_ssl !== false,
      auth: { user: c.imap_username, pass: c.imap_password },
      logger: false,
      socketTimeout: 15000,
    });
    try {
      await client.connect();
      const lock = await client.getMailboxLock("INBOX");
      try {
        // deno-lint-ignore no-explicit-any
        const status = await (client as any).status("INBOX", { messages: true, unseen: true });
        await admin.rpc("record_inbound_poll", {
          _inbox_id: inbox_id, _ok: true, _error: null, _new_messages: 0,
        });
        return json({ ok: true, mailbox: "INBOX", messages: status.messages, unseen: status.unseen }, 200);
      } finally {
        lock.release();
      }
    } catch (e) {
      const msg = (e as Error).message;
      await admin.rpc("record_inbound_poll", { _inbox_id: inbox_id, _ok: false, _error: msg, _new_messages: 0 });
      return json({ error: msg }, 400);
    } finally {
      try { await client.logout(); } catch { /* ignore */ }
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status: number) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}