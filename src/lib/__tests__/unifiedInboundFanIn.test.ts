import { describe, expect, it } from "vitest";
import {
  processUnifiedInbound,
  projectThread,
  routeUnifiedInbound,
  unifiedIdempotencyKey,
  UNIFIED_INBOUND_MAX_ATTEMPTS,
  type AuthenticatedInboundEvent,
  type ClaimResult,
  type FinaliseReceipt,
  type RoutingContext,
  type UnifiedInboundStore,
  type UnifiedReceiptClaim,
  type ThreadProjection,
} from "../../../supabase/functions/_shared/unifiedInboundFanIn";
import {
  decideFollowupBlock,
  reviewExternalReply,
  selectOriginalReplySender,
} from "../../../supabase/functions/_shared/unifiedInboundSafety";
import { buildMetadataOnlyPrivacyTransfer } from "../../../supabase/functions/_shared/unifiedPrivacyTransfer";

const BUSINESS_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BUSINESS_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CONTACT_SHARED = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const NOW = new Date("2026-11-16T12:00:00.000Z");

function event(overrides: Partial<AuthenticatedInboundEvent> = {}): AuthenticatedInboundEvent {
  return {
    source: "smartlead",
    sourceEventId: "provider-event-1",
    eventKind: "reply_received",
    occurredAt: "2026-11-16T11:59:00.000Z",
    signatureVerified: true,
    authenticatedBusinessId: BUSINESS_A,
    providerConnectionId: "connection-a",
    providerMailboxId: "mailbox-1",
    providerCampaignId: "campaign-a",
    providerLeadId: "lead-a",
    threadId: "thread-a",
    originalSenderMailbox: "sender-1@gsm.example",
    contentReference: "protected://message/1",
    contactId: CONTACT_SHARED,
    ...overrides,
  };
}

function routes(overrides: Partial<RoutingContext> = {}): RoutingContext {
  return {
    mailboxes: [{
      mailboxId: "mailbox-1",
      mailboxAddress: "sender-1@gsm.example",
      businessId: BUSINESS_A,
      estate: "gsm",
      active: true,
      verified: true,
    }],
    campaigns: [{ connectionId: "connection-a", campaignId: "campaign-a", businessId: BUSINESS_A, active: true, verified: true }],
    aliases: [],
    forms: [{ source: "kindnesss_commercial", siteId: "kindnesss-site", businessId: BUSINESS_A, verified: true }],
    ...overrides,
  };
}

interface MemoryRow extends UnifiedReceiptClaim {
  id: string;
  status: string;
  attempts: number;
  leaseToken: string;
  route?: FinaliseReceipt;
}

function memoryStore() {
  const rows = new Map<string, MemoryRow>();
  let sequence = 0;
  const store: UnifiedInboundStore = {
    async claim(receipt): Promise<ClaimResult> {
      const existing = rows.get(receipt.idempotencyKey);
      const now = Date.parse(receipt.now);
      if (existing) {
        const leaseExpired = Date.parse(existing.leaseUntil) <= now;
        const retryDue = existing.status === "retry" && existing.route?.nextAttemptAt && Date.parse(existing.route.nextAttemptAt) <= now;
        const reclaimable = existing.attempts < UNIFIED_INBOUND_MAX_ATTEMPTS && leaseExpired && (existing.status === "retry" ? retryDue : existing.status === "processing");
        if (!reclaimable) return { state: "duplicate", receiptId: existing.id };
        existing.attempts += 1;
        existing.leaseUntil = receipt.leaseUntil;
        existing.leaseToken = `lease-${++sequence}`;
        existing.status = "processing";
        return { state: "claimed", receiptId: existing.id, attempts: existing.attempts, leaseToken: existing.leaseToken };
      }
      const row: MemoryRow = {
        ...receipt,
        id: `receipt-${++sequence}`,
        status: "processing",
        attempts: 1,
        leaseToken: `lease-${sequence}`,
      };
      rows.set(receipt.idempotencyKey, row);
      return { state: "claimed", receiptId: row.id, attempts: 1, leaseToken: row.leaseToken };
    },
    async finalise(receiptId, update) {
      const row = [...rows.values()].find((candidate) => candidate.id === receiptId);
      if (!row || row.leaseToken !== update.leaseToken) throw new Error("stale_lease");
      row.route = update;
      row.status = update.status;
      row.leaseUntil = NOW.toISOString();
    },
  };
  return { store, rows };
}

function deps(store: UnifiedInboundStore, context: RoutingContext = routes(), now = NOW) {
  return { enabledFlag: "true", store, routingContext: async () => context, now: () => now };
}

describe("unified inbound deterministic routing", () => {
  it("fans in 200 physical GSM mailboxes without losing business, sender or thread identity", async () => {
    const context = routes({
      mailboxes: Array.from({ length: 200 }, (_, index) => ({
        mailboxId: `mailbox-${index + 1}`,
        mailboxAddress: `sender-${index + 1}@gsm.example`,
        businessId: index % 2 ? BUSINESS_B : BUSINESS_A,
        estate: "gsm" as const,
        active: true,
        verified: true,
      })),
    });
    const memory = memoryStore();
    for (let index = 0; index < 200; index += 1) {
      const businessId = index % 2 ? BUSINESS_B : BUSINESS_A;
      const response = await processUnifiedInbound(event({
        sourceEventId: `event-${index + 1}`,
        authenticatedBusinessId: businessId,
        providerMailboxId: `mailbox-${index + 1}`,
        originalSenderMailbox: `sender-${index + 1}@gsm.example`,
        threadId: `thread-${index + 1}`,
      }), deps(memory.store, context));
      expect(response.status).toBe(202);
    }
    expect(memory.rows.size).toBe(200);
    for (const row of memory.rows.values()) {
      expect(row.route?.status).toBe("processed");
      expect(row.route?.businessId).toBe(row.authenticatedBusinessId);
      expect(row.route?.originalSenderMailbox).toContain("@gsm.example");
      expect(row.route?.threadKey).toContain(row.authenticatedBusinessId);
    }
  });

  it("keeps the same canonical contact in two independent business threads", () => {
    const first = routeUnifiedInbound(event({ contactId: CONTACT_SHARED }), routes());
    const second = routeUnifiedInbound(event({
      authenticatedBusinessId: BUSINESS_B,
      providerMailboxId: "mailbox-b",
      originalSenderMailbox: "sender-b@gsm.example",
      threadId: "thread-b",
      contactId: CONTACT_SHARED,
    }), routes({
      mailboxes: [{ mailboxId: "mailbox-b", mailboxAddress: "sender-b@gsm.example", businessId: BUSINESS_B, estate: "gsm", active: true, verified: true }],
    }));
    expect(first).toMatchObject({ outcome: "routed", businessId: BUSINESS_A });
    expect(second).toMatchObject({ outcome: "routed", businessId: BUSINESS_B });
    expect(first.outcome === "routed" && second.outcome === "routed" && first.threadKey).not.toBe(second.outcome === "routed" && second.threadKey);
  });

  it("isolates 100 businesses and never infers scope from a shared contact", () => {
    const context = routes({
      mailboxes: Array.from({ length: 100 }, (_, index) => ({
        mailboxId: `mailbox-${index}`,
        mailboxAddress: `sender-${index}@gsm.example`,
        businessId: `business-${index}`,
        estate: "gsm" as const,
        active: true,
        verified: true,
      })),
    });
    for (let index = 0; index < 100; index += 1) {
      const decision = routeUnifiedInbound(event({
        authenticatedBusinessId: `business-${index}`,
        providerMailboxId: `mailbox-${index}`,
        originalSenderMailbox: `sender-${index}@gsm.example`,
        contactId: CONTACT_SHARED,
      }), context);
      expect(decision).toMatchObject({ outcome: "routed", businessId: `business-${index}` });
    }
  });

  it("uses mailbox > campaign > alias > signed form and quarantines higher-priority mismatches", () => {
    const mailboxDecision = routeUnifiedInbound(event({ providerCampaignId: "unknown", alias: "unknown@example.com" }), routes());
    expect(mailboxDecision).toMatchObject({ outcome: "routed", evidence: "allocated_mailbox" });
    const mismatch = routeUnifiedInbound(event({ providerMailboxId: "mailbox-b" }), routes({
      mailboxes: [{ mailboxId: "mailbox-b", mailboxAddress: "sender-1@gsm.example", businessId: BUSINESS_B, estate: "gsm", active: true, verified: true }],
    }));
    expect(mismatch).toEqual({ outcome: "quarantine", reason: "authenticated_business_mismatch" });
    const unknown = routeUnifiedInbound(event({ providerMailboxId: "unknown" }), routes());
    expect(unknown).toEqual({ outcome: "quarantine", reason: "mailbox_mapping_missing" });
  });

  it("accepts only the signed allowlisted Kindnesss commercial form route", () => {
    const formEvent = event({
      source: "kindnesss_commercial",
      sourceEventId: "site-event-1",
      eventKind: "commercial_enquiry",
      providerMailboxId: null,
      providerCampaignId: null,
      providerConnectionId: null,
      originalSenderMailbox: null,
      siteId: "kindnesss-site",
    });
    expect(routeUnifiedInbound(formEvent, routes())).toMatchObject({ outcome: "routed", evidence: "signed_first_party_form" });
    expect(unifiedIdempotencyKey(formEvent)).toBe("kindnesss_commercial:site-event-1");
  });

  it("excludes GHAT even when a matching allocation is active", () => {
    expect(routeUnifiedInbound(event(), routes({
      mailboxes: [{ mailboxId: "mailbox-1", mailboxAddress: "charity@ghat.example", businessId: BUSINESS_A, estate: "ghat", active: true, verified: true }],
    }))).toEqual({ outcome: "quarantine", reason: "ghat_excluded" });
  });
});

describe("durable fan-in safety and retries", () => {
  it("collapses concurrent duplicate deliveries into one immutable receipt", async () => {
    const memory = memoryStore();
    const responses = await Promise.all(Array.from({ length: 12 }, () => processUnifiedInbound(event(), deps(memory.store))));
    expect(memory.rows.size).toBe(1);
    expect(responses.filter((response) => response.status === 202)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 200)).toHaveLength(11);
  });

  it("rejects spoofed events and performs no writes", async () => {
    const memory = memoryStore();
    const response = await processUnifiedInbound(event({ signatureVerified: false }), deps(memory.store));
    expect(response.status).toBe(401);
    expect(memory.rows.size).toBe(0);
  });

  it("performs no writes while the fan-in flag is disabled", async () => {
    const memory = memoryStore();
    const response = await processUnifiedInbound(event(), { ...deps(memory.store), enabledFlag: undefined });
    expect(response).toEqual({ status: 503, body: { ok: false, reason: "receiver_disabled" } });
    expect(memory.rows.size).toBe(0);
  });

  it("quarantines unknown mappings without assigning another business", async () => {
    const memory = memoryStore();
    const response = await processUnifiedInbound(event({ providerMailboxId: "unknown" }), deps(memory.store));
    expect(response).toMatchObject({ status: 202, body: { route: "quarantine", reason: "mailbox_mapping_missing", autoSend: false } });
    expect([...memory.rows.values()][0].route?.businessId).toBeNull();
  });

  it("recovers a durable receipt after a transient routing outage", async () => {
    const memory = memoryStore();
    let fail = true;
    let now = new Date(NOW);
    const running = {
      enabledFlag: "true",
      store: memory.store,
      routingContext: async () => { if (fail) throw new Error("provider timeout"); return routes(); },
      now: () => now,
    };
    expect((await processUnifiedInbound(event(), running)).status).toBe(503);
    fail = false;
    now = new Date(now.getTime() + 3700 * 1000);
    expect((await processUnifiedInbound(event(), running)).status).toBe(202);
    expect(memory.rows.size).toBe(1);
    expect([...memory.rows.values()][0]).toMatchObject({ attempts: 2, status: "processed" });
  });

  it("retries provider/routing outages with a lease and eventually dead-letters", async () => {
    const memory = memoryStore();
    let now = new Date(NOW);
    for (let attempt = 1; attempt <= UNIFIED_INBOUND_MAX_ATTEMPTS; attempt += 1) {
      const response = await processUnifiedInbound(event(), {
        enabledFlag: "true",
        store: memory.store,
        routingContext: async () => { throw new Error("provider timeout"); },
        now: () => now,
      });
      expect(response.status).toBe(503);
      const row = [...memory.rows.values()][0];
      expect(row.attempts).toBe(attempt);
      expect(row.status).toBe(attempt === UNIFIED_INBOUND_MAX_ATTEMPTS ? "dead_letter" : "retry");
      now = new Date(now.getTime() + 3700 * 1000);
    }
    expect(memory.rows.size).toBe(1);
  });

  it("converges out-of-order replies and opt-outs without re-opening follow-ups", () => {
    const route = routeUnifiedInbound(event(), routes());
    if (route.outcome !== "routed") throw new Error("expected route");
    const initial: ThreadProjection = { businessId: BUSINESS_A, threadKey: route.threadKey, replied: false, optedOut: false, latestEventAt: "2026-11-16T10:00:00Z", lastInboundAt: null };
    const replied = projectThread(initial, event({ occurredAt: "2026-11-16T11:00:00Z" }), route);
    const olderOther = projectThread(replied, event({ eventKind: "other", occurredAt: "2026-11-16T09:00:00Z" }), route);
    const optedOut = projectThread(olderOther, event({ eventKind: "lead_unsubscribed", occurredAt: "2026-11-16T10:30:00Z" }), route);
    expect(optedOut).toMatchObject({ replied: true, optedOut: true, latestEventAt: "2026-11-16T11:00:00Z", lastInboundAt: "2026-11-16T11:00:00Z" });
  });
});

describe("reply, sender and suppression safety", () => {
  it("blocks internal pending follow-ups on authentic reply but does not claim provider stop", () => {
    const decision = decideFollowupBlock({ eventType: "reply_received", businessId: BUSINESS_A, contactId: CONTACT_SHARED, providerCampaignId: "campaign-a", providerLeadId: "lead-a" });
    expect(decision).toMatchObject({ internalPendingFollowupsBlocked: true, providerStopVerified: false, state: "internal_block_provider_unverified" });
  });

  it("requires exact verified provider read-back before saying Smartlead follow-ups stopped", () => {
    const base = { eventType: "lead_unsubscribed" as const, businessId: BUSINESS_A, contactId: CONTACT_SHARED, providerCampaignId: "campaign-a", providerLeadId: "lead-a" };
    const wrongTenant = decideFollowupBlock({ ...base, providerAcknowledgement: { provider: "smartlead", businessId: BUSINESS_B, providerCampaignId: "campaign-a", providerLeadId: "lead-a", contactId: CONTACT_SHARED, readbackVerified: true, pendingFollowups: 0, checkedAt: NOW.toISOString() } });
    expect(wrongTenant.providerStopVerified).toBe(false);
    const verified = decideFollowupBlock({ ...base, providerAcknowledgement: { provider: "smartlead", businessId: BUSINESS_A, providerCampaignId: "campaign-a", providerLeadId: "lead-a", contactId: CONTACT_SHARED, readbackVerified: true, pendingFollowups: 0, checkedAt: NOW.toISOString() } });
    expect(verified).toMatchObject({ internalPendingFollowupsBlocked: true, providerStopVerified: true });
  });

  it("selects only the original fresh, healthy, campaign-ready sticky GSM sender", () => {
    const input = {
      businessId: BUSINESS_A,
      originalMailboxId: "mailbox-1",
      allocations: [{ mailboxId: "mailbox-1", businessId: BUSINESS_A, active: true, threadSticky: true }],
      mailboxes: [{ id: "mailbox-1", address: "sender-1@gsm.example", estate: "gsm" as const, active: true, retired: false, readiness: "campaign_ready", providerHealth: "healthy", lastProviderCheckAt: NOW.toISOString() }],
      now: NOW,
    };
    expect(selectOriginalReplySender(input)).toEqual({ ok: true, mailboxId: "mailbox-1", address: "sender-1@gsm.example" });
    expect(selectOriginalReplySender({ ...input, mailboxes: [{ ...input.mailboxes[0], estate: "ghat" as const }] })).toEqual({ ok: false, reason: "ghat_excluded" });
    expect(selectOriginalReplySender({ ...input, originalMailboxId: "mailbox-2" })).toEqual({ ok: false, reason: "original_sender_not_verified" });
  });

  it("never permits an external response without approval, scope, sender and existing gates", () => {
    const base = { businessId: BUSINESS_A, draftBusinessId: BUSINESS_A, sender: { ok: true } as const, humanApproved: false, separatelyApprovedPriorPolicy: false, existingSendGatesPassed: false, escalation: "none" as const };
    expect(reviewExternalReply(base).externalResponseAllowed).toBe(false);
    expect(reviewExternalReply({ ...base, humanApproved: true }).reason).toBe("existing_send_gates_closed");
    expect(reviewExternalReply({ ...base, humanApproved: true, existingSendGatesPassed: true, escalation: "privacy" }).reason).toBe("human_escalation_required");
  });

  it("keeps privacy transfer metadata-only and independent of commercial ingestion", () => {
    const transfer = buildMetadataOnlyPrivacyTransfer({ source: "kindnesss", businessId: BUSINESS_A, requestId: "request-1", requestType: "access", submittedAt: NOW.toISOString() });
    expect(transfer).toMatchObject({ ok: true, record: { contact_id: null, request_summary: null, founder_review_required: true } });
    expect(buildMetadataOnlyPrivacyTransfer({ source: "kindnesss", businessId: BUSINESS_A, requestId: "request-1", requestType: "access", submittedAt: NOW.toISOString(), email: "person@example.com" })).toEqual({ ok: false, reason: "invalid_metadata_only_transfer" });
  });
});
