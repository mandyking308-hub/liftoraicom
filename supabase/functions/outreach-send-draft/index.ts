import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import nodemailer from "npm:nodemailer@6.9.14";

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
    const { data: userData, error: uErr } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (uErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const { draft_id, edited_body } = (await req.json().catch(() => ({}))) as
      { draft_id?: string; edited_body?: string };
    if (!draft_id) return json({ error: "draft_id required" }, 400);

    const encKey = Deno.env.get("INBOX_CREDENTIALS_KEY");
    if (!encKey) return json({ error: "encryption key not configured" }, 500);
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: draft, error: dErr } = await admin.from("ai_drafts")
      .select("*").eq("id", draft_id).maybeSingle();
    if (dErr || !draft) return json({ error: "draft not found" }, 404);
    if (!["pending","approved"].includes(draft.status)) {
      return json({ error: `draft already ${draft.status}` }, 400);
    }

    const { data: contact } = await admin.from("contacts")
      .select("id,email,assigned_inbox_id").eq("id", draft.contact_id).maybeSingle();
    if (!contact?.email) return json({ error: "contact has no email" }, 400);

    const inboxId = draft.inbox_id ?? contact.assigned_inbox_id;
    if (!inboxId) return json({ error: "no inbox to send from" }, 400);

    const { data: creds, error: cErr } = await admin.rpc("get_inbox_credentials_for_send", {
      _inbox_id: inboxId, _enc_key: encKey,
    });
    if (cErr || !creds) return json({ error: cErr?.message ?? "creds missing" }, 400);
    const c = creds as Record<string, unknown>;
    if (c.provider_type !== "ionos_smtp") return json({ error: "inbox not SMTP-configured" }, 400);

    const body = (edited_body && edited_body.trim().length > 0) ? edited_body : draft.draft_body;
    const port = Number(c.smtp_port);
    const isSSL = c.smtp_encryption === "ssl";
    const fromEmail = (c.from_email as string) || (c.smtp_username as string);
    const fromName = (c.from_name as string) || "";
    const replyTo = (c.reply_to_email as string) || fromEmail;

    const transporter = nodemailer.createTransport({
      host: c.smtp_host as string, port, secure: isSSL,
      auth: { user: c.smtp_username as string, pass: c.smtp_password as string },
      requireTLS: !isSSL, connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000,
      tls: { servername: c.smtp_host as string, minVersion: "TLSv1.2" },
    });
    try { await transporter.verify(); } catch (e) {
      return json({ error: `SMTP verify failed: ${(e as Error).message}` }, 400);
    }
    let info: { messageId?: string; response?: string };
    try {
      info = await transporter.sendMail({
        from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
        to: contact.email,
        replyTo,
        subject: "Re: " + (await getLatestSubject(admin, draft.contact_id) ?? "your message"),
        text: body,
      });
    } catch (e) {
      return json({ error: `SMTP send failed: ${(e as Error).message}` }, 400);
    }

    // Record outbound communication (triggers existing flow + cancels future sends already done by trigger).
    await admin.from("communications").insert({
      contact_id: draft.contact_id,
      channel: "email",
      direction: "outbound",
      message: body,
      inbox_id: inboxId,
      ai_generated: true,
    });

    await admin.from("ai_drafts").update({
      status: "sent",
      edited_body: edited_body ?? null,
      approved_by: userData.user.id,
      approved_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
    }).eq("id", draft_id);

    return json({ ok: true, messageId: info.messageId, response: info.response }, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

async function getLatestSubject(
  admin: ReturnType<typeof createClient>, contactId: string,
): Promise<string | null> {
  const { data } = await admin.from("inbound_messages")
    .select("subject").eq("contact_id", contactId)
    .order("received_at", { ascending: false }).limit(1).maybeSingle();
  return data?.subject ?? null;
}

function json(b: unknown, status: number) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}