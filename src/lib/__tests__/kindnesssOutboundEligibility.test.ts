import { describe, expect, it } from "vitest";
import {
  KINDNESSS_BUSINESS_ID, buildPilotSchedule, checkStepCopy, classifyAll, mayReceiveNextStep, pilotPreflight, summarise,
  type CandidateRow,
} from "@/lib/kindnesss/outboundEligibility";

const row = (o: Partial<CandidateRow> = {}): CandidateRow => ({
  contactId: Math.random().toString(36), businessId: KINDNESSS_BUSINESS_ID, email: `p${Math.random()}@school.example`,
  country: "United Kingdom", lawfulBasis: "legitimate_interests", emailVerifiedStatus: "verified",
  isGloballySuppressed: false, hardBounced: false, unsubscribed: false, doNotContact: false, isInternal: false, archived: false, ...o,
});

// Read-only snapshot of the live 30 (14 Oct 2026 10:54 UTC): countries + recorded basis.
const LIVE_COUNTRIES = ["Argentina","Mexico","United Kingdom","Brazil","United Kingdom","United Kingdom","United States","Malaysia","Spain","United Arab Emirates","United Arab Emirates","United Arab Emirates","United Kingdom","United Kingdom","Malaysia","United Kingdom","Pakistan","Hong Kong","Hong Kong","Hong Kong","Hong Kong","United Arab Emirates","Egypt","Lebanon","Iraq","Spain","United Kingdom","United Kingdom","United Kingdom","United Kingdom"];
const PROVISIONAL_IDX = new Set([12, 13, 29]);
const liveSnapshot = LIVE_COUNTRIES.map((country, i) => row({ country, lawfulBasis: PROVISIONAL_IDX.has(i) ? "legitimate_interests_provisional" : null }));

describe("bulk eligibility (fail closed)", () => {
  it("passes a fully evidenced UK record", () => {
    expect(classifyAll([row()])[0]).toMatchObject({ eligible: true, reasons: [] });
  });
  it("blocks unknown country, missing and provisional basis", () => {
    const c = classifyAll([row({ country: "Iraq" }), row({ lawfulBasis: null }), row({ lawfulBasis: "legitimate_interests_provisional" }), row({ country: null })]);
    expect(c.map((x) => x.reasons)).toEqual([["unknown_country"], ["no_lawful_basis"], ["provisional_lawful_basis"], ["unknown_country"]]);
  });
  it("blocks basis not accepted for country (Spain needs consent)", () => {
    expect(classifyAll([row({ country: "Spain" })])[0].reasons).toEqual(["basis_not_accepted_for_country"]);
  });
  it("blocks suppression, bounce, unsubscribe, DNC, internal, archived, unverified, duplicate, invalid", () => {
    const dup = "same@school.example";
    const c = classifyAll([
      row({ isGloballySuppressed: true }), row({ hardBounced: true }), row({ unsubscribed: true }), row({ doNotContact: true }),
      row({ isInternal: true }), row({ archived: true }), row({ emailVerifiedStatus: "risky" }), row({ email: dup }), row({ email: dup.toUpperCase() }), row({ email: "bad" }),
    ]);
    expect(c.map((x) => x.reasons[0])).toEqual(["globally_suppressed", "hard_bounced", "unsubscribed", "do_not_contact", "internal", "archived", "unverified_email", undefined, "duplicate_email", "invalid_email"]);
  });
  it("isolates businesses and excludes private family/education records", () => {
    const c = classifyAll([row({ businessId: "other" }), row({ tags: ["family"] }), row({ dataSource: "founder_private_family" })]);
    expect(c.map((x) => x.reasons)).toEqual([["wrong_business"], ["private_record"], ["private_record"]]);
  });
  it("live snapshot: 0 of 30 can send today", () => {
    const s = summarise(classifyAll(liveSnapshot));
    expect(s.eligible).toBe(0);
    expect(s.byReason).toMatchObject({ no_lawful_basis: 27, provisional_lawful_basis: 3 });
  });
});

describe("schedule: 5 steps, 4 working days apart from actual start", () => {
  it("refuses expired 13 Oct and past dates", () => {
    expect(() => buildPilotSchedule("2026-10-13", "2026-10-13")).toThrow("start_date_expired");
    expect(() => buildPilotSchedule("2026-10-12", "2026-10-14")).toThrow("start_date_in_past");
    expect(() => buildPilotSchedule("2026-10-17", "2026-10-14")).toThrow("start_date_not_working_day");
  });
  it("computes Mon–Fri gaps from a Thursday start", () => {
    const s = buildPilotSchedule("2026-10-15", "2026-10-14");
    expect(s.sendDates).toEqual(["2026-10-15", "2026-10-21", "2026-10-27", "2026-11-02", "2026-11-06"]);
    expect(s.calendarGaps).toEqual([6, 6, 6, 4]);
  });
  it("skips declared holidays", () => {
    expect(buildPilotSchedule("2026-10-15", "2026-10-14", ["2026-10-19"]).sendDates[1]).toBe("2026-10-22");
  });
});

describe("copy + stop rules", () => {
  const ok = Array.from({ length: 5 }, (_, i) => ({ subject: i ? "" : "Hello", body: "Hi %signature% %unsubscribe-text%" }));
  it("requires signature + unsubscribe tokens on every step and threaded follow-ups", () => {
    expect(checkStepCopy(ok).ok).toBe(true);
    expect(checkStepCopy([...ok.slice(0, 4), { subject: "New", body: "x" }]).problems).toEqual(["step_5_missing_signature", "step_5_missing_unsubscribe", "step_5_breaks_thread_subject"]);
  });
  it("stops on reply/unsubscribe/bounce/complaint/objection/suppression, not on opens", () => {
    for (const e of ["reply", "unsubscribe", "bounce", "complaint", "objection", "suppressed"] as const) expect(mayReceiveNextStep(["sent", e])).toBe(false);
    expect(mayReceiveNextStep(["sent", "open"])).toBe(true);
  });
});

describe("30-lead pilot preflight against live evidence", () => {
  it("is NO-GO with the exact current blockers", () => {
    const r = pilotPreflight({
      classifications: classifyAll(liveSnapshot),
      senders: [
        { smartleadId: "24265073", smtpOk: true, imapOk: true, warmupStatus: "warming", readinessState: "warming" },
        { smartleadId: "24265132", smtpOk: true, imapOk: true, warmupStatus: "warming", readinessState: "warming" },
      ],
      campaign: { id: "4103531", status: "DRAFTED", remoteLeadCount: 6, maxLeadsPerDay: 3, stopOnReply: true },
      gates: { smartlead_campaign_start_gate: false, smartlead_lead_push_gate: false },
      webhookSigningVerified: false,
      copy: { ok: true, launchApprovedInLiftor: false, renderedTestVerified: false },
      schedule: null,
    });
    expect(r.go).toBe(false);
    expect(r.blockers).toEqual([
      "eligible_0_of_30",
      "sender_24265073_not_campaign_ready(warming)",
      "sender_24265132_not_campaign_ready(warming)",
      "campaign_holds_6_preloaded_leads_reconcile_without_deleting",
      "gate_off:smartlead_campaign_start_gate",
      "gate_off:smartlead_lead_push_gate",
      "webhook_signing_unverified",
      "copy_not_launch_approved",
      "signature_unsubscribe_render_untested",
      "no_actual_start_date",
    ]);
  });
  it("rejects a raised daily cap", () => {
    const r = pilotPreflight({ classifications: [], senders: [], campaign: { id: "4103531", status: "DRAFTED", remoteLeadCount: 0, maxLeadsPerDay: 30, stopOnReply: true }, gates: {}, webhookSigningVerified: true, copy: { ok: true, launchApprovedInLiftor: true, renderedTestVerified: true }, schedule: null });
    expect(r.blockers).toContain("daily_cap_above_approved");
  });
});
