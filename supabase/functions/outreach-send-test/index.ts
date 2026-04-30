import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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
    const { data: userData, error: userErr } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const { inbox_id, to } = await req.json().catch(() => ({}));
    if (!inbox_id || !to) return json({ error: "inbox_id and to required" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: "invalid recipient email" }, 400);

    const encKey = Deno.env.get("INBOX_CREDENTIALS_KEY");
    if (!encKey) return json({ error: "encryption key not configured" }, 500);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: creds, error: credErr } = await admin.rpc("get_inbox_credentials_for_send", {
      _inbox_id: inbox_id, _enc_key: encKey,
    });
    if (credErr || !creds) {
      const msg = credErr?.message ?? "credentials not found";
      await admin.rpc("record_inbox_test_send", {
        _inbox_id: inbox_id, _success: false, _to: to, _error: msg,
      });
      return json({ ok: false, error: msg }, 400);
    }

    const c = creds as Record<string, unknown>;
    if (c.provider_type !== "ionos_smtp") {
      const msg = `Test send not supported for provider ${c.provider_type}`;
      await admin.rpc("record_inbox_test_send", { _inbox_id: inbox_id, _success: false, _to: to, _error: msg });
      return json({ ok: false, error: msg }, 400);
    }

    const port = Number(c.smtp_port);
    const isSSL = c.smtp_encryption === "ssl";
    const fromEmail = (c.from_email as string) || (c.smtp_username as string);
    const fromName = (c.from_name as string) || "";
    const replyTo = (c.reply_to_email as string) || fromEmail;

    let result: { ok: boolean; error?: string; messageId?: string } = { ok: false };

    try {
      const client = new SMTPClient({
        connection: {
          hostname: c.smtp_host as string,
          port,
          tls: isSSL, // true => implicit TLS (465), false => STARTTLS upgrade on 587
          auth: { username: c.smtp_username as string, password: c.smtp_password as string },
        },
      });

      await client.send({
        from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
        to,
        replyTo,
        subject: "NeonCandy Liftor SMTP test",
        content: `This is a real SMTP test from Liftor using ${fromEmail}.\n\nIf you received this email, IONOS SMTP is configured correctly and this inbox is now Live Ready.`,
      });
      await client.close();
      result = { ok: true };
    } catch (e) {
      result = { ok: false, error: (e as Error).message };
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
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status: number) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}