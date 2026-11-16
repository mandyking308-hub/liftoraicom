import {
  UNIFIED_INBOUND_LEASE_SECONDS,
  UNIFIED_INBOUND_MAX_ATTEMPTS,
  type ClaimResult,
  type UnifiedInboundStore,
  type UnifiedReceiptStatus,
} from "./unifiedInboundFanIn.ts";

interface RpcResponse {
  data: unknown;
  error: { message: string } | null;
}

/** Structural subset of the service-role Supabase client used by the real adapters. */
export interface UnifiedInboundRpcClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<RpcResponse>;
}

function rows(data: unknown): Record<string, unknown>[] {
  return Array.isArray(data) ? data as Record<string, unknown>[] : [];
}

/** Production durable store: every write goes through the reviewed atomic RPCs. */
export function createUnifiedInboundStore(admin: UnifiedInboundRpcClient): UnifiedInboundStore {
  return {
    async claim(receipt): Promise<ClaimResult> {
      const { data, error } = await admin.rpc("claim_unified_inbound_receipt", {
        _source: receipt.source,
        _source_event_id: receipt.sourceEventId,
        _idempotency_key: receipt.idempotencyKey,
        _authenticated_business_id: receipt.authenticatedBusinessId,
        _event_kind: receipt.eventKind,
        _occurred_at: receipt.occurredAt,
        _content_reference: receipt.contentReference,
        _contact_id: receipt.contactId,
        _source_mailbox_id: receipt.sourceMailboxId,
        _original_sender_mailbox: receipt.originalSenderMailbox,
        _lease_seconds: UNIFIED_INBOUND_LEASE_SECONDS,
        _max_attempts: UNIFIED_INBOUND_MAX_ATTEMPTS,
      });
      if (error) throw new Error("unified_inbound_claim_failed");
      const row = rows(data)[0];
      if (!row) return { state: "store_unavailable" };
      if (row.state === "claimed") {
        return {
          state: "claimed",
          receiptId: String(row.receipt_id),
          attempts: Number(row.attempts),
          leaseToken: String(row.lease_token),
        };
      }
      return {
        state: "duplicate",
        receiptId: String(row.receipt_id),
        status: String(row.receipt_status) as UnifiedReceiptStatus,
      };
    },

    async finalise(receiptId, update): Promise<void> {
      const { error } = await admin.rpc("finalise_unified_inbound_receipt", {
        _receipt_id: receiptId,
        _lease_token: update.leaseToken,
        _status: update.status,
        _business_id: update.businessId,
        _route_evidence: update.routeEvidence,
        _thread_key: update.threadKey,
        _original_sender_mailbox: update.originalSenderMailbox,
        _quarantine_reason: update.quarantineReason,
        _next_attempt_at: update.nextAttemptAt,
        _error_code: update.errorCode,
      });
      if (error) throw new Error("unified_inbound_finalise_failed");
    },
  };
}
