import type { TestPool } from "./postgresTestPool";
import type { PrivacyNotificationEvent } from "../../../../supabase/functions/_shared/kindnesssPrivacyHandoff";
import type { PrivacyNotificationStore, PrivacyReceipt } from "../../../../supabase/functions/_shared/kindnesssPrivacyReceiver";

async function serviceQuery(pool: TestPool, text: string, values: unknown[] = []) {
  const client = await pool.connect();
  try {
    await client.query("set role service_role");
    return (await client.query(text, values)).rows;
  } finally {
    await client.query("reset role").catch(() => {});
    client.release();
  }
}

/** Test adapter invokes the same atomic RPC as the production Supabase store. */
export function createPostgresPrivacyStore(pool: TestPool): PrivacyNotificationStore {
  return {
    async receive(event: PrivacyNotificationEvent): Promise<PrivacyReceipt> {
      const rows = await serviceQuery(pool,
        `select * from public.receive_kindnesss_privacy_notification(
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
        )`, [
          event.source, event.business_id, event.event_id, event.schema_version, event.event_type,
          event.occurred_at, event.kind, event.request_ref, event.request_type, event.due_at,
        ]);
      const row = rows[0];
      if (!row) throw new Error("privacy_notification_store_empty");
      return {
        deliveryId: String(row.delivery_id),
        privacyRequestId: String(row.privacy_request_id),
        duplicate: row.duplicate === true,
      };
    },
  };
}
