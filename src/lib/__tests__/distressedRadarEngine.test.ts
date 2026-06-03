import { describe, it, expect } from "vitest";
import {
  computeScores, recommendAction, recommendStructure, applyScoringDefaults,
  disposalReadiness, summariseRadar, SCAN_SOURCES,
  type AcquisitionOpportunity, type DisposalAsset,
} from "../distressedRadarEngine";

const baseOpp = (o: Partial<AcquisitionOpportunity> = {}): AcquisitionOpportunity => ({
  id: "o1", opportunity_name: "X", source: null, source_url: null, country: "UK",
  category: "saas", distress_type: "founder_exhausted",
  asking_price: 100_000, revenue_ttm: 80_000, profit_ttm: 10_000,
  monthly_recurring_revenue: 8_000, annual_recurring_revenue: 96_000,
  customer_count: 120, user_count: 1000, email_list_size: 5000, social_following: 2000,
  domain_strength: 60, trademark_status: "registered",
  ip_assets: "logo+codebase", code_assets: "react+node", customer_data_status: "clean",
  operational_complexity: 40, founder_dependency: 40,
  liftor_advantage_notes: "AI ops can collapse support cost",
  liftor_fit_score: null, brand_value_score: null, replacement_cost_score: null,
  turnaround_score: null, legal_risk_score: null, financing_feasibility_score: null,
  exit_route_score: null, overall_priority_score: null,
  financing_required: 100_000, recommended_structure: "do_not_buy", recommended_action: "watch",
  notes: null, next_action: null, founder_approval_required: true, founder_approved: false,
  scanned_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  ...o,
});

describe("distressedRadarEngine", () => {
  it("scores a strong fit higher than a weak fit", () => {
    const strong = computeScores(baseOpp());
    const weak = computeScores(baseOpp({
      liftor_advantage_notes: null, customer_count: 0, monthly_recurring_revenue: 0,
      operational_complexity: 90, founder_dependency: 90, category: "other",
    }));
    expect(strong.liftor_fit_score).toBeGreaterThan(weak.liftor_fit_score);
    expect(strong.overall_priority_score).toBeGreaterThan(weak.overall_priority_score);
  });

  it("never recommends acquire on cheap-only opportunities with no Liftor advantage", () => {
    const cheap = baseOpp({
      asking_price: 1_000, financing_required: 1_000,
      liftor_advantage_notes: null, customer_count: 0, monthly_recurring_revenue: 0,
      operational_complexity: 100, founder_dependency: 100, trademark_status: null,
      ip_assets: null, code_assets: null, category: "other",
    });
    const scored = applyScoringDefaults(cheap);
    expect(scored.recommended_action).not.toBe("acquire");
    expect(["reject", "park", "watch"]).toContain(scored.recommended_action!);
  });

  it("rejects on extreme legal risk (bankruptcy + unknown data + no trademark)", () => {
    const risky = baseOpp({
      distress_type: "bankruptcy", trademark_status: "unknown",
      customer_data_status: "unknown", country: null,
    });
    const s = computeScores(risky);
    expect(s.legal_risk_score).toBeGreaterThanOrEqual(70);
    expect(recommendAction(risky, s)).toBe("reject");
    expect(recommendStructure(risky, s)).toBe("do_not_buy");
  });

  it("routes founder-exhausted small deals to seller finance", () => {
    const o = baseOpp({ distress_type: "founder_exhausted", asking_price: 200_000, financing_required: 200_000 });
    const s = computeScores(o);
    expect(recommendStructure(o, s)).toBe("seller_finance");
  });

  it("routes big-ticket deals away from cash", () => {
    const o = baseOpp({ asking_price: 3_000_000, financing_required: 3_000_000 });
    const s = computeScores(o);
    expect(["spv", "investor_partner", "earn_out", "revenue_share"]).toContain(recommendStructure(o, s));
  });

  it("disposalReadiness blocks if evidence or handover missing", () => {
    const d: DisposalAsset = {
      id: "d", asset_name: "Old tool", category: "saas", build_status: "built", revenue_status: "none",
      reason_for_disposal: "non-core", sale_route: "flippa", asking_price_estimate: 5000,
      evidence_pack_status: "missing", handover_docs_status: "partial",
      code_ip_status: "clean", customer_data_status: "none", compliance_risk: "low",
      recommended_action: "prepare", notes: null, founder_approved: false,
      created_at: "", updated_at: "",
    };
    const r = disposalReadiness(d);
    expect(r.ready).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/Evidence/);
  });

  it("disposalReadiness ready when everything is in place", () => {
    const d: DisposalAsset = {
      id: "d", asset_name: "Old tool", category: "saas", build_status: "built", revenue_status: "modest",
      reason_for_disposal: "non-core", sale_route: "acquire", asking_price_estimate: 25000,
      evidence_pack_status: "verified", handover_docs_status: "ready",
      code_ip_status: "clean", customer_data_status: "clean", compliance_risk: "low",
      recommended_action: "list", notes: null, founder_approved: true,
      created_at: "", updated_at: "",
    };
    expect(disposalReadiness(d).ready).toBe(true);
  });

  it("summariseRadar buckets correctly", () => {
    const a = applyScoringDefaults(baseOpp({ id: "a" })) as AcquisitionOpportunity;
    const b = applyScoringDefaults(baseOpp({ id: "b", source: "Flippa", overall_priority_score: 90 })) as AcquisitionOpportunity;
    const c = applyScoringDefaults(baseOpp({ id: "c", distress_type: "administration" })) as AcquisitionOpportunity;
    const opps = [a, b, c].map(x => ({ ...x, overall_priority_score: x.overall_priority_score ?? 50, legal_risk_score: x.legal_risk_score ?? 20 })) as AcquisitionOpportunity[];
    const sum = summariseRadar(opps, []);
    expect(sum.total_opps).toBe(3);
    expect(sum.marketplace_assets.find(o => o.id === "b")).toBeTruthy();
    expect(sum.distressed_brands_to_watch.find(o => o.id === "c")).toBeTruthy();
  });

  it("registers all required scanning sources", () => {
    const ids = SCAN_SOURCES.map(s => s.id);
    for (const k of ["flippa", "acquire", "gazette", "companies_house", "pacer", "wipo"]) {
      expect(ids).toContain(k);
    }
  });
});