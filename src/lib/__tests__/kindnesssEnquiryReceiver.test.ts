import { describe, expect, it } from "vitest";
import { handleKindnesssEnquiry, type HandoffStore, type ClaimResult } from "../../../supabase/functions/_shared/kindnesssEnquiryReceiver";
import { KINDNESSS_BUSINESS_ID, MAX_ATTEMPTS, hmacHex } from "../../../supabase/functions/_shared/kindnesssEnquiryHandoff";

const SECRET = "offline-test-secret";
const NOW = 1_792_000_000;
const event = (over: Record<string, unknown> = {}) => ({
  schema_version: 1, event_type: "commercial_enquiry.submitted",
  event_id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", source: "kindnesss", business_id: KINDNESSS_BUSINESS_ID,
  occurred_at: "2026-10-14T10:00:00Z", enquiry_id: "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff",
  contact_name: "Ops Lead", contact_email: "ops@school.example", organisation_name: "School", role_title: null,
  country: "United Kingdom", enquiry_type: "demo", message: "Please book a demo.", consent_contact: true, ...over,
});

/** In-memory store emulating INSERT ... ON CONFLICT DO NOTHING atomically (single-threaded JS). */
function memStore(opts: { unavailable?: boolean } = {}) {
  const rows = new Map<string, { id: string; status: string; attempts: number; route?: string | null }>();
  const audits: string[] = [];
  const store: HandoffStore = {
    async claim({ businessId, idempotencyKey }): Promise<ClaimResult> {
      if (opts.unavailable) return { state: "store_unavailable", detail: "relation does not exist" };
      const k = `${businessId}|${idempotencyKey}`;
      const r = rows.get(k);
      if (!r) { const n = { id: `r${rows.size + 1}`, status: "received", attempts: 1 }; rows.set(k, n); return { state: "claimed", recordId: n.id, attempts: 1 }; }
      if (r.status === "failed" && r.attempts < MAX_ATTEMPTS) { r.attempts++; r.status = "received"; return { state: "claimed", recordId: r.id, attempts: r.attempts }; }
      return { state: "duplicate", recordId: r.id, status: r.status as "processed" };
    },
    async finalise(id, u) { for (const r of rows.values()) if (r.id === id) { r.status = u.status; r.route = u.route; } },
    async audit(e) { audits.push(e.action); },
  };
  return { store, rows, audits };
}

async function signed(body: unknown) {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  const ts = String(NOW);
  return { raw, headers: { source: "kindnesss", timestamp: ts, signature: `sha256=${await hmacHex(SECRET, `${ts}.${raw}`)}` } };
}

const deps = (store: HandoffStore, resolve = async () => ({ kind: "matched" as const, contactId: "c", relationshipId: "r" }), flag = "true", secret: string | undefined = SECRET) =>
  ({ enabledFlag: flag, secret, nowSeconds: NOW, store, resolveContact: resolve });

describe("Kindnesss enquiry receiver (offline integration contract)", () => {
  it("default OFF: returns 503 and writes nothing", async () => {
    const m = memStore(); const s = await signed(event());
    const r = await handleKindnesssEnquiry(s.raw, s.headers, deps(m.store, undefined, undefined as unknown as string));
    expect(r.status).toBe(503); expect(m.rows.size).toBe(0); expect(m.audits).toEqual([]);
  });

  it("missing secret fails closed with no record", async () => {
    const m = memStore(); const s = await signed(event());
    const r = await handleKindnesssEnquiry(s.raw, s.headers, deps(m.store, undefined, "true", undefined));
    expect(r).toMatchObject({ status: 503, body: { reason: "missing_secret" } }); expect(m.rows.size).toBe(0);
  });

  it("missing table (store unavailable) returns 503 so the sender retries", async () => {
    const m = memStore({ unavailable: true }); const s = await signed(event());
    expect((await handleKindnesssEnquiry(s.raw, s.headers, deps(m.store))).status).toBe(503);
  });

  it("accepts signed event into same-business conversation", async () => {
    const m = memStore(); const s = await signed(event());
    const r = await handleKindnesssEnquiry(s.raw, s.headers, deps(m.store));
    expect(r).toMatchObject({ status: 202, body: { route: "conversation" } });
    expect([...m.rows.values()][0]).toMatchObject({ status: "processed", route: "conversation" });
  });

  it("concurrent duplicate deliveries create exactly one record", async () => {
    const m = memStore(); const s = await signed(event());
    const rs = await Promise.all(Array.from({ length: 10 }, () => handleKindnesssEnquiry(s.raw, s.headers, deps(m.store))));
    expect(m.rows.size).toBe(1);
    expect(rs.filter((r) => r.status === 202)).toHaveLength(1);
    expect(rs.filter((r) => r.body.duplicate)).toHaveLength(9);
  });

  it("rejects bad signature, tenant confusion, child data and unknown fields without writing", async () => {
    const m = memStore();
    const good = await signed(event());
    const cases = [
      { raw: good.raw, headers: { ...good.headers, signature: "sha256=" + "f".repeat(64) } },
      await signed(event({ business_id: "11111111-2222-4333-8444-555555555555" })),
      { ...(await signed(event())), headers: { ...good.headers, source: "neon-candy" } },
      await signed(event({ pupil_name: "x" })),
      await signed(event({ message: "my son is in year 3 class" })),
      await signed(event({ __proto__x: 1 })),
      await signed("[]"),
    ];
    for (const c of cases) expect((await handleKindnesssEnquiry(c.raw, c.headers, deps(m.store))).status).toBeGreaterThanOrEqual(400);
    expect(m.rows.size).toBe(0);
    expect(m.audits.every((a) => a === "kindnesss_handoff_rejected")).toBe(true);
  });

  it("quarantines ambiguous contact founder-only", async () => {
    const m = memStore(); const s = await signed(event());
    const r = await handleKindnesssEnquiry(s.raw, s.headers, deps(m.store, async () => ({ kind: "ambiguous" as const, candidateCount: 2 }) as never));
    expect(r.body.route).toBe("quarantine");
  });

  it("lookup failure retries via atomic reclaim, then dead-letters", async () => {
    const m = memStore(); const s = await signed(event());
    const failing = async () => { throw new Error("db timeout"); };
    const statuses: number[] = [];
    for (let i = 0; i < MAX_ATTEMPTS + 1; i++) statuses.push((await handleKindnesssEnquiry(s.raw, s.headers, deps(m.store, failing as never))).status);
    expect(statuses.slice(0, MAX_ATTEMPTS - 1).every((x) => x === 503)).toBe(true);
    expect([...m.rows.values()][0].status).toBe("dead_letter");
    expect(statuses[MAX_ATTEMPTS]).toBe(200); // further deliveries are duplicates
    expect(m.audits).toContain("kindnesss_handoff_dead_letter");
  });

  it("recovers after a transient failure", async () => {
    const m = memStore(); const s = await signed(event()); let n = 0;
    const flaky = async () => { if (n++ === 0) throw new Error("x"); return { kind: "matched" as const, contactId: "c", relationshipId: "r" }; };
    expect((await handleKindnesssEnquiry(s.raw, s.headers, deps(m.store, flaky))).status).toBe(503);
    expect((await handleKindnesssEnquiry(s.raw, s.headers, deps(m.store, flaky))).status).toBe(202);
  });

  it("no entrypoint is deployed for this receiver", async () => {
    const { existsSync } = await import("node:fs");
    expect(existsSync("supabase/functions/kindnesss-enquiry-receiver/index.ts")).toBe(false);
  });
});
