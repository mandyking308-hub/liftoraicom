import { describe, it, expect, beforeEach } from "vitest";
import {
  applyFilters, computeMetrics, reserveDecision, releaseDecision,
  type ApprovalRow, type EscalationRow,
} from "@/lib/approvalOpsEngine";

const now = new Date();
const ago = (mins: number) => new Date(now.getTime() - mins * 60_000).toISOString();
const today = (() => { const d = new Date(); d.setHours(8, 0, 0, 0); return d.toISOString(); })();

const mk = (over: Partial<ApprovalRow>): ApprovalRow => ({
  id: over.id ?? "r1",
  business_id: over.business_id ?? "b1",
  approval_type: over.approval_type ?? "outbound_send",
  agent_key: over.agent_key ?? "outbound",
  title: "x",
  summary: null,
  draft_subject: null,
  draft_body: null,
  priority_level: over.priority_level ?? "normal",
  risk_flags: [],
  compliance_flags: [],
  status: over.status ?? "pending",
  founder_decision: over.founder_decision ?? null,
  decided_at: over.decided_at ?? null,
  created_at: over.created_at ?? ago(60),
  source_system: null,
  ...over,
});

const rows: ApprovalRow[] = [
  mk({ id: "a1", priority_level: "urgent", status: "pending" }),
  mk({ id: "a2", priority_level: "high",   status: "pending", agent_key: "crm" }),
  mk({ id: "a3", priority_level: "normal", status: "blocked", business_id: "b2" }),
  mk({ id: "a4", priority_level: "normal", status: "pending", approval_type: "compliance" }),
  mk({ id: "a5", priority_level: "urgent", status: "approved", founder_decision: "approve", decided_at: today, created_at: ago(120) }),
];

const escalations: EscalationRow[] = [
  { id: "e1", business_id: "b1", source_module: "x", escalation_type: "y", severity: "high", escalation_status: "open", escalation_reason: null, created_at: ago(30), resolved_at: null },
];

describe("Approval Operations engine", () => {
  it("filters by status / severity / agent / type / business", () => {
    expect(applyFilters(rows, { status: "pending" }).map((r) => r.id).sort()).toEqual(["a1","a2","a4"]);
    expect(applyFilters(rows, { severity: "urgent" }).map((r) => r.id).sort()).toEqual(["a1","a5"]);
    expect(applyFilters(rows, { agent_key: "crm" }).map((r) => r.id)).toEqual(["a2"]);
    expect(applyFilters(rows, { approval_type: "compliance" }).map((r) => r.id)).toEqual(["a4"]);
    expect(applyFilters(rows, { business_id: "b2" }).map((r) => r.id)).toEqual(["a3"]);
  });

  it("computes metrics including weighted founder load and decision delay", () => {
    const m = computeMetrics(rows, escalations);
    expect(m.pending).toBe(3);
    expect(m.blocked).toBe(1);
    expect(m.approvals_today).toBe(1);
    expect(m.escalations_open).toBe(1);
    // urgent(1)*4 + high(1)*2 + normal(1)*1 + escal(1)*3 = 10
    expect(m.founder_load_score).toBe(10);
    expect(m.avg_decision_delay_minutes).toBeGreaterThanOrEqual(0);
  });

  it("caps founder load score at 100", () => {
    const heavy: ApprovalRow[] = Array.from({ length: 50 }, (_, i) => mk({ id: `u${i}`, priority_level: "urgent", status: "pending" }));
    expect(computeMetrics(heavy, []).founder_load_score).toBe(100);
  });

  it("prevents duplicate decision submission via reservation", () => {
    expect(reserveDecision("x", "approve")).toBe(true);
    expect(reserveDecision("x", "approve")).toBe(false);
    releaseDecision("x", "approve");
    expect(reserveDecision("x", "approve")).toBe(true);
    releaseDecision("x", "approve");
  });

  it("allows distinct decisions on the same item to coexist (race-safe per kind)", () => {
    expect(reserveDecision("y", "approve")).toBe(true);
    expect(reserveDecision("y", "reject")).toBe(true);
    releaseDecision("y", "approve");
    releaseDecision("y", "reject");
  });
});