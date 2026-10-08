import { describe, it, expect } from "vitest";
import {
  assertMapping, backoffMs, dedupeKey, isRetryable, mapCampaignSnapshot, sanitizeSenders, summarizeHistory,
} from "../../../supabase/functions/_shared/smartleadCampaignSync";

const BIZ = "640de582-a112-4d16-a221-03c27f00c6ec";

describe("smartlead campaign sync logic", () => {
  it("maps a paused draft with 3 pending leads and zero activity", () => {
    const s = mapCampaignSnapshot(
      { name: "K", status: "DRAFTED", track_settings: ["DONT_EMAIL_OPEN"], max_leads_per_day: 3 },
      { sent_count: "0", open_count: "0", reply_count: "0", campaign_lead_stats: { total: 3, notStarted: 3 } },
    );
    expect(s).toMatchObject({ campaign_status: "DRAFTED", total_leads: 3, not_started: 3, sent_count: 0, open_count: 0, reply_count: 0, max_leads_per_day: 3 });
  });
  it("keeps missing metrics null, never zero", () => {
    const s = mapCampaignSnapshot({}, {});
    expect(s.sent_count).toBeNull();
    expect(s.total_leads).toBeNull();
  });
  it("strips sender passwords and credentials", () => {
    const out = sanitizeSenders([{ id: 1, from_email: "a@b.c", password: "x", imap_password: "y", smtp_host: "h", is_smtp_success: true }]);
    const s = JSON.stringify(out);
    expect(s).not.toContain("password");
    expect(s).not.toContain("smtp_host");
    expect(out[0].smtp_ok).toBe(true);
  });
  it("summarizes empty history as no sends/replies", () => {
    expect(summarizeHistory([])).toMatchObject({ sent_count: 0, reply_count: 0, open_count: null, last_reply_at: null });
  });
  it("summarizes sent + reply history", () => {
    const r = summarizeHistory([
      { type: "SENT", message_id: "m1", time: "2026-10-09T09:00:00Z", open_count: 1 },
      { type: "REPLY", message_id: "m2", time: "2026-10-09T10:00:00Z", email_body: "<p>Hi, interested</p>" },
    ]);
    expect(r).toMatchObject({ sent_count: 1, reply_count: 1, last_reply_preview: "Hi, interested", open_count: 1 });
  });
  it("dedupes by provider message id", () => {
    expect(dedupeKey({ message_id: "abc", type: "SENT" })).toBe(dedupeKey({ message_id: "abc", type: "SENT", time: "x" }));
  });
  it("rejects wrong-business and unmapped campaigns", () => {
    expect(assertMapping(BIZ, "1", [])).toEqual({ ok: false, error: "campaign_not_mapped" });
    expect(assertMapping(BIZ, "4103531", [{ business_id: "other", provider_campaign_id: "4103531", mapping_status: "mapped" }]))
      .toEqual({ ok: false, error: "campaign_mapped_to_other_business" });
    expect(assertMapping(BIZ, "4103531", [{ business_id: BIZ, provider_campaign_id: "4103531", mapping_status: "mapped" }])).toEqual({ ok: true });
  });
  it("retries only 429/5xx with bounded backoff", () => {
    expect(isRetryable(401)).toBe(false);
    expect(isRetryable(400)).toBe(false);
    expect(isRetryable(429)).toBe(true);
    expect(isRetryable(503)).toBe(true);
    expect(backoffMs(10)).toBe(8000);
  });
});

import { buildReplyPayload, trackingFlags } from "../../../supabase/functions/_shared/smartleadCampaignSync";
describe("reply payload + tracking flags", () => {
  it("builds the documented reply-email-thread body", () => {
    expect(buildReplyPayload("4714610528", "Thanks", "<m@x>", "2026-10-09T10:00:00Z"))
      .toEqual({ lead_id: 4714610528, email_body: "Thanks", reply_message_id: "<m@x>", reply_email_time: "2026-10-09T10:00:00.000Z" });
  });
  it("fails closed when reply id or time missing", () => {
    expect(() => buildReplyPayload("1", "x", null, "2026-10-09T10:00:00Z")).toThrow();
    expect(() => buildReplyPayload("1", "x", "m", null)).toThrow();
    expect(() => buildReplyPayload("1", "  ", "m", "2026-10-09T10:00:00Z")).toThrow();
  });
  it("reads open and click flags independently", () => {
    expect(trackingFlags(["DONT_EMAIL_OPEN"])).toEqual({ opensTracked: false, clicksTracked: true });
    expect(trackingFlags(["DONT_EMAIL_OPEN", "DONT_LINK_CLICK"])).toEqual({ opensTracked: false, clicksTracked: false });
    expect(trackingFlags(null)).toEqual({ opensTracked: null, clicksTracked: null });
  });
});
