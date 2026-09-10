import { describe, expect, it } from "vitest";
import {
  allocateMailboxes,
  effectiveDailyCap,
  screenMailbox,
  type MailboxRecord,
  type AllocationRequest,
} from "../../../supabase/functions/_shared/mailboxAllocator";

const m = (over: Partial<MailboxRecord> = {}): MailboxRecord => ({
  id: `mb-${over.id ?? Math.random().toString(36).slice(2)}`,
  email_address: over.email_address ?? "hello@example.com",
  active: true,
  excluded_from_allocation: false,
  provider_ready: true,
  smtp_ready: true,
  imap_ready: true,
  warmup_ready: true,
  daily_send_limit: 50,
  ramp_daily_cap: 10,
  emails_sent_today: 0,
  ...over,
});

const req = (over: Partial<AllocationRequest> = {}): AllocationRequest => ({
  business_name: "Aurelia",
  requested_count: 1,
  ...over,
});

describe("mailbox allocator", () => {
  it("effective cap is min of limit and ramp", () => {
    expect(effectiveDailyCap(m({ daily_send_limit: 50, ramp_daily_cap: 10 }))).toBe(10);
    expect(effectiveDailyCap(m({ daily_send_limit: 5, ramp_daily_cap: 10 }))).toBe(5);
    expect(effectiveDailyCap(m({}))).toBe(10);
  });

  it("rejects legacy Neon Candy estate by default", () => {
    const r = allocateMailboxes([m({ estate_key: "neon-candy-legacy" })], req({ estate_key: "education" }));
    expect(r.ok).toBe(false);
    expect(r.rejected[0].codes).toContain("estate_mismatch");
  });

  it("rejects unready mailboxes", () => {
    const r = allocateMailboxes([m({ provider_ready: false })], req());
    expect(r.ok).toBe(false);
    expect(r.rejected[0].codes).toContain("provider_not_ready");
  });

  it("rejects mailboxes locked to a different business", () => {
    const r = allocateMailboxes(
      [m({ business_name: "Neon Candy", segregation_locked: true, allowed_business_names: [] })],
      req({ business_name: "Aurelia" }),
    );
    expect(r.ok).toBe(false);
    expect(r.rejected[0].codes).toContain("segregation_locked_to_other_business");
  });

  it("rejects mailboxes that have hit the daily cap", () => {
    const r = allocateMailboxes([m({ emails_sent_today: 10, ramp_daily_cap: 10 })], req({ requested_count: 1 }));
    expect(r.ok).toBe(false);
    expect(r.rejected[0].codes).toContain("daily_cap_reached");
  });

  it("distributes load across least-loaded mailboxes", () => {
    const boxes = [
      m({ id: "a", email_address: "a@x.com", emails_sent_today: 0 }),
      m({ id: "b", email_address: "b@x.com", emails_sent_today: 5 }),
    ];
    const r = allocateMailboxes(boxes, req({ requested_count: 4 }));
    expect(r.ok).toBe(true);
    const a = r.assignments.find((x) => x.inbox_id === "a");
    const b = r.assignments.find((x) => x.inbox_id === "b");
    expect((a?.assigned ?? 0) >= (b?.assigned ?? 0)).toBe(true);
  });

  it("returns partial allocation when capacity is limited", () => {
    const r = allocateMailboxes([m({ emails_sent_today: 8 })], req({ requested_count: 5 }));
    expect(r.ok).toBe(true);
    expect(r.decision).toBe("partially_allocated");
    expect(r.allocated_count).toBe(2);
  });

  it("respects explicit allowed_business_names", () => {
    const ok = m({ allowed_business_names: ["Aurelia"] });
    const bad = m({ allowed_business_names: ["Billy"] });
    const r = allocateMailboxes([ok, bad], req({ business_name: "Aurelia" }));
    expect(r.ok).toBe(true);
    expect(r.assignments[0].inbox_id).toBe(ok.id);
    expect(r.rejected.some((x) => x.inbox_id === bad.id && x.codes.includes("business_not_permitted"))).toBe(true);
  });
});
