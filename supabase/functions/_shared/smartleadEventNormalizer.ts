/**
 * Smartlead webhook event normalisation + safe state transitions.
 *
 * PURE. No IO. Decides:
 *   1. the canonical Liftor event type for a Smartlead payload,
 *   2. a stable idempotency key so a duplicate webhook is stored once,
 *   3. which canonical CRM suppression fields (if any) must change.
 *
 * SAFETY: unknown event types are stored and acknowledged but never cause a
 * state transition. Reply / bounce / unsubscribe only ever ESCALATE
 * suppression — they can never un-block a contact.
 */

export const EVENT_NORMALIZER_VERSION = "smartlead-event-normalizer-1.0.0";

export type CanonicalEventType =
  | "email_sent"
  | "email_opened"
  | "link_clicked"
  | "reply_received"
  | "email_bounced"
  | "lead_unsubscribed"
  | "lead_status_changed"
  | "campaign_status_changed"
  | "campaign_completed"
  | "mailbox_error"
  | "unknown";

export const OPERATIONAL_EVENT_TYPES: readonly CanonicalEventType[] = [
  "email_sent",
  "reply_received",
  "email_bounced",
  "lead_unsubscribed",
  "lead_status_changed",
  "campaign_status_changed",
  "mailbox_error",
] as const;

const ALIASES: Record<string, CanonicalEventType> = {
  sent: "email_sent",
  email_sent: "email_sent",
  emailsent: "email_sent",
  email_send: "email_sent",
  message_sent: "email_sent",

  open: "email_opened",
  opened: "email_opened",
  email_open: "email_opened",
  email_opened: "email_opened",

  click: "link_clicked",
  clicked: "link_clicked",
  link_clicked: "link_clicked",
  email_link_clicked: "link_clicked",

  reply: "reply_received",
  replied: "reply_received",
  reply_received: "reply_received",
  email_reply: "reply_received",
  email_reply_received: "reply_received",
  lead_replied: "reply_received",

  bounce: "email_bounced",
  bounced: "email_bounced",
  email_bounce: "email_bounced",
  email_bounced: "email_bounced",
  hard_bounce: "email_bounced",
  lead_bounced: "email_bounced",

  unsubscribe: "lead_unsubscribed",
  unsubscribed: "lead_unsubscribed",
  lead_unsubscribe: "lead_unsubscribed",
  lead_unsubscribed: "lead_unsubscribed",
  email_unsubscribed: "lead_unsubscribed",

  lead_status_changed: "lead_status_changed",
  status_change: "lead_status_changed",
  lead_category_updated: "lead_status_changed",

  campaign_status_changed: "campaign_status_changed",
  campaign_paused: "campaign_status_changed",
  campaign_started: "campaign_status_changed",
  campaign_completed: "campaign_completed",
  completed: "campaign_completed",

  account_error: "mailbox_error",
  email_account_error: "mailbox_error",
  mailbox_error: "mailbox_error",
  smtp_error: "mailbox_error",
  email_account_disconnected: "mailbox_error",
};

export function normalizeEventType(raw: unknown): CanonicalEventType {
  const k = String(raw ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!k) return "unknown";
  return ALIASES[k] ?? "unknown";
}

export interface RawWebhookPayload {
  [key: string]: unknown;
}

export interface ExtractedEvent {
  canonical_event_type: CanonicalEventType;
  raw_event_type: string | null;
  provider_event_id: string | null;
  provider_campaign_id: string | null;
  provider_lead_id: string | null;
  provider_mailbox_id: string | null;
  provider_message_id: string | null;
  email: string | null;
  event_occurred_at: string | null;
  is_known: boolean;
  is_operational: boolean;
}

function pick(p: RawWebhookPayload, paths: string[]): unknown {
  for (const path of paths) {
    let cur: unknown = p;
    for (const seg of path.split(".")) {
      if (cur && typeof cur === "object" && seg in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[seg];
      } else {
        cur = undefined;
        break;
      }
    }
    if (cur !== undefined && cur !== null && cur !== "") return cur;
  }
  return null;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  return String(v);
}

export function extractEvent(payload: RawWebhookPayload): ExtractedEvent {
  const rawType = pick(payload, ["event_type", "event", "type", "action", "webhook_event_type"]);
  const canonical = normalizeEventType(rawType);

  return {
    canonical_event_type: canonical,
    raw_event_type: str(rawType),
    provider_event_id: str(pick(payload, ["event_id", "id", "stats_id", "event_uuid", "webhook_event_id"])),
    provider_campaign_id: str(pick(payload, ["campaign_id", "campaign.id", "campaign_uuid"])),
    provider_lead_id: str(pick(payload, ["lead_id", "lead.id", "sl_lead_id", "lead.lead_id"])),
    provider_mailbox_id: str(
      pick(payload, ["email_account_id", "from_email_account_id", "email_account.id", "sender_account_id"]),
    ),
    provider_message_id: str(pick(payload, ["message_id", "email_id", "stats_id", "sl_email_lead_id"])),
    email: str(pick(payload, ["lead.email", "to_email", "email", "lead_email"]))?.toLowerCase() ?? null,
    event_occurred_at: str(
      pick(payload, ["event_timestamp", "timestamp", "time_stamp", "sent_time", "event_time", "created_at"]),
    ),
    is_known: canonical !== "unknown",
    is_operational: (OPERATIONAL_EVENT_TYPES as readonly string[]).includes(canonical),
  };
}

/**
 * Stable de-duplication key.
 * Prefers the provider's own event id; otherwise a deterministic composite so
 * a retried webhook without an event id still collapses to one row.
 */
export function buildIdempotencyKey(e: ExtractedEvent): string {
  if (e.provider_event_id) return `evt:${e.provider_event_id}`;
  const parts = [
    e.canonical_event_type,
    e.provider_campaign_id ?? "nocampaign",
    e.provider_lead_id ?? e.email ?? "nolead",
    e.provider_message_id ?? "nomsg",
    e.event_occurred_at ?? "nots",
  ];
  return `cmp:${parts.join("|")}`;
}

export interface ContactMutation {
  /** Patch to apply to public.contacts. Empty means no CRM change. */
  contact_patch: Record<string, unknown>;
  /** True when this event permanently blocks all future sends to the contact. */
  blocks_future_sends: boolean;
  /** True when a live conversation has started and automation must stand down. */
  opens_conversation: boolean;
  transition: string;
}

/**
 * Canonical CRM effect of an event.
 * Only ever escalates. Never clears an existing block.
 */
export function deriveContactMutation(
  e: ExtractedEvent,
  payload: RawWebhookPayload = {},
): ContactMutation {
  const nowIso = new Date().toISOString();
  const none: ContactMutation = {
    contact_patch: {},
    blocks_future_sends: false,
    opens_conversation: false,
    transition: "no_state_change",
  };

  switch (e.canonical_event_type) {
    case "reply_received":
      return {
        contact_patch: { conversation_active: true, status: "replied" },
        blocks_future_sends: false,
        opens_conversation: true,
        transition: "reply_opens_conversation_and_stops_automation",
      };

    case "email_bounced": {
      const bounceType = String(
        pick(payload, ["bounce_type", "bounce.type", "sub_type", "reason_type"]) ?? "",
      ).toLowerCase();
      // Soft bounces must NOT permanently suppress a contact.
      const isSoft = bounceType.includes("soft") || bounceType.includes("temporary");
      if (isSoft) {
        return {
          contact_patch: {},
          blocks_future_sends: false,
          opens_conversation: false,
          transition: "soft_bounce_recorded_no_suppression",
        };
      }
      return {
        contact_patch: {
          hard_bounced: true,
          sendable_status: "not_sendable",
          status: "bounced",
        },
        blocks_future_sends: true,
        opens_conversation: false,
        transition: "hard_bounce_blocks_future_sends",
      };
    }

    case "lead_unsubscribed":
      return {
        contact_patch: {
          unsubscribed_at: nowIso,
          unsubscribe_source: "smartlead_webhook",
          sendable_status: "not_sendable",
          status: "unsubscribed",
          do_not_contact_at: nowIso,
          do_not_contact_reason: "unsubscribed_via_smartlead",
        },
        blocks_future_sends: true,
        opens_conversation: false,
        transition: "unsubscribe_blocks_future_sends",
      };

    // Recorded for provenance, but deliberately no CRM suppression change.
    case "email_sent":
    case "email_opened":
    case "link_clicked":
    case "lead_status_changed":
    case "campaign_status_changed":
    case "campaign_completed":
    case "mailbox_error":
      return { ...none, transition: `${e.canonical_event_type}_recorded_only` };

    case "unknown":
    default:
      return { ...none, transition: "unknown_event_stored_without_transition" };
  }
}

/** Mailbox-level effect (pause a failing sender). Never touches contacts. */
export function deriveMailboxMutation(
  e: ExtractedEvent,
  payload: RawWebhookPayload = {},
): { inbox_patch: Record<string, unknown>; reason: string | null } {
  if (e.canonical_event_type !== "mailbox_error") return { inbox_patch: {}, reason: null };
  const detail = String(pick(payload, ["error", "message", "reason", "detail"]) ?? "provider_reported_error");
  return {
    inbox_patch: {
      provider_ready: false,
      paused_reason: "provider_account_error",
      last_error_message: detail.slice(0, 500),
    },
    reason: "provider_account_error",
  };
}
