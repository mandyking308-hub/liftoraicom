import { describe, it, expect } from "vitest";
import {
  summarizeFabric,
  validateBusinessContext,
  detectCrossBusinessContamination,
  type FabricEnvelope,
  type FabricContract,
  type FabricLink,
  type FabricValidationEvent,
  type FabricRepair,
} from "@/lib/contextFabricEngine";

const env = (business_id: string, ready = true): FabricEnvelope => ({
  id: `e-${business_id}`,
  business_id,
  archetype_code: "MEDIA_LABEL",
  brand_name: "Brand",
  context_status: ready ? "ready" : "missing",
  product_catalogue_status: ready ? "ready" : "missing",
  entity_mapping_status: ready ? "ready" : "missing",
  integration_status: ready ? "ready" : "missing",
  founder_confirmed: ready,
});

const seededEnvelopes = [env("b1"), env("b2"), env("b3")];

describe("Business Context Fabric runtime", () => {
  it("rejects payloads with missing business_id", () => {
    expect(validateBusinessContext({ business_id: null }, seededEnvelopes)).toEqual({
      ok: false,
      reason: "missing_business_id",
    });
    expect(validateBusinessContext({}, seededEnvelopes).ok).toBe(false);
  });

  it("rejects payloads pointing at an unknown business envelope", () => {
    expect(validateBusinessContext({ business_id: "ghost" }, seededEnvelopes)).toEqual({
      ok: false,
      reason: "unknown_business",
    });
  });

  it("accepts payloads with a known seeded business_id", () => {
    expect(validateBusinessContext({ business_id: "b1" }, seededEnvelopes)).toEqual({ ok: true });
  });

  it("flags cross-business contamination on links", () => {
    expect(
      detectCrossBusinessContamination({
        business_id: "b1",
        source_business_id: "b1",
        target_business_id: "b2",
      })
    ).toEqual({ ok: false, reason: "cross_business_contamination" });

    expect(
      detectCrossBusinessContamination({
        business_id: "b2",
        source_business_id: "b1",
        target_business_id: null,
      })
    ).toEqual({ ok: false, reason: "cross_business_contamination" });
  });

  it("allows same-business links", () => {
    expect(
      detectCrossBusinessContamination({
        business_id: "b1",
        source_business_id: "b1",
        target_business_id: "b1",
      })
    ).toEqual({ ok: true });
  });

  it("detects orphaned cross-module links in the summary", () => {
    const links: FabricLink[] = [
      { id: "l1", business_id: "b1", source_module: "outbound", target_module: "crm", source_record_id: "s1", target_record_id: "t1", link_status: "active" },
      { id: "l2", business_id: "ghost", source_module: "outbound", target_module: "crm", source_record_id: "s2", target_record_id: "t2", link_status: "active" },
      { id: "l3", business_id: null, source_module: "outbound", target_module: "crm", source_record_id: "s3", target_record_id: "t3", link_status: "active" },
    ];
    const sum = summarizeFabric({
      envelopes: seededEnvelopes,
      contracts: [] as FabricContract[],
      links,
      events: [] as FabricValidationEvent[],
      repairs: [] as FabricRepair[],
    });
    expect(sum.orphaned_links).toBe(2);
    expect(sum.businesses).toBe(3);
    expect(sum.envelope_health_pct).toBe(100);
  });

  it("reports watch state when warnings are open", () => {
    const sum = summarizeFabric({
      envelopes: seededEnvelopes,
      contracts: [],
      links: [],
      events: [
        { id: "v1", business_id: "b1", severity: "low", validation_type: "contract_integrity", action_taken: "warned", validation_summary: "x", resolved_at: null },
      ],
      repairs: [],
    });
    expect(sum.activation_state).toBe("watch");
    expect(sum.open_warnings).toBe(1);
  });

  it("reports blocked state on critical unresolved events", () => {
    const sum = summarizeFabric({
      envelopes: [env("b1", false), env("b2", false)],
      contracts: [],
      links: [],
      events: [
        { id: "v1", business_id: "b1", severity: "critical", validation_type: "envelope_health", action_taken: "blocked", validation_summary: "x", resolved_at: null },
      ],
      repairs: [],
    });
    expect(sum.activation_state).toBe("blocked");
  });
});