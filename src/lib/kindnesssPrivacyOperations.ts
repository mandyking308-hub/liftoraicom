/* eslint-disable @typescript-eslint/no-explicit-any -- candidate privacy tables intentionally have no generated live types. */
import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase as any;

export const KINDNESSS_PRIVACY_BUSINESS_ID = "640de582-a112-4d16-a221-03c27f00c6ec";
export const PRIVACY_OPERATOR_STATUSES = [
  "unacknowledged",
  "acknowledged",
  "in_progress",
  "waiting_on_kindnesss",
  "blocked",
] as const;

export type PrivacyOperatorStatus = typeof PRIVACY_OPERATOR_STATUSES[number];
export type PrivacyOperationsAvailability = "available" | "not_configured" | "unavailable";
export type PrivacyDueState = "overdue" | "due_soon" | "scheduled" | "authoritatively_resolved" | "unverified";

export interface PrivacyDeliveryRecord {
  id: string;
  business_id: string;
  event_id: string;
  request_ref: string;
  kind: "new_request" | "overdue";
  request_type: string;
  due_at: string;
  received_at: string;
  privacy_request_id: string;
}

export interface PrivacyOperationRecord {
  privacy_request_id: string;
  business_id: string;
  owner_user_id: string | null;
  operational_status: PrivacyOperatorStatus;
  operator_acknowledged_at: string | null;
  operator_acknowledged_by: string | null;
  due_at: string;
  last_delivery_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface PrivacyRequestAuthorityRecord {
  id: string;
  request_status: string;
  completed_at: string | null;
}

export interface PrivacyOperationCase {
  privacyRequestId: string;
  businessId: string;
  requestRef: string;
  requestType: string;
  dueAt: string;
  lastDeliveryAt: string;
  deliveryCount: number;
  latestDeliveryKind: "new_request" | "overdue";
  deliveryAcknowledged: true;
  operatorStatus: PrivacyOperatorStatus;
  ownerUserId: string | null;
  operatorAcknowledgedAt: string | null;
  operationsUpdatedAt: string;
  canonicalStatus: string;
  canonicalCompletedAt: string | null;
}

export interface PrivacyOperationsSnapshot {
  availability: PrivacyOperationsAvailability;
  cases: PrivacyOperationCase[];
  detail: string;
}

export interface SavePrivacyOperationInput {
  privacyRequestId: string;
  ownerUserId: string;
  operationalStatus: PrivacyOperatorStatus;
  expectedUpdatedAt: string;
}

export function assertPrivacyOperatorStatus(value: string): asserts value is PrivacyOperatorStatus {
  if (!(PRIVACY_OPERATOR_STATUSES as readonly string[]).includes(value)) {
    throw new Error("kindnesss_authoritative_action_required");
  }
}

/** Visual due state only: no cron, notification, email or Kindnesss status mutation. */
export function privacyDueState(dueAt: string, canonicalStatus: string, now = new Date()): PrivacyDueState {
  if (["completed", "closed", "rejected"].includes(canonicalStatus)) return "authoritatively_resolved";
  const dueMs = Date.parse(dueAt);
  const nowMs = now.getTime();
  if (!Number.isFinite(dueMs) || !Number.isFinite(nowMs)) return "unverified";
  if (dueMs < nowMs) return "overdue";
  if (dueMs - nowMs <= 72 * 60 * 60 * 1000) return "due_soon";
  return "scheduled";
}

export function buildPrivacyOperationCases(
  deliveries: readonly PrivacyDeliveryRecord[],
  operations: readonly PrivacyOperationRecord[],
  requests: readonly PrivacyRequestAuthorityRecord[],
): PrivacyOperationCase[] {
  const operationsByCase = new Map(operations.map((item) => [item.privacy_request_id, item]));
  const requestsByCase = new Map(requests.map((item) => [item.id, item]));
  const grouped = new Map<string, PrivacyDeliveryRecord[]>();
  for (const delivery of deliveries) {
    grouped.set(delivery.privacy_request_id, [...(grouped.get(delivery.privacy_request_id) ?? []), delivery]);
  }

  return [...grouped.entries()].map(([privacyRequestId, caseDeliveries]) => {
    const ordered = [...caseDeliveries].sort((a, b) => Date.parse(b.received_at) - Date.parse(a.received_at));
    const latest = ordered[0];
    const operation = operationsByCase.get(privacyRequestId);
    if (!operation) throw new Error("privacy_operation_projection_incomplete");
    const request = requestsByCase.get(privacyRequestId);
    return {
      privacyRequestId,
      businessId: latest.business_id,
      requestRef: latest.request_ref,
      requestType: latest.request_type,
      dueAt: operation.due_at,
      lastDeliveryAt: operation.last_delivery_at,
      deliveryCount: ordered.length,
      latestDeliveryKind: latest.kind,
      deliveryAcknowledged: true as const,
      operatorStatus: operation.operational_status,
      ownerUserId: operation.owner_user_id,
      operatorAcknowledgedAt: operation.operator_acknowledged_at,
      operationsUpdatedAt: operation.updated_at,
      canonicalStatus: request?.request_status ?? "unverified",
      canonicalCompletedAt: request?.completed_at ?? null,
    };
  }).sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
}

/** Reads only the dedicated privacy candidate tables and existing founder privacy cases. */
export async function loadKindnesssPrivacyOperations(): Promise<PrivacyOperationsSnapshot> {
  const [deliveries, operations, requests] = await Promise.all([
    sb.from("kindnesss_privacy_notification_deliveries")
      .select("id,business_id,event_id,request_ref,kind,request_type,due_at,received_at,privacy_request_id")
      .eq("business_id", KINDNESSS_PRIVACY_BUSINESS_ID)
      .order("received_at", { ascending: false })
      .limit(500),
    sb.from("kindnesss_privacy_case_operations")
      .select("privacy_request_id,business_id,owner_user_id,operational_status,operator_acknowledged_at,operator_acknowledged_by,due_at,last_delivery_at,updated_at,updated_by")
      .eq("business_id", KINDNESSS_PRIVACY_BUSINESS_ID)
      .limit(500),
    sb.from("data_privacy_requests")
      .select("id,request_status,completed_at")
      .eq("business_id", KINDNESSS_PRIVACY_BUSINESS_ID)
      .eq("request_source", "kindnesss_privacy_metadata")
      .limit(500),
  ]);

  if (deliveries.error || operations.error || requests.error) {
    return {
      availability: "unavailable",
      cases: [],
      detail: "Not activated: the separate privacy schema or founder read access is unavailable. Delivery and case counts are unverified; no zero is inferred.",
    };
  }

  let cases: PrivacyOperationCase[];
  try {
    cases = buildPrivacyOperationCases(
      (deliveries.data ?? []) as PrivacyDeliveryRecord[],
      (operations.data ?? []) as PrivacyOperationRecord[],
      (requests.data ?? []) as PrivacyRequestAuthorityRecord[],
    );
  } catch {
    return {
      availability: "unavailable",
      cases: [],
      detail: "Not activated: privacy delivery and operator records are inconsistent. Counts are unverified and no operator state is inferred.",
    };
  }
  return {
    availability: cases.length ? "available" : "not_configured",
    cases,
    detail: cases.length
      ? "Durable delivery references are available. Operator triage is internal to Liftor; Kindnesss remains authoritative for identity verification, approval and closure."
      : "Not configured: no durable Kindnesss privacy deliveries are recorded. This is not proof that no privacy requests exist.",
  };
}

/** Explicit founder/admin triage only. There are no approval, identity-verification or closure parameters. */
export async function saveKindnesssPrivacyOperation(input: SavePrivacyOperationInput): Promise<void> {
  assertPrivacyOperatorStatus(input.operationalStatus);
  if (!input.privacyRequestId || !input.ownerUserId || !input.expectedUpdatedAt) {
    throw new Error("privacy_review_context_required");
  }
  const { error } = await sb.rpc("review_kindnesss_privacy_case_operations", {
    _privacy_request_id: input.privacyRequestId,
    _owner_user_id: input.ownerUserId,
    _operational_status: input.operationalStatus,
    _expected_updated_at: input.expectedUpdatedAt,
  });
  if (error) throw new Error("privacy_triage_not_saved");
}
