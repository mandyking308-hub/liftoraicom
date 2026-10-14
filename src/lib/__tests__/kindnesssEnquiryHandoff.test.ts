import { describe, expect, it } from "vitest";
import {
  KINDNESSS_BUSINESS_ID, decideHandoff, hmacHex, idempotencyKeyFor, nextRetry,
  type ContactResolution, type HandoffInput,
} from "@/lib/inbound/kindnesssEnquiryHandoff";

const SECRET = "test-only-secret-not-real";
const NOW = 1_792_000_000;
const OTHER_BUSINESS = "11111111-2222-4333-8444-555555555555";

const baseEvent = () => ({
  schema_version: 1, event_type: "commercial_enquiry.submitted",
  event_id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", source: "kindnesss",
  business_id: KINDNESSS_BUSINESS_ID, occurred_at: "2026-10-14T10:00:00Z",
  enquiry_id: "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff",
  contact_name: "Head Teacher", contact_email: " Head@School.example ",
  organisation_name: "Example School", role_title: "Headteacher", country: "UK",
  enquiry_type: "school_pilot", message: "We would like a demo for staff.", consent_contact: true,
});

async function input(over: Partial<HandoffInput> & { body?: unknown; sig?: string } = {}): Promise<HandoffInput> {
  const rawBody = typeof over.body === "string" ? over.body : JSON.stringify(over.body ?? baseEvent());
  const ts = String(NOW);
  const sig = over.sig ?? `sha256=${await hmacHex(SECRET, `${ts}.${rawBody}`)}`;
  return {
    enabledFlag: "true", secret: SECRET, rawBody,
    headers: { source: "kindnesss", timestamp: ts, signature: sig },
    nowSeconds: NOW,
    idempotencyKeyExists: async () => false,
    resolveContact: async () => ({ kind: "matched", contactId: "c1", relationshipId: "r1" }),
    ...over,
  };
}

describe("Kindnesss enquiry handoff (offline contract)", () => {
  it("is OFF unless explicitly enabled", async () => {
    for (const flag of [undefined, null, "", "false", "TRUE", "1"]) {
      const d = await decideHandoff(await input({ enabledFlag: flag }));
      expect(d).toMatchObject({ outcome: "reject", reason: "receiver_disabled" });
    }
  });

  it("accepts a correctly signed event into same-business conversation, never auto-sends", async () => {
    let seenEmail = "";
    const d = await decideHandoff(await input({ resolveContact: async (b, e) => { expect(b).toBe(KINDNESSS_BUSINESS_ID); seenEmail = e; return { kind: "matched", contactId: "c1", relationshipId: "r1" }; } }));
    expect(d).toMatchObject({ outcome: "accept", route: "conversation", businessId: KINDNESSS_BUSINESS_ID, autoSend: false, relationshipId: "r1" });
    expect(seenEmail).toBe("head@school.example");
  });

  it("rejects bad, missing, or tampered signatures and missing secret", async () => {
    expect(await decideHandoff(await input({ sig: "sha256=" + "0".repeat(64) }))).toMatchObject({ reason: "bad_signature" });
    expect(await decideHandoff(await input({ sig: "" }))).toMatchObject({ reason: "bad_signature" });
    const good = await input();
    expect(await decideHandoff({ ...good, rawBody: good.rawBody.replace("demo", "deme") })).toMatchObject({ reason: "bad_signature" });
    expect(await decideHandoff({ ...good, secret: undefined })).toMatchObject({ reason: "missing_secret" });
  });

  it("rejects replayed (stale) timestamps and unknown sources", async () => {
    const good = await input();
    expect(await decideHandoff({ ...good, nowSeconds: NOW + 301 })).toMatchObject({ reason: "stale_or_future_timestamp" });
    expect(await decideHandoff({ ...good, headers: { ...good.headers, source: "neon-candy" } })).toMatchObject({ reason: "unknown_source" });
  });

  it("rejects wrong business / tenant mismatch with no fallback", async () => {
    const d = await decideHandoff(await input({ body: { ...baseEvent(), business_id: OTHER_BUSINESS } }));
    expect(d).toMatchObject({ outcome: "reject", reason: "tenant_mismatch", httpStatus: 403 });
  });

  it("returns duplicate for repeated delivery using exact idempotency key", async () => {
    const seen = new Set<string>();
    const exists = async (_b: string, k: string) => { const had = seen.has(k); seen.add(k); return had; };
    const first = await decideHandoff(await input({ idempotencyKeyExists: exists }));
    const second = await decideHandoff(await input({ idempotencyKeyExists: exists }));
    expect(first.outcome).toBe("accept");
    expect(second).toMatchObject({ outcome: "duplicate", idempotencyKey: idempotencyKeyFor("kindnesss", KINDNESSS_BUSINESS_ID, baseEvent().event_id) });
  });

  it("keeps lookups inside the mapped business (cross-business isolation)", async () => {
    const calls: string[] = [];
    await decideHandoff(await input({
      idempotencyKeyExists: async (b) => { calls.push(b); return false; },
      resolveContact: async (b) => { calls.push(b); return { kind: "none" }; },
    }));
    expect(calls).toEqual([KINDNESSS_BUSINESS_ID, KINDNESSS_BUSINESS_ID]);
  });

  it("quarantines unmatched or ambiguous contacts founder-only", async () => {
    for (const [res, reason] of [[{ kind: "none" }, "no_contact_match"], [{ kind: "ambiguous", candidateCount: 2 }, "ambiguous_contact"]] as [ContactResolution, string][]) {
      const d = await decideHandoff(await input({ resolveContact: async () => res }));
      expect(d).toMatchObject({ outcome: "accept", route: "quarantine", quarantineReason: reason, contactId: null, autoSend: false });
    }
  });

  it("rejects child/parent/pupil/family/passport fields and content", async () => {
    for (const extra of [{ child_name: "x" }, { pupil_class: "x" }, { parent_email: "x" }, { kindness_passport: {} }, { family: "x" }]) {
      expect(await decideHandoff(await input({ body: { ...baseEvent(), ...extra } }))).toMatchObject({ outcome: "reject", reason: "forbidden_field" });
    }
    for (const message of ["My daughter is in Year 4 class", "Her Kindness Passport entries", "DOB 01/01/2017"]) {
      expect(await decideHandoff(await input({ body: { ...baseEvent(), message } }))).toMatchObject({ outcome: "reject", reason: "forbidden_content" });
    }
  });

  it("rejects malformed and unknown-field payloads", async () => {
    expect(await decideHandoff(await input({ body: "{not json" }))).toMatchObject({ reason: "malformed_json" });
    expect(await decideHandoff(await input({ body: { ...baseEvent(), extra: 1 } }))).toMatchObject({ reason: "schema_invalid" });
    expect(await decideHandoff(await input({ body: { ...baseEvent(), contact_email: "nope" } }))).toMatchObject({ reason: "schema_invalid" });
  });

  it("retry policy backs off, dead-letters permanent errors and exhausted attempts", () => {
    expect(nextRetry(0, 202)).toEqual({ action: "done" });
    expect(nextRetry(0, 401)).toEqual({ action: "dead_letter" });
    expect(nextRetry(0, 503)).toEqual({ action: "retry", delaySeconds: 30 });
    expect(nextRetry(2, null)).toEqual({ action: "retry", delaySeconds: 120 });
    expect(nextRetry(1, 429)).toMatchObject({ action: "retry" });
    expect(nextRetry(6, 503)).toEqual({ action: "dead_letter" });
  });
});
