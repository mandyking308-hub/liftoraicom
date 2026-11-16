/**
 * Unified inbound fan-in decision core — SOURCE CANDIDATE ONLY.
 *
 * No edge entrypoint imports this module. Authentication is performed by the
 * existing signed Smartlead boundary or the signed Kindnesss handoff boundary
 * before an event reaches this core. This module performs no network or database
 * I/O itself; the injected store must implement the pending atomic claim RPC.
 */

export const UNIFIED_INBOUND_FANIN_FLAG = "UNIFIED_INBOUND_FANIN_ENABLED";
export const UNIFIED_INBOUND_MAX_ATTEMPTS = 6;
export const UNIFIED_INBOUND_LEASE_SECONDS = 30;

export type UnifiedInboundSource = "smartlead" | "kindnesss_commercial";
export type UnifiedEventKind =
  | "reply_received"
  | "lead_unsubscribed"
  | "email_bounced"
  | "commercial_enquiry"
  | "other";

export interface AuthenticatedInboundEvent {
  source: UnifiedInboundSource;
  sourceEventId: string;
  eventKind: UnifiedEventKind;
  occurredAt: string;
  signatureVerified: boolean;
  /** Business bound to the verified provider connection or signed site route. */
  authenticatedBusinessId: string;
  providerConnectionId?: string | null;
  providerMailboxId?: string | null;
  providerCampaignId?: string | null;
  providerLeadId?: string | null;
  alias?: string | null;
  siteId?: string | null;
  threadId?: string | null;
  originalSenderMailbox?: string | null;
  contentReference?: string | null;
  /** Canonical identity only; never used to choose a business. */
  contactId?: string | null;
}

export interface MailboxRoute {
  mailboxId: string;
  mailboxAddress: string;
  businessId: string;
  estate: "gsm" | "ghat";
  active: boolean;
  verified: boolean;
}

export interface CampaignRoute {
  connectionId: string;
  campaignId: string;
  businessId: string;
  active: boolean;
  verified: boolean;
}

export interface AliasRoute {
  alias: string;
  businessId: string;
  verified: boolean;
}

export interface FormRoute {
  source: "kindnesss_commercial";
  siteId: string;
  businessId: string;
  verified: boolean;
}

export interface RoutingContext {
  mailboxes: readonly MailboxRoute[];
  campaigns: readonly CampaignRoute[];
  aliases: readonly AliasRoute[];
  forms: readonly FormRoute[];
}

export type QuarantineReason =
  | "ghat_excluded"
  | "mailbox_mapping_missing"
  | "mailbox_mapping_ambiguous"
  | "campaign_mapping_missing"
  | "campaign_mapping_ambiguous"
  | "alias_mapping_missing"
  | "alias_mapping_ambiguous"
  | "form_mapping_missing"
  | "form_mapping_ambiguous"
  | "authenticated_business_mismatch"
  | "sender_mailbox_mismatch"
  | "routing_evidence_missing";

export type RouteDecision =
  | {
      outcome: "routed";
      businessId: string;
      evidence: "allocated_mailbox" | "verified_campaign" | "verified_alias" | "signed_first_party_form";
      threadKey: string;
      originalSenderMailbox: string | null;
    }
  | { outcome: "quarantine"; reason: QuarantineReason };

function normaliseAddress(value: string | null | undefined): string | null {
  const valueNormalised = value?.trim().toLowerCase() ?? "";
  return valueNormalised || null;
}

function scopedBusiness(
  event: AuthenticatedInboundEvent,
  businessId: string,
  evidence: Extract<RouteDecision, { outcome: "routed" }>["evidence"],
  originalSenderMailbox: string | null,
): RouteDecision {
  if (businessId !== event.authenticatedBusinessId) {
    return { outcome: "quarantine", reason: "authenticated_business_mismatch" };
  }
  const threadIdentity = event.threadId?.trim() || event.sourceEventId;
  return {
    outcome: "routed",
    businessId,
    evidence,
    threadKey: `${businessId}:${event.source}:${threadIdentity}`,
    originalSenderMailbox,
  };
}

/**
 * Deterministic routing priority. Presence of a higher-priority identifier is
 * authoritative: a bad mapping quarantines and never falls through to a weaker
 * identifier or another business. Contact ID, names and message text are never
 * routing evidence.
 */
export function routeUnifiedInbound(
  event: AuthenticatedInboundEvent,
  context: RoutingContext,
): RouteDecision {
  if (event.source === "smartlead" && event.providerMailboxId) {
    const allMatches = context.mailboxes.filter((m) => m.mailboxId === event.providerMailboxId);
    if (allMatches.some((m) => m.estate === "ghat")) {
      return { outcome: "quarantine", reason: "ghat_excluded" };
    }
    const matches = allMatches.filter((m) => m.active && m.verified && m.estate === "gsm");
    if (matches.length === 0) return { outcome: "quarantine", reason: "mailbox_mapping_missing" };
    if (matches.length !== 1) return { outcome: "quarantine", reason: "mailbox_mapping_ambiguous" };
    const mailbox = matches[0];
    const allocatedAddress = normaliseAddress(mailbox.mailboxAddress);
    const eventAddress = normaliseAddress(event.originalSenderMailbox);
    if (!allocatedAddress || (eventAddress && allocatedAddress !== eventAddress)) {
      return { outcome: "quarantine", reason: "sender_mailbox_mismatch" };
    }
    return scopedBusiness(event, mailbox.businessId, "allocated_mailbox", allocatedAddress);
  }

  if (event.source === "smartlead" && event.providerCampaignId) {
    const matches = context.campaigns.filter((c) =>
      c.campaignId === event.providerCampaignId &&
      c.connectionId === event.providerConnectionId &&
      c.active && c.verified
    );
    if (matches.length === 0) return { outcome: "quarantine", reason: "campaign_mapping_missing" };
    if (matches.length !== 1) return { outcome: "quarantine", reason: "campaign_mapping_ambiguous" };
    return scopedBusiness(
      event,
      matches[0].businessId,
      "verified_campaign",
      normaliseAddress(event.originalSenderMailbox),
    );
  }

  const alias = normaliseAddress(event.alias);
  if (alias) {
    const matches = context.aliases.filter((a) => normaliseAddress(a.alias) === alias && a.verified);
    if (matches.length === 0) return { outcome: "quarantine", reason: "alias_mapping_missing" };
    if (matches.length !== 1) return { outcome: "quarantine", reason: "alias_mapping_ambiguous" };
    return scopedBusiness(
      event,
      matches[0].businessId,
      "verified_alias",
      normaliseAddress(event.originalSenderMailbox),
    );
  }

  if (event.source === "kindnesss_commercial" && event.siteId) {
    const matches = context.forms.filter((f) =>
      f.source === event.source && f.siteId === event.siteId && f.verified
    );
    if (matches.length === 0) return { outcome: "quarantine", reason: "form_mapping_missing" };
    if (matches.length !== 1) return { outcome: "quarantine", reason: "form_mapping_ambiguous" };
    return scopedBusiness(event, matches[0].businessId, "signed_first_party_form", null);
  }

  return { outcome: "quarantine", reason: "routing_evidence_missing" };
}

export function unifiedIdempotencyKey(event: Pick<AuthenticatedInboundEvent, "source" | "sourceEventId">): string {
  return `${event.source}:${event.sourceEventId}`;
}

export interface UnifiedReceiptClaim {
  source: UnifiedInboundSource;
  sourceEventId: string;
  idempotencyKey: string;
  authenticatedBusinessId: string;
  eventKind: UnifiedEventKind;
  occurredAt: string;
  contentReference: string | null;
  contactId: string | null;
  sourceMailboxId: string | null;
  originalSenderMailbox: string | null;
  leaseUntil: string;
  now: string;
}

export type ClaimResult =
  | { state: "claimed"; receiptId: string; attempts: number; leaseToken: string }
  | { state: "duplicate"; receiptId: string }
  | { state: "store_unavailable" };

export interface FinaliseReceipt {
  leaseToken: string;
  status: "processed" | "quarantine" | "retry" | "dead_letter";
  businessId: string | null;
  routeEvidence: string | null;
  threadKey: string | null;
  originalSenderMailbox: string | null;
  quarantineReason: QuarantineReason | null;
  nextAttemptAt: string | null;
  errorCode: string | null;
}

export interface UnifiedInboundStore {
  /** Atomic insert-or-reclaim backed by a unique index and leased RPC. */
  claim(receipt: UnifiedReceiptClaim): Promise<ClaimResult>;
  /** Must compare receipt ID and lease token so a stale worker cannot finalise. */
  finalise(receiptId: string, update: FinaliseReceipt): Promise<void>;
}

export interface FanInDeps {
  enabledFlag: string | null | undefined;
  store: UnifiedInboundStore;
  routingContext: (event: AuthenticatedInboundEvent) => Promise<RoutingContext>;
  now?: () => Date;
}

export type FanInResponse =
  | { status: 503; body: { ok: false; reason: "receiver_disabled" | "store_unavailable" | "retry" } }
  | { status: 401; body: { ok: false; reason: "authentication_required" } }
  | { status: 200; body: { ok: true; duplicate: true } }
  | { status: 202; body: { ok: true; duplicate: false; route: "routed" | "quarantine"; reason?: QuarantineReason; autoSend: false } }
  | { status: 500; body: { ok: false; reason: "finalise_failed" } };

export function retryDelaySeconds(attempts: number): number {
  return Math.min(30 * 2 ** Math.max(0, attempts - 1), 3600);
}

/**
 * Durable receipt first, then deterministic routing. Disabled or unauthenticated
 * calls perform no writes. Routing outages retain the receipt and use a leased
 * retry; exhausted attempts become a visible dead letter.
 */
export async function processUnifiedInbound(
  event: AuthenticatedInboundEvent,
  deps: FanInDeps,
): Promise<FanInResponse> {
  if (deps.enabledFlag !== "true") {
    return { status: 503, body: { ok: false, reason: "receiver_disabled" } };
  }
  if (!event.signatureVerified || !event.sourceEventId || !event.authenticatedBusinessId) {
    return { status: 401, body: { ok: false, reason: "authentication_required" } };
  }

  const now = deps.now?.() ?? new Date();
  const leaseUntil = new Date(now.getTime() + UNIFIED_INBOUND_LEASE_SECONDS * 1000).toISOString();
  let claim: ClaimResult;
  try {
    claim = await deps.store.claim({
      source: event.source,
      sourceEventId: event.sourceEventId,
      idempotencyKey: unifiedIdempotencyKey(event),
      authenticatedBusinessId: event.authenticatedBusinessId,
      eventKind: event.eventKind,
      occurredAt: event.occurredAt,
      contentReference: event.contentReference ?? null,
      contactId: event.contactId ?? null,
      sourceMailboxId: event.providerMailboxId ?? null,
      originalSenderMailbox: event.originalSenderMailbox ?? null,
      leaseUntil,
      now: now.toISOString(),
    });
  } catch {
    return { status: 503, body: { ok: false, reason: "store_unavailable" } };
  }

  if (claim.state === "store_unavailable") {
    return { status: 503, body: { ok: false, reason: "store_unavailable" } };
  }
  if (claim.state === "duplicate") return { status: 200, body: { ok: true, duplicate: true } };

  let update: FinaliseReceipt;
  try {
    const route = routeUnifiedInbound(event, await deps.routingContext(event));
    update = route.outcome === "routed"
      ? {
          leaseToken: claim.leaseToken,
          status: "processed",
          businessId: route.businessId,
          routeEvidence: route.evidence,
          threadKey: route.threadKey,
          originalSenderMailbox: route.originalSenderMailbox,
          quarantineReason: null,
          nextAttemptAt: null,
          errorCode: null,
        }
      : {
          leaseToken: claim.leaseToken,
          status: "quarantine",
          businessId: null,
          routeEvidence: null,
          threadKey: null,
          originalSenderMailbox: null,
          quarantineReason: route.reason,
          nextAttemptAt: null,
          errorCode: null,
        };
  } catch {
    const exhausted = claim.attempts >= UNIFIED_INBOUND_MAX_ATTEMPTS;
    update = {
      leaseToken: claim.leaseToken,
      status: exhausted ? "dead_letter" : "retry",
      businessId: null,
      routeEvidence: null,
      threadKey: null,
      originalSenderMailbox: null,
      quarantineReason: null,
      nextAttemptAt: exhausted ? null : new Date(now.getTime() + retryDelaySeconds(claim.attempts) * 1000).toISOString(),
      errorCode: exhausted ? "routing_attempts_exhausted" : "routing_lookup_failed",
    };
  }

  try {
    await deps.store.finalise(claim.receiptId, update);
  } catch {
    return { status: 500, body: { ok: false, reason: "finalise_failed" } };
  }

  if (update.status === "retry") return { status: 503, body: { ok: false, reason: "retry" } };
  if (update.status === "dead_letter") return { status: 503, body: { ok: false, reason: "retry" } };
  return {
    status: 202,
    body: update.status === "quarantine"
      ? { ok: true, duplicate: false, route: "quarantine", reason: update.quarantineReason ?? "routing_evidence_missing", autoSend: false }
      : { ok: true, duplicate: false, route: "routed", autoSend: false },
  };
}

export interface ThreadProjection {
  businessId: string;
  threadKey: string;
  replied: boolean;
  optedOut: boolean;
  latestEventAt: string;
  lastInboundAt: string | null;
}

/** Out-of-order delivery converges: flags are monotonic and timestamps use max. */
export function projectThread(
  current: ThreadProjection,
  event: Pick<AuthenticatedInboundEvent, "eventKind" | "occurredAt">,
  route: Extract<RouteDecision, { outcome: "routed" }>,
): ThreadProjection {
  const latestEventAt = Date.parse(event.occurredAt) >= Date.parse(current.latestEventAt) ? event.occurredAt : current.latestEventAt;
  const lastInboundAt = current.lastInboundAt && Date.parse(current.lastInboundAt) >= Date.parse(event.occurredAt)
    ? current.lastInboundAt
    : event.occurredAt;
  return {
    ...current,
    businessId: route.businessId,
    threadKey: route.threadKey,
    replied: current.replied || event.eventKind === "reply_received",
    optedOut: current.optedOut || event.eventKind === "lead_unsubscribed",
    latestEventAt,
    lastInboundAt,
  };
}
