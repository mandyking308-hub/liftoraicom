import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { ImapFlow } from "npm:imapflow@1.0.164";
import { simpleParser } from "npm:mailparser@3.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_MESSAGES_PER_POLL = 10;
const FULL_POLL_TIMEOUT_MS = 55_000;
const CONNECT_TIMEOUT_MS = 12_000;
const MAILBOX_OPEN_TIMEOUT_MS = 10_000;
const SEARCH_TIMEOUT_MS = 20_000;
const FETCH_MESSAGE_TIMEOUT_MS = 8_000;
const PARSE_TIMEOUT_MS = 8_000;
const PROCESS_TIMEOUT_MS = 10_000;
const MARK_SEEN_TIMEOUT_MS = 5_000;
const LOGOUT_TIMEOUT_MS = 5_000;

const ERROR_CODES = {
  CONFIG_ERROR: "CONFIG_ERROR",
  IMAP_TIMEOUT: "IMAP_TIMEOUT",
  IMAP_AUTH_FAILED: "IMAP_AUTH_FAILED",
  IMAP_CONNECTION_FAILED: "IMAP_CONNECTION_FAILED",
  IMAP_TLS_FAILED: "IMAP_TLS_FAILED",
  IMAP_LIBRARY_ERROR: "IMAP_LIBRARY_ERROR",
  MESSAGE_PARSE_FAILED: "MESSAGE_PARSE_FAILED",
  MESSAGE_PROCESSING_FAILED: "MESSAGE_PROCESSING_FAILED",
  INBOX_NOT_FOUND: "INBOX_NOT_FOUND",
} as const;

const BOUNCE_FROM_PATTERNS = [
  /mailer-daemon@/i,
  /postmaster@/i,
  /mail-?delivery/i,
  /no-?reply.*bounce/i,
];
const BOUNCE_SUBJECT_PATTERNS = [
  /undelivered/i,
  /undeliverable/i,
  /delivery (status|failure)/i,
  /returned mail/i,
  /failure notice/i,
  /mail delivery failed/i,
];

const SAFE_DUPLICATE_STATUSES = new Set(["unmatched", "bounce_handled", "routed"]);

type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
type PollStage = "config" | "creds" | "connect" | "open" | "fetch" | "parse" | "process" | "logout";

type InboxRow = {
  id: string;
  email_address: string;
  business_name: string | null;
  monitored_mailbox: string | null;
  inbound_provider?: string | null;
  inbound_polling_enabled?: boolean | null;
  active?: boolean | null;
};

type ImapCreds = {
  imap_host: string | null;
  imap_port: number | null;
  imap_ssl: boolean | null;
  imap_username: string | null;
  imap_password: string | null;
};

type ProviderError = {
  name?: string;
  message?: string;
};

type CounterSnapshot = {
  messages_scanned: number;
  new_messages: number;
  imported: number;
  duplicates: number;
  matched: number;
  unmatched: number;
  conversations_created: number;
  ai_drafts_created: number;
  bounces: number;
  remaining_unseen: number;
};

interface PollResult extends CounterSnapshot {
  inbox_id: string;
  email_address: string;
  ok: boolean;
  code?: ErrorCode;
  message?: string;
  stage?: PollStage;
  providerError?: ProviderError;
  suggestedAction?: string;
  partial_counts?: CounterSnapshot;
  errors: string[];
  processed_message_ids: string[];
}

type PersistOutcome = {
  markSeen: boolean;
  messageId: string;
  counts: Partial<CounterSnapshot>;
};

class PollStageError extends Error {
  code: ErrorCode;
  stage: PollStage;
  providerError?: ProviderError;
  suggestedAction?: string;

  constructor(
    code: ErrorCode,
    stage: PollStage,
    message: string,
    providerError?: ProviderError,
    suggestedAction?: string,
  ) {
    super(message);
    this.name = "PollStageError";
    this.code = code;
    this.stage = stage;
    this.providerError = providerError;
    this.suggestedAction = suggestedAction;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET");
  const providedSecret = req.headers.get("x-cron-secret");
  if (!cronSecret || !providedSecret || providedSecret !== cronSecret) {
    return json({
      ok: false,
      code: ERROR_CODES.CONFIG_ERROR,
      message: "unauthorized",
      stage: "auth",
      partial_counts: emptyCounts(),
    }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const encKey = Deno.env.get("INBOX_CREDENTIALS_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({
      ok: false,
      code: ERROR_CODES.CONFIG_ERROR,
      message: "Backend credentials for inbound polling are missing.",
      stage: "config",
      partial_counts: emptyCounts(),
    }, 200);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  if (!encKey) {
    return json({
      ok: false,
      code: ERROR_CODES.CONFIG_ERROR,
      message: "The inbox credential decryption key is not configured.",
      stage: "config",
      partial_counts: emptyCounts(),
    }, 200);
  }

  let targetInboxId: string | null = null;
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (body?.inbox_id) targetInboxId = String(body.inbox_id);
    } catch {
      // ignore invalid JSON and poll all enabled inboxes
    }
  }

  let q = admin.from("inboxes")
    .select("id, email_address, business_name, monitored_mailbox, inbound_provider, inbound_polling_enabled, active")
    .eq("inbound_provider", "ionos_imap")
    .eq("inbound_polling_enabled", true);

  if (targetInboxId) q = q.eq("id", targetInboxId);

  const { data: inboxes, error: inboxError } = await q;
  if (inboxError) {
    return json({
      ok: false,
      code: ERROR_CODES.CONFIG_ERROR,
      message: inboxError.message,
      stage: "config",
      partial_counts: emptyCounts(),
    }, 200);
  }

  if (targetInboxId && !(inboxes ?? []).length) {
    return json({
      ok: false,
      code: ERROR_CODES.INBOX_NOT_FOUND,
      message: "No enabled inbound inbox was found for this poll request.",
      stage: "config",
      partial_counts: emptyCounts(),
      results: [],
      polled: 0,
    }, 200);
  }

  const settled = await Promise.allSettled((inboxes ?? []).map((ib) => pollInbox(admin, encKey, ib as InboxRow)));
  const results: PollResult[] = settled.map((entry, index) => {
    if (entry.status === "fulfilled") return entry.value;
    const inbox = (inboxes ?? [])[index] as InboxRow | undefined;
    const fallback = createResult(inbox ?? { id: `unknown-${index}`, email_address: "unknown", business_name: null, monitored_mailbox: null });
    const mapped = normalizeStageError(entry.reason, "process");
    return applyFailure(fallback, mapped);
  });

  return json({
    ok: results.every((result) => result.ok),
    polled: results.length,
    results,
  }, 200);
});

async function pollInbox(
  admin: ReturnType<typeof createClient>,
  encKey: string,
  ib: InboxRow,
): Promise<PollResult> {
  const result = createResult(ib);
  const deadline = Date.now() + FULL_POLL_TIMEOUT_MS;
  const mailbox = (ib.monitored_mailbox ?? "INBOX").trim() || "INBOX";
  let client: ImapFlow | null = null;

  try {
    const creds = await runStage("creds", deadline, 5_000, async () => {
      const { data, error } = await admin.rpc("get_inbox_imap_credentials", {
        _inbox_id: ib.id,
        _enc_key: encKey,
      });
      if (error) throw error;
      return data as ImapCreds | null;
    }, { inbox_id: ib.id });

    if (!creds?.imap_host || !creds.imap_username || !creds.imap_password) {
      throw new PollStageError(
        ERROR_CODES.CONFIG_ERROR,
        "creds",
        "IMAP credentials are incomplete for this inbox.",
        undefined,
        "Save the inbound mailbox host, username, and password, then retry Poll Now.",
      );
    }

    const host = creds.imap_host;
    const port = creds.imap_port ?? 993;
    const secure = creds.imap_ssl !== false;
    const username = creds.imap_username;

    logPoll(ib.id, "config", "resolved", {
      host,
      port,
      secure,
      username,
      mailbox,
    });

    client = new ImapFlow({
      host,
      port,
      secure,
      auth: { user: username, pass: creds.imap_password },
      logger: false,
      socketTimeout: CONNECT_TIMEOUT_MS,
    });

    await runStage("connect", deadline, CONNECT_TIMEOUT_MS, () => client!.connect(), {
      inbox_id: ib.id,
      host,
      port,
      secure,
      username,
    });

    const lock = await runStage("open", deadline, MAILBOX_OPEN_TIMEOUT_MS, () => client!.getMailboxLock(mailbox), {
      inbox_id: ib.id,
      mailbox,
    });

    try {
      const unseenUids = await runStage("fetch", deadline, SEARCH_TIMEOUT_MS, async () => {
        const found = await client!.search({ seen: false }, { uid: true });
        return [...found].map((uid) => Number(uid)).filter((uid) => Number.isFinite(uid));
      }, {
        inbox_id: ib.id,
        mailbox,
      });

      unseenUids.sort((a, b) => a - b);
      const uidsToProcess = unseenUids.slice(0, MAX_MESSAGES_PER_POLL);
      result.remaining_unseen = Math.max(0, unseenUids.length - uidsToProcess.length);

      logPoll(ib.id, "fetch", "queued", {
        mailbox,
        unseen_found: unseenUids.length,
        processing_this_run: uidsToProcess.length,
        remaining_unseen: result.remaining_unseen,
        uids: uidsToProcess,
      });

      for (const uid of uidsToProcess) {
        ensureTimeRemaining(deadline, "process");

        let shouldMarkSeen = false;
        let processedMessageId: string | null = null;

        try {
          const fetched = await runStage("fetch", deadline, FETCH_MESSAGE_TIMEOUT_MS, async () => {
            const message = await client!.fetchOne(String(uid), { source: true, envelope: true, uid: true }, { uid: true });
            if (!message?.source) {
              throw new Error(`No message source returned for UID ${uid}`);
            }
            return message;
          }, {
            inbox_id: ib.id,
            uid,
          });

          const parsed = await runStage("parse", deadline, PARSE_TIMEOUT_MS, () => simpleParser(fetched.source), {
            inbox_id: ib.id,
            uid,
          });

          const outcome = await runStage("process", deadline, PROCESS_TIMEOUT_MS, () => persistMessage(admin, ib, parsed, uid), {
            inbox_id: ib.id,
            uid,
          });

          processedMessageId = outcome.messageId;
          result.processed_message_ids.push(outcome.messageId);
          applyCountDelta(result, outcome.counts);
          shouldMarkSeen = outcome.markSeen;

          logPoll(ib.id, "process", "message_processed", {
            uid,
            message_id: outcome.messageId,
            mark_seen: shouldMarkSeen,
          });
        } catch (error) {
          const mapped = normalizeStageError(error, "process");
          const errorLabel = processedMessageId ? `${processedMessageId}` : `uid:${uid}`;
          result.errors.push(`${mapped.stage}:${errorLabel}:${mapped.message}`);
          logPoll(ib.id, mapped.stage, "error", {
            uid,
            message_id: processedMessageId,
            code: mapped.code,
            message: mapped.message,
            provider_error: mapped.providerError?.message ?? null,
          });

          if (mapped.code === ERROR_CODES.IMAP_TIMEOUT || mapped.stage === "fetch") {
            throw mapped;
          }
        } finally {
          if (shouldMarkSeen) {
            try {
              await runStage("process", deadline, MARK_SEEN_TIMEOUT_MS, () => {
                // deno-lint-ignore no-explicit-any
                return (client as any).messageFlagsAdd(uid, ["\\Seen"], { uid: true });
              }, {
                inbox_id: ib.id,
                uid,
              });
            } catch (error) {
              const mapped = normalizeStageError(error, "process");
              result.errors.push(`process:uid:${uid}:failed to mark seen: ${mapped.message}`);
              throw mapped;
            }
          }
        }
      }
    } finally {
      lock.release();
    }

    result.ok = true;
  } catch (error) {
    const mapped = normalizeStageError(error, "process");
    applyFailure(result, mapped);
  } finally {
    await closeClient(ib.id, client);
    await recordInboundPoll(admin, result);
  }

  return result;
}

async function persistMessage(
  admin: ReturnType<typeof createClient>,
  ib: InboxRow,
  parsed: Awaited<ReturnType<typeof simpleParser>>,
  uid: number,
): Promise<PersistOutcome> {
  const messageId = parsed.messageId || `imap-${ib.id}-${uid}`;
  const fromEmail = lower(parsed.from?.value?.[0]?.address);
  const toEmail = lower(parsed.to?.value?.[0]?.address ?? ib.email_address);
  const subject = parsed.subject ?? "";
  const bodyText = parsed.text ?? "";
  const bodyHtml = typeof parsed.html === "string" ? parsed.html : null;
  const inReplyTo = parsed.inReplyTo ?? null;
  const refs = Array.isArray(parsed.references)
    ? parsed.references.join(" ")
    : (parsed.references ?? null);
  const isBounce = looksLikeBounce(fromEmail, subject);

  logPoll(ib.id, "parse", "parsed", {
    uid,
    message_id: messageId,
    from_email: fromEmail,
    subject,
  });

  // Internal/founder/admin/test addresses must never become prospects, warm
  // leads, replies, or orphan blockers. Log to activity_log + record the
  // inbound row as internal_ignored so it stays auditable.
  if (fromEmail) {
    const { data: isInternal } = await admin.rpc("is_internal_email", { _email: fromEmail });
    if (isInternal === true) {
      await admin.from("activity_log").insert({
        event_type: "internal_inbound_ignored",
        description: `Internal/founder inbound from ${fromEmail} polled by inbox ${ib.email_address ?? ib.id} — not treated as a campaign reply.`,
        entity_type: "internal_email",
      });
      // Best-effort: record the inbound row but mark it internal_ignored so
      // it never appears in prospect/blocker views.
      await admin.from("inbound_messages").insert({
        inbox_id: ib.id,
        message_id: messageId,
        in_reply_to: inReplyTo,
        references_header: refs,
        from_email: fromEmail,
        to_email: toEmail,
        subject,
        body_text: bodyText.slice(0, 100000),
        body_html: bodyHtml?.slice(0, 200000) ?? null,
        is_bounce: isBounce,
        contact_id: null,
        campaign_id: null,
        processing_status: "internal_ignored",
        processing_error: null,
      });
      return {
        markSeen: true,
        messageId,
        counts: { internal_ignored: 1 },
      };
    }
  }

  const { data: existing, error: existingError } = await admin
    .from("inbound_messages")
    .select("id, processing_status, conversation_id")
    .eq("inbox_id", ib.id)
    .eq("message_id", messageId)
    .maybeSingle();

  if (existingError) {
    throw new PollStageError(
      ERROR_CODES.MESSAGE_PROCESSING_FAILED,
      "process",
      `Could not check for duplicate inbound message ${messageId}.`,
      toProviderError(existingError),
      "Retry Poll Now. If it repeats, inspect the inbound message table access logs.",
    );
  }

  if (existing) {
    const safeDuplicate = SAFE_DUPLICATE_STATUSES.has(existing.processing_status ?? "") || Boolean(existing.conversation_id);
    return {
      markSeen: safeDuplicate,
      messageId,
      counts: { duplicates: 1 },
    };
  }

  let contact: { id: string; assigned_inbox_id: string | null; active_campaign_id: string | null; status: string | null } | null = null;

  if (fromEmail) {
    const { data: existingContact, error: contactLookupError } = await admin
      .from("contacts")
      .select("id, assigned_inbox_id, active_campaign_id, status")
      .eq("email", fromEmail)
      .maybeSingle();

    if (contactLookupError) {
      throw new PollStageError(
        ERROR_CODES.MESSAGE_PROCESSING_FAILED,
        "process",
        `Could not match sender ${fromEmail} to a contact.`,
        toProviderError(contactLookupError),
        "Retry Poll Now. If it persists, inspect the contacts table access for this sender.",
      );
    }

    contact = existingContact;
  }

  // ===== NDR / BOUNCE RESOLUTION =====
  // Bounces come from mailer-daemon/postmaster — they never match by from_email.
  // Try to extract the original recipient from subject/body and suppress that contact.
  if (!contact && isBounce) {
    const haystack = `${subject}\n${bodyText}`;
    const candidates = [
      /\[([^\]\s@]+@[^\]\s]+)\]/.exec(subject)?.[1],
      /<([^>\s@]+@[^>\s]+)>/.exec(subject)?.[1],
      /To:\s*<?([^\s<>]+@[^\s<>]+)/i.exec(haystack)?.[1],
      /Original-Recipient:[^\n]*?<?([^\s<>;]+@[^\s<>;]+)/i.exec(haystack)?.[1],
      /Final-Recipient:[^\n]*?<?([^\s<>;]+@[^\s<>;]+)/i.exec(haystack)?.[1],
    ].filter((x): x is string => Boolean(x)).map(lower);
    for (const candidate of candidates) {
      const { data: bounceContact } = await admin
        .from("contacts")
        .select("id, assigned_inbox_id, active_campaign_id, status")
        .eq("email", candidate)
        .maybeSingle();
      if (bounceContact) { contact = bounceContact; break; }
    }
  }

  let autoCreatedContact = false;
  if (!contact && fromEmail && !isBounce) {
    const { data: newContact, error: createContactError } = await admin
      .from("contacts")
      .insert({
        email: fromEmail,
        name: parsed.from?.value?.[0]?.name ?? "",
        source: "inbound_reply",
        status: "ENGAGED",
        assigned_inbox_id: ib.id,
        assigned_business: ib.business_name ?? "",
        conversation_active: true,
        last_replied_at: new Date().toISOString(),
      })
      .select("id, assigned_inbox_id, active_campaign_id, status")
      .single();

    if (createContactError) {
      const { data: refetchedContact } = await admin
        .from("contacts")
        .select("id, assigned_inbox_id, active_campaign_id, status")
        .eq("email", fromEmail)
        .maybeSingle();

      contact = refetchedContact;
    } else {
      contact = newContact;
      autoCreatedContact = true;
    }
  }

  const { data: inboundRow, error: inboundInsertError } = await admin
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
      body_html: bodyHtml?.slice(0, 200000) ?? null,
      is_bounce: isBounce,
      contact_id: contact?.id ?? null,
      campaign_id: contact?.active_campaign_id ?? null,
      processing_status: "received",
      processing_error: null,
    })
    .select("id")
    .single();

  if (inboundInsertError || !inboundRow) {
    throw new PollStageError(
      ERROR_CODES.MESSAGE_PROCESSING_FAILED,
      "process",
      `Could not store inbound message ${messageId}.`,
      toProviderError(inboundInsertError),
      "Retry Poll Now. If it repeats, inspect the inbound_messages insert error.",
    );
  }

  try {
    if (!contact) {
      const systemEvent = await admin.from("system_events").insert({
        event_type: "inbound_orphan",
        severity: "high",
        message: `Inbound from unknown contact ${fromEmail}`,
        metadata: { inbox_id: ib.id, message_id: messageId, subject },
      });

      if (systemEvent.error) throw systemEvent.error;

      const unmatchedUpdate = await admin
        .from("inbound_messages")
        .update({ processing_status: "unmatched", processing_error: null })
        .eq("id", inboundRow.id);

      if (unmatchedUpdate.error) throw unmatchedUpdate.error;

      return {
        markSeen: true,
        messageId,
        counts: {
          imported: 1,
          unmatched: 1,
          new_messages: 1,
        },
      };
    }

    if (isBounce) {
      const [emailEventRes, contactUpdateRes, inboundUpdateRes, queueCancel] = await Promise.all([
        admin.from("email_events").insert({ contact_id: contact.id, event_type: "bounced" }),
        admin.from("contacts").update({
          status: "DO_NOT_CONTACT",
          active_campaign_id: null,
          hard_bounced: true,
          sendable_status: "suppressed",
          is_globally_suppressed: true,
          global_suppression_reason: "hard_bounced_ndr",
          global_suppression_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", contact.id),
        admin.from("inbound_messages").update({
          processing_status: "bounce_handled",
          processing_error: null,
        }).eq("id", inboundRow.id),
        admin.from("email_queue").update({
          status: "cancelled",
          block_reason: "ndr_suppressed",
        }).eq("contact_id", contact.id).in("status", ["pending","delayed","throttled","scheduled"]),
      ]);

      if (emailEventRes.error) throw emailEventRes.error;
      if (contactUpdateRes.error) throw contactUpdateRes.error;
      if (inboundUpdateRes.error) throw inboundUpdateRes.error;
      if (queueCancel.error) throw queueCancel.error;

      return {
        markSeen: true,
        messageId,
        counts: {
          imported: 1,
          matched: 1,
          bounces: 1,
          new_messages: 1,
        },
      };
    }

    const communicationRes = await admin.from("communications").insert({
      contact_id: contact.id,
      channel: "email",
      direction: "inbound",
      message: `${subject ? `[${subject}] ` : ""}${bodyText}`.slice(0, 8000),
      inbox_id: contact.assigned_inbox_id ?? ib.id,
      ai_generated: false,
    });
    if (communicationRes.error) throw communicationRes.error;

    const emailEventRes = await admin.from("email_events").insert({
      contact_id: contact.id,
      event_type: "replied",
    });
    if (emailEventRes.error) throw emailEventRes.error;

    const contactUpdateRes = await admin.from("contacts").update({
      last_replied_at: new Date().toISOString(),
      conversation_active: true,
      updated_at: new Date().toISOString(),
    }).eq("id", contact.id);
    if (contactUpdateRes.error) throw contactUpdateRes.error;

    let conversationCreated = false;
    let conversationId: string | null = null;

    const { data: existingConversation, error: existingConversationError } = await admin
      .from("conversations")
      .select("id")
      .eq("contact_id", contact.id)
      .maybeSingle();
    if (existingConversationError) throw existingConversationError;

    conversationId = existingConversation?.id ?? null;

    if (!conversationId) {
      const { data: createdConversation, error: createConversationError } = await admin
        .from("conversations")
        .insert({
          contact_id: contact.id,
          business_name: ib.business_name ?? "",
          status: "OPEN",
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (createConversationError) throw createConversationError;
      conversationId = createdConversation?.id ?? null;
      conversationCreated = Boolean(conversationId);
    } else if (autoCreatedContact) {
      conversationCreated = true;
    }

    if (!conversationId) {
      throw new PollStageError(
        ERROR_CODES.MESSAGE_PROCESSING_FAILED,
        "process",
        `No conversation could be linked for inbound message ${messageId}.`,
        undefined,
        "Retry Poll Now. If it repeats, inspect conversation creation for this contact.",
      );
    }

    const inboundUpdateRes = await admin
      .from("inbound_messages")
      .update({
        conversation_id: conversationId,
        processing_status: "routed",
        processing_error: null,
      })
      .eq("id", inboundRow.id);
    if (inboundUpdateRes.error) throw inboundUpdateRes.error;

    return {
      markSeen: true,
      messageId,
      counts: {
        imported: 1,
        matched: 1,
        new_messages: 1,
        conversations_created: conversationCreated ? 1 : 0,
      },
    };
  } catch (error) {
    await admin
      .from("inbound_messages")
      .update({
        processing_status: "processing_failed",
        processing_error: (error as Error)?.message?.slice(0, 500) ?? "processing_failed",
      })
      .eq("id", inboundRow.id);

    throw new PollStageError(
      ERROR_CODES.MESSAGE_PROCESSING_FAILED,
      "process",
      `Inbound message ${messageId} was stored but could not be routed.`,
      toProviderError(error),
      "Open Inbound Inbox to inspect the stored message, then retry Poll Now after fixing the routing issue.",
    );
  }
}

function createResult(ib: Pick<InboxRow, "id" | "email_address">): PollResult {
  return {
    inbox_id: ib.id,
    email_address: ib.email_address,
    ok: false,
    ...emptyCounts(),
    errors: [],
    processed_message_ids: [],
  };
}

function emptyCounts(): CounterSnapshot {
  return {
    messages_scanned: 0,
    new_messages: 0,
    imported: 0,
    duplicates: 0,
    matched: 0,
    unmatched: 0,
    conversations_created: 0,
    ai_drafts_created: 0,
    bounces: 0,
    remaining_unseen: 0,
  };
}

function applyCountDelta(result: PollResult, counts: Partial<CounterSnapshot>) {
  result.messages_scanned += counts.messages_scanned ?? 1;
  result.new_messages += counts.new_messages ?? 0;
  result.imported += counts.imported ?? 0;
  result.duplicates += counts.duplicates ?? 0;
  result.matched += counts.matched ?? 0;
  result.unmatched += counts.unmatched ?? 0;
  result.conversations_created += counts.conversations_created ?? 0;
  result.ai_drafts_created += counts.ai_drafts_created ?? 0;
  result.bounces += counts.bounces ?? 0;
  if (typeof counts.remaining_unseen === "number") result.remaining_unseen = counts.remaining_unseen;
}

function applyFailure(result: PollResult, error: PollStageError): PollResult {
  result.ok = false;
  result.code = error.code;
  result.message = error.message;
  result.stage = error.stage;
  result.providerError = error.providerError;
  result.suggestedAction = error.suggestedAction;
  result.partial_counts = snapshotCounts(result);
  result.errors.push(`${error.stage}:${error.message}`);
  return result;
}

function snapshotCounts(result: PollResult): CounterSnapshot {
  return {
    messages_scanned: result.messages_scanned,
    new_messages: result.new_messages,
    imported: result.imported,
    duplicates: result.duplicates,
    matched: result.matched,
    unmatched: result.unmatched,
    conversations_created: result.conversations_created,
    ai_drafts_created: result.ai_drafts_created,
    bounces: result.bounces,
    remaining_unseen: result.remaining_unseen,
  };
}

function normalizeStageError(error: unknown, fallbackStage: PollStage): PollStageError {
  if (error instanceof PollStageError) return error;

  const providerError = toProviderError(error);
  const text = `${providerError.name ?? ""} ${providerError.message ?? String(error)}`.toLowerCase();
  const inferredStage = inferStageFromText(text) ?? fallbackStage;

  if (text.includes("timeout") || text.includes("timed out") || text.includes("idle timeout")) {
    return new PollStageError(
      ERROR_CODES.IMAP_TIMEOUT,
      inferredStage,
      timeoutMessage(inferredStage),
      providerError,
      "Retry Poll Now. If the timeout keeps happening, reduce unseen backlog or inspect the mailbox connection.",
    );
  }

  if (inferredStage === "parse") {
    return new PollStageError(
      ERROR_CODES.MESSAGE_PARSE_FAILED,
      "parse",
      "An inbound email could not be parsed within the allowed time.",
      providerError,
      "Retry Poll Now. If the same message keeps failing, inspect the raw email in the provider mailbox.",
    );
  }

  if (text.includes("auth") || text.includes("login") || text.includes("invalid credentials") || text.includes("authentication")) {
    return new PollStageError(
      ERROR_CODES.IMAP_AUTH_FAILED,
      inferredStage,
      "The IMAP server rejected the mailbox username or password.",
      providerError,
      "Verify the mailbox credentials, save them again, and retry Poll Now.",
    );
  }

  if (text.includes("tls") || text.includes("ssl") || text.includes("certificate") || text.includes("handshake")) {
    return new PollStageError(
      ERROR_CODES.IMAP_TLS_FAILED,
      inferredStage,
      "The IMAP TLS/SSL handshake failed.",
      providerError,
      "Confirm the mailbox is using SSL on port 993 and retry Poll Now.",
    );
  }

  if (text.includes("connect") || text.includes("network") || text.includes("econnrefused") || text.includes("enotfound")) {
    return new PollStageError(
      ERROR_CODES.IMAP_CONNECTION_FAILED,
      inferredStage,
      "The IMAP server could not be reached.",
      providerError,
      "Confirm the IMAP host and port are reachable, then retry Poll Now.",
    );
  }

  if (inferredStage === "process") {
    return new PollStageError(
      ERROR_CODES.MESSAGE_PROCESSING_FAILED,
      "process",
      "An inbound message could not be stored or routed completely.",
      providerError,
      "Open Inbound Inbox to inspect the stored message, then retry once the routing issue is fixed.",
    );
  }

  if (inferredStage === "creds" || inferredStage === "config") {
    return new PollStageError(
      ERROR_CODES.CONFIG_ERROR,
      inferredStage,
      providerError.message || "Inbound polling is not configured correctly.",
      providerError,
      "Update the inbox configuration and retry Poll Now.",
    );
  }

  return new PollStageError(
    ERROR_CODES.IMAP_LIBRARY_ERROR,
    inferredStage,
    "The IMAP client returned an unexpected error.",
    providerError,
    "Retry Poll Now. If it persists, inspect the backend logs for the exact provider error.",
  );
}

function inferStageFromText(text: string): PollStage | null {
  if (text.includes("connect")) return "connect";
  if (text.includes("mailbox") || text.includes("lock") || text.includes("select")) return "open";
  if (text.includes("fetch") || text.includes("search") || text.includes("uid")) return "fetch";
  if (text.includes("parse")) return "parse";
  if (text.includes("logout") || text.includes("close")) return "logout";
  if (text.includes("credential") || text.includes("decrypt")) return "creds";
  return null;
}

function timeoutMessage(stage: PollStage): string {
  switch (stage) {
    case "connect":
      return "The IMAP connection did not open before the timeout.";
    case "open":
      return "The mailbox could not be opened before the timeout.";
    case "fetch":
      return "Fetching unseen IMAP messages took too long.";
    case "parse":
      return "Parsing an inbound email took too long.";
    case "process":
      return "Inbound message processing exceeded the safe execution window.";
    case "logout":
      return "Closing the IMAP client took too long.";
    case "creds":
      return "Loading the IMAP credentials took too long.";
    case "config":
    default:
      return "Inbound polling exceeded the safe execution window.";
  }
}

async function runStage<T>(
  stage: PollStage,
  deadline: number,
  stageTimeoutMs: number,
  fn: () => Promise<T>,
  meta?: Record<string, unknown>,
): Promise<T> {
  ensureTimeRemaining(deadline, stage);
  const timeoutMs = Math.min(stageTimeoutMs, Math.max(1, deadline - Date.now()));
  logPoll(meta?.inbox_id as string | undefined, stage, "start", { ...meta, timeout_ms: timeoutMs });

  try {
    const value = await withTimeout(fn(), timeoutMs, `${stage}_timeout`);
    logPoll(meta?.inbox_id as string | undefined, stage, "complete", meta);
    return value;
  } catch (error) {
    throw normalizeStageError(error, stage);
  }
}

function ensureTimeRemaining(deadline: number, stage: PollStage) {
  if (Date.now() >= deadline) {
    throw new PollStageError(
      ERROR_CODES.IMAP_TIMEOUT,
      stage,
      timeoutMessage(stage),
      undefined,
      "Retry Poll Now. If the timeout repeats, reduce backlog or inspect the IMAP provider response time.",
    );
  }
}

async function closeClient(inboxId: string, client: ImapFlow | null) {
  if (!client) return;

  try {
    await runStage("logout", Date.now() + LOGOUT_TIMEOUT_MS, LOGOUT_TIMEOUT_MS, async () => {
      if (client.authenticated) {
        await client.logout();
      } else {
        client.close();
      }
    }, { inbox_id: inboxId });
  } catch (error) {
    logPoll(inboxId, "logout", "error", {
      code: normalizeStageError(error, "logout").code,
      message: normalizeStageError(error, "logout").message,
    });
    try {
      client.close();
    } catch {
      // ignore close failures
    }
  }
}

async function recordInboundPoll(
  admin: ReturnType<typeof createClient>,
  result: PollResult,
) {
  try {
    await admin.rpc("record_inbound_poll", {
      _inbox_id: result.inbox_id,
      _ok: result.ok,
      _error: result.errors.length ? result.errors.join("; ").slice(0, 500) : null,
      _new_messages: result.new_messages,
    });
  } catch (error) {
    logPoll(result.inbox_id, "process", "record_error", {
      message: (error as Error)?.message ?? String(error),
    });
  }
}

function logPoll(inboxId: string | undefined, stage: string, event: string, data?: Record<string, unknown>) {
  console.log(`[outreach-inbound-poll] ${JSON.stringify({
    inbox_id: inboxId ?? null,
    stage,
    event,
    ...data,
  })}`);
}

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

function toProviderError(error: unknown): ProviderError {
  if (!error) return {};
  return {
    name: (error as Error)?.name ?? "Error",
    message: (error as Error)?.message ?? String(error),
  };
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}
