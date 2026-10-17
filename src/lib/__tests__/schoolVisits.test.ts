import { describe, it, expect } from "vitest";
import { normaliseAnswer, startAssessment, mergeObservations, mergeFollowups, summarise, newSchoolKey, type VisitFramework } from "@/lib/schoolVisits/schoolVisits";
import { navGroups } from "@/components/founder/FounderLayout";

const fw: VisitFramework = { sections: [{ title: "S", criteria: [
  { key: "A", label: "a", dimension: "x" }, { key: "B", label: "b", dimension: "x" }, { key: "C", label: "c", dimension: "x" },
] }] };

describe("school visit rules", () => {
  it("drops a rating without evidence or on unchecked criteria", () => {
    expect(normaliseAnswer({ assessment: "confirmed", rating: 4, evidence: "" }).rating).toBeNull();
    expect(normaliseAnswer({ assessment: "not_checked", rating: 4, evidence: "seen" }).rating).toBeNull();
    expect(normaliseAnswer({ assessment: "confirmed", rating: 4, evidence: "seen" }).rating).toBe(4);
    expect(normaliseAnswer({ assessment: "concern", rating: 9, evidence: "seen" }).rating).toBeNull();
  });
  it("starting an assessment does not set a visit status or date", () => {
    const va = startAssessment("t", "2026-10-17T00:00:00Z");
    expect(va).not.toHaveProperty("visit_status");
    expect(va).not.toHaveProperty("visit_date");
  });
  it("missing evidence is counted as not checked, never scored", () => {
    const s = summarise(fw, { criteria: { A: { assessment: "confirmed", rating: 5, evidence: "ok", follow_up: "" } } });
    expect(s).toMatchObject({ confirmed: 1, not_checked: 2, rated: 1, avgRating: 5 });
    expect(summarise(fw, {}).avgRating).toBeNull();
  });
  it("preserves existing observations and non-visit follow-ups", () => {
    expect(mergeObservations({ note: "n" }, { travel: "t" })).toEqual({ note: "n", visit_fields: { travel: "t" } });
    const out = mergeFollowups([{ kind: "pipeline", x: 1 }, { kind: "visit_followup", id: "old" }],
      [{ id: "new", kind: "visit_followup", action: "a", owner: "o", due_date: null, done: false }]);
    expect(out).toEqual([{ kind: "pipeline", x: 1 }, { id: "new", kind: "visit_followup", action: "a", owner: "o", due_date: null, done: false }]);
  });
  it("new school keys never collide with existing ones", () => {
    expect(newSchoolKey("St Example", ["st-example"])).toBe("st-example-2");
  });
  it("founder nav links School Visit Assessments", () => {
    expect(navGroups.flatMap((g) => g.items).filter((i) => i.to === "/founder/school-visits")).toHaveLength(1);
  });
});
