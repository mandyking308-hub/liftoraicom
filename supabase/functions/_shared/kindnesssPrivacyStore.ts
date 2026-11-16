import type { PrivacyNotificationEvent } from "./kindnesssPrivacyHandoff.ts";
import type { PrivacyNotificationStore, PrivacyReceipt } from "./kindnesssPrivacyReceiver.ts";

interface RpcResponse {
  data: unknown;
  error: { message: string } | null;
}

/** Structural subset of the service-role Supabase client. */
export interface PrivacyRpcClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<RpcResponse>;
}

/** Production store backed by the reviewed, atomic privacy notification RPC. */
export function createKindnesssPrivacyStore(admin: PrivacyRpcClient): PrivacyNotificationStore {
  return {
    async receive(event: PrivacyNotificationEvent): Promise<PrivacyReceipt> {
      const { data, error } = await admin.rpc("receive_kindnesss_privacy_notification", {
        _source: event.source,
        _business_id: event.business_id,
        _event_id: event.event_id,
        _schema_version: event.schema_version,
        _event_type: event.event_type,
        _occurred_at: event.occurred_at,
        _kind: event.kind,
        _request_ref: event.request_ref,
        _request_type: event.request_type,
        _due_at: event.due_at,
      });
      if (error) throw new Error("privacy_notification_store_failed");
      const row = Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : undefined;
      if (!row) throw new Error("privacy_notification_store_empty");
      return {
        deliveryId: String(row.delivery_id),
        privacyRequestId: String(row.privacy_request_id),
        duplicate: row.duplicate === true,
      };
    },
  };
}
