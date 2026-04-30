import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import nodemailer from "npm:nodemailer@6.9.14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  let inboxIdForLog: string | null = null;
  let toForLog: string | null = null;
  let adminForLog: ReturnType<typeof createClient> | null = null;
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    console.log("[send-test] auth ok user=", userData.user.id);

    const { inbox_id, to } = await req.json().catch(() => ({}));
    if (!inbox_id) return json({ code: "INBOX_NOT_FOUND", error: "inbox_id required" }, 400);
    if (!to) return json({ code: "TEST_RECIPIENT_REQUIRED", error: "to required" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ code: "TEST_RECIPIENT_REQUIRED", error: "invalid recipient email" }, 400);
    inboxIdForLog = inbox_id;
    toForLog = to;
    console.log("[send-test] payload inbox_id=", inbox_id, " to=", to);

    const encKey = Deno.env.get("INBOX_CREDENTIALS_KEY");
    if (!encKey) return json({ code: "MISSING_CREDENTIALS", error: "encryption key not configured" }, 500);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    adminForLog = admin;

    const { data: creds, error: credErr } = await admin.rpc("get_inbox_credentials_for_send", {
      _inbox_id: inbox_id, _enc_key: encKey,
    });
    console.log("[send-test] cred lookup done err=", credErr?.message, " hasCreds=", !!creds);
    if (credErr || !creds) {
      const msg = credErr?.message ?? "credentials not found";
      const code = credErr ? "CREDENTIAL_DECRYPT_FAILED" : "MISSING_CREDENTIALS";
      await admin.rpc("record_inbox_test_send", {
        _inbox_id: inbox_id, _success: false, _to: to, _error: msg,
      });
      return json({ ok: false, code, error: msg }, 400);
    }

    const c = creds as Record<string, unknown>;
    if (c.provider_type !== "ionos_smtp") {
      const msg = `Test send not supported for provider ${c.provider_type}`;
      await admin.rpc("record_inbox_test_send", { _inbox_id: inbox_id, _success: false, _to: to, _error: msg });
      return json({ ok: false, code: "INBOX_NOT_CONFIGURED", error: msg }, 400);
    }

    const port = Number(c.smtp_port);
    const isSSL = c.smtp_encryption === "ssl";
    const fromEmail = (c.from_email as string) || (c.smtp_username as string);
    const fromName = (c.from_name as string) || "";
    const replyTo = (c.reply_to_email as string) || fromEmail;
    console.log("[send-test] smtp config host=", c.smtp_host, " port=", port, " ssl=", isSSL, " user=", c.smtp_username);

    let result: { ok: boolean; error?: string; code?: string; messageId?: string } = { ok: false };

    try {
      const transporter = nodemailer.createTransport({
        host: c.smtp_host as string,
        port,
        secure: isSSL, // true => implicit TLS (465); false => STARTTLS on 587
        requireTLS: !isSSL, // force STARTTLS on 587
        auth: { user: c.smtp_username as string, pass: c.smtp_password as string },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
      });
      console.log("[send-test] verifying transport...");
      await transporter.verify();
      console.log("[send-test] transport verified, sending...");
      const info = await transporter.sendMail({
        from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
        to,
        replyTo,
        subject: "NeonCandy Liftor SMTP test",
        text: `This is a real SMTP test from Liftor using ${fromEmail}.\n\nIf you received this email, IONOS SMTP is configured correctly and this inbox is now Live Ready.`,
      });
      console.log("[send-test] sendMail response messageId=", info.messageId, " response=", info.response);
      result = { ok: true, messageId: info.messageId };
    } catch (e) {
      const err = e as { message?: string; code?: string; responseCode?: number; command?: string };
      const raw = err.message ?? String(e);
      let code = "SMTP_SEND_FAILED";
      if (err.code === "EAUTH" || err.responseCode === 535 || /auth/i.test(raw)) code = "SMTP_AUTH_FAILED";
      else if (err.code === "ETIMEDOUT" || err.code === "ECONNECTION" || err.code === "ECONNREFUSED" || err.code === "ESOCKET") code = "SMTP_CONNECTION_FAILED";
      else if (/tls|ssl|certificate/i.test(raw)) code = "SMTP_TLS_FAILED";
      console.error("[send-test] smtp error code=", code, " raw=", raw, " err.code=", err.code);
      result = { ok: false, code, error: raw };
    }

    await admin.rpc("record_inbox_test_send", {
      _inbox_id: inbox_id,
      _success: result.ok,
      _to: to,
      _error: result.error ?? null,
    });

    await admin.from("activity_log").insert({
      event_type: result.ok ? "smtp_test_passed" : "smtp_test_failed",
      description: result.ok
        ? `Real SMTP test send succeeded to ${to}`
        : `Real SMTP test send failed: ${result.error}`,
      entity_type: "inbox",
      entity_id: inbox_id,
    });

    return json(result, result.ok ? 200 : 400);
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    console.error("[send-test] uncaught:", msg);
    if (adminForLog && inboxIdForLog) {
      await adminForLog.rpc("record_inbox_test_send", {
        _inbox_id: inboxIdForLog, _success: false, _to: toForLog, _error: msg,
      }).catch(() => {});
    }
    return json({ ok: false, code: "SMTP_SEND_FAILED", error: msg }, 500);
  }
});

function json(b: unknown, status: number) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}