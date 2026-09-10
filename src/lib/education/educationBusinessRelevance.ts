// Deterministic, campaign-SPECIFIC education business relevance engine.
//
// IMPORTANT: this is intentionally SEPARATE from the campaign-neutral Apollo
// `education_role_score` (supabase/functions/_shared/educationRoleScorer.ts).
// Nothing here changes that score, Apollo behaviour or the Apollo Credit Firewall.
//
// One CRM contact (public.contacts) may be relevant to zero, one or many of the
// four education businesses. Relevance is recorded per business on
// public.business_contact_relationships — never by duplicating the contact.

import { EDUCATION_BUSINESSES, EducationBusinessSlug } from "./educationBusinesses";

export const RELEVANCE_ENGINE_VERSION = "edu-relevance-1.0.0";

export type RelevanceCategory =
  | "sen"
  | "wellbeing"
  | "pshe"
  | "curriculum"
  | "literacy"
  | "leadership"
  | "digital"
  | "safeguarding"
  | "innovation"
  | "procurement"
  | "partnerships"
  | "international"
  | "parent_experience";

const CATEGORY_KEYWORDS: Record<RelevanceCategory, string[]> = {
  sen: [
    "sen", "send", "senco", "special educational needs", "special needs", "inclusion",
    "inclusive", "additional needs", "learning support", "ehcp", "asn", "neurodiversity",
    "neurodivergent", "accessibility",
  ],
  wellbeing: [
    "wellbeing", "well-being", "well being", "pastoral", "mental health", "counselling",
    "counseling", "student support", "pupil support", "welfare",
  ],
  pshe: [
    "pshe", "rshe", "character", "citizenship", "student experience", "pupil experience",
    "student life", "enrichment", "behaviour", "behavior", "student voice",
  ],
  curriculum: [
    "curriculum", "teaching and learning", "teaching & learning", "pedagogy", "academic",
    "school improvement", "standards", "quality of education", "assessment", "eyfs",
  ],
  literacy: [
    "literacy", "reading", "english", "library", "librarian", "phonics", "books",
    "storytelling", "language",
  ],
  leadership: [
    "headteacher", "head teacher", "head of school", "principal", "executive head",
    "director of education", "chief education", "deputy head", "assistant head",
    "trust leader", "leader", "leadership", "ceo", "chief executive", "director",
    "head of", "superintendent", "provost",
  ],
  digital: [
    "digital", "edtech", "ed tech", "technology", "it director", "cio", "cto",
    "information technology", "digital learning", "online learning", "e-learning",
    "elearning", "data", "systems", "platform",
  ],
  safeguarding: [
    "safeguarding", "dsl", "designated safeguarding", "safety", "child protection",
    "compliance", "risk",
  ],
  innovation: ["innovation", "transformation", "future", "strategy", "change"],
  procurement: [
    "procurement", "purchasing", "commercial", "buyer", "sourcing", "contracts",
    "finance director", "cfo", "business manager", "sbm", "operations director",
    "chief operating", "coo",
  ],
  partnerships: [
    "partnership", "partnerships", "alliances", "external relations", "development",
    "engagement", "outreach", "stakeholder", "business development",
  ],
  international: [
    "international", "global", "regional", "emea", "apac", "mena", "overseas",
    "country director", "country head", "group director", "group head", "worldwide",
    "cross-border",
  ],
  parent_experience: [
    "parent", "admissions", "marketing", "communications", "community", "family",
    "enrolment", "enrollment", "brand",
  ],
};

type WeightMap = Partial<Record<RelevanceCategory, number>>;

const BUSINESS_WEIGHTS: Record<EducationBusinessSlug, WeightMap> = {
  // SEN deliberately dominant for Billy.
  "billy-and-the-wild-forest": {
    sen: 45,
    literacy: 22,
    wellbeing: 18,
    curriculum: 18,
    leadership: 14,
    pshe: 10,
    international: 4,
  },
  aurelia: {
    digital: 40,
    safeguarding: 25,
    innovation: 18,
    curriculum: 15,
    leadership: 14,
    procurement: 10,
    partnerships: 8,
  },
  kindnesss: {
    wellbeing: 38,
    pshe: 28,
    sen: 18,
    curriculum: 14,
    leadership: 12,
    parent_experience: 12,
    partnerships: 6,
  },
  "kingsbridge-global": {
    international: 40,
    partnerships: 26,
    leadership: 18,
    procurement: 14,
    curriculum: 10,
    parent_experience: 4,
  },
};

const SENIORITY_BONUS: Record<string, number> = {
  c_suite: 10,
  founder: 10,
  owner: 10,
  executive: 9,
  vp: 8,
  director: 8,
  head: 7,
  senior: 5,
  manager: 3,
  entry: 0,
  intern: 0,
};

export interface RelevanceContactInput {
  id?: string;
  role?: string | null;
  seniority?: string | null;
  company?: string | null;
  organisation_name?: string | null;
  education_role_family?: string | null;
  tags?: string[] | null;
}

export interface BusinessRelevanceResult {
  business_slug: EducationBusinessSlug;
  business_name: string;
  score: number;
  level: "high" | "medium" | "low" | "not_relevant";
  categories: RelevanceCategory[];
  reasons: string[];
  engine_version: string;
}

const HIGH_THRESHOLD = 60;
const MEDIUM_THRESHOLD = 40;
const LOW_THRESHOLD = 20;

export const RELEVANCE_QUALIFICATION_THRESHOLD = MEDIUM_THRESHOLD;

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9&\s-]/g, " ").replace(/\s+/g, " ").trim();
}

/** Deterministic category detection from role/company/family text. */
export function detectCategories(contact: RelevanceContactInput): RelevanceCategory[] {
  const haystack = normalise(
    [
      contact.role ?? "",
      contact.education_role_family ?? "",
      (contact.tags ?? []).join(" "),
      contact.organisation_name ?? contact.company ?? "",
    ].join(" "),
  );
  const found: RelevanceCategory[] = [];
  (Object.keys(CATEGORY_KEYWORDS) as RelevanceCategory[]).forEach((cat) => {
    const hit = CATEGORY_KEYWORDS[cat].some((kw) => haystack.includes(kw));
    if (hit) found.push(cat);
  });
  return found;
}

function seniorityBonus(seniority?: string | null): number {
  if (!seniority) return 0;
  const key = normalise(seniority).replace(/[\s-]+/g, "_");
  return SENIORITY_BONUS[key] ?? 0;
}

function levelFor(score: number): BusinessRelevanceResult["level"] {
  if (score >= HIGH_THRESHOLD) return "high";
  if (score >= MEDIUM_THRESHOLD) return "medium";
  if (score >= LOW_THRESHOLD) return "low";
  return "not_relevant";
}

export function scoreBusinessRelevance(
  contact: RelevanceContactInput,
  slug: EducationBusinessSlug,
): BusinessRelevanceResult {
  const definition = EDUCATION_BUSINESSES.find((b) => b.slug === slug)!;
  const weights = BUSINESS_WEIGHTS[slug];
  const categories = detectCategories(contact);
  const matched = categories.filter((c) => (weights[c] ?? 0) > 0);

  let raw = matched.reduce((sum, c) => sum + (weights[c] ?? 0), 0);
  const reasons: string[] = matched
    .sort((a, b) => (weights[b] ?? 0) - (weights[a] ?? 0))
    .map((c) => `${c}:+${weights[c]}`);

  if (raw > 0) {
    const bonus = seniorityBonus(contact.seniority);
    if (bonus > 0) {
      raw += bonus;
      reasons.push(`seniority:+${bonus}`);
    }
  }

  const score = Math.max(0, Math.min(100, raw));
  return {
    business_slug: slug,
    business_name: definition.name,
    score,
    level: levelFor(score),
    categories: matched,
    reasons,
    engine_version: RELEVANCE_ENGINE_VERSION,
  };
}

/** Scores one CRM contact against all four education businesses. */
export function scoreAllEducationBusinesses(contact: RelevanceContactInput): BusinessRelevanceResult[] {
  return EDUCATION_BUSINESSES.map((b) => scoreBusinessRelevance(contact, b.slug));
}

/** Only the businesses this contact is actually relevant to (>= medium). */
export function relevantEducationBusinesses(
  contact: RelevanceContactInput,
  minScore = RELEVANCE_QUALIFICATION_THRESHOLD,
): BusinessRelevanceResult[] {
  return scoreAllEducationBusinesses(contact).filter((r) => r.score >= minScore);
}

/**
 * Business relationship rows to upsert for one contact.
 * Exactly one row per relevant business; the contacts row is never duplicated.
 */
export interface BusinessRelationshipUpsert {
  contact_id: string;
  business_name: string;
  relevance_category: string;
  business_relevance_score: number;
  business_relevance_level: string;
  business_relevance_reasons: string[];
  business_relevance_categories: string[];
  relevance_engine_version: string;
  campaign_eligible: boolean;
  qualification_reason: string;
}

export function buildRelationshipUpserts(
  contactId: string,
  contact: RelevanceContactInput,
  minScore = RELEVANCE_QUALIFICATION_THRESHOLD,
): BusinessRelationshipUpsert[] {
  return relevantEducationBusinesses(contact, minScore).map((r) => ({
    contact_id: contactId,
    business_name: r.business_name,
    relevance_category: r.categories[0] ?? "general",
    business_relevance_score: r.score,
    business_relevance_level: r.level,
    business_relevance_reasons: r.reasons,
    business_relevance_categories: r.categories,
    relevance_engine_version: r.engine_version,
    // Relevance alone never authorises sending; eligibility is decided by the gate.
    campaign_eligible: false,
    qualification_reason: `${r.engine_version} score=${r.score} (${r.reasons.join(", ")})`,
  }));
}
