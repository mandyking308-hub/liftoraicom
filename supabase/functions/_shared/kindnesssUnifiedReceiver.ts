import {
  authenticateAndValidate,
  KINDNESSS_SOURCE,
  type KindnesssEnquiryEvent,
} from "./kindnesssEnquiryHandoff.ts";
import {
  processUnifiedInbound,
  type AuthenticatedInboundEvent,
  type FanInResponse,
  type RoutingContext,
  type UnifiedInboundStore,
} from "./unifiedInboundFanIn.ts";

export interface KindnesssUnifiedReceiverDeps {
  enabledFlag: string | null | undefined;
  fanInEnabledFlag: string | null | undefined;
  secret: string | null | undefined;
  store: UnifiedInboundStore;
  now?: () => Date;
  routingContext?: (event: AuthenticatedInboundEvent) => Promise<RoutingContext>;
}

export function kindnesssUnifiedEvent(
  event: KindnesssEnquiryEvent,
  businessId: string,
): AuthenticatedInboundEvent {
  return {
    source: "kindnesss_commercial",
    sourceEventId: event.event_id,
    eventKind: "commercial_enquiry",
    occurredAt: event.occurred_at,
    signatureVerified: true,
    authenticatedBusinessId: businessId,
    siteId: KINDNESSS_SOURCE,
    threadId: event.enquiry_id,
    // UUID reference only: no name, email, message, child or family data is persisted here.
    contentReference: `kindnesss://commercial-enquiry/${event.enquiry_id}`,
    contactId: null,
    originalSenderMailbox: null,
  };
}

function formRouting(event: AuthenticatedInboundEvent): RoutingContext {
  return {
    mailboxes: [],
    campaigns: [],
    aliases: [],
    forms: [{
      source: "kindnesss_commercial",
      siteId: KINDNESSS_SOURCE,
      businessId: event.authenticatedBusinessId,
      verified: true,
    }],
  };
}

/** Actual signed Kindnesss receiver path, backed by the same durable unified receipts as Smartlead. */
export async function handleKindnesssUnifiedEnquiry(
  rawBody: string,
  headers: { source: string | null; timestamp: string | null; signature: string | null },
  deps: KindnesssUnifiedReceiverDeps,
): Promise<FanInResponse | { status: number; body: Record<string, unknown> }> {
  const now = deps.now?.() ?? new Date();
  const auth = await authenticateAndValidate({
    enabledFlag: deps.enabledFlag,
    secret: deps.secret,
    rawBody,
    headers,
    nowSeconds: Math.floor(now.getTime() / 1000),
  });
  if (auth.outcome === "reject") {
    return { status: auth.httpStatus, body: { ok: false, reason: auth.reason } };
  }

  const event = kindnesssUnifiedEvent(auth.event, auth.businessId);
  return processUnifiedInbound(event, {
    enabledFlag: deps.fanInEnabledFlag,
    store: deps.store,
    routingContext: deps.routingContext ?? (async () => formRouting(event)),
    now: () => now,
  });
}
