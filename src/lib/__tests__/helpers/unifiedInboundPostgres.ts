import type { TestPool as Pool } from "./postgresTestPool";
import type {
  AuthenticatedInboundEvent,
  ClaimResult,
  RoutingContext,
  UnifiedInboundStore,
  UnifiedReceiptStatus,
} from "../../../../supabase/functions/_shared/unifiedInboundFanIn";

async function serviceQuery<T>(pool: Pool, text: string, values: unknown[] = []): Promise<T[]> {
  const client = await pool.connect();
  try {
    await client.query("set role service_role");
    const result = await client.query(text, values);
    return result.rows as T[];
  } finally {
    await client.query("reset role").catch(() => {});
    client.release();
  }
}

/** Test adapter calls the same real RPCs as the production Supabase store. */
export function createPostgresUnifiedInboundStore(pool: Pool): UnifiedInboundStore {
  return {
    async claim(receipt): Promise<ClaimResult> {
      const result = await serviceQuery<Record<string, unknown>>(pool,
        `select * from public.claim_unified_inbound_receipt(
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
        )`, [
          receipt.source, receipt.sourceEventId, receipt.idempotencyKey, receipt.authenticatedBusinessId,
          receipt.eventKind, receipt.occurredAt, receipt.contentReference, receipt.contactId,
          receipt.sourceMailboxId, receipt.originalSenderMailbox, 30, 6,
        ]);
      const row = result[0];
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
      await serviceQuery(pool, "select public.finalise_unified_inbound_receipt($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [
        receiptId, update.leaseToken, update.status, update.businessId, update.routeEvidence,
        update.threadKey, update.originalSenderMailbox, update.quarantineReason,
        update.nextAttemptAt, update.errorCode,
      ]);
    },
  };
}

/** PostgreSQL equivalent of the production deterministic routing queries. */
export async function loadPostgresRoutingContext(pool: Pool, event: AuthenticatedInboundEvent): Promise<RoutingContext> {
  const campaigns = await serviceQuery<Record<string, unknown>>(pool,
    `select provider_connection_id, provider_campaign_id, business_id, mapping_status, is_active
     from public.outbound_provider_campaign_mappings
     where business_id = $1 and provider_type = 'smartlead'`, [event.authenticatedBusinessId]);
  const allocations = await serviceQuery<Record<string, unknown>>(pool,
    `select mailbox_id, business_id, allocation_status, thread_sticky
     from public.gsm_mailbox_allocations
     where business_id = $1 and allocation_status = 'active' and thread_sticky = true`, [event.authenticatedBusinessId]);
  const mailboxIds = allocations.map((row) => String(row.mailbox_id));
  const mailboxes = mailboxIds.length
    ? await serviceQuery<Record<string, unknown>>(pool,
      `select id, email, provider_mailbox_id, smartlead_email_account_id, estate_classification, active, retired
       from public.gsm_mailboxes where id = any($1::uuid[])`, [mailboxIds])
    : [];
  const allocationByMailbox = new Map(allocations.map((row) => [String(row.mailbox_id), row]));
  return {
    mailboxes: mailboxes.flatMap((mailbox) => {
      const allocation = allocationByMailbox.get(String(mailbox.id));
      const providerId = mailbox.smartlead_email_account_id ?? mailbox.provider_mailbox_id;
      if (!allocation || typeof providerId !== "string" || !providerId) return [];
      return [{
        mailboxId: providerId,
        mailboxAddress: String(mailbox.email),
        businessId: String(allocation.business_id),
        estate: mailbox.estate_classification === "ghat" ? "ghat" as const : "gsm" as const,
        active: mailbox.active === true && mailbox.retired === false,
        verified: allocation.allocation_status === "active" && allocation.thread_sticky === true,
      }];
    }),
    campaigns: campaigns.map((mapping) => ({
      connectionId: String(mapping.provider_connection_id),
      campaignId: String(mapping.provider_campaign_id),
      businessId: String(mapping.business_id),
      active: mapping.is_active === true,
      verified: mapping.mapping_status === "mapped",
    })),
    aliases: [],
    forms: event.source === "kindnesss_commercial" ? [{
      source: "kindnesss_commercial",
      siteId: "kindnesss",
      businessId: event.authenticatedBusinessId,
      verified: true,
    }] : [],
  };
}
