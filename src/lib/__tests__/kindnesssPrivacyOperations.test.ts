import { describe, expect, it } from "vitest";
import {
  assertPrivacyOperatorStatus,
  buildPrivacyOperationCases,
  privacyDueState,
  type PrivacyDeliveryRecord,
  type PrivacyOperationRecord,
} from "../kindnesssPrivacyOperations";

const CASE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REQUEST_REF = "11111111-2222-4333-8444-555555555555";
const BUSINESS_ID = "640de582-a112-4d16-a221-03c27f00c6ec";

function delivery(overrides: Partial<PrivacyDeliveryRecord> = {}): PrivacyDeliveryRecord {
  return {
    id: "delivery-1",
    business_id: BUSINESS_ID,
    event_id: "event-1",
    request_ref: REQUEST_REF,
    kind: "new_request",
    request_type: "deletion",
    due_at: "2026-11-18T12:00:00.000Z",
    received_at: "2026-11-16T10:00:00.000Z",
    privacy_request_id: CASE_ID,
    ...overrides,
  };
}

const operation: PrivacyOperationRecord = {
  privacy_request_id: CASE_ID,
  business_id: BUSINESS_ID,
  owner_user_id: null,
  operational_status: "unacknowledged",
  operator_acknowledged_at: null,
  operator_acknowledged_by: null,
  due_at: "2026-11-18T12:00:00.000Z",
  last_delivery_at: "2026-11-16T10:00:00.000Z",
  updated_at: "2026-11-16T10:00:00.000Z",
  updated_by: null,
};

describe("Kindnesss privacy operations projection", () => {
  it("groups independent delivery IDs under one opaque case without requester or child data", () => {
    const [result] = buildPrivacyOperationCases([
      delivery(),
      delivery({ id: "delivery-2", event_id: "event-2", kind: "overdue", received_at: "2026-11-17T10:00:00.000Z" }),
    ], [operation], [{ id: CASE_ID, request_status: "received", completed_at: null }]);
    expect(result).toMatchObject({
      privacyRequestId: CASE_ID,
      requestRef: REQUEST_REF,
      deliveryCount: 2,
      latestDeliveryKind: "overdue",
      deliveryAcknowledged: true,
      operatorStatus: "unacknowledged",
      canonicalStatus: "received",
    });
    expect(result).not.toHaveProperty("requester");
    expect(result).not.toHaveProperty("child");
    expect(result).not.toHaveProperty("notes");
  });

  it("fails closed instead of inventing an operator state when its projection is missing", () => {
    expect(() => buildPrivacyOperationCases([delivery()], [], [])).toThrow("privacy_operation_projection_incomplete");
  });

  it("derives visual due alerts without treating delivery as case resolution", () => {
    const now = new Date("2026-11-16T12:00:00.000Z");
    expect(privacyDueState("2026-11-16T11:59:59.000Z", "received", now)).toBe("overdue");
    expect(privacyDueState("2026-11-18T12:00:00.000Z", "received", now)).toBe("due_soon");
    expect(privacyDueState("2026-12-16T12:00:00.000Z", "received", now)).toBe("scheduled");
    expect(privacyDueState("invalid", "received", now)).toBe("unverified");
    expect(privacyDueState("2026-11-16T11:59:59.000Z", "completed", now)).toBe("authoritatively_resolved");
  });

  it("allows internal triage only and rejects canonical closure or approval actions", () => {
    expect(() => assertPrivacyOperatorStatus("acknowledged")).not.toThrow();
    expect(() => assertPrivacyOperatorStatus("waiting_on_kindnesss")).not.toThrow();
    for (const forbidden of ["closed", "completed", "approved", "identity_verified", "rejected"]) {
      expect(() => assertPrivacyOperatorStatus(forbidden)).toThrow("kindnesss_authoritative_action_required");
    }
  });
});
