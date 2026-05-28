import { describe, it, expect } from "vitest";
import { computeTotalScore, parseCsv, sanitizeExtraction, ALLOWED_EXTRACTION_FIELDS, FORBIDDEN_EXTRACTION_FIELDS, CAPITAL_EFFICIENCY_QUESTIONS } from "../fundingRadarEngine";

describe("fundingRadarEngine", () => {
  it("computes weighted total score", () => {
    const score = computeTotalScore({
      capital_efficiency_advantage_score: 80,
      ai_automation_advantage_score: 90,
      recurring_revenue_score: 70,
      investor_validation_score: 60,
      global_expansion_score: 50,
    });
    // 80*.3 + 90*.25 + 70*.15 + 60*.15 + 50*.15 = 24+22.5+10.5+9+7.5 = 73.5 -> 74
    expect(score).toBe(74);
  });

  it("treats missing scores as zero", () => {
    expect(computeTotalScore({})).toBe(0);
  });

  it("parses simple csv with quoted values", () => {
    const csv = `company_name,sector,last_funding_amount_usd\n"Acme, Inc.",fintech,1000000\nBeta,health,500000`;
    const { headers, rows } = parseCsv(csv);
    expect(headers).toEqual(["company_name", "sector", "last_funding_amount_usd"]);
    expect(rows.length).toBe(2);
    expect(rows[0].company_name).toBe("Acme, Inc.");
    expect(rows[1].sector).toBe("health");
  });

  it("strips forbidden extraction fields", () => {
    const dirty = { problem_thesis: "ok", branding: "stolen", source_code: "naughty", customer_pain: "ok" };
    const clean = sanitizeExtraction(dirty);
    expect(clean.problem_thesis).toBe("ok");
    expect(clean.customer_pain).toBe("ok");
    expect((clean as any).branding).toBeUndefined();
    expect((clean as any).source_code).toBeUndefined();
  });

  it("declares full legal/IP allow + forbid lists", () => {
    expect(ALLOWED_EXTRACTION_FIELDS).toContain("problem_thesis");
    expect(ALLOWED_EXTRACTION_FIELDS).toContain("distinct_execution_route");
    expect(FORBIDDEN_EXTRACTION_FIELDS).toContain("customer_lists");
    expect(FORBIDDEN_EXTRACTION_FIELDS).toContain("scraped_restricted_data");
  });

  it("asks all required capital-efficiency questions", () => {
    const keys = CAPITAL_EFFICIENCY_QUESTIONS.map((q) => q.key);
    for (const k of [
      "staff_heavy","sales_heavy","onboarding_heavy","support_heavy",
      "compliance_heavy","delivery_manual","ai_can_collapse_cost","liftor_can_operate",
    ]) expect(keys).toContain(k);
  });
});