import { describe, expect, it, vi } from "vitest";
import { filterAdmissions, isConfirmedBooking, mergeAdmissions, readAdmissions, saveAdmissions, validDate,
  type AdmissionsRecord, type AdmissionsStore } from "@/lib/schoolVisits/schoolAdmissions";

const record = (id: string, admissions: Record<string, unknown> = {}, kind = "prospective_school"): AdmissionsRecord =>
  ({ id, school_name: "", record_kind: kind, structured_observations: { admissions } });

describe("private school admissions rules", () => {
  it("keeps unknown dates and status unknown without inventing a booking", () => {
    const a = readAdmissions(null);
    expect(a).toMatchObject({ status: "not_started", diary_status: "unknown", diary_date: "", application_deadline: "" });
    expect(isConfirmedBooking(a)).toBe(false);
  });
  it("requested and offered dates never count as confirmed bookings", () => {
    for (const diary_status of ["requested", "offered", "awaiting_confirmation"]) {
      expect(isConfirmedBooking(readAdmissions({ admissions: { diary_status, diary_date: "2026-10-25" } }))).toBe(false);
    }
    expect(isConfirmedBooking(readAdmissions({ admissions: { diary_status: "confirmed", diary_date: "2026-10-25" } }))).toBe(true);
  });
  it("preserves visit fields, history, unknown admissions keys and input immutability", () => {
    const existing = { visit_fields: { travel: "retained" }, history: [1], admissions: { provenance: "retained" } };
    const before = structuredClone(existing);
    const next = mergeAdmissions(existing, { ...readAdmissions(existing), next_action: "Review" });
    expect(next).toEqual({ ...existing, admissions: { provenance: "retained", ...readAdmissions(existing), next_action: "Review" } });
    expect(existing).toEqual(before);
  });
  it("sorts active urgent deadlines first and unknown dates last without dropping history", () => {
    const rows = [record("unknown"), record("later", { application_deadline: "2026-11-01" }),
      record("urgent", { application_deadline: "2026-10-22" }), record("closed", { status: "withdrawn", application_deadline: "2026-10-01" }, "prior_school")];
    expect(filterAdmissions(rows, "").map((r) => r.id)).toEqual(["urgent", "later", "unknown", "closed"]);
    expect(rows[0].id).toBe("unknown");
  });
  it("filters by status, diary status, type and action/owner search", () => {
    const rows = [record("match", { status: "applying", diary_status: "requested", action_owner: "Owner", next_action: "Review" }), record("other")];
    expect(filterAdmissions(rows, "owner", "applying", "requested", "prospective_school").map((r) => r.id)).toEqual(["match"]);
    expect(filterAdmissions(rows, "owner", "submitted")).toEqual([]);
    expect(filterAdmissions(rows, "review", "all", "confirmed")).toEqual([]);
    expect(filterAdmissions(rows, "", "all", "all", "prior_school")).toEqual([]);
  });
  it("rejects impossible dates and confirmed bookings without a date before any write", async () => {
    expect(validDate("2026-02-30")).toBe("");
    const store = { read: vi.fn(), compareAndSet: vi.fn() };
    await expect(saveAdmissions(store, "id", { ...readAdmissions({}), diary_status: "confirmed" })).rejects.toThrow("valid date");
    await expect(saveAdmissions(store, "id", { ...readAdmissions({}), application_deadline: "2026-02-30" })).rejects.toThrow("valid date");
    expect(store.read).not.toHaveBeenCalled();
    expect(store.compareAndSet).not.toHaveBeenCalled();
  });
  it("saves only the selected school observations and preserves assessments and followups", async () => {
    const rows: Record<string, Record<string, unknown>> = {
      one: { structured_observations: { visit_fields: { travel: "retained" } }, visit_assessment: { criteria: {} }, contact_followups: [1] },
      two: { structured_observations: { history: [2] } },
    };
    const before = structuredClone(rows);
    const store: AdmissionsStore = {
      read: async (id) => rows[id].structured_observations,
      compareAndSet: async (id, previous, next) => {
        if (rows[id].structured_observations !== previous) return false;
        rows[id].structured_observations = next; return true;
      },
    };
    await saveAdmissions(store, "one", { ...readAdmissions({}), diary_status: "requested", diary_date: "2026-10-25" });
    expect(rows.two).toEqual(before.two);
    expect(rows.one.visit_assessment).toEqual(before.one.visit_assessment);
    expect(rows.one.contact_followups).toEqual(before.one.contact_followups);
    expect(readAdmissions(rows.one.structured_observations).diary_status).toBe("requested");
    expect(rows.one).not.toHaveProperty("visit_status");
  });
  it("refuses a concurrent JSONB update instead of overwriting it", async () => {
    const store: AdmissionsStore = { read: async () => ({ history: [1] }), compareAndSet: async () => false };
    await expect(saveAdmissions(store, "one", readAdmissions({}))).rejects.toThrow("changed while saving");
  });
  it("propagates RLS denial and never attempts a write after denied read", async () => {
    const store = { read: vi.fn().mockRejectedValue(new Error("denied")), compareAndSet: vi.fn() };
    await expect(saveAdmissions(store, "one", readAdmissions({}))).rejects.toThrow("denied");
    expect(store.compareAndSet).not.toHaveBeenCalled();
  });
});