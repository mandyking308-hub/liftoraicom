/**
 * Founder-only School Visit Assessments: pure helpers.
 * No school data lives in source — everything is read from the RLS-protected
 * founder_school_visit_* tables after the founder/admin guard passes.
 */

export const ASSESSMENT_STATUSES = ["not_checked", "confirmed", "concern", "follow_up", "not_applicable"] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

export const VISIT_STATUSES = ["not_verified", "booked", "visited", "current_school", "historical_experience"] as const;
export const RECORD_KINDS = ["prospective_school", "current_school", "prior_school"] as const;

export interface TemplateCriterion { key: string; label: string; dimension: string }
export interface TemplateSection { title: string; criteria: TemplateCriterion[] }
export interface VisitFramework {
  sections: TemplateSection[];
  status_options?: string[];
  decision_options?: string[];
  non_negotiables?: string[];
  evidence_prompts?: string[];
  weights_percent?: Record<string, number>;
  scoring_guidance?: string;
}

export interface CriterionAnswer {
  assessment: AssessmentStatus;
  rating: number | null;
  evidence: string;
  follow_up: string;
}

export interface VisitAssessment {
  template_key?: string;
  started_at?: string;
  updated_at?: string;
  criteria?: Record<string, CriterionAnswer>;
}

export interface FollowUp { id: string; kind: "visit_followup"; action: string; owner: string; due_date: string | null; done: boolean }

/** Visit detail fields stored under structured_observations.visit_fields. */
export const VISIT_FIELDS: { key: string; label: string; long?: boolean }[] = [
  { key: "who_we_met", label: "People met" },
  { key: "curriculum_assessment_evidence", label: "Curriculum / assessment evidence", long: true },
  { key: "year_group_numbers", label: "Year group size" },
  { key: "girls_cohort_size", label: "Girls in cohort" },
  { key: "tutor_ownership", label: "Tutor" },
  { key: "bullying_intervention_example", label: "Bullying intervention", long: true },
  { key: "send_support", label: "SEND / learning support", long: true },
  { key: "parent_communication", label: "Parent communication", long: true },
  { key: "clubs_cross_year", label: "Clubs / cross-year mixing", long: true },
  { key: "travel", label: "Travel / commute" },
  { key: "christine_reaction", label: "Christine's reaction", long: true },
  { key: "parent_strengths", label: "Strengths", long: true },
  { key: "parent_concerns", label: "Concerns", long: true },
  { key: "decision_rationale", label: "Decision rationale", long: true },
];

export const allCriteria = (f: VisitFramework | null | undefined): TemplateCriterion[] =>
  (f?.sections ?? []).flatMap((s) => s.criteria ?? []);

export const emptyAnswer = (): CriterionAnswer => ({ assessment: "not_checked", rating: null, evidence: "", follow_up: "" });

export const hasStarted = (va: VisitAssessment | null | undefined) => !!va?.started_at;

/** Rating is only kept when the status is evidence-backed and evidence text exists. */
export function normaliseAnswer(a: Partial<CriterionAnswer>): CriterionAnswer {
  const assessment = (ASSESSMENT_STATUSES as readonly string[]).includes(a.assessment ?? "")
    ? (a.assessment as AssessmentStatus) : "not_checked";
  const evidence = (a.evidence ?? "").trim();
  const supported = (assessment === "confirmed" || assessment === "concern") && evidence.length > 0;
  const r = typeof a.rating === "number" && Number.isInteger(a.rating) && a.rating >= 1 && a.rating <= 5 ? a.rating : null;
  return { assessment, rating: supported ? r : null, evidence: a.evidence ?? "", follow_up: a.follow_up ?? "" };
}

/** Starts an assessment without touching visit_status (never auto-marks visited/booked). */
export function startAssessment(templateKey: string, now = new Date().toISOString()): VisitAssessment {
  return { template_key: templateKey, started_at: now, updated_at: now, criteria: {} };
}

/** Merges new visit fields into existing observations, preserving prior keys. */
export function mergeObservations(existing: Record<string, unknown> | null | undefined, visitFields: Record<string, string>) {
  const prev = (existing ?? {}) as Record<string, unknown>;
  const prevFields = (prev.visit_fields ?? {}) as Record<string, string>;
  return { ...prev, visit_fields: { ...prevFields, ...visitFields } };
}

/** Replaces only visit follow-ups; any other entries (e.g. pipeline contact data) are kept. */
export function mergeFollowups(existing: unknown, visitFollowups: FollowUp[]): unknown[] {
  const arr = Array.isArray(existing) ? existing : [];
  const others = arr.filter((e) => !(e && typeof e === "object" && (e as { kind?: string }).kind === "visit_followup"));
  return [...others, ...visitFollowups];
}

export interface CriterionSummary { confirmed: number; concern: number; follow_up: number; not_applicable: number; not_checked: number; rated: number; avgRating: number | null }

/** Summary uses only recorded evidence; unchecked criteria are counted, never scored. */
export function summarise(f: VisitFramework | null | undefined, va: VisitAssessment | null | undefined): CriterionSummary {
  const s: CriterionSummary = { confirmed: 0, concern: 0, follow_up: 0, not_applicable: 0, not_checked: 0, rated: 0, avgRating: null };
  let sum = 0;
  for (const c of allCriteria(f)) {
    const a = normaliseAnswer(va?.criteria?.[c.key] ?? {});
    s[a.assessment]++;
    if (a.rating != null) { s.rated++; sum += a.rating; }
  }
  s.avgRating = s.rated ? Math.round((sum / s.rated) * 10) / 10 : null;
  return s;
}

/** Builds a unique school_key for a new record; never reuses an existing one. */
export function newSchoolKey(name: string, existing: string[]): string {
  const base = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "school";
  let k = base, i = 2;
  const set = new Set(existing);
  while (set.has(k)) k = `${base}-${i++}`;
  return k;
}

export const label = (s: string) => s.replace(/_/g, " ");
