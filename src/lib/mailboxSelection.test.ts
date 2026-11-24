import { describe, it, expect } from "vitest";
import { selectSlotMailboxes, type BoxRow } from "../../supabase/functions/_shared/mailboxSelection";

const now = new Date("2026-11-24T12:00:00Z");
const box = (id: string, o: Partial<BoxRow> = {}): BoxRow => ({ id, smartlead_email_account_id: id, warmup_status: "warm", readiness_state: "campaign_ready", health_score: 98, last_provider_check_at: "2026-11-24T06:00:00Z", quarantined_reason: null, ...o });
const s = new Date("2026-12-01T00:00:00Z"), e = new Date("2026-12-29T00:00:00Z");

describe("new launch mailbox selection", () => {
  it("uses all 180 ready mailboxes, not a cap of 20", () => {
    const boxes = Array.from({ length: 180 }, (_, i) => box(String(i)));
    expect(selectSlotMailboxes(boxes, [], "biz", s, e, now)).toHaveLength(180);
  });
  it("skips mailboxes not warm, not campaign ready, or with stale Winnr data", () => {
    const boxes = [box("a"), box("b", { warmup_status: "warming" }), box("c", { readiness_state: "warming" }), box("d", { last_provider_check_at: "2026-11-22T00:00:00Z" })];
    expect(selectSlotMailboxes(boxes, [], "biz", s, e, now).map((b) => b.id)).toEqual(["a"]);
  });
  it("skips mailboxes another business has booked in an overlapping slot", () => {
    const bk = [{ mailbox_id: "a", business_id: "other", starts_at: "2026-12-10T00:00:00Z", ends_at: "2026-12-11T00:00:00Z" },
      { mailbox_id: "b", business_id: "biz", starts_at: "2026-12-10T00:00:00Z", ends_at: "2026-12-11T00:00:00Z" }];
    expect(selectSlotMailboxes([box("a"), box("b")], bk, "biz", s, e, now).map((b) => b.id)).toEqual(["b"]);
  });
});
