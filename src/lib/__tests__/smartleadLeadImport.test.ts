import { describe, expect, it } from "vitest";
import {
  buildLeadsPath,
  classifySmartleadHttp,
  clampPageLimit,
  computeContinuation,
  emptyCounters,
  mapSmartleadLead,
  parseLeadsEnvelope,
  planContactWrite,
  resolveMapping,
  tally,
  type ExistingContact,
  type MappingRow,
} from "../../../supabase/functions/_shared/smartleadLeadImport";

const ctx = {
  business_id: "biz-1",
  business_name: "Neon Candy",
  provider_campaign_id: "sl-99",
  imported_at: "2026-09-07T10:00:00.000Z",
};

const lead = (over: Record<string, unknown> = {}) =>
  mapSmartleadLead({
    lead_id: "L1",
    email: "  Jane@Example.com ",
    first_name: "Jane",
    last_name: "Doe",
    company_name: "Acme",
    created_at: "2026-08-01T00:00:00Z",
    ...over,
  });

describe("pagination", () => {
  it("clamps limit to the documented max of 100", () => {
    expect(clampPageLimit(500)).toBe(100);
    expect(clampPageLimit(25)).toBe(25);
    expect(clampPageLimit(0)).toBe(100);
  });

  it("builds the documented leads path", () => {
    expect(buildLeadsPath("77", 200, 100)).toBe("/campaigns/77/leads?offset=200&limit=100");
  });

  it("resumes from the next offset while pages are full", () => {
    expect(computeContinuation(0, 100, 100, 250)).toEqual({ has_more: true, next_offset: 100 });
    expect(computeContinuation(200, 50, 100, 250)).toEqual({ has_more: false, next_offset: null });
    expect(computeContinuation(0, 0, 100, 0)).toEqual({ has_more: false, next_offset: null });
  });

  it("parses provider envelope variants and flags malformed bodies", () => {
    expect(parseLeadsEnvelope({ total_leads: 3, data: [{ lead: {} }] }).total_leads).toBe(3);
    expect(parseLeadsEnvelope([{}]).leads.length).toBe(1);
    expect(parseLeadsEnvelope({ nope: 1 }).malformed).toBe(true);
  });
});

describe("provider errors", () => {
  it("separates entitlement failures from empty lists", () => {
    expect(classifySmartleadHttp(401).kind).toBe("unauthorized");
    const f = classifySmartleadHttp(403);
    expect(f.kind).toBe("forbidden");
    expect(f.retryable).toBe(false);
    expect(f.actionable).toMatch(/not an empty campaign/i);
    expect(classifySmartleadHttp(429).retryable).toBe(true);
    expect(classifySmartleadHttp(200).kind).toBe("ok");
    expect(classifySmartleadHttp(200, true).kind).toBe("bad_response");
  });
});

describe("lead mapping", () => {
  it("normalises email and keeps missing verification as unknown", () => {
    const l = lead();
    expect(l.email).toBe("jane@example.com");
    expect(l.verification_status).toBe("unknown");
    expect(l.provider_lead_id).toBe("L1");
  });

  it("preserves provider negative statuses", () => {
    const l = lead({ status: "UNSUBSCRIBED" });
    expect(l.is_unsubscribed).toBe(true);
    expect(mapSmartleadLead({ email: "a@b.com", is_bounced: true }).is_bounced).toBe(true);
  });
});

describe("contact write planning", () => {
  it("creates new contacts as needs-review, never send-ready", () => {
    const p = planContactWrite(lead(), null, ctx);
    expect(p.action).toBe("create");
    expect(p.contact_patch.sendable_status).toBe("needs_review");
    expect(p.relationship_patch?.campaign_eligible).toBe(false);
    expect(p.send_ready).toBe(false);
  });

  it("never downgrades verified data to unknown or masked values", () => {
    const existing: ExistingContact = {
      id: "c1", email: "jane@example.com", email_verified_status: "verified",
      first_name: "Jane", company: "Acme Real Ltd",
    };
    const p = planContactWrite(lead({ company_name: "****", first_name: "  " }), existing, ctx);
    expect(p.contact_patch.email_verified_status).toBeUndefined();
    expect(p.contact_patch.company).toBeUndefined();
    expect(p.warnings).toContain("kept_stronger_local_verification");
  });

  it("holds suppressed / do-not-contact records and never clears the flags", () => {
    const existing: ExistingContact = {
      id: "c2", email: "jane@example.com", do_not_contact_at: "2026-01-01T00:00:00Z",
      is_globally_suppressed: true,
    };
    const p = planContactWrite(lead(), existing, ctx);
    expect(p.action).toBe("hold");
    expect(p.contact_patch.do_not_contact_at).toBeUndefined();
    expect(p.contact_patch.is_globally_suppressed).toBeUndefined();
    expect(p.relationship_patch?.do_not_contact).toBe(true);
  });

  it("propagates provider opt-out into suppression on re-import", () => {
    const p = planContactWrite(lead({ status: "UNSUBSCRIBED" }), null, ctx);
    expect(p.contact_patch.sendable_status).toBe("suppressed");
    expect(p.contact_patch.status).toBe("DO_NOT_CONTACT");
  });

  it("does not reassign a contact owned by another business", () => {
    const existing: ExistingContact = {
      id: "c3", email: "jane@example.com", assigned_business: "biz-OTHER", first_name: "Jane",
    };
    const p = planContactWrite(lead(), existing, ctx);
    expect(p.contact_patch.assigned_business).toBeUndefined();
    expect(p.warnings).toContain("contact_already_assigned_to_other_business_assignment_left_unchanged");
    expect(p.relationship_patch?.business_id).toBe("biz-1");
  });

  it("re-importing an unchanged contact is a no-op skip", () => {
    const existing: ExistingContact = {
      id: "c4", email: "jane@example.com", first_name: "Jane", last_name: "Doe",
      name: "Jane Doe", company: "Acme", source_record_id: "L1",
    };
    const p = planContactWrite(lead(), existing, ctx);
    expect(p.action).toBe("skip");
    expect(p.reason).toBe("no_new_information");
  });

  it("skips leads without an email", () => {
    expect(planContactWrite(mapSmartleadLead({ lead_id: "x" }), null, ctx).action).toBe("skip");
  });
});

describe("mapping resolution", () => {
  const row = (over: Partial<MappingRow>): MappingRow => ({
    id: "m1", business_id: "biz-1", liftor_campaign_id: "lc-1", provider_campaign_id: "sl-99",
    provider_campaign_name: "Neon", mapping_status: "mapped", is_active: true, ...over,
  });

  it("errors actionably when the campaign is unmapped", () => {
    const r = resolveMapping([], {});
    expect(r.ok).toBe(false);
    expect((r as { error?: string }).error).toBe("campaign_not_mapped");
  });

  it("refuses to guess when several mappings match", () => {
    const r = resolveMapping([row({}), row({ id: "m2", provider_campaign_id: "sl-99" })], {});
    expect(r.ok).toBe(false);
    expect((r as { error?: string }).error).toBe("ambiguous_campaign_mapping");
  });

  it("rejects incomplete mappings", () => {
    const r = resolveMapping([row({ business_id: null })], {});
    expect((r as { error?: string }).error).toBe("incomplete_campaign_mapping");
  });

  it("resolves an unambiguous mapping", () => {
    const r = resolveMapping([row({}), row({ id: "m3", provider_campaign_id: "sl-100" })], { provider_campaign_id: "sl-99" });
    expect(r.ok).toBe(true);
  });
});

describe("counters", () => {
  it("tallies each outcome", () => {
    const c = emptyCounters();
    tally(c, "create"); tally(c, "hold"); tally(c, "error");
    expect(c).toEqual({ processed: 3, created: 1, updated: 0, held: 1, skipped: 0, errors: 1 });
  });
});
