import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TestPool, type TestPoolClient } from "./helpers/postgresTestPool";
import { createPostgresPrivacyStore } from "./helpers/kindnesssPrivacyPostgres";
import {
  buildPrivacyEvent,
  buildPrivacyRequest,
  signPrivacyRequest,
  type PrivacyOutboxRow,
  type PrivacyWireEvent,
} from "./fixtures/kindnesss/liftor-privacy-outbound.server";
import { handleKindnesssPrivacyNotification } from "../../../supabase/functions/_shared/kindnesssPrivacyReceiver";
import type { PrivacyNotificationStore } from "../../../supabase/functions/_shared/kindnesssPrivacyReceiver";

const DATABASE_URL = process.env.UNIFIED_INBOUND_TEST_DATABASE_URL;
const BUSINESS_A = "640de582-a112-4d16-a221-03c27f00c6ec";
const BUSINESS_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const FOUNDER = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const ADMIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TEAM = "cccccccc-3333-4333-8333-cccccccccccc";
const SECRET = "synthetic-privacy-signing-secret-40-bytes!!!";
const COMMERCIAL_SECRET = "different-commercial-signing-secret-32bytes";
const NOW_MS = Date.parse("2026-11-16T10:05:00.000Z");
const pool = new TestPool(DATABASE_URL);
const store = createPostgresPrivacyStore(pool);

async function asUser<T>(role: "authenticated" | "anon", userId: string | null, run: (client: TestPoolClient) => Promise<T>): Promise<T> {
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

function outbox(id = randomUUID(), requestRef = randomUUID(), kind: "new_request" | "overdue" = "new_request"): PrivacyOutboxRow {
  return {
    id,
    request_id: requestRef,
    kind,
    payload: { kind, request_ref: requestRef, request_type: "deletion", due_at: "2026-12-16T10:00:00.000Z" },
    created_at: "2026-11-16T10:00:00.000Z",
    attempts: 0,
  };
}

function request(event: PrivacyWireEvent, secret = SECRET): { url: string; method: "POST"; body: string; headers: Record<string, string> } {
  return buildPrivacyRequest({ enabled: true, url: "https://liftorai.com/functions/v1/kindnesss-privacy-receiver", secret }, event, NOW_MS);
}

function receive(req: ReturnType<typeof request>, target: PrivacyNotificationStore = store, nowMs = NOW_MS) {
  return handleKindnesssPrivacyNotification(new TextEncoder().encode(req.body), {
    source: req.headers["X-Liftor-Source"],
    eventType: req.headers["X-Liftor-Event-Type"],
    eventId: req.headers["X-Liftor-Event-Id"],
    timestamp: req.headers["X-Liftor-Timestamp"],
    signature: req.headers["X-Liftor-Signature"],
  }, {
    enabledFlag: "true",
    secret: SECRET,
    commercialSecret: COMMERCIAL_SECRET,
    store: target,
    now: () => new Date(nowMs),
  });
}

describe.skipIf(!DATABASE_URL).sequential("disposable PostgreSQL Kindnesss privacy receiver", () => {
  beforeAll(async () => {
    await pool.query(readFileSync("src/lib/__tests__/fixtures/kindnesssPrivacyMinimalSchema.sql", "utf8"));
    await pool.query(readFileSync("docs/candidates/kindnesss-privacy-handoff-2026-11-16.sql", "utf8"));
  }, 60_000);

  beforeEach(async () => {
    await pool.query("truncate public.kindnesss_privacy_notification_deliveries, public.kindnesss_privacy_case_operations, public.kindnesss_privacy_request_links, public.data_privacy_requests, public.user_roles, public.businesses restart identity cascade");
    await pool.query("insert into public.businesses(id,name) values ($1,'Kindnesss active synthetic'),($2,'Other synthetic business')", [BUSINESS_A, BUSINESS_B]);
    await pool.query("insert into public.user_roles(user_id,role) values ($1,'founder'),($2,'admin'),($3,'client')", [FOUNDER, ADMIN, TEAM]);
  });

  afterAll(async () => { await pool.end(); });

  it("persists the actual sender bytes as metadata only with a null-contact founder case", async () => {
    const event = buildPrivacyEvent(outbox());
    const response = await receive(request(event));
    expect(response).toMatchObject({ status: 202, body: { duplicate: false, autoSend: false } });
    const deliveries = (await pool.query("select * from public.kindnesss_privacy_notification_deliveries")).rows;
    const cases = (await pool.query("select * from public.data_privacy_requests")).rows;
    expect(deliveries).toHaveLength(1);
    expect(cases).toHaveLength(1);
    expect(deliveries[0]).toMatchObject({ event_id: event.event_id, request_ref: event.request_ref, business_id: BUSINESS_A, kind: "new_request" });
    expect(cases[0]).toMatchObject({ business_id: BUSINESS_A, contact_id: null, request_summary: null, request_status: "received", completed_at: null, founder_review_required: true });
    expect(JSON.stringify(deliveries)).not.toMatch(/requester|email|child_name|details|notes/i);
    expect(JSON.stringify(cases)).not.toMatch(/requester|email|child_name|details|notes/i);
  });

  it("collapses concurrent duplicate deliveries into one receipt and one case", async () => {
    const req = request(buildPrivacyEvent(outbox()));
    const responses = await Promise.all(Array.from({ length: 12 }, () => receive(req)));
    expect(responses.filter((response) => response.status === 202)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 200)).toHaveLength(11);
    expect((await pool.query("select count(*)::int as count from public.kindnesss_privacy_notification_deliveries")).rows[0].count).toBe(1);
    expect((await pool.query("select count(*)::int as count from public.data_privacy_requests")).rows[0].count).toBe(1);
  });

  it("rejects wrong secret, stale time, tamper, source/business mismatch and PII without database writes", async () => {
    const event = buildPrivacyEvent(outbox());
    const valid = request(event);
    expect((await receive(valid, store, NOW_MS + 301_000)).status).toBe(401);
    expect((await receive(request(event, "wrong-privacy-signing-secret-32-bytes!!!"))).status).toBe(401);
    expect((await receive({ ...valid, body: valid.body.replace("deletion", "access") })).status).toBe(401);
    expect((await receive({ ...valid, headers: { ...valid.headers, "X-Liftor-Source": "other" } })).status).toBe(401);

    const extraBody = JSON.stringify({ ...event, requester_email: "person@example.invalid", child_name: "Synthetic child" });
    const extraSignature = signPrivacyRequest(SECRET, valid.headers["X-Liftor-Timestamp"], event.event_id, extraBody);
    expect((await receive({ ...valid, body: extraBody, headers: { ...valid.headers, "X-Liftor-Signature": extraSignature } })).status).toBe(422);

    const wrongBusiness = JSON.stringify({ ...event, business_id: BUSINESS_B });
    const businessSignature = signPrivacyRequest(SECRET, valid.headers["X-Liftor-Timestamp"], event.event_id, wrongBusiness);
    expect((await receive({ ...valid, body: wrongBusiness, headers: { ...valid.headers, "X-Liftor-Signature": businessSignature } })).status).toBe(400);
    expect((await pool.query("select count(*)::int as count from public.kindnesss_privacy_notification_deliveries")).rows[0].count).toBe(0);
    expect((await pool.query("select count(*)::int as count from public.data_privacy_requests")).rows[0].count).toBe(0);
  });

  it("returns 503 on a database outage and retries the same event without duplication", async () => {
    const req = request(buildPrivacyEvent(outbox()));
    const unavailable: PrivacyNotificationStore = { receive: async () => { throw new Error("synthetic database outage"); } };
    expect((await receive(req, unavailable)).status).toBe(503);
    expect((await pool.query("select count(*)::int as count from public.kindnesss_privacy_notification_deliveries")).rows[0].count).toBe(0);
    expect((await receive(req)).status).toBe(202);
    expect((await receive(req)).status).toBe(200);
    expect((await pool.query("select count(*)::int as count from public.kindnesss_privacy_notification_deliveries")).rows[0].count).toBe(1);
  });

  it("links concurrent new and overdue event IDs to one unresolved case", async () => {
    const requestRef = randomUUID();
    const first = buildPrivacyEvent(outbox(randomUUID(), requestRef, "new_request"));
    const second = buildPrivacyEvent(outbox(randomUUID(), requestRef, "overdue"));
    const responses = await Promise.all([receive(request(first)), receive(request(second))]);
    expect(responses.every((response) => response.status === 202)).toBe(true);
    expect(responses[0].body.privacy_request_id).toBe(responses[1].body.privacy_request_id);
    expect(responses[0].body.delivery_id).not.toBe(responses[1].body.delivery_id);
    const deliveries = (await pool.query("select id,kind,privacy_request_id from public.kindnesss_privacy_notification_deliveries order by kind")).rows;
    const cases = (await pool.query("select request_status,completed_at,contact_id,request_summary from public.data_privacy_requests")).rows;
    expect(deliveries).toHaveLength(2);
    expect(new Set(deliveries.map((row) => row.privacy_request_id)).size).toBe(1);
    expect(cases).toEqual([{ request_status: "received", completed_at: null, contact_id: null, request_summary: null }]);
  });

  it("refuses another business or an inactive Kindnesss record without cross-tenant writes", async () => {
    await expect(pool.query("select public.receive_kindnesss_privacy_notification('kindnesss',$1,$2,1,'privacy_request.notification',now(),'new_request',$3,'deletion',now())", [BUSINESS_B, randomUUID(), randomUUID()])).rejects.toThrow(/invalid privacy notification metadata/);
    await pool.query("update public.businesses set portfolio_status='legacy_prelaunch' where id=$1", [BUSINESS_A]);
    expect((await receive(request(buildPrivacyEvent(outbox())))).status).toBe(503);
    expect((await pool.query("select count(*)::int as count from public.data_privacy_requests")).rows[0].count).toBe(0);
  });

  it("enforces founder/admin-only RLS and denies anon or commercial-team writes", async () => {
    await receive(request(buildPrivacyEvent(outbox())));
    const countFor = (user: string) => asUser("authenticated", user, async (client) => (await client.query("select count(*)::int as count from public.kindnesss_privacy_notification_deliveries")).rows[0].count);
    expect(await countFor(FOUNDER)).toBe(1);
    expect(await countFor(ADMIN)).toBe(1);
    expect(await countFor(TEAM)).toBe(0);
    expect(await asUser("authenticated", TEAM, async (client) => (await client.query("select count(*)::int as count from public.data_privacy_requests")).rows[0].count)).toBe(0);
    expect(await asUser("authenticated", FOUNDER, async (client) => (await client.query("select count(*)::int as count from public.kindnesss_privacy_case_operations")).rows[0].count)).toBe(1);
    expect(await asUser("authenticated", TEAM, async (client) => (await client.query("select count(*)::int as count from public.kindnesss_privacy_case_operations")).rows[0].count)).toBe(0);
    await expect(asUser("anon", null, (client) => client.query("select * from public.kindnesss_privacy_notification_deliveries"))).rejects.toThrow(/permission denied/);
    await expect(asUser("authenticated", TEAM, (client) => client.query("insert into public.kindnesss_privacy_notification_deliveries(source,business_id,event_id,schema_version,event_type,occurred_at,kind,request_ref,request_type,due_at,privacy_request_id) select 'kindnesss',business_id,gen_random_uuid(),1,event_type,now(),kind,request_ref,request_type,due_at,privacy_request_id from public.kindnesss_privacy_notification_deliveries"))).rejects.toThrow(/permission denied/);
  });

  it("keeps delivery and request-link metadata immutable", async () => {
    await receive(request(buildPrivacyEvent(outbox())));
    await expect(pool.query("update public.kindnesss_privacy_notification_deliveries set request_type='access'")).rejects.toThrow(/immutable/);
    await expect(pool.query("delete from public.kindnesss_privacy_notification_deliveries")).rejects.toThrow(/immutable/);
    await expect(pool.query("update public.kindnesss_privacy_request_links set request_ref=gen_random_uuid()")).rejects.toThrow(/immutable/);
    expect((await pool.query("select request_status,completed_at from public.data_privacy_requests")).rows[0]).toEqual({ request_status: "received", completed_at: null });
  });

  it("separates delivery and operator acknowledgement while preserving Kindnesss-only authority", async () => {
    const first = buildPrivacyEvent(outbox());
    const accepted = await receive(request(first));
    const caseId = String(accepted.body.privacy_request_id);
    const initial = (await pool.query(`select operational_status,owner_user_id,operator_acknowledged_at,to_char(updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as token from public.kindnesss_privacy_case_operations`)).rows[0];
    expect(initial).toMatchObject({ operational_status: "unacknowledged", owner_user_id: null, operator_acknowledged_at: null });
    const tokenCheck = (await pool.query(
      "select updated_at = $1::text::timestamptz as matches,updated_at::text as stored,($1::text::timestamptz)::text as parsed from public.kindnesss_privacy_case_operations",
      [initial.token],
    )).rows[0];
    expect(tokenCheck.parsed).toBe(tokenCheck.stored);
    expect(tokenCheck.matches).toBe(true);

    const reviewed = await asUser("authenticated", FOUNDER, (client) => client.query(
      "select * from public.review_kindnesss_privacy_case_operations($1,$2,$3,$4::text::timestamptz)",
      [caseId, FOUNDER, "acknowledged", initial.token],
    ));
    expect(reviewed.rows[0]).toMatchObject({ privacy_request_id: caseId, owner_user_id: FOUNDER, operational_status: "acknowledged", updated_by: FOUNDER });
    expect(reviewed.rows[0].operator_acknowledged_at).toBeTruthy();
    expect((await pool.query("select request_status,completed_at from public.data_privacy_requests")).rows[0]).toEqual({ request_status: "received", completed_at: null });

    await expect(asUser("authenticated", FOUNDER, (client) => client.query(
      "select * from public.review_kindnesss_privacy_case_operations($1,$2,$3,$4::text::timestamptz)",
      [caseId, FOUNDER, "closed", reviewed.rows[0].updated_at],
    ))).rejects.toThrow(/Kindnesss admin authority/);
    await expect(asUser("authenticated", FOUNDER, (client) => client.query(
      "select * from public.review_kindnesss_privacy_case_operations($1,$2,$3,$4::text::timestamptz)",
      [caseId, TEAM, "in_progress", reviewed.rows[0].updated_at],
    ))).rejects.toThrow(/founder or admin/);
    await expect(asUser("authenticated", TEAM, (client) => client.query(
      "select * from public.review_kindnesss_privacy_case_operations($1,$2,$3,$4::text::timestamptz)",
      [caseId, FOUNDER, "in_progress", reviewed.rows[0].updated_at],
    ))).rejects.toThrow(/founder or admin privacy review/);
    await expect(asUser("authenticated", FOUNDER, (client) => client.query(
      "update public.data_privacy_requests set request_status='completed',completed_at=now() where id=$1", [caseId],
    ))).rejects.toThrow(/Kindnesss admin authority/);
    await expect(asUser("authenticated", FOUNDER, (client) => client.query(
      "delete from public.data_privacy_requests where id=$1", [caseId],
    ))).rejects.toThrow(/cannot be deleted/);
  });

  it("uses compare-and-set for triage and preserves it across later deliveries and duplicates", async () => {
    const requestRef = randomUUID();
    const first = buildPrivacyEvent(outbox(randomUUID(), requestRef, "new_request"));
    const accepted = await receive(request(first));
    const caseId = String(accepted.body.privacy_request_id);
    const initial = (await pool.query(`select to_char(updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as token from public.kindnesss_privacy_case_operations`)).rows[0];
    const reviewed = await asUser("authenticated", ADMIN, (client) => client.query(
      "select * from public.review_kindnesss_privacy_case_operations($1,$2,$3,$4::text::timestamptz)",
      [caseId, ADMIN, "in_progress", initial.token],
    ));
    const reviewUpdatedAt = reviewed.rows[0].updated_at;

    await expect(asUser("authenticated", FOUNDER, (client) => client.query(
      "select * from public.review_kindnesss_privacy_case_operations($1,$2,$3,$4::text::timestamptz)",
      [caseId, FOUNDER, "blocked", initial.token],
    ))).rejects.toThrow(/stale privacy operation review/);

    const secondOutbox = outbox(randomUUID(), requestRef, "overdue");
    secondOutbox.payload = { kind: "overdue", request_ref: requestRef, request_type: "deletion", due_at: "2026-12-20T10:00:00.000Z" };
    const second = buildPrivacyEvent(secondOutbox);
    expect((await receive(request(second))).status).toBe(202);
    expect((await receive(request(second))).status).toBe(200);
    const operation = (await pool.query("select owner_user_id,operational_status,due_at::text as due_at,updated_at from public.kindnesss_privacy_case_operations")).rows[0];
    expect(operation).toMatchObject({ owner_user_id: ADMIN, operational_status: "in_progress", updated_at: reviewUpdatedAt });
    expect(operation.due_at).toContain("2026-12-20");
    expect((await pool.query("select count(*)::int as count from public.kindnesss_privacy_notification_deliveries")).rows[0].count).toBe(2);
  });

  it("denies direct authenticated writes to operator tracking even for founders", async () => {
    await receive(request(buildPrivacyEvent(outbox())));
    await expect(asUser("authenticated", FOUNDER, (client) => client.query(
      "update public.kindnesss_privacy_case_operations set operational_status='blocked'",
    ))).rejects.toThrow(/permission denied/);
  });
});
