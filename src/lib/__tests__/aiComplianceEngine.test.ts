import { describe, it, expect } from "vitest";
import { classifyRisk, synthesizeGaps, type AIComplianceSystem } from "@/lib/aiComplianceEngine";
import type { ComplianceProfile, ApprovalTrigger } from "@/lib/businessComplianceEngine";

const baseSystem = (over: Partial<AIComplianceSystem> = {}): AIComplianceSystem => ({
  id: over.id ?? "s1",
  business_id: over.business_id ?? "b1",
  system_name: over.system_name ?? "Test agent",
  system_type: over.system_type ?? "agent",
  owner_role: null, provider: null, purpose: null,
  internal_or_external: over.internal_or_external ?? "internal",
  autonomy_level: over.autonomy_level ?? "recommend_only",
  uses_personal_data: false, uses_sensitive_data: false,
  handles_children_data: false, handles_health_data: false,
  handles_financial_data: false, handles_legal_data: false,
  external_action_capable: false,
  current_status: "under_review", risk_level: "low",
  founder_confirmed: true,
  last_reviewed_at: null,
  next_review_due_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...over,
});

describe("classifyRisk", () => {
  it("returns low for a tame internal recommender", () => {
    const r = classifyRisk(baseSystem(), { hasDataFlow: true, hasOversight: true });
    expect(r.level).toBe("low");
    expect(r.score).toBeLessThan(3);
  });

  it("escalates to critical for autonomous external action with sensitive data", () => {
    const r = classifyRisk(baseSystem({
      autonomy_level: "external_action_capable",
      external_action_capable: true,
      uses_sensitive_data: true,
      handles_health_data: true,
      uses_personal_data: true,
      purpose: "publishes pricing changes for finance product",
    }), { hasDataFlow: false, hasOversight: false });
    expect(r.level).toBe("critical");
    expect(r.reasons.length).toBeGreaterThan(5);
  });

  it("flags overdue review", () => {
    const r = classifyRisk(baseSystem({ next_review_due_at: new Date(Date.now() - 86400000).toISOString() }));
    expect(r.reasons.some(x => /overdue/i.test(x))).toBe(true);
  });

  it("marks medium when only personal data + external surface", () => {
    const r = classifyRisk(baseSystem({
      uses_personal_data: true,
      internal_or_external: "external",
    }));
    expect(["medium", "high"]).toContain(r.level);
  });
});

describe("synthesizeGaps", () => {
  const profile: ComplianceProfile = {
    id: "p1", business_id: "b1",
    compliance_risk_level: "critical",
    regulated_activity_possible: true,
    handles_children_data: false, handles_health_data: true,
    handles_financial_data: false, handles_legal_sensitive_data: false,
    marketplace_liability: false, requires_disclaimers: true,
    founder_confirmed: true, notes: null,
  };

  it("emits a gap when a critical business has no inventoried systems", () => {
    const gaps = synthesizeGaps({ profiles: [profile], systems: [], flows: [], oversight: [], triggers: [] });
    expect(gaps.some(g => /No AI systems inventoried/i.test(g.gap_title))).toBe(true);
  });

  it("flags external-action system without approval triggers as critical", () => {
    const sys = baseSystem({ external_action_capable: true, business_id: "b1" });
    const gaps = synthesizeGaps({ profiles: [profile], systems: [sys], flows: [], oversight: [], triggers: [] });
    expect(gaps.some(g => g.severity === "critical" && /External-action capable/i.test(g.gap_title))).toBe(true);
  });

  it("does not double-flag if data flow & oversight exist", () => {
    const sys = baseSystem({ uses_personal_data: true, founder_confirmed: true });
    const trig: ApprovalTrigger = {
      id: "t1", business_id: "b1",
      trigger_name: "Some trigger", trigger_condition: "x",
      action_required: "founder_approval", active: true,
    };
    const gaps = synthesizeGaps({
      profiles: [profile], systems: [sys],
      flows: [{ id: "f1", business_id: "b1", system_id: sys.id, source_system: "a", destination_system: "b",
        data_categories: [], personal_data: true, sensitive_data: false, children_data: false,
        lawful_basis: null, processor_or_controller_note: null, retention_period: null,
        storage_location: null, cross_border_transfer: false, transfer_jurisdiction: null,
        security_controls: null, founder_confirmed: true, review_status: "reviewed",
        created_at: "", updated_at: "" }],
      oversight: [{ id: "o1", business_id: "b1", system_id: sys.id,
        oversight_type: "founder_approval", trigger_source: null, trigger_reason: null,
        proposed_ai_action: null, human_decision: "approved", decided_by: null,
        decision_notes: null, external_action_blocked: false, evidence_url: null,
        created_at: "" }],
      triggers: [trig],
    });
    expect(gaps.find(g => /Missing data-flow record/i.test(g.gap_title))).toBeUndefined();
    expect(gaps.find(g => /No oversight events/i.test(g.gap_title))).toBeUndefined();
  });
});