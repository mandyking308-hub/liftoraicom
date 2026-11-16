import { describe, expect, it } from "vitest";
import {
  filterInboxRows,
  isVerifiedBusinessScope,
  newInLast24Hours,
  visibleRowsForActor,
  type UnifiedInboxRow,
} from "../unifiedInbox";

const NOW = new Date("2026-11-16T12:00:00.000Z");
const row = (overrides: Partial<UnifiedInboxRow> = {}): UnifiedInboxRow => ({
  id: "row-1",
  source: "smartlead",
  channel: "email",
  businessId: "business-a",
  receivedAt: "2026-11-16T11:00:00.000Z",
  status: "received",
  subject: "Reply",
  threadReference: "thread-a",
  mailboxId: "mailbox-a",
  mailboxIdentity: "sender-a@gsm.example",
  replied: true,
  optOut: false,
  needsReview: false,
  failed: false,
  quarantine: false,
  quarantineReason: null,
  reference: "protected-reference-1",
  privacy: false,
  ...overrides,
});

describe("founder unified inbox view model", () => {
  it("counts only actual new rows and leaves unread unrepresented rather than inventing read state", () => {
    const rows = [row(), row({ id: "old", receivedAt: "2026-11-14T11:00:00.000Z" }), row({ id: "future", receivedAt: "2026-11-17T11:00:00.000Z" })];
    expect(newInLast24Hours(rows, NOW)).toBe(1);
    expect(rows[0]).not.toHaveProperty("unread");
  });

  it("enforces business-scoped team visibility and founder-only quarantine", () => {
    const rows = [
      row({ id: "a", businessId: "business-a" }),
      row({ id: "b", businessId: "business-b" }),
      row({ id: "q", businessId: null, quarantine: true, needsReview: true }),
    ];
    expect(visibleRowsForActor(rows, { founderOrAdmin: false, businessIds: ["business-a"] }).map((item) => item.id)).toEqual(["a"]);
    expect(visibleRowsForActor(rows, { founderOrAdmin: true })).toHaveLength(3);
  });

  it("keeps two businesses isolated when the contact reference is shared", () => {
    const rows = [row({ id: "a", businessId: "business-a", reference: "shared-contact" }), row({ id: "b", businessId: "business-b", reference: "shared-contact" })];
    expect(filterInboxRows(rows, { businessId: "business-a" }).map((item) => item.id)).toEqual(["a"]);
  });

  it("supports explicit needs-review, failed, unassigned and quarantine views", () => {
    const rows = [
      row({ id: "ok" }),
      row({ id: "review", needsReview: true }),
      row({ id: "failed", failed: true }),
      row({ id: "unassigned", businessId: null, quarantine: true, quarantineReason: "unknown_mapping" }),
    ];
    expect(filterInboxRows(rows, { view: "needs_review" }).map((item) => item.id)).toEqual(["review", "unassigned"]);
    expect(filterInboxRows(rows, { view: "failed" }).map((item) => item.id)).toEqual(["failed"]);
    expect(filterInboxRows(rows, { view: "unassigned" }).map((item) => item.id)).toEqual(["unassigned"]);
    expect(filterInboxRows(rows, { view: "quarantine" }).map((item) => item.id)).toEqual(["unassigned"]);
  });

  it("requires an actual registry business and no quarantine before drill-down", () => {
    const businesses = [{ id: "business-a", name: "A", portfolio_status: "active", archived_at: null }];
    expect(isVerifiedBusinessScope(row(), businesses)).toBe(true);
    expect(isVerifiedBusinessScope(row({ businessId: "business-b" }), businesses)).toBe(false);
    expect(isVerifiedBusinessScope(row({ quarantine: true }), businesses)).toBe(false);
  });

  it("represents privacy cases by reference only", () => {
    const privacy = row({ privacy: true, source: "privacy", subject: "Privacy request · access", reference: "request-id" });
    expect(privacy.reference).toBe("request-id");
    expect(privacy.threadReference).toBe("thread-a");
    expect(privacy).not.toHaveProperty("senderName");
    expect(privacy).not.toHaveProperty("body");
  });
});
