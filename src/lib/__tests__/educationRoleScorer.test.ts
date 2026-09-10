import { describe, it, expect } from "vitest";
import {
  scoreEducationRole,
  EDUCATION_SEARCH_TITLES,
} from "../../../supabase/functions/_shared/educationRoleScorer";

describe("education role scorer — families", () => {
  const cases: Array<[string, string]> = [
    ["Group Chief Executive Officer", "executive_sponsor"],
    ["Director of Education", "education_academic_leadership"],
    ["Head of Curriculum", "curriculum_teaching_learning"],
    ["Chief Digital Officer", "innovation_digital_technology"],
    ["Head of Inclusion and SEN", "sen_inclusion_wellbeing"],
    ["Head of Procurement", "procurement_commercial_partnerships"],
    ["Director of Admissions", "marketing_admissions_parent_experience"],
    ["Regional Director", "regional_group_leadership"],
  ];
  it.each(cases)("classifies %s", (title, family) => {
    expect(scoreEducationRole({ title }).role_family).toBe(family);
  });
});

describe("education role scorer — determinism and reasons", () => {
  it("is deterministic", () => {
    const a = scoreEducationRole({ title: "Group Director of Education", organisation: "Global Schools Group" });
    const b = scoreEducationRole({ title: "Group Director of Education", organisation: "Global Schools Group" });
    expect(a).toEqual(b);
  });

  it("always gives reasons", () => {
    expect(scoreEducationRole({ title: "Chief Education Officer" }).reasons.length).toBeGreaterThan(0);
    expect(scoreEducationRole({ title: "Something Unrelated" }).reasons.length).toBeGreaterThan(0);
  });

  it("ranks a group education leader above a single-site admissions manager", () => {
    const senior = scoreEducationRole({ title: "Group Director of Education" });
    const junior = scoreEducationRole({ title: "Admissions Manager, Campus" });
    expect(senior.score).toBeGreaterThan(junior.score);
  });
});

describe("education role scorer — penalties", () => {
  it("penalises early-years-only roles", () => {
    const r = scoreEducationRole({ title: "Head of Early Years Curriculum" });
    expect(r.penalties).toContain("early_years_only_focus");
  });

  it("penalises tertiary roles", () => {
    const r = scoreEducationRole({ title: "University Dean of Faculty" });
    expect(r.penalties).toContain("tertiary_not_k12");
  });

  it("penalises classroom-only roles", () => {
    const r = scoreEducationRole({ title: "Mathematics Teacher" });
    expect(r.penalties).toContain("classroom_only_no_buying_remit");
  });

  it("marks non-buyers as irrelevant", () => {
    expect(scoreEducationRole({ title: "Marketing Intern" }).relevant).toBe(false);
    expect(scoreEducationRole({ title: "School Bus Driver" }).relevant).toBe(false);
  });

  it("penalises a missing title", () => {
    expect(scoreEducationRole({ title: "" }).penalties).toContain("missing_title");
  });
});

describe("education role scorer — campaign neutrality", () => {
  it("contains no Neon Candy or music taxonomy in the search titles", () => {
    const joined = EDUCATION_SEARCH_TITLES.join(" ").toLowerCase();
    for (const banned of ["music", "neon", "candy", "sweet", "confection", "dj", "band"]) {
      expect(joined).not.toContain(banned);
    }
  });

  it("does not reward music-specific titles", () => {
    expect(scoreEducationRole({ title: "Head of Music Programming" }).relevant).toBe(false);
  });
});
