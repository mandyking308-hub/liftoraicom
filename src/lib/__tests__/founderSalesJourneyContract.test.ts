import { describe, expect, it } from "vitest";
import { evaluateFounderTestEnvelope, evaluateOfflineOffer, evaluateOfflineReply, founderJourneyLiveReport, type FounderTestScope, type OfflineReply } from "../kindnesss/founderSalesJourneyContract";
import { KINDNESSS_BUSINESS_ID, mayReceiveNextStep } from "../kindnesss/outboundEligibility";

// Deliberate OFFLINE fixtures. Not Mandy's reply, a real offer, or a payment.
const scope = (override: Partial<FounderTestScope> = {}): FounderTestScope => ({
  callerAuthorized: true, businessId: KINDNESSS_BUSINESS_ID, testId: "internal-sales-offline-20261021",
  configuredFounderEmail: "founder@example.test", recipients: ["founder@example.test"], provider: "smartlead",
  senderId: "24265073", approvedIntroduction: true, suppressionChecked: true, suppressed: false,
  smtpVerified: true, imapVerified: true, replyToMatchesSender: true, isolatedReplyCaptureVerified: true,
  atomicSingleSendClaimVerified: true, priorIntroductionMessageId: null, ...override,
});
const reply = (override: Partial<OfflineReply> = {}): OfflineReply => ({
  businessId: KINDNESSS_BUSINESS_ID, testId: scope().testId, fromEmail: "founder@example.test",
  providerMessageId: "fixture-reply-1", inReplyTo: "fixture-intro-1", text: "Please explain the school programme.", confidence: 0.9, ...override,
});

describe("one founder only, never an operational sending bypass", () => {
  it("passes the isolated envelope contract but still cannot execute any send", () => {
    expect(evaluateFounderTestEnvelope(scope())).toMatchObject({ contractEligible: true, executionAllowed: false,
      executionBlocker: "isolated_smartlead_sender_not_implemented" });
  });
  it.each([
    [{ callerAuthorized: false }, "founder_admin_required"],
    [{ businessId: "another-business" }, "wrong_business"],
    [{ recipients: [] }, "exactly_one_allowlisted_founder_required"],
    [{ recipients: ["founder@example.test", "prospect@example.test"] }, "exactly_one_allowlisted_founder_required"],
    [{ recipients: ["prospect@example.test"] }, "exactly_one_allowlisted_founder_required"],
    [{ provider: "gmail" }, "smartlead_required_not_gmail_or_smtp"],
    [{ provider: "smtp" }, "smartlead_required_not_gmail_or_smtp"],
    [{ senderId: "other" }, "existing_gsm_sender_required"],
    [{ approvedIntroduction: false }, "introduction_approval_required"],
    [{ suppressionChecked: false }, "suppression_not_cleared"],
    [{ suppressed: true }, "suppression_not_cleared"],
    [{ isolatedReplyCaptureVerified: false }, "isolated_reply_capture_unverified"],
    [{ replyToMatchesSender: false }, "isolated_reply_capture_unverified"],
    [{ atomicSingleSendClaimVerified: false }, "atomic_single_send_claim_unverified"],
    [{ priorIntroductionMessageId: "fixture-intro-1" }, "introduction_already_sent"],
    [{ smtpVerified: false }, "sender_connectivity_unverified"],
    [{ testId: "untraceable" }, "traceable_test_id_required"],
  ] as [Partial<FounderTestScope>, string][])("rejects unsafe envelope %j", (patch, reason) => {
    const result = evaluateFounderTestEnvelope(scope(patch));
    expect(result.contractEligible).toBe(false);
    expect(result.blockers).toContain(reason);
    expect(result.executionAllowed).toBe(false);
  });
  it("allows either existing GSM sender but never a third sender", () => {
    expect(evaluateFounderTestEnvelope(scope({ senderId: "24265132" })).contractEligible).toBe(true);
  });
  it("keeps the introduction retry identity stable and business/test scoped", () => {
    const a = evaluateFounderTestEnvelope(scope()).sendIdempotencyKey;
    expect(a).toBe(`${KINDNESSS_BUSINESS_ID}:internal-sales-offline-20261021:introduction`);
    expect(evaluateFounderTestEnvelope(scope()).sendIdempotencyKey).toBe(a);
    expect(evaluateFounderTestEnvelope(scope({ testId: "internal-sales-different-test" })).sendIdempotencyKey).not.toBe(a);
  });
});

describe("reply identity, deterministic chase stop and approval", () => {
  const sent = () => scope({ priorIntroductionMessageId: "fixture-intro-1" });
  it("accepts only the exact offline reply thread and requires review; invokes no AI", () => {
    expect(evaluateOfflineReply(sent(), reply())).toMatchObject({ ok: true, followUpsAllowed: false,
      draftReviewRequired: true, aiInvoked: false, replySendAllowed: false, escalation: { escalate: false } });
  });
  it.each([
    { businessId: "other" }, { testId: "other-test" }, { fromEmail: "other@example.test" },
    { inReplyTo: "other-intro" }, { providerMessageId: "" }, { text: "" },
  ])("rejects mismatched reply %j", patch => {
    expect(evaluateOfflineReply(sent(), reply(patch)).ok).toBe(false);
  });
  it("rejects unauthorized callers and replies before introduction", () => {
    expect(evaluateOfflineReply({ ...sent(), callerAuthorized: false }, reply()).ok).toBe(false);
    expect(evaluateOfflineReply(scope(), reply()).ok).toBe(false);
  });
  it("deduplicates the same reply instead of producing another draft", () => {
    expect(evaluateOfflineReply(sent(), reply(), ["fixture-reply-1"])).toEqual({ ok: false, reason: "duplicate_reply" });
  });
  it("escalates complaints and low confidence without auto-sending", () => {
    expect(evaluateOfflineReply(sent(), reply({ text: "I have a complaint" }))).toMatchObject({ escalation: { escalate: true, reason: "complaint" }, replySendAllowed: false });
    expect(evaluateOfflineReply(sent(), reply({ confidence: 0.1 }))).toMatchObject({ escalation: { escalate: true, reason: "low_confidence" } });
  });
  it.each(["reply", "unsubscribe", "bounce", "objection", "complaint", "suppressed"] as const)("stops all later steps on %s", event => {
    expect(mayReceiveNextStep(["sent", event])).toBe(false);
  });
});

describe("actual Kindnesss blockers, not invented sale evidence", () => {
  it("reuses the approved-offer contract and fails with no actual Kindnesss offer", () => {
    expect(evaluateOfflineOffer(scope(), { selectedOfferId: null, offers: [], products: [] })).toEqual({ ok: false, reason: "approved_offer_selection_required" });
    expect(evaluateOfflineOffer(scope({ businessId: "other" }), { selectedOfferId: null, offers: [], products: [] }).ok).toBe(false);
  });
  it("cannot fabricate a Dodo payment, won deal, receipt or onboarding", () => {
    const report = founderJourneyLiveReport({ envelope: evaluateFounderTestEnvelope(scope({ isolatedReplyCaptureVerified: false, atomicSingleSendClaimVerified: false })),
      offer: evaluateOfflineOffer(scope(), { selectedOfferId: null, offers: [], products: [] }), events: [], testId: scope().testId });
    expect(report).toMatchObject({ mode: "source_only", firstEmailSent: false, crmWon: false, paidVerified: false, externalActions: 0 });
    expect(report.stages).toHaveLength(7);
    expect(report.stages.find(s => s.stage === "dodo_checkout")?.reason).toBe("liftor_dodo_sandbox_adapter_missing");
    expect(report.stages.find(s => s.stage === "verified_payment_crm_won")?.reason).toBe("authentic_dodo_sandbox_webhook_required_never_browser_return");
    expect(report.plannedActivationKeys).toEqual(founderJourneyLiveReport({ envelope: evaluateFounderTestEnvelope(scope()), offer: { ok: false, reason: "missing" }, events: [], testId: scope().testId }).plannedActivationKeys);
  });
});