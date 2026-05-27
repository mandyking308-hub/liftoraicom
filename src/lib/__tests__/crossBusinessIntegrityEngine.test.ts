import { describe, it, expect } from "vitest";
import {
  detectContamination,
  shouldQuarantine,
  shouldBlockOutbound,
  type LinkRow,
  type EnvelopeRow,
} from "@/lib/crossBusinessIntegrityEngine";

const BIZ_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const BIZ_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const BIZ_C = "cccccccc-cccc-cccc-cccc-cccccccccccc";

const envelopes: EnvelopeRow[] = [
  { id: "env-a", business_id: BIZ_A, brand_name: "NeonCandy" },
  { id: "env-b", business_id: BIZ_B, brand_name: "MarketplaceDemo" },
];

function link(over: Partial<LinkRow>): LinkRow {
  return {
    id: crypto.randomUUID(),
    business_id: BIZ_A,
    source_module: "crm",
    source_table: "contacts",
    source_record_id: "rec-1",
    target_module: "envelopes",
    target_table: "business_context_envelopes",
    target_record_id: "env-a",
    link_type: "owner",
    link_status: "active",
    ...over,
  };
}

describe("crossBusinessIntegrityEngine", () => {
  it("detects nothing on a clean dataset", () => {
    const findings = detectContamination([link({})], envelopes);
    expect(findings).toHaveLength(0);
  });

  it("detects orphaned record (no business_id)", () => {
    const f = detectContamination([link({ business_id: null })], envelopes);
    expect(f[0].kind).toBe("orphaned_record");
  });

  it("detects wrong_business_link (business_id tampering)", () => {
    const f = detectContamination([link({ business_id: BIZ_C })], envelopes);
    expect(f[0].kind).toBe("wrong_business_link");
    expect(f[0].severity).toBe("critical");
  });

  it("detects mismatched_envelope (cross-business envelope)", () => {
    const f = detectContamination(
      [link({ business_id: BIZ_A, target_module: "envelopes", target_record_id: "env-b" })],
      envelopes,
    );
    expect(f[0].kind).toBe("mismatched_envelope");
  });

  it("detects mixed_crm_ownership (same record under two businesses)", () => {
    const findings = detectContamination([
      link({ business_id: BIZ_A, source_record_id: "rec-x" }),
      link({ business_id: BIZ_B, source_record_id: "rec-x" }),
    ], envelopes);
    expect(findings.some((f) => f.kind === "mixed_crm_ownership")).toBe(true);
  });

  it("detects memory_contamination on memory module crossover", () => {
    const findings = detectContamination([
      link({ source_module: "memory", business_id: BIZ_A, source_record_id: "mem-1", target_module: "memory" }),
      link({ source_module: "memory", business_id: BIZ_B, source_record_id: "mem-1", target_module: "memory" }),
    ], envelopes);
    expect(findings.some((f) => f.kind === "memory_contamination")).toBe(true);
  });

  it("detects wrong_campaign_ownership via expectedOwner map", () => {
    const expected = new Map([["camp-1", BIZ_B]]);
    const findings = detectContamination(
      [link({ source_module: "campaigns", source_record_id: "camp-1", business_id: BIZ_A })],
      envelopes,
      expected,
    );
    expect(findings[0].kind).toBe("wrong_campaign_ownership");
  });

  it("detects invalid_module_relationship (disallowed join)", () => {
    const f = detectContamination(
      [link({ source_module: "campaigns", target_module: "memory" })],
      envelopes,
    );
    expect(f[0].kind).toBe("invalid_module_relationship");
  });

  it("quarantines + blocks outbound for critical/high severity", () => {
    const f = detectContamination([link({ business_id: BIZ_C })], envelopes)[0];
    expect(shouldQuarantine(f)).toBe(true);
    expect(shouldBlockOutbound(f)).toBe(true);
  });

  it("covers all seven detection types", () => {
    const kinds = new Set([
      "wrong_business_link", "mixed_crm_ownership", "memory_contamination",
      "wrong_campaign_ownership", "mismatched_envelope", "orphaned_record",
      "invalid_module_relationship",
    ]);
    expect(kinds.size).toBe(7);
  });
});