import { describe, it, expect } from "vitest";
import {
  buildCreatePostInput, buildDistributionIdempotencyKey, classifyProviderError,
  computeNextRetryAt, evaluateSubmission, isDurableMediaUrl, summariseStatuses,
  type SubmissionContext,
} from "../../../supabase/functions/_shared/socialDistributionLogic";

const future = new Date(Date.now() + 3600_000).toISOString();

const base = (over: Partial<SubmissionContext> = {}): SubmissionContext => ({
  job: { id: "job-1", business_id: "biz-1", platform: "twitter", scheduled_for: future },
  business_id: "biz-1",
  channel: { id: "ch-1", external_channel_id: "ext-1", service: "twitter" },
  mapping_active: true,
  mapping_business_id: "biz-1",
  connection_present: true,
  connection_organization_id: "org-1",
  gate_unlocked: true,
  approved: true,
  policy_mode: "approved_batch_autopilot",
  paused: false,
  text: "Hello world",
  ...over,
});

describe("social distribution fabric", () => {
  it("passes a fully valid approved job", () => {
    expect(evaluateSubmission(base()).eligible).toBe(true);
  });

  it("blocks when the execution gate is locked", () => {
    const r = evaluateSubmission(base({ gate_unlocked: false }));
    expect(r.eligible).toBe(false);
    expect(r.blockers).toContain("execution_gate_locked");
  });

  it("blocks in default test mode", () => {
    expect(evaluateSubmission(base({ policy_mode: "test" })).blockers).toContain("policy_test_mode");
  });

  it("blocks when no channel is mapped", () => {
    expect(evaluateSubmission(base({ channel: null })).blockers).toContain("channel_not_mapped");
  });

  it("blocks cross-business channel mapping", () => {
    expect(evaluateSubmission(base({ mapping_business_id: "biz-2" })).blockers).toContain("cross_business_channel_mapping");
  });

  it("blocks disconnected, locked and paused channels", () => {
    const r = evaluateSubmission(base({ channel: { id: "ch", external_channel_id: "e", is_disconnected: true, is_locked: true, is_queue_paused: true } }));
    expect(r.blockers).toEqual(expect.arrayContaining(["channel_disconnected", "channel_locked", "channel_queue_paused"]));
  });

  it("blocks emergency pause and past/missing schedule times", () => {
    expect(evaluateSubmission(base({ paused: true })).blockers).toContain("emergency_pause_active");
    expect(evaluateSubmission(base({ job: { id: "j", business_id: "biz-1", scheduled_for: "2020-01-01T00:00:00Z" } })).blockers).toContain("scheduled_time_in_past");
    expect(evaluateSubmission(base({ job: { id: "j", business_id: "biz-1", scheduled_for: null } })).blockers).toContain("missing_scheduled_time");
  });

  it("blocks invalid or expired media urls", () => {
    expect(isDurableMediaUrl("http://x.com/a.jpg")).toBe(false);
    expect(isDurableMediaUrl("https://cdn.example.com/a.jpg")).toBe(true);
    expect(isDurableMediaUrl("https://cdn.example.com/a.jpg?Expires=1000000")).toBe(false);
    expect(evaluateSubmission(base({ media_urls: ["http://insecure/a.png"] })).blockers).toContain("invalid_media_url");
  });

  it("blocks a job that already has a provider post id (duplicate click)", () => {
    const r = evaluateSubmission(base({ job: { id: "j", business_id: "biz-1", scheduled_for: future, provider_post_id: "buffer-1" } }));
    expect(r.blockers).toContain("already_submitted");
  });

  it("produces a stable idempotency key for repeated clicks and a different one per channel", () => {
    const a = buildDistributionIdempotencyKey({ business_id: "b", job_id: "j", channel_id: "c", scheduled_for: future });
    const b = buildDistributionIdempotencyKey({ business_id: "b", job_id: "j", channel_id: "c", scheduled_for: future });
    const c = buildDistributionIdempotencyKey({ business_id: "b", job_id: "j", channel_id: "c2", scheduled_for: future });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("builds a customScheduled Buffer input with assets and no linkAttachment mixing", () => {
    const input = buildCreatePostInput({
      organizationId: "org", channelId: "ch", text: "hi", dueAt: future,
      mediaUrls: ["https://cdn.example.com/a.jpg"], linkAttachment: { url: "https://x.com" },
    });
    expect(input.mode).toBe("customScheduled");
    expect(input.schedulingType).toBe("automatic");
    expect(input.dueAt).toBe(future);
    expect(input.assets).toEqual([{ source: { url: "https://cdn.example.com/a.jpg" } }]);
    expect(input.linkAttachment).toBeUndefined();
  });

  it("uses shareNow only when explicitly selected", () => {
    const input = buildCreatePostInput({ organizationId: "o", channelId: "c", text: "t", shareNow: true });
    expect(input.mode).toBe("shareNow");
    expect(input.dueAt).toBeUndefined();
  });

  it("classifies transient vs hard failures and backs off exponentially", () => {
    expect(classifyProviderError("rate limit", 429)).toBe("transient");
    expect(classifyProviderError("upstream failure", 503)).toBe("transient");
    expect(classifyProviderError("Unauthorized", 401)).toBe("hard");
    expect(classifyProviderError("invalid dueAt")).toBe("hard");
    const t0 = new Date("2026-01-01T00:00:00Z");
    expect(computeNextRetryAt(1, t0)!.toISOString()).toBe("2026-01-01T00:01:00.000Z");
    expect(computeNextRetryAt(3, t0)!.toISOString()).toBe("2026-01-01T00:04:00.000Z");
    expect(computeNextRetryAt(5, t0)).toBeNull();
  });

  it("summarises status totals", () => {
    expect(summariseStatuses([{ distribution_status: "scheduled" }, { distribution_status: "scheduled" }, {}]).scheduled).toBe(2);
  });
});
