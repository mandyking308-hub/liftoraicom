import { describe, it, expect } from "vitest";
import { compute, computeAlertsDue, deriveStage, summarisePortfolio, type PortfolioExitTarget, type Settings } from "../portfolioExitTargetEngine";

const settings: Settings = { id: "s", gbp_usd_rate: 1.27, default_target_arr_usd: 5_000_000, default_target_arr_gbp: 5_000_000, notes: null, updated_at: "" };

function mk(o: Partial<PortfolioExitTarget> = {}): PortfolioExitTarget {
  return {
    id: "t1", business_id: null, business_name: "X", business_status: "live",
    revenue_model: "recurring_subscription", monthly_price_per_customer: 1500, current_active_customers: 0,
    target_arr_usd: null, target_arr_gbp: null, gross_margin_percent: 70,
    monthly_ai_cost: 0, monthly_human_delivery_cost: 0, monthly_other_operating_cost: 0,
    churn_percent: 2, customer_acquisition_cost: 1000,
    founder_dependency_score: 30, ai_operated_score: 70, repeatability_score: 60, compliance_readiness_score: 60,
    evidence_pack_status: "partial", buyer_fit_category: "PE", likely_exit_route: "strategic_sale",
    exit_stage: "activated", next_action: null, founder_approved: false, founder_override_notes: null,
    created_at: "", updated_at: "", ...o,
  };
}

describe("portfolioExitTargetEngine", () => {
  it("computes MRR/ARR", () => {
    const c = compute(mk({ current_active_customers: 10 }), settings);
    expect(c.mrr).toBe(15_000);
    expect(c.arr).toBe(180_000);
  });
  it("approx 278 customers needed for £5m at £1500/m", () => {
    const c = compute(mk(), settings);
    expect(c.customers_needed_gbp).toBe(278);
  });
  it("alerts cumulative at milestones", () => {
    const al = computeAlertsDue(50, 0, 5_000_000, 5_000_000);
    expect(al.map(a => a.code)).toEqual(["customers_10", "customers_25", "customers_50"]);
  });
  it("75% ARR alert fires before full $5m", () => {
    const al = computeAlertsDue(0, 3_800_000, 5_000_000, 5_000_000);
    expect(al.find(a => a.code === "arr_75pct_usd")).toBeTruthy();
    expect(al.find(a => a.code === "arr_5m_usd")).toBeFalsy();
  });
  it("derives stage by customers and ARR", () => {
    expect(deriveStage(0, 0, 5e6, 5e6, 1.27, "built")).toBe("built_no_revenue");
    expect(deriveStage(60, 0, 5e6, 5e6, 1.27, "live")).toBe("operating_proof_50");
    expect(deriveStage(0, 5_100_000, 5e6, 5e6, 1.27, "live")).toBe("strong_threshold_5m_gbp");
  });
  it("revenue alone is not sale-readiness", () => {
    const heavy = compute(mk({ current_active_customers: 300, gross_margin_percent: 70, founder_dependency_score: 95, ai_operated_score: 5, repeatability_score: 10, compliance_readiness_score: 10, evidence_pack_status: "missing" }), settings);
    const balanced = compute(mk({ current_active_customers: 50, gross_margin_percent: 80, founder_dependency_score: 10, ai_operated_score: 90, repeatability_score: 90, compliance_readiness_score: 90, evidence_pack_status: "verified" }), settings);
    expect(balanced.sale_readiness_score).toBeGreaterThan(heavy.sale_readiness_score);
  });
  it("portfolio summary aggregates", () => {
    const s = summarisePortfolio([mk({ id: "a", current_active_customers: 50 }), mk({ id: "b", current_active_customers: 0 })], settings);
    expect(s.total).toBe(2);
    expect(s.revenue_generating).toBe(1);
    expect(s.total_mrr).toBe(75_000);
  });
});