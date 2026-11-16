import type { ExtractedEvent, RawWebhookPayload } from "./smartleadEventNormalizer.ts";
import {
  processUnifiedInbound,
  type AuthenticatedInboundEvent,
  type FanInDeps,
  type FanInResponse,
  type MailboxRoute,
  type RoutingContext,
} from "./unifiedInboundFanIn.ts";
import { createUnifiedInboundStore } from "./unifiedInboundStore.ts";

export interface SmartleadConnectionScope {
  id: string;
  business_id: string;
}

export interface SmartleadUnifiedInput {
  connection: SmartleadConnectionScope;
  event: ExtractedEvent;
  payload: RawWebhookPayload;
  eventRowId: string;
  idempotencyKey: string;
  contactId: string | null;
  receivedAt: string;
}

function valueAt(payload: RawWebhookPayload, path: string): unknown {
  let current: unknown = payload;
  for (const segment of path.split(".")) {
    if (!current || typeof current !== "object" || !(segment in current)) return null;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/** Only explicit sending-account fields are accepted; prospect/body fields never choose a sender. */
export function extractSmartleadOriginalSender(payload: RawWebhookPayload): string | null {
  for (const path of [
    "email_account.email",
    "account.email",
    "sender_mailbox.email",
    "sender_email",
    "mailbox_email",
    "data.account_email",
  ]) {
    const value = valueAt(payload, path);
    if (typeof value === "string" && value.includes("@")) return value.trim().toLowerCase();
  }
  return null;
}

export function buildSmartleadUnifiedEvent(input: SmartleadUnifiedInput): AuthenticatedInboundEvent {
  const eventKind = input.event.canonical_event_type === "reply_received" ||
      input.event.canonical_event_type === "lead_unsubscribed" ||
      input.event.canonical_event_type === "email_bounced"
    ? input.event.canonical_event_type
    : "other";
  return {
    source: "smartlead",
    sourceEventId: input.idempotencyKey,
    eventKind,
    occurredAt: input.event.event_occurred_at ?? input.receivedAt,
    signatureVerified: true,
    authenticatedBusinessId: input.connection.business_id,
    providerConnectionId: input.connection.id,
    providerMailboxId: input.event.provider_mailbox_id,
    providerCampaignId: input.event.provider_campaign_id,
    providerLeadId: input.event.provider_lead_id,
    threadId: input.event.provider_lead_id ?? input.event.provider_message_id ?? input.idempotencyKey,
    originalSenderMailbox: extractSmartleadOriginalSender(input.payload),
    contentReference: `outbound_provider_events://${input.eventRowId}`,
    contactId: input.contactId,
  };
}

/** Shared by the deployed Supabase adapter and disposable PostgreSQL integration tests. */
export function processSmartleadUnifiedInboundEvent(
  input: SmartleadUnifiedInput,
  deps: FanInDeps,
): Promise<FanInResponse> {
  return processUnifiedInbound(buildSmartleadUnifiedEvent(input), deps);
}

// The PostgREST builder is deliberately structural so the pure tests do not fetch remote modules.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseQueryClient = { from: (table: string) => any };

/** Load only deterministic, business-scoped routing evidence from the actual Liftor tables. */
export async function loadSupabaseSmartleadRoutingContext(
  admin: SupabaseQueryClient,
  event: AuthenticatedInboundEvent,
): Promise<RoutingContext> {
  const [campaignResult, allocationResult] = await Promise.all([
    admin.from("outbound_provider_campaign_mappings")
      .select("provider_connection_id,provider_campaign_id,business_id,mapping_status,is_active")
      .eq("business_id", event.authenticatedBusinessId)
      .eq("provider_type", "smartlead"),
    admin.from("gsm_mailbox_allocations")
      .select("mailbox_id,business_id,allocation_status,thread_sticky")
      .eq("business_id", event.authenticatedBusinessId)
      .eq("allocation_status", "active")
      .eq("thread_sticky", true),
  ]);
  if (campaignResult.error || allocationResult.error) throw new Error("routing_lookup_failed");

  interface AllocationRow {
    mailbox_id: string;
    business_id: string;
    allocation_status: string;
    thread_sticky: boolean;
  }
  const allocations = (allocationResult.data ?? []) as AllocationRow[];
  const mailboxIds = allocations.map((row) => row.mailbox_id);
  let mailboxRows: Record<string, unknown>[] = [];
  if (mailboxIds.length) {
    const mailboxResult = await admin.from("gsm_mailboxes")
      .select("id,email,provider_mailbox_id,smartlead_email_account_id,estate_classification,active,retired")
      .in("id", mailboxIds);
    if (mailboxResult.error) throw new Error("routing_lookup_failed");
    mailboxRows = mailboxResult.data ?? [];
  }

  const allocationByMailbox = new Map<string, AllocationRow>(allocations.map((row) => [row.mailbox_id, row]));
  const mailboxes: MailboxRoute[] = mailboxRows.flatMap((mailbox) => {
    const allocation = allocationByMailbox.get(String(mailbox.id));
    if (!allocation) return [];
    const providerId = mailbox.smartlead_email_account_id ?? mailbox.provider_mailbox_id;
    if (typeof providerId !== "string" || !providerId) return [];
    return [{
      mailboxId: providerId,
      mailboxAddress: String(mailbox.email),
      businessId: String(allocation.business_id),
      estate: mailbox.estate_classification === "ghat" ? "ghat" : "gsm",
      active: mailbox.active === true && mailbox.retired === false,
      verified: allocation.allocation_status === "active" && allocation.thread_sticky === true,
    }];
  });

  return {
    mailboxes,
    campaigns: (campaignResult.data ?? []).map((mapping: Record<string, unknown>) => ({
      connectionId: String(mapping.provider_connection_id),
      campaignId: String(mapping.provider_campaign_id),
      businessId: String(mapping.business_id),
      active: mapping.is_active === true,
      verified: mapping.mapping_status === "mapped",
    })),
    aliases: [],
    forms: [],
  };
}

/** Real Supabase adapter used by smartlead-webhook; no provider HTTP or send path. */
export function processSupabaseSmartleadUnifiedInbound(
  admin: SupabaseQueryClient & Parameters<typeof createUnifiedInboundStore>[0],
  input: SmartleadUnifiedInput,
  enabledFlag: string | null | undefined,
): Promise<FanInResponse> {
  const event = buildSmartleadUnifiedEvent(input);
  return processUnifiedInbound(event, {
    enabledFlag,
    store: createUnifiedInboundStore(admin),
    routingContext: () => loadSupabaseSmartleadRoutingContext(admin, event),
  });
}
