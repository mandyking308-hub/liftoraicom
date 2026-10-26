import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { execSync } from "child_process";
import {
  loadEmailHistory, EmailHistoryLookupError, stepsToCancelOnStop,
  type EmailHistoryDeps, type HistoryContact,
} from "../../../supabase/functions/_shared/emailHistory";

const C = (id: string, email: string, extra: Partial<HistoryContact> = {}): HistoryContact => ({ id, email, ...extra });

function deps(contacts: HistoryContact[], events: { contact_id: string; event_type: string }[]): EmailHistoryDeps {
  return {
    fetchContactsByEmails: async (emails) => ({ data: contacts.filter((c) => emails.includes(c.email ?? "")), error: null }),
    fetchEventsByContactIds: async (ids) => ({ data: events.filter((e) => ids.includes(e.contact_id)), error: null }),
  };
}

describe("email history lookup (email_events keyed by contact_id)", () => {
  it("synthetic bounce is detected", async () => {
    const h = await loadEmailHistory(["b@x.test"], deps([C("1", "b@x.test")], [{ contact_id: "1", event_type: "bounced" }]));
    expect(h.byEmail.get("b@x.test")!.has("bounced")).toBe(true);
  });
  it("unsubscribe (contacts.unsubscribed_at) suppresses", async () => {
    const h = await loadEmailHistory(["u@x.test"], deps([C("1", "u@x.test", { unsubscribed_at: "2026-10-01" })], []));
    const f = h.byEmail.get("u@x.test")!;
    expect(f.has("unsubscribed") && f.has("suppressed")).toBe(true);
  });
  it("DNC status suppresses", async () => {
    const h = await loadEmailHistory(["d@x.test"], deps([C("1", "d@x.test", { status: "DO_NOT_CONTACT" })], []));
    expect(h.byEmail.get("d@x.test")!.has("suppressed")).toBe(true);
  });
  it("reply is detected, mixed-case CRM email still matched", async () => {
    const h = await loadEmailHistory(["R@X.test"], deps([C("1", "R@X.test")], [{ contact_id: "1", event_type: "replied" }]));
    expect(h.byEmail.get("r@x.test")!.has("replied")).toBe(true);
  });
  it("active/pending sequence marks previously emailed", async () => {
    const h = await loadEmailHistory(["s@x.test"], deps([C("1", "s@x.test")], [{ contact_id: "1", event_type: "sent" }]));
    expect(h.byEmail.get("s@x.test")!.has("previously_emailed")).toBe(true);
  });
  it("missing history (no CRM contact) is clean but not provider-checked", async () => {
    const h = await loadEmailHistory(["n@x.test"], deps([], []));
    expect(h.byEmail.get("n@x.test")!.size).toBe(0);
    expect(h.provider_history_checked).toBe(false);
  });
  it("clean control has no flags", async () => {
    const h = await loadEmailHistory(["ok@x.test"], deps([C("1", "ok@x.test")], [{ contact_id: "1", event_type: "opened" }]));
    expect(h.byEmail.get("ok@x.test")!.size).toBe(0);
  });
  it("duplicate CRM email: bounce on either record wins", async () => {
    const h = await loadEmailHistory(["dup@x.test"], deps(
      [C("1", "dup@x.test"), C("2", "DUP@x.test")], [{ contact_id: "2", event_type: "bounced" }]));
    const f = h.byEmail.get("dup@x.test")!;
    expect(f.has("duplicate_crm_email") && f.has("bounced")).toBe(true);
  });
  it("multi-business collision: shared contact bounce from another business suppresses", async () => {
    // contacts are portfolio-shared; events are not business-filtered
    const h = await loadEmailHistory(["shared@x.test"], deps([C("9", "shared@x.test")], [{ contact_id: "9", event_type: "bounced" }]));
    expect(h.byEmail.get("shared@x.test")!.has("bounced")).toBe(true);
  });
  it("query error fails closed", async () => {
    const d = deps([C("1", "e@x.test")], []);
    d.fetchEventsByContactIds = async () => ({ data: null, error: { code: "42703", message: "column does not exist" } });
    await expect(loadEmailHistory(["e@x.test"], d)).rejects.toBeInstanceOf(EmailHistoryLookupError);
  });
  it("rejected promise / timeout fails closed", async () => {
    const d = deps([], []);
    d.fetchContactsByEmails = () => Promise.reject(new Error("timeout"));
    await expect(loadEmailHistory(["t@x.test"], d)).rejects.toThrow(/email_history_lookup_failed:contacts/);
  });
  it("RLS denial fails closed and leaks no email", async () => {
    const d = deps([], []);
    d.fetchContactsByEmails = async () => ({ data: null, error: { code: "42501", message: "permission denied" } });
    const err = await loadEmailHistory(["secret@x.test"], d).catch((e) => e);
    expect(err).toBeInstanceOf(EmailHistoryLookupError);
    expect(String(err.message)).not.toContain("secret@");
  });
  it("null data without error (stale/unavailable) fails closed", async () => {
    const d = deps([], []);
    d.fetchContactsByEmails = async () => ({ data: null, error: null });
    await expect(loadEmailHistory(["z@x.test"], d)).rejects.toBeInstanceOf(EmailHistoryLookupError);
  });
  it("reply cancels all remaining steps of the five-touch sequence", () => {
    const rows = [1, 2, 3, 4, 5].map((s) => ({ sequence_step: s, status: s === 1 ? "sent" : "pending" }));
    expect(stepsToCancelOnStop(rows).map((r) => r.sequence_step)).toEqual([2, 3, 4, 5]);
  });
});

describe("source guards", () => {
  it("no code path queries the non-existent email_events.recipient_email", () => {
    const out = execSync("grep -rln 'recipient_email' supabase/functions/lead-quality-scan supabase/functions/lead-quality-autopilot || true").toString();
    expect(out.trim()).toBe("");
  });
  it("send worker holds on failed history lookup and cancels all pending steps on reply", () => {
    const src = readFileSync("supabase/functions/outreach-send-worker/index.ts", "utf8");
    expect(src).toContain("EMAIL_HISTORY_UNAVAILABLE");
    expect(src).toMatch(/\.eq\("contact_id", item\.contact_id\)\.eq\("status", "pending"\)/);
  });
  it("scan and autopilot fail closed on lookup error", () => {
    expect(readFileSync("supabase/functions/lead-quality-scan/index.ts", "utf8")).toMatch(/EmailHistoryLookupError[\s\S]*503/);
    expect(readFileSync("supabase/functions/lead-quality-autopilot/index.ts", "utf8")).toContain("historyError ? []");
  });
});
