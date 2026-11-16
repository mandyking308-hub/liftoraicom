import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { TestPool as Pool, TestPoolClient as PoolClient } from "./helpers/postgresTestPool";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  buildEnquiryEvent,
  buildLiftorRequest,
  signLiftorRequest,
  LIFTOR_WIRE_KEYS,
  type LiftorWireEvent,
} from "./fixtures/kindnesss/liftor-outbound.server";
import { handleKindnesssUnifiedEnquiry } from "../../../supabase/functions/_shared/kindnesssUnifiedReceiver";
import { extractEvent } from "../../../supabase/functions/_shared/smartleadEventNormalizer";
import {
  processSmartleadUnifiedInboundEvent,
  type SmartleadUnifiedInput,
} from "../../../supabase/functions/_shared/unifiedInboundSmartleadAdapter";
import { createPostgresUnifiedInboundStore, loadPostgresRoutingContext } from "./helpers/unifiedInboundPostgres";

const DATABASE_URL = process.env.UNIFIED_INBOUND_TEST_DATABASE_URL;
const BUSINESS_A = "640de582-a112-4d16-a221-03c27f00c6ec";
const BUSINESS_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CONNECTION_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CONNECTION_B = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const SHARED_CONTACT = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const FOUNDER = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const TEAM_A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const TEAM_B = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const OUTSIDER = "cccccccc-3333-4333-8333-cccccccccccc";
const SECRET = "synthetic-kindnesss-signing-secret-32-bytes";
const NOW_MS = Date.now();

const pool = new Pool(DATABASE_URL);
const store = createPostgresUnifiedInboundStore(pool);

async function asUser<T>(role: "authenticated" | "anon", userId: string | null, run: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query(`set role ${role}`);
    if (userId) await client.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
    return await run(client);
  } finally {
    await client.query("reset role").catch(() => {});
    client.release();
  }
}

function enquiry(id = randomUUID()) {
  return {
    id,
    created_at: new Date(NOW_MS).toISOString(),
    enquiry_type: "school_pilot",
    organisation_name: "Synthetic School",
    contact_name: "Synthetic Ops Lead",
    work_email: "ops@school.example",
    country_region: "United Kingdom",
    role_title: "Operations",
    consent_contact: true,
  };
}

function senderRequest(event: LiftorWireEvent, nowMs = NOW_MS) {
  return buildLiftorRequest({
    enabled: true,
    url: "https://liftorai.com/functions/v1/kindnesss-enquiry-receiver",
    secret: SECRET,
  }, event, nowMs);
}

function receive(request: ReturnType<typeof senderRequest>, nowMs = NOW_MS, failRouting = false) {
  return handleKindnesssUnifiedEnquiry(request.body, {
    source: request.headers["X-Liftor-Source"],
    timestamp: request.headers["X-Liftor-Timestamp"],
    signature: request.headers["X-Liftor-Signature"],
  }, {
    enabledFlag: "true",
    fanInEnabledFlag: "true",
    secret: SECRET,
    store,
    now: () => new Date(nowMs),
    routingContext: failRouting
      ? async () => { throw new Error("synthetic routing outage"); }
      : (event) => loadPostgresRoutingContext(pool, event),
  });
}

function smartleadInput(index: number, businessId = BUSINESS_A, connectionId = CONNECTION_A): SmartleadUnifiedInput {
  const payload = {
    id: `event-${index}`,
    type: "email_reply_received",
    created_at: new Date(NOW_MS).toISOString(),
    email_account_id: `provider-${index}`,
    lead_id: `lead-${index}`,
    email_account: { email: `sender-${index}@gsm.example` },
  };
  return {
    connection: { id: connectionId, business_id: businessId },
    event: extractEvent(payload),
    payload,
    eventRowId: randomUUID(),
    idempotencyKey: `req:synthetic-${index}`,
    contactId: SHARED_CONTACT,
    receivedAt: new Date(NOW_MS).toISOString(),
  };
}

function processSmartlead(input: SmartleadUnifiedInput, nowMs = NOW_MS) {
  return processSmartleadUnifiedInboundEvent(input, {
    enabledFlag: "true",
    store,
    routingContext: (event) => loadPostgresRoutingContext(pool, event),
    now: () => new Date(nowMs),
  });
}

describe.skipIf(!DATABASE_URL).sequential("disposable PostgreSQL unified inbound integration", () => {
  beforeAll(async () => {
    await pool.query(readFileSync("src/lib/__tests__/fixtures/unifiedInboundMinimalSchema.sql", "utf8"));
    await pool.query(readFileSync("docs/candidates/unified-inbound-phase1-2026-11-16.sql", "utf8"));
  }, 60_000);

  beforeEach(async () => {
    await pool.query("truncate public.unified_inbound_receipts, public.unified_inbound_provider_acks, public.unified_inbound_team_members, public.founder_approval_items, public.communication_records, public.gsm_mailbox_allocations, public.gsm_mailboxes, public.outbound_provider_campaign_mappings, public.businesses, public.user_roles restart identity cascade");
    await pool.query("insert into public.businesses(id,name) values ($1,'Kindnesss active synthetic'),($2,'Second synthetic business')", [BUSINESS_A, BUSINESS_B]);
    await pool.query("insert into public.user_roles(user_id,role) values ($1,'founder')", [FOUNDER]);
    await pool.query("insert into public.unified_inbound_team_members(business_id,user_id) values ($1,$2),($3,$4)", [BUSINESS_A, TEAM_A, BUSINESS_B, TEAM_B]);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("delivers the actual Kindnesss sender bytes through the real receiver into a reference-only durable receipt", async () => {
    const event = buildEnquiryEvent(enquiry());
    const request = senderRequest(event);
    expect(Object.keys(event).sort()).toEqual([...LIFTOR_WIRE_KEYS].sort());
    expect(LIFTOR_WIRE_KEYS).toHaveLength(15);
    expect(new TextEncoder().encode(request.body).length).toBeGreaterThan(100);
    const response = await receive(request);
    expect(response).toMatchObject({ status: 202, body: { route: "routed", autoSend: false } });
    const { rows } = await pool.query("select * from public.unified_inbound_receipts");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      source: "kindnesss_commercial",
      source_event_id: event.event_id,
      authenticated_business_id: BUSINESS_A,
      business_id: BUSINESS_A,
      status: "processed",
      route_evidence: "signed_first_party_form",
      contact_id: null,
      original_sender_mailbox: null,
      content_reference: `kindnesss://commercial-enquiry/${event.enquiry_id}`,
    });
    expect(JSON.stringify(rows[0])).not.toContain("ops@school.example");
    expect(JSON.stringify(rows[0])).not.toContain("Synthetic Ops Lead");
  });

  it("collapses concurrent actual sender retries and rejects tampering, unknown tenants and stale timestamps without writes", async () => {
    const event = buildEnquiryEvent(enquiry());
    const request = senderRequest(event);
    const responses = await Promise.all(Array.from({ length: 12 }, () => receive(request)));
    expect(responses.filter((response) => response.status === 202)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 200)).toHaveLength(11);
    expect((await pool.query("select count(*)::int as count from public.unified_inbound_receipts")).rows[0].count).toBe(1);

    const tampered = await receive({ ...request, body: `${request.body} ` });
    const stale = await receive(request, NOW_MS + 301_000);
    const wrongTenantBody = JSON.stringify({ ...event, business_id: BUSINESS_B });
    const timestamp = String(Math.floor(NOW_MS / 1000));
    const wrongTenant = await receive({
      ...request,
      body: wrongTenantBody,
      headers: { ...request.headers, "X-Liftor-Signature": signLiftorRequest(SECRET, timestamp, wrongTenantBody) },
    });
    expect([tampered.status, stale.status, wrongTenant.status]).toEqual([401, 401, 403]);
    expect((await pool.query("select count(*)::int as count from public.unified_inbound_receipts")).rows[0].count).toBe(1);
  });

  it("persists a routing outage, reclaims the retry after its due time and converges on the same receipt", async () => {
    const event = buildEnquiryEvent(enquiry());
    const first = await receive(senderRequest(event), NOW_MS, true);
    expect(first).toMatchObject({ status: 503, body: { reason: "retry" } });
    const before = await pool.query("select status,attempts,lease_until,next_attempt_at from public.unified_inbound_receipts");
    expect(before.rows[0]).toMatchObject({ status: "retry", attempts: 1, lease_until: null });
    expect(before.rows[0].next_attempt_at).not.toBeNull();

    const early = await receive(senderRequest(event, NOW_MS + 1_000), NOW_MS + 1_000);
    expect(early).toMatchObject({ status: 503, body: { reason: "retry" } });
    await pool.query("update public.unified_inbound_receipts set next_attempt_at=now()-interval '1 second' where status='retry'");
    const recovered = await receive(senderRequest(event, NOW_MS + 31_000), NOW_MS + 31_000);
    expect(recovered).toMatchObject({ status: 202, body: { route: "routed" } });
    const after = await pool.query("select status,attempts from public.unified_inbound_receipts");
    expect(after.rows).toHaveLength(1);
    expect(after.rows[0]).toMatchObject({ status: "processed", attempts: 2 });
  });

  it("keeps identical provider event IDs and one canonical contact isolated across two businesses", async () => {
    for (const [index, business, connection] of [[1, BUSINESS_A, CONNECTION_A], [2, BUSINESS_B, CONNECTION_B]] as const) {
      await pool.query("insert into public.gsm_mailboxes(id,email,smartlead_email_account_id) values (gen_random_uuid(),$1,$2)", [`sender-${index}@gsm.example`, `provider-${index}`]);
      await pool.query("insert into public.gsm_mailbox_allocations(mailbox_id,pool_id,business_id) select id,gen_random_uuid(),$1 from public.gsm_mailboxes where smartlead_email_account_id=$2", [business, `provider-${index}`]);
    }
    const first = smartleadInput(1, BUSINESS_A, CONNECTION_A);
    const secondBase = smartleadInput(2, BUSINESS_B, CONNECTION_B);
    const second = {
      ...secondBase,
      idempotencyKey: first.idempotencyKey,
      event: { ...secondBase.event, provider_event_id: first.event.provider_event_id },
      contactId: SHARED_CONTACT,
    };
    expect((await processSmartlead(first)).status).toBe(202);
    expect((await processSmartlead(second)).status).toBe(202);
    const { rows } = await pool.query("select authenticated_business_id,business_id,contact_id from public.unified_inbound_receipts order by authenticated_business_id");
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.business_id).sort()).toEqual([BUSINESS_A, BUSINESS_B].sort());
    expect(rows.every((row) => row.contact_id === SHARED_CONTACT)).toBe(true);
  });

  it("fans in 200 real database-backed GSM mailbox routes with exact original senders", async () => {
    await pool.query(`
      with inserted as (
        insert into public.gsm_mailboxes(email,smartlead_email_account_id)
        select 'sender-' || g || '@gsm.example', 'provider-' || g from generate_series(1,200) g
        returning id
      ) insert into public.gsm_mailbox_allocations(mailbox_id,pool_id,business_id)
      select id,gen_random_uuid(),$1 from inserted`, [BUSINESS_A]);
    for (let index = 1; index <= 200; index += 1) {
      const response = await processSmartlead(smartleadInput(index));
      expect(response.status).toBe(202);
    }
    const { rows } = await pool.query("select original_sender_mailbox,business_id,status from public.unified_inbound_receipts");
    expect(rows).toHaveLength(200);
    expect(rows.every((row) => row.business_id === BUSINESS_A && row.status === "processed")).toBe(true);
    expect(new Set(rows.map((row) => row.original_sender_mailbox)).size).toBe(200);
  }, 120_000);

  it("quarantines GHAT and wrong original senders without assigning a commercial business", async () => {
    await pool.query("insert into public.gsm_mailboxes(email,smartlead_email_account_id,estate_classification) values ('charity@ghat.example','provider-1','ghat'),('sender-2@gsm.example','provider-2','gsm')");
    await pool.query("insert into public.gsm_mailbox_allocations(mailbox_id,pool_id,business_id) select id,gen_random_uuid(),$1 from public.gsm_mailboxes", [BUSINESS_A]);
    const ghat = smartleadInput(1);
    const wrongSender = smartleadInput(2);
    wrongSender.payload = { ...wrongSender.payload, email_account: { email: "wrong@gsm.example" } };
    expect(await processSmartlead(ghat)).toMatchObject({ status: 202, body: { route: "quarantine", reason: "ghat_excluded" } });
    expect(await processSmartlead(wrongSender)).toMatchObject({ status: 202, body: { route: "quarantine", reason: "sender_mailbox_mismatch" } });
    const { rows } = await pool.query("select status,business_id,quarantine_reason from public.unified_inbound_receipts order by quarantine_reason");
    expect(rows).toEqual([
      expect.objectContaining({ status: "quarantine", business_id: null, quarantine_reason: "ghat_excluded" }),
      expect.objectContaining({ status: "quarantine", business_id: null, quarantine_reason: "sender_mailbox_mismatch" }),
    ]);
  });

  it("allows a leased NULL-to-verified sender once, rejects replacement, stale replay and cross-company finalisation", async () => {
    const claim = await store.claim({
      source: "smartlead", sourceEventId: "write-once", idempotencyKey: "req:write-once",
      authenticatedBusinessId: BUSINESS_A, eventKind: "reply_received", occurredAt: new Date(NOW_MS).toISOString(),
      contentReference: null, contactId: null, sourceMailboxId: "provider-write-once", originalSenderMailbox: null,
      leaseUntil: new Date(NOW_MS + 30_000).toISOString(), now: new Date(NOW_MS).toISOString(),
    });
    if (claim.state !== "claimed") throw new Error("expected claim");
    const update = {
      leaseToken: claim.leaseToken, status: "processed" as const, businessId: BUSINESS_A,
      routeEvidence: "verified_campaign", threadKey: `${BUSINESS_A}:smartlead:write-once`,
      originalSenderMailbox: "verified@gsm.example", quarantineReason: null, nextAttemptAt: null, errorCode: null,
    };
    await store.finalise(claim.receiptId, update);
    expect((await pool.query("select original_sender_mailbox from public.unified_inbound_receipts where id=$1", [claim.receiptId])).rows[0].original_sender_mailbox).toBe("verified@gsm.example");
    await expect(store.finalise(claim.receiptId, update)).rejects.toThrow();
    await expect(pool.query("update public.unified_inbound_receipts set original_sender_mailbox='replacement@gsm.example' where id=$1", [claim.receiptId])).rejects.toThrow(/immutable inbound receipt evidence/);
    await expect(pool.query("update public.unified_inbound_receipts set original_sender_mailbox=null where id=$1", [claim.receiptId])).rejects.toThrow(/immutable inbound receipt evidence/);

    const other = await store.claim({
      source: "smartlead", sourceEventId: "cross-company", idempotencyKey: "req:cross-company",
      authenticatedBusinessId: BUSINESS_A, eventKind: "other", occurredAt: new Date(NOW_MS).toISOString(),
      contentReference: null, contactId: null, sourceMailboxId: null, originalSenderMailbox: null,
      leaseUntil: new Date(NOW_MS + 30_000).toISOString(), now: new Date(NOW_MS).toISOString(),
    });
    if (other.state !== "claimed") throw new Error("expected second claim");
    await expect(store.finalise(other.receiptId, { ...update, leaseToken: other.leaseToken, businessId: BUSINESS_B })).rejects.toThrow(/authenticated business scope mismatch/);
  });

  it("enforces founder/team/outsider RLS and denies anonymous or authenticated direct writes", async () => {
    await processSmartlead(smartleadInput(1));
    const retryClaim = await store.claim({
      source: "smartlead", sourceEventId: "quarantine", idempotencyKey: "req:quarantine",
      authenticatedBusinessId: BUSINESS_A, eventKind: "other", occurredAt: new Date(NOW_MS).toISOString(),
      contentReference: null, contactId: null, sourceMailboxId: "unknown", originalSenderMailbox: null,
      leaseUntil: new Date(NOW_MS).toISOString(), now: new Date(NOW_MS).toISOString(),
    });
    if (retryClaim.state !== "claimed") throw new Error("expected quarantine claim");
    await store.finalise(retryClaim.receiptId, {
      leaseToken: retryClaim.leaseToken, status: "quarantine", businessId: null, routeEvidence: null,
      threadKey: null, originalSenderMailbox: null, quarantineReason: "mailbox_mapping_missing", nextAttemptAt: null, errorCode: null,
    });
    // No mailbox route exists, so the first event is also quarantined; add a scoped route for RLS visibility.
    await pool.query("insert into public.gsm_mailboxes(email,smartlead_email_account_id) values ('sender-3@gsm.example','provider-3')");
    await pool.query("insert into public.gsm_mailbox_allocations(mailbox_id,pool_id,business_id) select id,gen_random_uuid(),$1 from public.gsm_mailboxes", [BUSINESS_A]);
    await processSmartlead(smartleadInput(3));

    const countFor = (user: string) => asUser("authenticated", user, async (client) => (await client.query("select count(*)::int as count from public.unified_inbound_receipts")).rows[0].count);
    expect(await countFor(FOUNDER)).toBe(3);
    expect(await countFor(TEAM_A)).toBe(1);
    expect(await countFor(TEAM_B)).toBe(0);
    expect(await countFor(OUTSIDER)).toBe(0);
    await expect(asUser("anon", null, (client) => client.query("select * from public.unified_inbound_receipts"))).rejects.toThrow(/permission denied/);
    await expect(asUser("authenticated", TEAM_A, (client) => client.query("insert into public.unified_inbound_receipts(source,source_event_id,idempotency_key,authenticated_business_id,event_kind,occurred_at) values ('smartlead','x','x',$1,'other',now())", [BUSINESS_A]))).rejects.toThrow(/permission denied/);
  });

  it("creates only an approval-required reply draft with all send switches false", async () => {
    const mailboxId = randomUUID();
    await pool.query(`insert into public.gsm_mailboxes(id,email,smartlead_email_account_id,readiness_state,provider_health,last_provider_check_at)
      values ($1,'sender-1@gsm.example','provider-1','campaign_ready','healthy',now())`, [mailboxId]);
    await pool.query("insert into public.gsm_mailbox_allocations(mailbox_id,pool_id,business_id) values ($1,gen_random_uuid(),$2)", [mailboxId, BUSINESS_A]);
    expect((await processSmartlead(smartleadInput(1))).status).toBe(202);
    const receipt = (await pool.query("select id from public.unified_inbound_receipts")).rows[0];
    const result = await asUser("authenticated", FOUNDER, (client) => client.query(
      "select * from public.create_unified_inbound_reply_draft($1,$2,$3,'Synthetic reply','Thank you; a human will review.')",
      [receipt.id, BUSINESS_A, mailboxId],
    ));
    expect(result.rows).toHaveLength(1);
    const approval = (await pool.query("select execution_enabled,auto_execute_allowed,send_allowed,status from public.founder_approval_items")).rows[0];
    const communication = (await pool.query("select communication_status,sent_at from public.communication_records")).rows[0];
    expect(approval).toEqual({ execution_enabled: false, auto_execute_allowed: false, send_allowed: false, status: "pending" });
    expect(communication).toEqual({ communication_status: "approval_required", sent_at: null });
    await expect(asUser("authenticated", FOUNDER, (client) => client.query(
      "select * from public.create_unified_inbound_reply_draft($1,$2,$3,'Privacy','GDPR privacy request details')",
      [receipt.id, BUSINESS_A, mailboxId],
    ))).rejects.toThrow(/privacy or safeguarding/);
  });
});
