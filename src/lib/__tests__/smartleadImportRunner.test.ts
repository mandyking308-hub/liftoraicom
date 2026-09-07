import { describe, expect, it } from "vitest";
import {
  type ImportStore,
  type LeadMappingRecord,
  runImportPage,
} from "../../../supabase/functions/_shared/smartleadImportRunner.ts";
import { mapSmartleadLead, type MappingRow } from "../../../supabase/functions/_shared/smartleadLeadImport.ts";
import { buildWebhookReadiness } from "../../../supabase/functions/_shared/smartleadReceiverReadiness.ts";

const mapping: MappingRow = {
  id: "map-1",
  business_id: "biz-1",
  liftor_campaign_id: "lc-1",
  provider_campaign_id: "sl-9",
  provider_campaign_name: "Neon",
  mapping_status: "mapped",
  is_active: true,
};

interface MockOpts {
  contacts?: Array<Record<string, unknown>>;
  leadMaps?: LeadMappingRecord[];
  relationships?: Array<{ id: string; contact_id: string; business_id: string | null; business_name: string; do_not_contact: boolean }>;
  failRelationshipInsert?: boolean;
  failContactLookup?: boolean;
}

function mockStore(o: MockOpts = {}) {
  const calls: string[] = [];
  const contacts = [...(o.contacts ?? [])];
  const leadMaps = [...(o.leadMaps ?? [])];
  const rels = [...(o.relationships ?? [])];
  let seq = 0;

  const store: ImportStore = {
    async findContactsByEmails(emails) {
      calls.push("select:contacts");
      if (o.failContactLookup) throw new Error("db down");
      const set = new Set(emails.map((e) => e.toLowerCase()));
      return contacts.filter((c) => set.has(String(c.email ?? "").toLowerCase())) as never;
    },
    async findContactById(id) {
      calls.push("select:contact_by_id");
      return (contacts.find((c) => c.id === id) ?? null) as never;
    },
    async findLeadMappings(_c, emails, ids) {
      calls.push("select:lead_mappings");
      const e = new Set(emails.map((x) => x.toLowerCase()));
      const i = new Set(ids);
      return leadMaps.filter((m) =>
        (m.provider_lead_id && i.has(m.provider_lead_id)) ||
        (m.contact_email && e.has(m.contact_email.toLowerCase()))
      );
    },
    async insertContact(patch) {
      calls.push("insert:contacts");
      const id = `new-${++seq}`;
      contacts.push({ id, ...patch });
      return { id };
    },
    async updateContact(id, patch) {
      calls.push("update:contacts");
      const c = contacts.find((x) => x.id === id);
      Object.assign(c ?? {}, patch);
    },
    async findRelationship(contactId, businessName, businessId) {
      calls.push("select:relationships");
      return rels.find((r) => r.contact_id === contactId && (r.business_id === businessId || r.business_name === businessName)) ?? null;
    },
    async insertRelationship(row) {
      calls.push("insert:relationships");
      if (o.failRelationshipInsert) throw new Error("rls denied");
      rels.push({
        id: `rel-${++seq}`,
        contact_id: String(row.contact_id),
        business_id: String(row.business_id ?? ""),
        business_name: String(row.business_name ?? ""),
        do_not_contact: row.do_not_contact === true,
      });
    },
    async updateRelationship() { calls.push("update:relationships"); },
    async insertLeadMapping(row) {
      calls.push("insert:lead_mappings");
      const id = `lm-${++seq}`;
      leadMaps.push({
        id,
        provider_lead_id: (row.provider_lead_id as string) ?? null,
        contact_email: (row.contact_email as string) ?? null,
        liftor_contact_id: String(row.liftor_contact_id),
      });
      return { id };
    },
    async updateLeadMapping() { calls.push("update:lead_mappings"); },
    async touchMappingSync() { calls.push("update:campaign_mapping_sync"); },
  };
  return { store, calls, contacts, leadMaps, rels };
}

const WRITE_PREFIXES = ["insert:", "update:", "upsert:", "delete:"];
const writeCalls = (calls: string[]) => calls.filter((c) => WRITE_PREFIXES.some((p) => c.startsWith(p)));

const lead = (over: Record<string, unknown> = {}) =>
  mapSmartleadLead({ id: "L1", email: "a@x.com", first_name: "A", last_name: "B", ...over });

const base = { mapping, business_name: "Neon Candy", imported_at: "2026-09-07T10:00:00.000Z" };

describe("preview performs zero writes", () => {
  it("makes no insert/update/upsert/delete calls at all, including mapping sync", async () => {
    const m = mockStore();
    const r = await runImportPage({ ...base, dry_run: true, leads: [lead(), lead({ id: "L2", email: "b@x.com" })], store: m.store });
    expect(r.ok).toBe(true);
    expect(writeCalls(m.calls)).toEqual([]);
    expect(m.calls).not.toContain("update:campaign_mapping_sync");
    expect(r.writes).toBe(0);
    expect(r.counters.created).toBe(2);
  });

  it("preview counts a duplicate email inside one page once, not twice", async () => {
    const m = mockStore();
    const r = await runImportPage({
      ...base, dry_run: true, store: m.store,
      leads: [lead(), lead({ id: "L2", email: "A@X.com" })],
    });
    expect(writeCalls(m.calls)).toEqual([]);
    expect(r.counters.created).toBe(1);
    expect(r.counters.processed).toBe(2);
  });
});

describe("prerequisite failures fail closed", () => {
  it("returns a prerequisite error and writes nothing when the contact lookup fails", async () => {
    const m = mockStore({ failContactLookup: true });
    const r = await runImportPage({ ...base, dry_run: false, leads: [lead()], store: m.store });
    expect(r.ok).toBe(false);
    expect(r.prerequisite_error).toBe("existing_contact_lookup_failed");
    expect(writeCalls(m.calls)).toEqual([]);
    expect(r.page_complete).toBe(false);
  });
});

describe("in-page duplicates and identifier conflicts", () => {
  it("does not create two contacts for the same email in one page", async () => {
    const m = mockStore();
    const r = await runImportPage({
      ...base, dry_run: false, store: m.store,
      leads: [lead(), lead({ id: "L2", email: "a@x.com", company: "Acme" })],
    });
    expect(m.calls.filter((c) => c === "insert:contacts")).toHaveLength(1);
    expect(r.counters.created).toBe(1);
    expect(r.counters.errors).toBe(0);
  });

  it("matches an existing contact case-insensitively instead of creating a duplicate", async () => {
    const m = mockStore({ contacts: [{ id: "c1", email: "A@X.com", name: "A B", company: "Acme" }] });
    const r = await runImportPage({ ...base, dry_run: false, leads: [lead({ email: "a@x.com" })], store: m.store });
    expect(m.calls).not.toContain("insert:contacts");
    expect(r.counters.created).toBe(0);
  });

  it("reports a conflict when the provider lead id and the email point at different contacts", async () => {
    const m = mockStore({
      contacts: [{ id: "c1", email: "a@x.com" }],
      leadMaps: [{ id: "lm-old", provider_lead_id: "L1", contact_email: "other@x.com", liftor_contact_id: "c-other" }],
    });
    const r = await runImportPage({ ...base, dry_run: false, leads: [lead()], store: m.store });
    expect(r.counters.errors).toBe(1);
    expect(r.details[0].reason).toContain("identifier_conflict");
    expect(writeCalls(m.calls)).toEqual([]);
    expect(r.page_complete).toBe(false);
  });
});

describe("repeat pages are idempotent", () => {
  it("re-importing the same page creates nothing new", async () => {
    const m = mockStore();
    await runImportPage({ ...base, dry_run: false, leads: [lead()], store: m.store });
    const first = m.calls.filter((c) => c === "insert:contacts").length;
    const r2 = await runImportPage({ ...base, dry_run: false, leads: [lead()], store: m.store });
    expect(m.calls.filter((c) => c === "insert:contacts").length).toBe(first);
    expect(r2.counters.created).toBe(0);
    expect(m.contacts).toHaveLength(1);
    expect(m.leadMaps).toHaveLength(1);
    expect(m.rels).toHaveLength(1);
  });
});

describe("association write failure", () => {
  it("counts an error, not an import, and blocks the checkpoint", async () => {
    const m = mockStore({ failRelationshipInsert: true });
    const r = await runImportPage({ ...base, dry_run: false, leads: [lead()], store: m.store });
    expect(r.counters.created).toBe(0);
    expect(r.counters.errors).toBe(1);
    expect(r.page_complete).toBe(false);
    expect(r.unresolved_rows).toBe(1);
    expect(m.calls).not.toContain("update:campaign_mapping_sync");
    expect(r.details[0].warnings?.[0]).toContain("repair");
  });

  it("a rerun repairs the missing relationship and provenance without duplicating the contact", async () => {
    const failing = mockStore({ failRelationshipInsert: true });
    await runImportPage({ ...base, dry_run: false, leads: [lead()], store: failing.store });
    expect(failing.contacts).toHaveLength(1);
    expect(failing.rels).toHaveLength(0);

    // Rerun with a healthy store that already holds the partially-written contact.
    const healthy = mockStore({ contacts: failing.contacts });
    const r = await runImportPage({ ...base, dry_run: false, leads: [lead()], store: healthy.store });
    expect(healthy.contacts).toHaveLength(1);
    expect(healthy.rels).toHaveLength(1);
    expect(healthy.leadMaps).toHaveLength(1);
    expect(r.page_complete).toBe(true);
    expect(r.counters.errors).toBe(0);
    expect(r.details[0].repaired).toContain("business_relationship_created");
  });
});

describe("checkpoint stamping", () => {
  it("stamps last_synced_at only when every row resolved", async () => {
    const ok = mockStore();
    await runImportPage({ ...base, dry_run: false, leads: [lead()], store: ok.store });
    expect(ok.calls).toContain("update:campaign_mapping_sync");
  });
});

describe("webhook readiness API contract", () => {
  it("keeps receiver_deployed boolean and false without attestation", () => {
    const r = buildWebhookReadiness({ attestation_present: false, test_event_captured: false });
    expect(typeof r.receiver_deployed).toBe("boolean");
    expect(r.receiver_deployed).toBe(false);
    expect(!!r.receiver_deployed).toBe(false); // consumer pattern
    expect(r.receiver_deployed_status).toBe("not_verified");
    expect(r.capture_mode_ready).toBe(false);
  });

  it("reports verified only with attestation, and capture ready only with a test event too", () => {
    const attested = buildWebhookReadiness({ attestation_present: true, test_event_captured: false });
    expect(attested.receiver_deployed).toBe(true);
    expect(attested.receiver_deployed_status).toBe("verified_deployed");
    expect(attested.capture_mode_ready).toBe(false);
    const full = buildWebhookReadiness({ attestation_present: true, test_event_captured: true });
    expect(full.capture_mode_ready).toBe(true);
  });
});
