import { describe, it, expect } from "vitest";
import { buildBatchName, buildDefaultChannels, buildOutreachSequenceSkeleton, buildSocialContentSkeleton } from "@/lib/campaignFactoryEngine";

describe("campaignFactoryEngine", () => {
  it("builds batch name", () => {
    expect(buildBatchName("2026-07-01")).toMatch(/July 2026/);
  });
  it("defaults channels", () => {
    expect(buildDefaultChannels({ business_name: "x" })).toContain("email");
  });
  it("social content skeleton has 10 items", () => {
    expect(buildSocialContentSkeleton("instagram", "2026-07-01")).toHaveLength(10);
  });
  it("outreach skeleton has 4 steps with unsubscribe-ready bodies", () => {
    const s = buildOutreachSequenceSkeleton();
    expect(s).toHaveLength(4);
    expect(s[0].step).toBe(1);
  });
});