/** OFFLINE CONTRACT ONLY. No sender, payment adapter, database or AI invocation.
 * Fixture results are never live customer evidence. Do not mount as a public API.
 */
import { authorizeConversationBusiness, paymentActivationIdempotencyKeys } from "../../../supabase/functions/_shared/customerCommercialLifecycle";
import { resolveWorker2ApprovedOffer, resolveWorker3Escalation, type Worker2OfferCandidate, type Worker2ProductCandidate } from "../../../supabase/functions/_shared/worker3CommercialHandoff";
import { KINDNESSS_BUSINESS_ID, PILOT_SENDER_IDS, mayReceiveNextStep, type LeadEvent } from "./outboundEligibility";

export interface FounderTestScope {
  /** Supplied by a future server-side role check, never browser storage. */
  callerAuthorized: boolean;
  businessId: string;
  testId: string;
  /** Future server configuration, not a client-controlled allowlist. */
  configuredFounderEmail: string;
  recipients: readonly string[];
  provider: string;
  senderId: string;
  approvedIntroduction: boolean;
  suppressionChecked: boolean;
  suppressed: boolean;
  smtpVerified: boolean;
  imapVerified: boolean;
  replyToMatchesSender: boolean;
  isolatedReplyCaptureVerified: boolean;
  atomicSingleSendClaimVerified: boolean;
  priorIntroductionMessageId: string | null;
}

export function evaluateFounderTestEnvelope(scope: FounderTestScope) {
  const blockers: string[] = [];
  if (!scope.callerAuthorized) blockers.push("founder_admin_required");
  if (scope.businessId !== KINDNESSS_BUSINESS_ID) blockers.push("wrong_business");
  if (!/^internal-sales-[a-z0-9-]{8,80}$/.test(scope.testId)) blockers.push("traceable_test_id_required");
  const expected = scope.configuredFounderEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(expected) || scope.recipients.length !== 1 ||
      scope.recipients[0]?.trim().toLowerCase() !== expected) blockers.push("exactly_one_allowlisted_founder_required");
  if (scope.provider !== "smartlead") blockers.push("smartlead_required_not_gmail_or_smtp");
  if (!PILOT_SENDER_IDS.some(id => id === scope.senderId)) blockers.push("existing_gsm_sender_required");
  if (!scope.approvedIntroduction) blockers.push("introduction_approval_required");
  if (!scope.suppressionChecked || scope.suppressed) blockers.push("suppression_not_cleared");
  if (!scope.smtpVerified || !scope.imapVerified) blockers.push("sender_connectivity_unverified");
  if (!scope.replyToMatchesSender || !scope.isolatedReplyCaptureVerified) blockers.push("isolated_reply_capture_unverified");
  if (!scope.atomicSingleSendClaimVerified) blockers.push("atomic_single_send_claim_unverified");
  if (scope.priorIntroductionMessageId) blockers.push("introduction_already_sent");
  return {
    contractEligible: blockers.length === 0,
    blockers,
    // Deliberately constant: this source harness cannot send even when fixtures pass.
    executionAllowed: false as const,
    executionBlocker: "isolated_smartlead_sender_not_implemented" as const,
    sendIdempotencyKey: `${scope.businessId}:${scope.testId}:introduction`,
  };
}

export interface OfflineReply {
  businessId: string;
  testId: string;
  fromEmail: string;
  providerMessageId: string;
  inReplyTo: string;
  text: string;
  confidence: number;
}

/** Validates a fixture turn; does not fetch, fabricate or generate a real reply. */
export function evaluateOfflineReply(scope: FounderTestScope, reply: OfflineReply, seenMessageIds: readonly string[] = []) {
  const auth = authorizeConversationBusiness({ callerAuthorized: scope.callerAuthorized,
    requestedBusinessId: scope.businessId, conversationBusinessId: reply.businessId });
  if (!auth.ok || scope.businessId !== KINDNESSS_BUSINESS_ID) return { ok: false as const, reason: "unauthorized_reply_context" };
  if (reply.testId !== scope.testId || reply.fromEmail.trim().toLowerCase() !== scope.configuredFounderEmail.trim().toLowerCase() ||
      !scope.priorIntroductionMessageId || reply.inReplyTo !== scope.priorIntroductionMessageId || !reply.providerMessageId || !reply.text.trim()) {
    return { ok: false as const, reason: "reply_identity_or_thread_mismatch" };
  }
  if (seenMessageIds.includes(reply.providerMessageId)) return { ok: false as const, reason: "duplicate_reply" };
  const escalation = resolveWorker3Escalation({ messageText: reply.text, confidence: reply.confidence });
  return {
    ok: true as const,
    followUpsAllowed: mayReceiveNextStep(["sent", "reply"]),
    draftReviewRequired: true as const,
    aiInvoked: false as const,
    replySendAllowed: false as const,
    escalation,
    replyIdempotencyKey: `${scope.businessId}:${scope.testId}:reply:${reply.providerMessageId}`,
  };
}

export function evaluateOfflineOffer(scope: FounderTestScope, input: {
  selectedOfferId: string | null;
  offers: readonly Worker2OfferCandidate[];
  products: readonly Worker2ProductCandidate[];
}) {
  if (!scope.callerAuthorized || scope.businessId !== KINDNESSS_BUSINESS_ID) return { ok: false as const, reason: "founder_business_context_required" };
  // Existing approval envelope is Stripe-specific. A passing fixture must NOT
  // be relabelled an approved Dodo product, quote or checkout.
  return resolveWorker2ApprovedOffer({ businessId: scope.businessId, ...input });
}

export type StageStatus = "BLOCKED" | "WAITING_FOR_REAL_EVENT";
export function founderJourneyLiveReport(input: {
  envelope: ReturnType<typeof evaluateFounderTestEnvelope>;
  offer: ReturnType<typeof evaluateOfflineOffer>;
  events: readonly LeadEvent[];
  testId: string;
}) {
  return {
    mode: "source_only" as const,
    firstEmailSent: false as const,
    crmWon: false as const,
    paidVerified: false as const,
    externalActions: 0,
    stages: [
      { stage: "intro_email", status: "BLOCKED" as StageStatus, reason: input.envelope.executionBlocker },
      { stage: "founder_reply", status: "WAITING_FOR_REAL_EVENT" as StageStatus, reason: "no_real_intro_or_reply" },
      { stage: "ai_reply_draft", status: "BLOCKED" as StageStatus, reason: "real_scoped_reply_and_founder_draft_review_required" },
      { stage: "quote_offer", status: "BLOCKED" as StageStatus, reason: input.offer.ok ? "stripe_fixture_not_dodo_offer_evidence" : input.offer.reason },
      { stage: "dodo_checkout", status: "BLOCKED" as StageStatus, reason: "liftor_dodo_sandbox_adapter_missing" },
      { stage: "verified_payment_crm_won", status: "BLOCKED" as StageStatus, reason: "authentic_dodo_sandbox_webhook_required_never_browser_return" },
      { stage: "receipt_onboarding", status: "BLOCKED" as StageStatus, reason: "verified_payment_and_school_release_clearance_required" },
    ],
    followUpsAllowedByStopRule: mayReceiveNextStep(input.events),
    plannedActivationKeys: paymentActivationIdempotencyKeys(`${KINDNESSS_BUSINESS_ID}:${input.testId}:sandbox`),
  };
}