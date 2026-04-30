import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { ImapFlow } from "npm:imapflow@1.0.164";
import { simpleParser } from "npm:mailparser@3.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BOUNCE_FROM_PATTERNS = [
  /mailer-daemon@/i, /postmaster@/i, /mail-?delivery/i, /no-?reply.*bounce/i,
];
const BOUNCE_SUBJECT_PATTERNS = [
  /undelivered/i, /undeliverable/i, /delivery (status|failure)/i,
  /returned mail/i, /failure notice/i, /mail delivery failed/i,
];

function looksLikeBounce(from: string, subject: string): boolean {
  const f = from.toLowerCase();
  const s = subject.toLowerCase();
  if (BOUNCE_FROM_PATTERNS.some((r) => r.test(f))) return true;
  if (BOUNCE_SUBJECT_PATTERNS.some((r) => r.test(s))) return true;
  return false;
}

function lower(addr?: string | null): string {
  return (addr ?? "").toLowerCase().trim();
}

interface PollResult {
  inbox_id: string;
  email_address: string;
  ok: boolean;
  new_messages: number;
  duplicates: number;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const encKey = Deno.env.get("INBOX_CREDENTIALS_KEY");
  if (!encKey) return json({ error: "encryption key not configured" }, 500);

  // Optional: poll a single inbox if inbox_id is in body, otherwise poll all enabled
  let targetInboxId: string | null = null;
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (body?.inbox_id) targetInboxId = String(body.inbox_id);
    } catch { /* ignore */ }
  }

  let q = admin.from("inboxes")
    .select("id, email_address, business_name, monitored_mailbox, inbound_provider, inbound_polling_enabled, active")
    .eq("inbound_provider", "ionos_imap")
    .eq("inbound_polling_enabled", true);
  if (targetInboxId) q = q.eq("id", targetInboxId);

  const { data: inboxes, error: ixErr } = await q;
  if (ixErr) return json({ error: ixErr.message }, 500);

  const results: PollResult[] = [];
  for (const ib of inboxes ?? []) {
    const result = await pollInbox(admin, encKey, ib);
    results.push(result);
  }

  return json({ ok: true, polled: results.length, results }, 200);
});

async function pollInbox(
  admin: ReturnType<typeof createClient>,
  encKey: string,
  ib: { id: string; email_address: string; business_name: string | null; monitored_mailbox: string | null },
): Promise<PollResult> {
  const result: PollResult = {
    inbox_id: ib.id, email_address: ib.email_address,
    ok: false, new_messages: 0, duplicates: 0, errors: [],
  };

  let creds: {
    imap_host: string | null; imap_port: number | null; imap_ssl: boolean | null;
    imap_username: string | null; imap_password: string | null;
  } | null = null;
  try {
    const { data, error } = await admin.rpc("get_inbox_imap_credentials", {
      _inbox_id: ib.id, _enc_key: encKey,
    });
    if (error) throw new Error(error.message);
    creds = data as typeof creds;
  } catch (e) {
    result.errors.push(`creds: ${(e as Error).message}`);
    await admin.rpc("record_inbound_poll", { _inbox_id: ib.id, _ok: false, _error: result.errors.join("; "), _new_messages: 0 });
    return result;
  }
  if (!creds?.imap_host || !creds?.imap_username || !creds?.imap_password) {
    result.errors.push("missing IMAP credentials");
    await admin.rpc("record_inbound_poll", { _inbox_id: ib.id, _ok: false, _error: result.errors.join("; "), _new_messages: 0 });
    return result;
  }

  const client = new ImapFlow({
    host: creds.imap_host,
    port: creds.imap_port ?? 993,
    secure: creds.imap_ssl !== false,
    auth: { user: creds.imap_username, pass: creds.imap_password },
    logger: false,
    socketTimeout: 20000,
  });

  try {
    await client.connect();
  } catch (e) {
    const msg = (e as Error).message;
    result.errors.push(`imap_connect: ${msg}`);
    await admin.rpc("record_inbound_poll", { _inbox_id: ib.id, _ok: false, _error: msg, _new_messages: 0 });
    return result;
  }

  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      // Fetch UNSEEN; cap at 50 to avoid runaway
      let count = 0;
      // deno-lint-ignore no-explicit-any
      for await (const msg of (client as any).fetch({ seen: false }, { source: true, envelope: true, uid: true })) {
        if (count >= 50) break;
        count++;
        try {
          const parsed = await simpleParser(msg.source);
          const messageId = parsed.messageId || `imap-${ib.id}-${msg.uid}`;
          const fromEmail = lower(parsed.from?.value?.[0]?.address);
          const toEmail = lower(parsed.to?.value?.[0]?.address ?? ib.email_address);
          const subject = parsed.subject ?? "";
          const bodyText = parsed.text ?? "";
          const bodyHtml = parsed.html || null;
          const inReplyTo = parsed.inReplyTo ?? null;
          const refs = Array.isArray(parsed.references) ? parsed.references.join(" ") : (parsed.references ?? null);
          const isBounce = looksLikeBounce(fromEmail, subject);

          // Dedupe insert
          const { data: existing } = await admin
            .from("inbound_messages")
            .select("id")
            .eq("inbox_id", ib.id)
            .eq("message_id", messageId)
            .maybeSingle();
          if (existing) {
            result.duplicates++;
            // Mark as seen and continue
            // deno-lint-ignore no-explicit-any
            await (client as any).messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true }).catch(() => {});
            continue;
          }

          // Match contact
          const { data: contact } = await admin
            .from("contacts")
            .select("id, assigned_inbox_id, active_campaign_id, status")
            .eq("email", fromEmail)
            .maybeSingle();

          // Insert raw inbound message
          const { data: inbRow, error: inbErr } = await admin
            .from("inbound_messages")
            .insert({
              inbox_id: ib.id,
              message_id: messageId,
              in_reply_to: inReplyTo,
              references_header: refs,
              from_email: fromEmail,
              to_email: toEmail,
              subject,
              body_text: bodyText.slice(0, 100000),
              body_html: typeof bodyHtml === "string" ? bodyHtml.slice(0, 200000) : null,
              is_bounce: isBounce,
              contact_id: contact?.id ?? null,
              campaign_id: contact?.active_campaign_id ?? null,
              processing_status: contact ? "matched" : "unmatched",
            })
            .select("id")
            .single();
          if (inbErr) {
            result.errors.push(`insert ${messageId}: ${inbErr.message}`);
            continue;
          }

          if (!contact) {
            await admin.from("system_events").insert({
              event_type: "inbound_orphan",
              severity: "high",
              message: `Inbound from unknown contact ${fromEmail}`,
              metadata: { inbox_id: ib.id, message_id: messageId, subject },
            });
            // Mark seen
            // deno-lint-ignore no-explicit-any
            await (client as any).messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true }).catch(() => {});
            result.new_messages++;
            continue;
          }

          if (isBounce) {
            await admin.from("email_events").insert({ contact_id: contact.id, event_type: "bounced" });
            await admin.from("contacts").update({
              status: "DO_NOT_CONTACT", active_campaign_id: null, updated_at: new Date().toISOString(),
            }).eq("id", contact.id);
            await admin.from("inbound_messages").update({ processing_status: "bounce_handled" }).eq("id", inbRow.id);
          } else {
            // Inbound communication — triggers AI engine + cancel pending sends via existing trigger
            await admin.from("communications").insert({
              contact_id: contact.id,
              channel: "email",
              direction: "inbound",
              message: `${subject ? `[${subject}] ` : ""}${bodyText}`.slice(0, 8000),
              inbox_id: contact.assigned_inbox_id ?? ib.id,
              ai_generated: false,
            });
            await admin.from("email_events").insert({ contact_id: contact.id, event_type: "replied" });
            await admin.from("contacts").update({
              last_replied_at: new Date().toISOString(),
              conversation_active: true,
              updated_at: new Date().toISOString(),
            }).eq("id", contact.id);
            // Link conversation back into the inbound row (best-effort, after trigger runs)
            const { data: conv } = await admin.from("conversations")
              .select("id").eq("contact_id", contact.id).maybeSingle();
            if (conv) {
              await admin.from("inbound_messages").update({
                conversation_id: conv.id, processing_status: "routed",
              }).eq("id", inbRow.id);
            }
          }

          // Mark message seen
          // deno-lint-ignore no-explicit-any
          await (client as any).messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true }).catch(() => {});
          result.new_messages++;
        } catch (e) {
          result.errors.push(`parse: ${(e as Error).message}`);
        }
      }
    } finally {
      lock.release();
    }
    result.ok = true;
  } catch (e) {
    result.errors.push(`imap: ${(e as Error).message}`);
  } finally {
    try { await client.logout(); } catch { /* ignore */ }
  }

  await admin.rpc("record_inbound_poll", {
    _inbox_id: ib.id,
    _ok: result.ok && result.errors.length === 0,
    _error: result.errors.length ? result.errors.join("; ").slice(0, 500) : null,
    _new_messages: result.new_messages,
  });
  return result;
}

function json(b: unknown, status: number) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}