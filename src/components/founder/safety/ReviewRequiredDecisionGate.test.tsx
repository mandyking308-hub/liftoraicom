import { describe, expect, it } from "vitest";
import {
  CONFIRMATION_TEXT,
  getDecisionApplyReadiness,
  type DecisionOption,
} from "./ReviewRequiredDecisionGate";

const eligibleQueueIds = [
  "77a84330-a066-4a28-983f-e42adf295936",
  "2771e102-7d76-4ab3-bb16-29d8769d7b02",
  "0fe97fb4-1947-40d8-b983-9bfa419a21f7",
  "11d3c5bf-31d3-414d-9093-bcba5c78a618",
  "0c46352b-cf98-4bbb-98b6-a24a6aa97f64",
  "0d14b45e-2142-4db4-b66d-aab530c03cf2",
  "baec3a1a-3430-4172-940e-d99843abea3e",
];

const previewResult = {
  ok: true,
  selected_queue_ids: eligibleQueueIds,
  counters: {
    emails_sent: 0,
    smtp_calls: 0,
    apollo_calls: 0,
    contacts_changed_if_applied: 0,
    bcrs_changed_if_applied: 0,
    compliance_records_changed_if_applied: 0,
    valid_future_step_blocked_rows_touched: 0,
  },
};

describe("getDecisionApplyReadiness", () => {
  it("returns canApply=true for the exact all-green scenario", () => {
    const decisions: Record<string, DecisionOption> = Object.fromEntries(
      eligibleQueueIds.map((id) => [id, "recommend_park_followup"]),
    );

    const readiness = getDecisionApplyReadiness({
      acknowledgementChecked: true,
      confirmationValue: CONFIRMATION_TEXT,
      decisions,
      forbiddenSelectedIds: [],
      founderAuthenticated: true,
      previewMatchesSelection: true,
      previewResult,
      selectedIds: eligibleQueueIds,
    });

    expect(readiness.confirmationExact).toBe(true);
    expect(readiness.canApply).toBe(true);
    expect(readiness.disabledReasons).toEqual([]);
  });

  it("fails with confirmation mismatch when the phrase differs", () => {
    const decisions: Record<string, DecisionOption> = Object.fromEntries(
      eligibleQueueIds.map((id) => [id, "recommend_park_followup"]),
    );

    const readiness = getDecisionApplyReadiness({
      acknowledgementChecked: true,
      confirmationValue: "I understand this parks selected follow-ups",
      decisions,
      forbiddenSelectedIds: [],
      founderAuthenticated: true,
      previewMatchesSelection: true,
      previewResult,
      selectedIds: eligibleQueueIds,
    });

    expect(readiness.confirmationExact).toBe(false);
    expect(readiness.canApply).toBe(false);
    expect(readiness.disabledReasons).toContain("Confirmation text does not match exactly.");
  });
});