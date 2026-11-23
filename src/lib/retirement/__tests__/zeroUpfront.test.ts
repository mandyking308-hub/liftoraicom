import { describe, it, expect } from "vitest";
import { isConfirmedZeroUpfront, effectiveZeroUpfrontStatus, inZeroUpfrontShortlist, isZeroUpfrontDDReady } from "../retirementAcquisition";

const proof = { zero_upfront_status: "confirmed_zero", upfront_cash_required: 0, seller_finance_percent: 100,
  zero_upfront_evidence: "Heads of terms: 100% deferred", zero_upfront_evidence_url: "https://example.com/l/1", terms_confirmed_at: "2026-11-23T00:00:00Z" };
const ddOk = { profit: 1, asking_price: 1, turnover: 1, evidence_quality: "verified" as const, retirement_confidence: "explicit" as const, red_flags: [] };

describe("£0 upfront rule", () => {
  it("50% seller finance does not count as £0", () => {
    expect(effectiveZeroUpfrontStatus({ seller_finance_percent: 50, zero_upfront_status: "negotiation_candidate" })).toBe("cash_required");
    expect(inZeroUpfrontShortlist({ ...proof, seller_finance_percent: 50 })).toBe(false);
  });
  it("deposit required is not eligible", () => {
    expect(inZeroUpfrontShortlist({ zero_upfront_status: "cash_required" })).toBe(false);
    expect(effectiveZeroUpfrontStatus({ upfront_cash_required: 5000 })).toBe("cash_required");
  });
  it("NULL cash is not zero", () => {
    expect(isConfirmedZeroUpfront({ ...proof, upfront_cash_required: null })).toBe(false);
    expect(effectiveZeroUpfrontStatus({ upfront_cash_required: null })).toBe("unknown");
  });
  it("confirmed_zero needs proof", () => {
    expect(isConfirmedZeroUpfront(proof)).toBe(true);
    expect(isConfirmedZeroUpfront({ ...proof, zero_upfront_evidence: " " })).toBe(false);
    expect(isConfirmedZeroUpfront({ ...proof, zero_upfront_evidence_url: null })).toBe(false);
    expect(isConfirmedZeroUpfront({ ...proof, terms_confirmed_at: null })).toBe(false);
  });
  it("high score / DD checks cannot promote without £0 proof", () => {
    expect(isZeroUpfrontDDReady({ ...ddOk, zero_upfront_status: "unknown" })).toBe(false);
    expect(isZeroUpfrontDDReady({ ...ddOk, ...proof })).toBe(true);
  });
  it("existing six records classification yields 0 confirmed", () => {
    const six = [
      { zero_upfront_status: "cash_required", zero_upfront_evidence: "100% seller finance is not available" },
      { zero_upfront_status: "cash_required", seller_finance_percent: 50 },
      {}, {}, {}, {},
    ].map((r) => ({ zero_upfront_status: "unknown", ...r }));
    expect(six.filter(inZeroUpfrontShortlist).length).toBe(0);
  });
});
