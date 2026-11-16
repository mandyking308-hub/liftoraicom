import {
  deriveContactMutation,
  type CanonicalEventType,
  type ExtractedEvent,
} from "./smartleadEventNormalizer.ts";

export interface ProviderStopAcknowledgement {
  provider: "smartlead";
  businessId: string;
  providerCampaignId: string;
  providerLeadId: string;
  contactId: string;
  readbackVerified: boolean;
  pendingFollowups: number;
  checkedAt: string;
}

export interface FollowupBlockInput {
  eventType: Extract<CanonicalEventType, "reply_received" | "lead_unsubscribed" | "email_bounced" | "email_sent" | "email_opened">;
  businessId: string;
  contactId: string;
  providerCampaignId: string | null;
  providerLeadId: string | null;
  providerAcknowledgement?: ProviderStopAcknowledgement | null;
}

export interface FollowupBlockDecision {
  internalPendingFollowupsBlocked: boolean;
  providerStopRequired: boolean;
  providerStopVerified: boolean;
  state: "not_required" | "internal_block_provider_unverified" | "provider_stop_verified";
  transition: string;
}

function eventShell(type: CanonicalEventType): ExtractedEvent {
  return {
    canonical_event_type: type,
    raw_event_type: type,
    provider_event_id: "synthetic-or-authenticated-event",
    provider_campaign_id: null,
    provider_lead_id: null,
    provider_mailbox_id: null,
    provider_message_id: null,
    email: null,
    event_occurred_at: null,
    is_known: true,
    is_operational: true,
  };
}

/**
 * Reuses the existing Smartlead normalizer's reply/opt-out suppression decision.
 * Internal pending work blocks immediately; provider stop is claimed only after
 * a same-business, same-campaign, same-lead, same-contact read-back proves zero
 * pending follow-ups. This function never calls the provider.
 */
export function decideFollowupBlock(input: FollowupBlockInput): FollowupBlockDecision {
  const mutation = deriveContactMutation(eventShell(input.eventType));
  const internalPendingFollowupsBlocked = mutation.opens_conversation || mutation.blocks_future_sends;
  if (!internalPendingFollowupsBlocked) {
    return {
      internalPendingFollowupsBlocked: false,
      providerStopRequired: false,
      providerStopVerified: false,
      state: "not_required",
      transition: mutation.transition,
    };
  }

  const ack = input.providerAcknowledgement;
  const providerStopVerified = Boolean(
    ack &&
    ack.provider === "smartlead" &&
    ack.businessId === input.businessId &&
    ack.contactId === input.contactId &&
    input.providerCampaignId && ack.providerCampaignId === input.providerCampaignId &&
    input.providerLeadId && ack.providerLeadId === input.providerLeadId &&
    ack.readbackVerified &&
    ack.pendingFollowups === 0 &&
    !Number.isNaN(Date.parse(ack.checkedAt))
  );

  return {
    internalPendingFollowupsBlocked: true,
    providerStopRequired: true,
    providerStopVerified,
    state: providerStopVerified ? "provider_stop_verified" : "internal_block_provider_unverified",
    transition: mutation.transition,
  };
}

export interface ReplyMailbox {
  id: string;
  address: string;
  estate: "gsm" | "ghat";
  active: boolean;
  retired: boolean;
  readiness: string;
  providerHealth: string;
  lastProviderCheckAt: string | null;
}

export interface ReplyAllocation {
  mailboxId: string;
  businessId: string;
  active: boolean;
  threadSticky: boolean;
}

/** No fallback sender: only the original, sticky, verified GSM mailbox may be selected. */
export function selectOriginalReplySender(input: {
  businessId: string;
  originalMailboxId: string | null;
  allocations: readonly ReplyAllocation[];
  mailboxes: readonly ReplyMailbox[];
  now?: Date;
}): { ok: true; mailboxId: string; address: string } | { ok: false; reason: string } {
  if (!input.originalMailboxId) return { ok: false, reason: "original_sender_missing" };
  const allocations = input.allocations.filter((a) =>
    a.mailboxId === input.originalMailboxId && a.businessId === input.businessId && a.active && a.threadSticky
  );
  if (allocations.length !== 1) return { ok: false, reason: "original_sender_not_verified" };
  const mailbox = input.mailboxes.find((m) => m.id === input.originalMailboxId);
  if (!mailbox) return { ok: false, reason: "original_sender_not_found" };
  if (mailbox.estate !== "gsm") return { ok: false, reason: "ghat_excluded" };
  const checkedAt = mailbox.lastProviderCheckAt ? Date.parse(mailbox.lastProviderCheckAt) : Number.NaN;
  const now = input.now?.getTime() ?? Date.now();
  const fresh = Number.isFinite(checkedAt) && checkedAt <= now && now - checkedAt <= 24 * 60 * 60 * 1000;
  if (!mailbox.active || mailbox.retired || mailbox.readiness !== "campaign_ready" || mailbox.providerHealth !== "healthy" || !fresh) {
    return { ok: false, reason: "original_sender_not_currently_approved" };
  }
  return { ok: true, mailboxId: mailbox.id, address: mailbox.address };
}

export type EscalationKind = "none" | "unknown" | "complaint" | "privacy" | "safeguarding";

/** Decision only. It cannot send and does not weaken any existing send gate. */
export function reviewExternalReply(input: {
  businessId: string;
  draftBusinessId: string;
  sender: { ok: true } | { ok: false };
  humanApproved: boolean;
  separatelyApprovedPriorPolicy: boolean;
  existingSendGatesPassed: boolean;
  escalation: EscalationKind;
}): { externalResponseAllowed: boolean; reason: string } {
  if (input.escalation !== "none") return { externalResponseAllowed: false, reason: "human_escalation_required" };
  if (input.businessId !== input.draftBusinessId) return { externalResponseAllowed: false, reason: "business_scope_mismatch" };
  if (!input.sender.ok) return { externalResponseAllowed: false, reason: "approved_original_sender_required" };
  if (!input.humanApproved && !input.separatelyApprovedPriorPolicy) {
    return { externalResponseAllowed: false, reason: "human_approval_required" };
  }
  if (!input.existingSendGatesPassed) return { externalResponseAllowed: false, reason: "existing_send_gates_closed" };
  return { externalResponseAllowed: true, reason: "decision_only_existing_send_path_still_required" };
}
