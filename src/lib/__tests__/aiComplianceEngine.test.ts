import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  classifyRisk, synthesizeGaps, synthesizeGapsExtended,
  aggregateCommandCentre, MODULE_SCAN_REGISTRY, gapDedupKey,
  type AIComplianceSystem,
} from "@/lib/aiComplianceEngine";
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

  it("escalates to medium once personal data, external surface and missing data-flow combine", () => {
    const r = classifyRisk(baseSystem({
      uses_personal_data: true,
      internal_or_external: "external",
    }), { hasDataFlow: false, hasOversight: false });
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

describe("synthesizeGapsExtended", () => {
  it("dedupes identical gaps emitted by both base and extended logic", () => {
    const sys = baseSystem({ external_action_capable: true, business_id: "b1", founder_confirmed: false, risk_level: "critical" });
    const out = synthesizeGapsExtended({ profiles: [], systems: [sys], flows: [], oversight: [], evidence: [], triggers: [] });
    const keys = out.map(gapDedupKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("flags external-action capable systems without oversight evidence as critical", () => {
    const sys = baseSystem({ external_action_capable: true, business_id: "b1", risk_level: "critical" });
    const out = synthesizeGapsExtended({ profiles: [], systems: [sys], flows: [], oversight: [], evidence: [], triggers: [] });
    expect(out.some(g => g.severity === "critical" && /External-action/.test(g.gap_title))).toBe(true);
  });

  it("requires evidence for regulated-data systems", () => {
    const sys = baseSystem({ handles_health_data: true, uses_personal_data: true, business_id: "b1", risk_level: "high" });
    const out = synthesizeGapsExtended({ profiles: [], systems: [sys], flows: [], oversight: [], evidence: [], triggers: [] });
    expect(out.some(g => /regulated-data/i.test(g.gap_title) && g.severity === "critical")).toBe(true);
  });

  it("emits a top-level gap when no systems are inventoried", () => {
    const out = synthesizeGapsExtended({ profiles: [], systems: [], flows: [], oversight: [], evidence: [], triggers: [] });
    expect(out.some(g => /No AI systems inventoried/.test(g.gap_title) && g.source === "module_scan")).toBe(true);
  });
});

describe("aggregateCommandCentre", () => {
  it("returns 'blocked' when an external-action system has no oversight", () => {
    const sys = baseSystem({ external_action_capable: true, business_id: "b1", risk_level: "critical" });
    const r = aggregateCommandCentre({
      systems: [sys], flows: [], oversight: [], evidence: [], gaps: [], profiles: [], triggers: [],
    });
    expect(r.status).toBe("blocked");
    expect(r.blocking_reasons.length).toBeGreaterThan(0);
    expect(r.founder_decisions_required).toBeGreaterThan(0);
  });

  it("returns 'needs_review' when there are no systems inventoried", () => {
    const r = aggregateCommandCentre({ systems: [], flows: [], oversight: [], evidence: [], gaps: [], profiles: [], triggers: [] });
    expect(r.status).toBe("needs_review");
    expect(r.systems).toBe(0);
  });

  it("returns 'clear' when a benign system is fully covered", () => {
    const sys = baseSystem({
      external_action_capable: false, uses_personal_data: false, uses_sensitive_data: false,
      founder_confirmed: true, risk_level: "low",
      last_reviewed_at: new Date().toISOString(),
    });
    const r = aggregateCommandCentre({
      systems: [sys],
      flows: [{ id: "f1", business_id: "b1", system_id: sys.id, source_system: "x", destination_system: "y",
        data_categories: [], personal_data: false, sensitive_data: false, children_data: false,
        lawful_basis: null, processor_or_controller_note: null, retention_period: null,
        storage_location: null, cross_border_transfer: false, transfer_jurisdiction: null,
        security_controls: null, founder_confirmed: true, review_status: "approved",
        created_at: "", updated_at: "" }],
      oversight: [{ id: "o1", business_id: "b1", system_id: sys.id, oversight_type: "founder_approval",
        trigger_source: null, trigger_reason: null, proposed_ai_action: null, human_decision: "approved",
        decided_by: null, decision_notes: null, external_action_blocked: false, evidence_url: null,
        created_at: "" }],
      evidence: [
        { id: "e1", business_id: null, system_id: sys.id, evidence_type: "policy", title: "AI Usage Policy",
          summary: null, source_module: "policies", source_table: null, source_record_id: null,
          review_status: "current", owner: null, next_review_due_at: null, created_at: "", updated_at: "" },
        { id: "e2", business_id: null, system_id: sys.id, evidence_type: "incident_record", title: "Escalation plan",
          summary: null, source_module: "incidents", source_table: null, source_record_id: null,
          review_status: "current", owner: null, next_review_due_at: null, created_at: "", updated_at: "" },
        { id: "e3", business_id: null, system_id: sys.id, evidence_type: "approval_log", title: "Approvals",
          summary: null, source_module: "approval_gates", source_table: null, source_record_id: null,
          review_status: "current", owner: null, next_review_due_at: null, created_at: "", updated_at: "" },
      ],
      gaps: [], profiles: [], triggers: [],
    });
    expect(r.status).toBe("clear");
    expect(r.blocking_reasons.length).toBe(0);
    expect(r.founder_decisions_required).toBe(0);
  });
});

describe("MODULE_SCAN_REGISTRY", () => {
  it("uses stable unique keys", () => {
    const keys = MODULE_SCAN_REGISTRY.map(m => m.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("external-action capable seeds default to high or critical risk", () => {
    for (const m of MODULE_SCAN_REGISTRY.filter(s => s.external_action_capable)) {
      expect(["high", "critical"]).toContain(m.default_risk);
    }
  });

  it("scan inserts only founder_confirmed=false rows and is idempotent (no duplicates on second run)", async () => {
    // Use a fresh module instance with a mocked supabase client.
    vi.resetModules();
    const store: any[] = [];
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: {
        from: (_t: string) => ({
          select: () => ({ order: () => Promise.resolve({ data: [...store], error: null }) }),
          upsert: (row: any) => ({
            select: () => ({
              single: () => {
                if (row.id) {
                  const i = store.findIndex(r => r.id === row.id);
                  if (i >= 0) store[i] = { ...store[i], ...row };
                } else {
                  store.push({ ...row, id: `mock-${store.length + 1}` });
                }
                return Promise.resolve({ data: row, error: null });
              },
            }),
          }),
          insert: () => Promise.resolve({ data: null, error: null, count: 0 }),
          delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        }),
      },
    }));
    const mod = await import("@/lib/aiComplianceEngine");
    const r1 = await mod.scanInternalModules();
    expect(r1.inserted).toBeGreaterThan(0);
    expect(store.every((r: any) => r.founder_confirmed === false)).toBe(true);
    const sizeAfter1 = store.length;

    const r2 = await mod.scanInternalModules();
    expect(r2.inserted).toBe(0); // idempotent
    expect(store.length).toBe(sizeAfter1);

    vi.doUnmock("@/integrations/supabase/client");
    vi.resetModules();
  });
});