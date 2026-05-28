import { describe, it, expect } from "vitest";
import {
  computeTotalScore, parseCsv, sanitizeExtraction,
  ALLOWED_EXTRACTION_FIELDS, FORBIDDEN_EXTRACTION_FIELDS, CAPITAL_EFFICIENCY_QUESTIONS,
  validateBuildPack, BUILD_PACK_REQUIRED_ITEMS,
  buildProductionPromptQueue, computePromptQueueReadiness, isLiveModeUnlocked,
} from "../fundingRadarEngine";

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

  it("validateBuildPack flags every requirement missing when pack is null", () => {
    const r = validateBuildPack(null);
    expect(r.totalCount).toBe(BUILD_PACK_REQUIRED_ITEMS.length);
    expect(r.presentCount).toBe(0);
    expect(r.status).not.toBe("READY_FOR_PROMPT_QUEUE");
    expect(r.missingKeys.length).toBe(BUILD_PACK_REQUIRED_ITEMS.length);
  });

  it("validateBuildPack reports READY only when all 23 items present", () => {
    const fullPack: any = {
      candidate: { name: "X", id: "x" },
      thesis: {
        problem_thesis: "thesis",
        paying_customer_profile: "ICP",
        legally_distinct_product_concept: "distinct",
        first_offer: "offer",
      },
      build_plan: {
        mvp_feature_list: ["a"],
        landing_page_structure: ["hero"],
        crm_pipeline_stages: ["lead"],
        onboarding_steps: ["welcome"],
        support_flow: ["intake"],
      },
      database_schema_needs: ["customers"],
      governance: { kpis: ["MRR"], approval_gates: ["build"], kill_continue_criteria: ["criteria"], compliance_pages: ["Terms"] },
      schedule: { first_30_day_execution_plan: ["d1"], first_90_day_operating_plan: ["d90"] },
      human_oversight_requirements: ["founder review"],
      ai_operator_requirements: ["agent registry"],
      command_centre_panel_requirements: ["MRR tile"],
      pricing_hypothesis: "$199/mo",
      compliance_legal_checklist: ["Terms"],
      customer_problem_thesis: "thesis",
      willingness_to_pay_evidence: "WTP",
      connections: { launch_factory: "/x", business_templates: "/y", portfolio_commander: "/z", command_centre: "/c" },
    };
    const r = validateBuildPack(fullPack);
    expect(r.status).toBe("READY_FOR_PROMPT_QUEUE");
    expect(r.presentCount).toBe(BUILD_PACK_REQUIRED_ITEMS.length);
  });

  it("prompt queue produces 14 ordered stages with the QA + live-mode gates", () => {
    const q = buildProductionPromptQueue(null);
    expect(q.length).toBe(14);
    expect(q.map((x) => x.order)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
    expect(q.find((x) => x.is_qa_gate)?.key).toBe("qa_smoke_test");
    expect(q.find((x) => x.is_live_mode_gate)?.key).toBe("founder_approval_live_mode");
  });

  it("queue blocks later stages when validation is not READY", () => {
    const q = buildProductionPromptQueue(null);
    const validation = validateBuildPack(null);
    const r = computePromptQueueReadiness(q, validation, {});
    // Every stage is blocked while validation fails
    expect(r.every((row) => row.readiness === "BLOCKED_BY_DEPS")).toBe(true);
    expect(isLiveModeUnlocked(q, {})).toBe(false);
  });

  it("queue advances to READY when validation passes and dependencies are completed", () => {
    const q = buildProductionPromptQueue(null);
    const validation = { ...validateBuildPack(null), status: "READY_FOR_PROMPT_QUEUE" as const, missingKeys: [], blockers: [] };
    const state = { product_foundation: { completed_at: new Date().toISOString(), notes: "", founder_approved: false } } as any;
    const r = computePromptQueueReadiness(q, validation, state);
    expect(r[0].readiness).toBe("DONE");
    expect(r[1].readiness).toBe("READY"); // database_schema depends only on product_foundation
  });
});