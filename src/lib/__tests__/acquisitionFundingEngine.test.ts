import { describe, it, expect } from "vitest";
import {
  computeScores, recommendAction, matchFunders, requiresUKRegulatoryReview,
  stampRegulatoryFlags, pitchPackReadiness, summariseAcquisitionFunding,
  type AFOpportunity, type AFFunder, type AFPitchPack,
} from "../acquisitionFundingEngine";

const baseOpp = (over: Partial<AFOpportunity> = {}): AFOpportunity => ({
  id: "o1", opportunity_name: "Acme", source: null, source_url: null,
  category: "saas", country: "UK", asking_price: 100_000, revenue_ttm: 200_000,
  profit_ttm: 30_000, current_mrr: 8_000, current_arr: 96_000, customer_count: 80,
  user_count: 800, email_list_size: 5000, social_following: 1200,
  owner_reason_for_sale: null, distress_signal: "founder_exhausted",
  asset_quality_score: null, brand_value_score: null, liftor_fit_score: null,
  turnaround_potential_score: null, replacement_cost_score: null,
  legal_risk_score: null, overall_priority_score: null,
  liftor_operating_advantage: "AI agents collapse support cost",
  recommended_action: "watch", founder_approval_required: true, founder_approved: false,
  notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  ...over,
});

describe("acquisitionFundingEngine", () => {
  it("rejects opportunities with no Liftor operating advantage", () => {
    const o = baseOpp({ liftor_operating_advantage: null, category: "other", current_mrr: 0, customer_count: 0, profit_ttm: 0 });
    const s = computeScores(o);
    expect(recommendAction(o, s)).toBe("reject");
  });

  it("rejects insolvency/bankruptcy as too risky regardless of fit", () => {
    const o = baseOpp({ distress_signal: "bankruptcy" });
    const s = computeScores(o);
    expect(s.legal_risk_score).toBeGreaterThanOrEqual(50);
    expect(recommendAction(o, s)).toBe("reject");
  });

  it("recommends seek_funding when fit is high and asking price > 50k", () => {
    const o = baseOpp({ asking_price: 750_000 });
    const s = computeScores(o);
    const r = recommendAction(o, s);
    expect(["seek_funding", "prepare_offer", "acquire"]).toContain(r);
  });

  it("matchFunders excludes funders that require profitability when none", () => {
    const f: AFFunder = {
      id: "f1", funder_name: "PE", funder_type: "micro_pe",
      contact_name: null, contact_email: null, contact_url: null, geography: null,
      preferred_deal_size_min: 0, preferred_deal_size_max: 10_000_000,
      preferred_asset_type: "any", accepts_pre_revenue: false, accepts_loss_making: false,
      requires_profitability: true, preferred_structure: "equity", risk_appetite: "low",
      status: "warm", notes: null, next_action: null,
      created_at: "", updated_at: "",
    };
    const noProfit = baseOpp({ profit_ttm: 0 });
    expect(matchFunders(noProfit, [f])).toEqual([]);
    const withProfit = baseOpp({ profit_ttm: 100_000 });
    expect(matchFunders(withProfit, [f])).toHaveLength(1);
  });

  it("stampRegulatoryFlags forces legal+tax review when SPV or external equity is involved", () => {
    const r1 = stampRegulatoryFlags({ spv_required: true });
    expect(r1.legal_review_required).toBe(true);
    expect(r1.tax_review_required).toBe(true);
    expect(r1.regulatory_risk).toMatch(/FCA|investor/i);
    const r2 = stampRegulatoryFlags({ investor_equity_required: 250_000 });
    expect(requiresUKRegulatoryReview(r2)).toBe(true);
    const r3 = stampRegulatoryFlags({ cash_upfront: 50_000 });
    expect(requiresUKRegulatoryReview(r3)).toBe(false);
  });

  it("pitchPackReadiness flags every required field when empty", () => {
    const r = pitchPackReadiness(null);
    expect(r.ready).toBe(false);
    expect(r.missing.length).toBeGreaterThanOrEqual(10);
    expect(r.status).toBe("not_started");
  });

  it("pitchPackReadiness marks ready_for_review when all fields present", () => {
    const p: Partial<AFPitchPack> = {
      investment_thesis: "x", why_this_asset: "x", why_now: "x", liftor_advantage: "x",
      ninety_day_relaunch_plan: "x", twelve_month_growth_plan: "x",
      funding_required: 100_000, proposed_capital_stack: "x", expected_return_routes: "x",
      key_risks: "x", due_diligence_required: "x",
    };
    const r = pitchPackReadiness(p);
    expect(r.ready).toBe(true);
    expect(r.status).toBe("ready_for_review");
  });

  it("summariseAcquisitionFunding buckets opportunities into command-centre sections", () => {
    const opps: AFOpportunity[] = [
      baseOpp({ id: "a", opportunity_name: "Seller exhausted", asking_price: 200_000, distress_signal: "founder_exhausted" }),
      baseOpp({ id: "b", opportunity_name: "Revenue decline", asking_price: 800_000, distress_signal: "revenue_decline" }),
      baseOpp({ id: "c", opportunity_name: "Strategic large", asking_price: 2_000_000, distress_signal: "poor_marketing" }),
      baseOpp({ id: "d", opportunity_name: "Cheap fit", asking_price: 25_000 }),
    ].map(o => {
      const s = computeScores(o);
      return { ...o, ...s, recommended_action: recommendAction(o, s) };
    });
    const sum = summariseAcquisitionFunding(opps, []);
    expect(sum.best_seller_finance.some(o => o.id === "a")).toBe(true);
    expect(sum.best_earn_out.some(o => o.id === "b")).toBe(true);
    expect(sum.best_strategic_co_buyer.some(o => o.id === "c")).toBe(true);
    expect(sum.best_internal_cash.some(o => o.id === "d")).toBe(true);
    expect(sum.awaiting_founder_approval.length).toBeGreaterThan(0);
  });
});