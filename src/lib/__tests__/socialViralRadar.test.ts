import { describe, expect, it } from "vitest";
import {
  VIRAL_CONFIRMATIONS,
  buildContentBrief,
  confirmationAccepted,
  dedupeSignals,
  detectRegulatedRisk,
  emptyStateReasons,
  normaliseSignal,
  resolveProviderStatus,
  scoreOpportunity,
  signalIdempotencyKey,
  SCORE_WEIGHTS_V1,
} from "../../../supabase/functions/_shared/socialViralLogic";

const ctx = {
  business_id: "b1",
  niche: "home renovation",
  audience_description: "UK homeowners planning a kitchen renovation",
  business_objective: "leads" as const,
  keywords: ["kitchen", "renovation"],
  platforms: ["tiktok"],
  geographies: ["GB"],
  languages: ["en"],
  excluded_topics: ["crypto"],
  conversion_route: "https://example.com/kitchen-guide",
};

const hotSignal = {
  platform: "tiktok",
  external_id: "x1",
  canonical_url: "https://www.tiktok.com/@a/video/1",
  title: "Kitchen renovation costs breakdown",
  topic: "kitchen renovation costs",
  language: "en",
  geography: "GB",
  published_at: new Date(Date.now() - 12 * 3600_000).toISOString(),
  metrics: {
    views: 900_000, views_24h: 600_000, views_prior_24h: 120_000,
    likes: 80_000, comments: 4_000, shares: 12_000, saves: 9_000,
    creator_followers: 40_000, saturation_ratio: 0.15,
  },
};

describe("viral scoring v1", () => {
  it("weights sum to 1", () => {
    const total = Object.values(SCORE_WEIGHTS_V1).reduce((a, b) => a + b, 0);
    expect(Number(total.toFixed(4))).toBe(1);
  });

  it("scores a fresh, on-audience, convertible signal highly", () => {
    const r = scoreOpportunity(hotSignal, ctx);
    expect(r.hard_blocked).toBe(false);
    expect(r.overall_score).toBeGreaterThan(55);
    expect(r.label).toContain("not guaranteed performance");
  });

  it("blocks big reach with no conversion route (empty virality guard)", () => {
    const r = scoreOpportunity(hotSignal, { ...ctx, conversion_route: null });
    expect(r.blockers).toContain("no_conversion_route");
    expect(r.overall_score).toBe(0);
    expect(r.recommended_status).toBe("needs_review");
  });

  it("blocks excluded topics", () => {
    const r = scoreOpportunity({ ...hotSignal, topic: "crypto trading hack" }, ctx);
    expect(r.blockers).toContain("excluded_topic");
  });

  it("blocks signals with no reach evidence", () => {
    const r = scoreOpportunity({ ...hotSignal, metrics: {} }, ctx);
    expect(r.blockers).toContain("missing_evidence");
  });

  it("is deterministic for identical inputs", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const a = scoreOpportunity(hotSignal, ctx, { now });
    const b = scoreOpportunity(hotSignal, ctx, { now });
    expect(a.overall_score).toBe(b.overall_score);
    expect(a.components).toEqual(b.components);
  });

  it("flags regulated risk topics for compliance review", () => {
    expect(detectRegulatedRisk("guaranteed returns on this investment").length).toBeGreaterThan(0);
  });
});

describe("signal normalisation and idempotency", () => {
  it("rejects non-https canonical urls", () => {
    const { errors } = normaliseSignal({ platform: "tiktok", canonical_url: "http://x.com/a", external_id: "1" });
    expect(errors).toContain("canonical_url_must_be_https");
  });

  it("requires a platform and an id", () => {
    const { errors } = normaliseSignal({});
    expect(errors).toContain("platform_required");
    expect(errors).toContain("external_id_or_url_required");
  });

  it("dedupes on business+provider+platform+external_id", () => {
    const rows = [
      { provider_slug: "manual_import", platform: "tiktok", external_id: "a" },
      { provider_slug: "manual_import", platform: "TikTok".toLowerCase(), external_id: "a" },
      { provider_slug: "manual_import", platform: "tiktok", external_id: "b" },
    ];
    const { unique, duplicates } = dedupeSignals("b1", rows);
    expect(unique).toHaveLength(2);
    expect(duplicates).toHaveLength(1);
    expect(signalIdempotencyKey("b1", "manual_import", "TIKTOK", "a"))
      .toBe(signalIdempotencyKey("b1", "manual_import", "tiktok", "a"));
  });
});

describe("opportunity to brief", () => {
  const approved = {
    id: "o1",
    opportunity_title: "Kitchen cost myths",
    platform: "tiktok",
    business_objective: "leads" as const,
    conversion_route: "https://example.com/kitchen-guide",
    opportunity_status: "approved" as const,
    risk_flags: [],
    requires_compliance_review: false,
  };

  it("blocks brief creation when the opportunity is not approved", () => {
    const { blockers } = buildContentBrief({ opportunity: { ...approved, opportunity_status: "scored" } });
    expect(blockers).toContain("opportunity_not_approved");
  });

  it("blocks brief creation without a conversion route", () => {
    const { blockers } = buildContentBrief({ opportunity: { ...approved, conversion_route: null } });
    expect(blockers).toContain("no_conversion_route");
  });

  it("produces an original-angle brief that never instructs copying", () => {
    const { brief, blockers } = buildContentBrief({ opportunity: approved, signal: hotSignal });
    expect(blockers).toHaveLength(0);
    expect(String(brief.original_angle)).toMatch(/Do not copy/i);
    expect(brief.brief_status).toBe("awaiting_founder_approval");
    expect(brief.cta).toBeTruthy();
    expect(brief.publish_by).toBeTruthy();
  });
});

describe("provider honesty and empty states", () => {
  it("never reports connected without a successful authenticated sync", () => {
    expect(resolveProviderStatus({ configured: true, contract_confirmed: true }).status).toBe("not_configured");
    expect(resolveProviderStatus({ configured: false, contract_confirmed: false }).status).toBe("not_configured");
    expect(resolveProviderStatus({ configured: true, contract_confirmed: false, last_successful_sync_at: new Date().toISOString() }).status)
      .toBe("not_configured");
    expect(resolveProviderStatus({ configured: true, contract_confirmed: true, last_successful_sync_at: new Date().toISOString() }).status)
      .toBe("connected");
    expect(resolveProviderStatus({ configured: true, contract_confirmed: true, manual_mode: true }).status).toBe("manual_mode");
    expect(resolveProviderStatus({ configured: true, contract_confirmed: true, last_successful_sync_at: new Date().toISOString(), consecutive_failures: 3 }).status)
      .toBe("degraded");
  });

  it("explains why the radar is empty instead of faking data", () => {
    const reasons = emptyStateReasons({
      provider_status: "not_configured", watchlists: 0, signals: 0,
      opportunities: 0, approved_opportunities: 0, conversion_routes: 0,
    });
    expect(reasons.length).toBeGreaterThan(0);
  });
});

describe("confirmation phrases", () => {
  it("requires exact phrases", () => {
    expect(confirmationAccepted("IMPORT VIRAL SIGNALS", VIRAL_CONFIRMATIONS.import_signals)).toBe(true);
    expect(confirmationAccepted("import viral signals", VIRAL_CONFIRMATIONS.import_signals)).toBe(false);
    expect(confirmationAccepted(undefined, VIRAL_CONFIRMATIONS.create_brief)).toBe(false);
  });
});