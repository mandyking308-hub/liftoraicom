import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { ImapFlow } from "npm:imapflow@1.0.164";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ===== GLOBAL SMTP/IMAP ERROR SHIELD =====
// denomailer (and occasionally imapflow) raise async errors AFTER the
// awaited send() has already resolved successfully — typically when the
// server closes the connection during QUIT with a non-standard reply
// ("invalid cmd"). Without this shield those errors surface as
// "event loop error: Error: invalid cmd" and abort the whole worker
// invocation, stranding rows in pending and never marking them sent.
// We swallow them globally; per-send errors are still captured by the
// awaited try/catch inside sendViaIonosSmtp().
let __smtpShieldInstalled = false;
function installSmtpShield() {
  if (__smtpShieldInstalled) return;
  __smtpShieldInstalled = true;
  globalThis.addEventListener("unhandledrejection", (ev) => {
    const msg = String((ev as PromiseRejectionEvent).reason ?? "");
    if (
      msg.includes("invalid cmd") ||
      msg.includes("SMTP") ||
      msg.includes("denomailer") ||
      msg.includes("ImapFlow") ||
      msg.includes("imap")
    ) {
      console.warn("[outreach-send-worker] swallowed async smtp/imap rejection:", msg);
      ev.preventDefault();
    }
  });
  globalThis.addEventListener("error", (ev) => {
    const msg = String((ev as ErrorEvent).message ?? "");
    if (msg.includes("invalid cmd") || msg.includes("SMTP") || msg.includes("denomailer")) {
      console.warn("[outreach-send-worker] swallowed async smtp error:", msg);
      ev.preventDefault();
    }
  });
}

const PER_RUN_LIMIT = 25;
// Hard wall-clock budget for this invocation. Edge Functions hard-cap at 150s
// idle timeout; we stop accepting new sends well before that.
const RUN_BUDGET_MS = 90_000;
// Per-send hard cap (SMTP + sanity-check + DB writes).
const PER_SEND_BUDGET_MS = 25_000;

// Send variance: small jitter between sends to avoid pattern detection,
// but bounded so we never exceed the run budget.
function jitterMs(): number {
  // 2s → 8s
  return Math.floor(2_000 + Math.random() * 6_000);
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label}_TIMEOUT_${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); },
           (e) => { clearTimeout(t); reject(e); });
  });
}

type InboxRow = {
  id: string;
  email_address: string;
  provider_type: "simulated" | "ionos_smtp";
  live_readiness: string;
  from_name: string | null;
  from_email: string | null;
  reply_to_email: string | null;
};

function buildMessageId(host: string): string {
  const rand = crypto.randomUUID().replace(/-/g, "");
  const domain = host.split("@").pop() || "liftor.local";
  return `<${rand}@${domain}>`;
}

/**
 * Append a copy of the just-sent RFC822 message to the IONOS "Sent" folder
 * via IMAP. Folder name is auto-discovered (Sent / Sent Items / INBOX.Sent /
 * the SPECIAL-USE \Sent flagged mailbox). Best-effort — never throws.
 */
async function appendToSentFolder(
  admin: ReturnType<typeof createClient>,
  inboxId: string,
  rfc822: string,
): Promise<{ ok: boolean; folder?: string; error?: string }> {
  const encKey = Deno.env.get("INBOX_CREDENTIALS_KEY");
  if (!encKey) return { ok: false, error: "encryption key not configured" };
  const { data, error } = await admin.rpc("get_inbox_imap_credentials", {
    _inbox_id: inboxId, _enc_key: encKey,
  });
  if (error || !data) return { ok: false, error: error?.message ?? "imap creds missing" };
  const c = data as Record<string, unknown>;
  const host = c.imap_host as string | null;
  const username = c.imap_username as string | null;
  const password = c.imap_password as string | null;
  if (!host || !username || !password) return { ok: false, error: "imap creds incomplete" };

  const client = new ImapFlow({
    host,
    port: (c.imap_port as number) ?? 993,
    secure: c.imap_ssl !== false,
    auth: { user: username, pass: password },
    logger: false,
  });

  try {
    await withTimeout(client.connect(), 12_000, "IMAP_CONNECT");
    // Discover Sent folder
    let sentFolder: string | null = null;
    try {
      const list = await withTimeout(client.list(), 8_000, "IMAP_LIST") as Array<{
        path: string; specialUse?: string; flags?: Set<string> | string[];
      }>;
      // Prefer SPECIAL-USE \Sent
      for (const m of list) {
        const flags = Array.isArray(m.flags) ? m.flags : Array.from(m.flags ?? []);
        if (m.specialUse === "\\Sent" || flags.includes("\\Sent")) { sentFolder = m.path; break; }
      }
      if (!sentFolder) {
        const candidates = ["Sent", "Sent Items", "INBOX.Sent", "INBOX/Sent", "Gesendet", "Gesendete Objekte"];
        for (const cand of candidates) {
          const hit = list.find((m) => m.path.toLowerCase() === cand.toLowerCase());
          if (hit) { sentFolder = hit.path; break; }
        }
      }
    } catch { /* ignore listing errors */ }

    if (!sentFolder) return { ok: false, error: "sent folder not found" };

    await withTimeout(
      client.append(sentFolder, rfc822, ["\\Seen"], new Date()),
      15_000,
      "IMAP_APPEND",
    );
    return { ok: true, folder: sentFolder };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  } finally {
    try { await withTimeout(client.logout(), 4_000, "IMAP_LOGOUT"); } catch { /* ignore */ }
  }
}

async function sendViaIonosSmtp(
  admin: ReturnType<typeof createClient>,
  inboxId: string,
  to: string,
  subject: string,
  body: string,
): Promise<{
  ok: boolean;
  error?: string;
  messageId?: string;
  rfc822?: string;
  fromAddress?: string;
}> {
  const encKey = Deno.env.get("INBOX_CREDENTIALS_KEY");
  if (!encKey) return { ok: false, error: "encryption key not configured" };
  const { data: creds, error } = await admin.rpc("get_inbox_credentials_for_send", {
    _inbox_id: inboxId, _enc_key: encKey,
  });
  if (error || !creds) return { ok: false, error: error?.message ?? "credentials missing" };
  const c = creds as Record<string, unknown>;
  const port = Number(c.smtp_port);
  const isSSL = c.smtp_encryption === "ssl";
  const fromEmail = (c.from_email as string) || (c.smtp_username as string);
  const fromName = (c.from_name as string) || "";
  const replyTo = (c.reply_to_email as string) || fromEmail;
  const messageId = buildMessageId(fromEmail);
  const fromHeader = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  // Pre-build a minimal RFC822 representation for IMAP APPEND. SMTP server
  // may rewrite headers but this captures what we sent.
  const rfc822 =
    `From: ${fromHeader}\r\n` +
    `To: ${to}\r\n` +
    `Reply-To: ${replyTo}\r\n` +
    `Subject: ${subject}\r\n` +
    `Message-ID: ${messageId}\r\n` +
    `Date: ${new Date().toUTCString()}\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: text/plain; charset=utf-8\r\n` +
    `Content-Transfer-Encoding: 8bit\r\n` +
    `\r\n` +
    body;
  let client: SMTPClient | null = null;
  let sendOk = false;
  try {
    client = new SMTPClient({
      connection: {
        hostname: c.smtp_host as string,
        port, tls: isSSL,
        auth: { username: c.smtp_username as string, password: c.smtp_password as string },
      },
    });
    await withTimeout(
      client.send({
        from: fromHeader,
        to, replyTo, subject, content: body,
        headers: { "Message-ID": messageId },
      }),
      PER_SEND_BUDGET_MS,
      "SMTP_SEND",
    );
    sendOk = true;
    return { ok: true, messageId, rfc822, fromAddress: fromEmail };
  } catch (e) {
    const msg = (e as Error).message;
    // If denomailer throws AFTER the message was already accepted (typically
    // an "invalid cmd" during QUIT), do not falsely mark the send as failed.
    if (sendOk) {
      console.warn("[outreach-send-worker] post-send smtp error ignored:", msg);
      return { ok: true, messageId, rfc822, fromAddress: fromEmail };
    }
    return { ok: false, error: msg };
  } finally {
    if (client) {
      try {
        // denomailer's close() is sync in some versions and returns undefined.
        const maybe = client.close() as unknown;
        if (maybe && typeof (maybe as Promise<void>).then === "function") {
          await withTimeout(maybe as Promise<void>, 3_000, "SMTP_CLOSE");
        }
      } catch (closeErr) {
        console.warn("[outreach-send-worker] smtp close error ignored:", (closeErr as Error).message);
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  installSmtpShield();
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const now = new Date();

    // Optional max override for safe one-shot proof runs.
    let maxOverride: number | null = null;
    try {
      const url = new URL(req.url);
      const q = url.searchParams.get("max");
      if (q) maxOverride = Math.max(1, Math.min(PER_RUN_LIMIT, parseInt(q, 10) || 0));
      if (req.method === "POST") {
        const body = await req.clone().json().catch(() => null);
        if (body && typeof body.max === "number") {
          maxOverride = Math.max(1, Math.min(PER_RUN_LIMIT, body.max));
        }
      }
    } catch { /* ignore */ }
    const runLimit = maxOverride ?? PER_RUN_LIMIT;

    // ===== SYSTEM MODE GUARD =====
    const { data: modeRow } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "system_mode")
      .maybeSingle();
    const systemMode: string =
      typeof modeRow?.value === "string" ? modeRow.value : (modeRow?.value ?? "test");
    const isLive = systemMode === "live";

    // Pull due items ordered by priority FIRST (reply-priority items get priority=10),
    // then by scheduled_at. Includes previously delayed/throttled items whose retry time has arrived.
    const { data: due, error } = await supabase
      .from("email_queue")
      .select("id, contact_id, campaign_id, sequence_step, inbox_id, business_name, scheduled_at, priority, retry_count")
      .in("status", ["pending", "delayed", "throttled"])
      .lte("scheduled_at", now.toISOString())
      .order("priority", { ascending: true })
      .order("scheduled_at", { ascending: true })
      .limit(runLimit);
    if (error) return json({ error: error.message }, 500);
    if (!due?.length) {
      return json({
        processed: 0, sent: 0, blocked: 0, delayed: 0, failed: 0, deferred: 0,
        due_found: 0, first_5_errors: [], next_due_send: null,
        mode: systemMode,
      }, 200);
    }

    let sent = 0, blocked = 0, failed = 0, delayed = 0, deferred = 0;
    const touchedCampaigns = new Set<string>();
    const firstErrors: Array<{ queue_id: string; error: string }> = [];
    const dueFound = due.length;
    const runStart = Date.now();

    for (let idx = 0; idx < due.length; idx++) {
      // Stop early if we're approaching the function idle timeout. Remaining
      // items stay pending and will be picked up by the next cron tick.
      if (Date.now() - runStart > RUN_BUDGET_MS) {
        deferred = due.length - idx;
        break;
      }
      const item = due[idx];
      // Variance between sends (skip jitter on first item)
      if (idx > 0 && sent > 0) {
        await new Promise((r) => setTimeout(r, jitterMs()));
      }

      // ===== THROTTLE / WINDOW / REPUTATION CHECK =====
      if (item.inbox_id) {
        // Ramp enforcement (day 1-3 = 20, day 4-7 = 40, day 8+ = 80)
        const { data: ramp } = await supabase.rpc("enforce_inbox_ramp", { _inbox_id: item.inbox_id });
        const rampDecision = ramp as { allowed: boolean; reason?: string } | null;
        if (rampDecision && !rampDecision.allowed) {
          await supabase.from("email_queue").update({
            status: "delayed",
            block_reason: rampDecision.reason ?? "RAMP_LIMIT_REACHED",
            scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          }).eq("id", item.id);
          delayed += 1;
          continue;
        }

        const { data: throttle } = await supabase.rpc("check_send_throttle", {
          _inbox_id: item.inbox_id,
          _contact_id: item.contact_id,
        });
        const decision = throttle as { allowed: boolean; reason: string; retry_at: string | null } | null;
        if (decision && !decision.allowed) {
          const retryAt = decision.retry_at ?? new Date(Date.now() + 60 * 60 * 1000).toISOString();
          const newStatus = decision.reason === "REPUTATION_PAUSE" || decision.reason === "DOMAIN_REPUTATION_PAUSE"
            ? "throttled" : "delayed";
          await supabase.from("email_queue").update({
            status: newStatus,
            block_reason: decision.reason,
            scheduled_at: retryAt,
          }).eq("id", item.id);
          await supabase.from("activity_log").insert({
            event_type: newStatus === "throttled" ? "send_blocked" : "send_delayed",
            description: `Queue ${item.id} ${newStatus}: ${decision.reason}`,
            entity_type: "email_queue",
            entity_id: item.id,
          });
          delayed += 1;
          continue;
        }
      }

      // Fetch sequence step content
      const { data: seq } = await supabase
        .from("outreach_sequences")
        .select("subject, body")
        .eq("campaign_id", item.campaign_id)
        .eq("step_number", item.sequence_step)
        .maybeSingle();

      // Re-check: skip if a reply has already arrived for this contact
      const { data: replyEvt } = await supabase.from("email_events")
        .select("id").eq("contact_id", item.contact_id).eq("event_type", "replied").limit(1);
      if (replyEvt && replyEvt.length) {
        await supabase.from("email_queue")
          .update({ status: "blocked", block_reason: "REPLY_RECEIVED" })
          .eq("id", item.id);
        blocked += 1;
        touchedCampaigns.add(item.campaign_id);
        continue;
      }

      // Parent-send integrity: a follow-up may only send if the prior step was
      // actually accepted by real SMTP.
      if (item.sequence_step > 1) {
        const { data: parentRow } = await supabase.from("email_queue")
          .select("id,status,delivery_kind,smtp_accepted_at,provider_message_id,block_reason")
          .eq("contact_id", item.contact_id)
          .eq("campaign_id", item.campaign_id)
          .eq("sequence_step", item.sequence_step - 1)
          .maybeSingle();

        const parentReal = !!parentRow
          && parentRow.status === "sent"
          && parentRow.delivery_kind === "smtp_real"
          && !!parentRow.smtp_accepted_at
          && !!parentRow.provider_message_id;

        if (!parentReal) {
          await supabase.from("email_queue")
            .update({
              status: "blocked",
              block_reason: "SIMULATED_PARENT_NOT_SENT",
              delivery_kind: "simulated_parent_not_sent",
              send_error: `Blocked follow-up because step ${item.sequence_step - 1} was not sent via real SMTP${parentRow?.block_reason ? ` (${parentRow.block_reason})` : ""}`,
              last_attempt_at: new Date().toISOString(),
            })
            .eq("id", item.id);
          await supabase.from("activity_log").insert({
            event_type: "send_blocked",
            description: `Queue ${item.id} blocked: SIMULATED_PARENT_NOT_SENT`,
            entity_type: "email_queue",
            entity_id: item.id,
          });
          blocked += 1;
          touchedCampaigns.add(item.campaign_id);
          continue;
        }
      }

      // Sanity check via shared edge function (bounded)
      let checkJson: any = {};
      try {
        const checkRes = await withTimeout(
          fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/crm-send-check`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              contact_id: item.contact_id,
              log_attempt: true,
              channel: "email",
              message: seq ? `[${seq.subject}] ${seq.body}\n\n<!-- tracking_pixel:${item.id} -->` : `Step ${item.sequence_step}`,
              ai_generated: false,
            }),
            signal: AbortSignal.timeout(15_000),
          }),
          15_000,
          "SANITY_CHECK",
        );
        checkJson = await checkRes.json().catch(() => ({}));
      } catch (e) {
        checkJson = { allowed: false, reason: `SANITY_CHECK_FAILED:${(e as Error).message}` };
      }
      const allowed = checkJson?.allowed === true;

      if (!allowed) {
        await supabase.from("email_queue")
          .update({ status: "blocked", block_reason: checkJson?.reason ?? "BLOCKED" })
          .eq("id", item.id);
        blocked += 1;
        touchedCampaigns.add(item.campaign_id);
        continue;
      }

      // ===== PROVIDER-AWARE DISPATCH =====
      // Resolve inbox + provider info
      let inboxRow: InboxRow | null = null;
      if (item.inbox_id) {
        const { data: ix } = await supabase
          .from("inboxes")
          .select("id,email_address,provider_type,live_readiness,from_name,from_email,reply_to_email")
          .eq("id", item.inbox_id)
          .maybeSingle();
        inboxRow = (ix as InboxRow | null) ?? null;
      }

      // Resolve recipient email from contact
      const { data: contactRow } = await supabase
        .from("contacts").select("email").eq("id", item.contact_id).maybeSingle();
      const recipient = (contactRow?.email as string | undefined) ?? null;

      // Per-inbox live: real send whenever inbox itself is Live Ready (ionos_smtp + live_ready),
      // regardless of global system_mode. This enables business-by-business go-live.
      const inboxLiveReady = inboxRow?.provider_type === "ionos_smtp"
        && inboxRow?.live_readiness === "live_ready";
      const useReal = inboxLiveReady && !!recipient;

      // ===== NEONCANDY HARD GUARD =====
      // Neon Candy may only send through hello@neoncandy.online.
      const isNeonCandy =
        (item.business_name ?? "").trim().toLowerCase() === "neon candy";
      if (isNeonCandy && (inboxRow?.email_address ?? "").toLowerCase() !== "hello@neoncandy.online") {
        await supabase.from("email_queue")
          .update({ status: "blocked", block_reason: "NEONCANDY_INVALID_INBOX",
                    send_error: `Neon Candy must send via hello@neoncandy.online (got: ${inboxRow?.email_address ?? "none"})` })
          .eq("id", item.id);
        blocked += 1; touchedCampaigns.add(item.campaign_id); continue;
      }

      // ===== LIVE-CAMPAIGN SIMULATED INBOX GUARD =====
      // In live mode, never let a simulated/non-ready inbox be silently used.
      if (isLive && !useReal) {
        await supabase.from("email_queue")
          .update({ status: "blocked", block_reason: "LIVE_CAMPAIGN_SIMULATED_INBOX_BLOCKED",
                    delivery_kind: "simulated",
                    send_error: `Live campaign attempted to use non-live inbox ${inboxRow?.email_address ?? "(unset)"} (${inboxRow?.live_readiness ?? "unknown"})` })
          .eq("id", item.id);
        await supabase.from("activity_log").insert({
          event_type: "send_blocked",
          description: `Queue ${item.id} blocked: LIVE_CAMPAIGN_SIMULATED_INBOX_BLOCKED`,
          entity_type: "email_queue", entity_id: item.id,
        });
        blocked += 1; touchedCampaigns.add(item.campaign_id); continue;
      }

      // Block if global mode is live but inbox is partially configured (ionos but not ready)
      if (isLive && inboxRow && inboxRow.provider_type !== "simulated" && !inboxLiveReady) {
        await supabase.from("email_queue")
          .update({ status: "blocked", block_reason: "INBOX_NOT_LIVE_READY" })
          .eq("id", item.id);
        await supabase.from("activity_log").insert({
          event_type: "send_blocked",
          description: `Queue ${item.id} blocked: inbox ${inboxRow.email_address} is not live-ready (${inboxRow.live_readiness})`,
          entity_type: "email_queue", entity_id: item.id,
        });
        blocked += 1;
        touchedCampaigns.add(item.campaign_id);
        continue;
      }

      try {
        let realSendOk = false;
        let providerError: string | null = null;
        let providerMessageId: string | null = null;
        let savedToSentAt: string | null = null;
        let savedFolder: string | null = null;
        let appendError: string | null = null;

        if (useReal && inboxRow && recipient) {
          const subj = seq?.subject ?? `Step ${item.sequence_step}`;
          const body = (seq?.body ?? "") + `\n\n<!-- queue:${item.id} -->`;
          const r = await sendViaIonosSmtp(supabase, inboxRow.id, recipient, subj, body);
          realSendOk = r.ok;
          providerError = r.error ?? null;
          providerMessageId = r.messageId ?? null;

          // Best-effort APPEND copy to IONOS Sent folder so the message
          // appears in the user's webmail "Sent" view. IONOS SMTP does NOT
          // automatically save sent mail to the IMAP Sent folder.
          if (r.ok && r.rfc822) {
            const ap = await appendToSentFolder(supabase, inboxRow.id, r.rfc822);
            if (ap.ok) {
              savedToSentAt = new Date().toISOString();
              savedFolder = ap.folder ?? null;
            } else {
              appendError = ap.error ?? "append failed";
            }
          }
        } else {
          // Simulated path — do NOT contact SMTP.
          await supabase.from("activity_log").insert({
            event_type: "send_simulated",
            description: isLive
              ? `SIMULATED — inbox not live-ready or provider=simulated, queue ${item.id}`
              : `TEST MODE — simulated send for queue ${item.id}`,
            entity_type: "email_queue", entity_id: item.id,
          });
        }

        // Decide success/failure for the queue row
        if (useReal && !realSendOk) {
          throw new Error(providerError ?? "SMTP send failed");
        }

        // ===== LIVE-MODE INTEGRITY GATE =====
        // For live mode, refuse to mark sent unless we have proof of SMTP transmission.
        if (isLive) {
          const okSmtp = useReal && realSendOk && !!providerMessageId;
          if (!okSmtp) {
            await supabase.from("email_queue")
              .update({
                status: "blocked",
                block_reason: "LIVE_CAMPAIGN_SIMULATED_INBOX_BLOCKED",
                delivery_kind: useReal ? "smtp_real" : "simulated",
                send_error: "Live mode requires smtp_real + smtp_accepted_at + provider_message_id",
                last_attempt_at: new Date().toISOString(),
              })
              .eq("id", item.id);
            blocked += 1; touchedCampaigns.add(item.campaign_id); continue;
          }
        }

        await supabase.from("email_events").insert({
          contact_id: item.contact_id,
          event_type: "sent",
          email_id: item.id,
        });

        const nowIso = new Date().toISOString();
        await supabase.from("email_queue")
          .update({
            status: "sent",
            sent_at: nowIso,
            last_attempt_at: nowIso,
            smtp_accepted_at: useReal ? nowIso : null,
            provider_message_id: providerMessageId,
            provider_response: useReal
              ? `SMTP accepted${savedFolder ? ` · saved to ${savedFolder}` : appendError ? ` · APPEND failed: ${appendError}` : ""}`
              : "SIMULATED (inbox not live-ready)",
            saved_to_sent_at: savedToSentAt,
            send_error: null,
            delivery_kind: useReal ? "smtp_real" : "simulated",
          })
          .eq("id", item.id);

        if (item.inbox_id) {
          await supabase.from("inboxes")
            .update({ consecutive_failures: 0 })
            .eq("id", item.inbox_id);
        }

        sent += 1;
        touchedCampaigns.add(item.campaign_id);
      } catch (err) {
        // Persist error on the queue row so operators can see it
        const errMsg = (err as Error).message;
        if (firstErrors.length < 5) firstErrors.push({ queue_id: item.id, error: errMsg });
        await supabase.from("email_queue")
          .update({
            send_error: errMsg,
            last_attempt_at: new Date().toISOString(),
            provider_response: `SMTP failed: ${errMsg}`,
            delivery_kind: "smtp_real",
          })
          .eq("id", item.id);

        // Soft-fail retry: mark_send_failure handles exponential backoff (5/20/60 min)
        // and only marks as "failed" after 3 attempts.
        const { data: retryResult } = await supabase.rpc("mark_send_failure", {
          _queue_id: item.id,
          _error: (err as Error).message,
        });
        const result = retryResult as { status: string } | null;
        if (result?.status === "failed") {
          failed += 1;
        } else {
          delayed += 1;
        }

        // Bump consecutive_failures on the inbox
        if (item.inbox_id) {
          await supabase.rpc("increment_inbox_failures", { _inbox_id: item.inbox_id }).then(
            () => {},
            async () => {
              // Fallback if RPC doesn't exist yet — just count it as a soft failure
              const { data: inb } = await supabase.from("inboxes")
                .select("consecutive_failures").eq("id", item.inbox_id).maybeSingle();
              await supabase.from("inboxes")
                .update({ consecutive_failures: (inb?.consecutive_failures ?? 0) + 1 })
                .eq("id", item.inbox_id);
            }
          );
        }
      }
    }

    for (const cid of touchedCampaigns) {
      await supabase.rpc("recompute_campaign_metrics", { _campaign_id: cid });
    }

    // Compute next due send + daily capacity remaining for the result panel.
    let nextDueSend: string | null = null;
    let dailyCapacityRemaining: Record<string, number> = {};
    try {
      const { data: nd } = await supabase
        .from("email_queue")
        .select("scheduled_at")
        .in("status", ["pending", "delayed", "throttled"])
        .order("scheduled_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      nextDueSend = (nd?.scheduled_at as string | undefined) ?? null;

      const inboxIds = Array.from(new Set(due.map((d) => d.inbox_id).filter(Boolean))) as string[];
      if (inboxIds.length) {
        const { data: inboxes } = await supabase
          .from("inboxes")
          .select("id,email_address,daily_send_limit,current_send_count")
          .in("id", inboxIds);
        for (const ib of inboxes ?? []) {
          const remaining = Math.max(
            0,
            (ib.daily_send_limit as number) - (ib.current_send_count as number ?? 0),
          );
          dailyCapacityRemaining[ib.email_address as string] = remaining;
        }
      }
    } catch { /* ignore */ }

    // ===== SELF-CHAIN =====
    // If we deferred items OR there is still due work in the queue, fire a
    // follow-up invocation (fire-and-forget) so the queue drains continuously
    // within one logical "run" instead of waiting for the next cron tick.
    let chained = false;
    try {
      let stillDue = deferred > 0;
      if (!stillDue) {
        const { count } = await supabase
          .from("email_queue")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "delayed", "throttled"])
          .lte("scheduled_at", new Date().toISOString());
        stillDue = (count ?? 0) > 0;
      }
      if (stillDue) {
        // Fire-and-forget — do NOT await. The new invocation runs independently.
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/outreach-send-worker`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ chained: true }),
        }).catch(() => { /* ignore */ });
        chained = true;
      }
    } catch { /* ignore chaining errors */ }

    return json({
      processed: due.length - deferred,
      sent, blocked, failed, delayed, deferred, chained,
      due_found: dueFound,
      first_5_errors: firstErrors,
      next_due_send: nextDueSend,
      daily_capacity_remaining: dailyCapacityRemaining,
      mode: systemMode,
      duration_ms: Date.now() - runStart,
    }, 200);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(b: unknown, status: number) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
