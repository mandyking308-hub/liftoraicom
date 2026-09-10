import { describe, expect, it } from "vitest";
import {
  buildDeterministicCampaignName,
  buildIdempotencyToken,
  normalizeCampaignList,
  resolveProviderCampaign,
} from "../../../supabase/functions/_shared/smartleadCampaignResolve";

describe("smartlead campaign resolver", () => {
  const campaigns = normalizeCampaignList([
    { id: "sl-1", name: "Aurelia opening [liftor-abc123def]", status: "ACTIVE" },
    { id: "sl-2", name: "Billy nurture [liftor-xyz789ghi]", status: "PAUSED" },
  ]);

  it("builds deterministic names and tokens", () => {
    expect(buildIdempotencyToken("abc-123-def")).toBe("liftor-abc123def");
    expect(buildDeterministicCampaignName("Aurelia opening", "abc-123-def")).toContain("liftor-abc123def");
  });

  it("resolves by explicit provider id", () => {
    const r = resolveProviderCampaign(campaigns, { provider_campaign_id: "sl-1" });
    expect(r.ok).toBe(true);
    expect(r.match?.provider_campaign_id).toBe("sl-1");
    expect(r.create_allowed).toBe(false);
  });

  it("resolves by deterministic token", () => {
    const r = resolveProviderCampaign(campaigns, { idempotency_token: "liftor-abc123def" });
    expect(r.ok).toBe(true);
    expect(r.match?.provider_campaign_id).toBe("sl-1");
  });

  it("fails closed on ambiguous token", () => {
    const r = resolveProviderCampaign(
      normalizeCampaignList([
        { id: "sl-3", name: "X [liftor-abc]" },
        { id: "sl-4", name: "Y [liftor-abc]" },
      ]),
      { idempotency_token: "liftor-abc" },
    );
    expect(r.ok).toBe(false);
    expect(r.outcome).toBe("ambiguous_name");
    expect(r.create_allowed).toBe(false);
  });

  it("permits creation only when no match and a selector was supplied", () => {
    const r = resolveProviderCampaign(campaigns, { idempotency_token: "liftor-missing" });
    expect(r.ok).toBe(false);
    expect(r.outcome).toBe("not_found");
    expect(r.create_allowed).toBe(true);
  });

  it("fails closed with no selector", () => {
    const r = resolveProviderCampaign(campaigns, {});
    expect(r.ok).toBe(false);
    expect(r.outcome).toBe("no_selector");
  });
});
