// Deterministic, campaign-neutral EDUCATION role scorer (Stage 4).
//
// Completely independent of the Neon Candy / music taxonomy. It answers one
// question only: how useful is this person as an education buying route for a
// group/operator account? Product-specific fit can be layered on later.

export type EducationRoleFamily =
  | "executive_sponsor"
  | "education_academic_leadership"
  | "curriculum_teaching_learning"
  | "innovation_digital_technology"
  | "sen_inclusion_wellbeing"
  | "procurement_commercial_partnerships"
  | "marketing_admissions_parent_experience"
  | "regional_group_leadership"
  | "unclassified";

export interface EducationRoleScore {
  role_family: EducationRoleFamily;
  score: number;              // 0–100
  reasons: string[];
  penalties: string[];
  group_scope: "group" | "regional" | "single_site" | "unknown";
  buying_authority: "high" | "medium" | "low";
  relevant: boolean;          // false = should not be retained as a buying route
}

interface FamilyRule {
  family: EducationRoleFamily;
  base: number;
  authority: "high" | "medium" | "low";
  patterns: RegExp[];
  label: string;
}

// Order matters: the first matching family wins, most senior/most specific first.
const FAMILY_RULES: FamilyRule[] = [
  {
    family: "executive_sponsor",
    base: 60,
    authority: "high",
    label: "Group executive sponsor",
    patterns: [
      /\b(chief executive|ceo|group ceo|managing director|group md|chief operating officer|coo|president|general manager|chief financial officer|cfo|founder|owner|board member|trustee|chair)\b/i,
    ],
  },
  {
    family: "education_academic_leadership",
    base: 58,
    authority: "high",
    label: "Education / academic leadership",
    patterns: [
      /\b(chief education officer|chief academic officer|chief learning officer|director of education|education director|director of academics|academic director|director of learning|head of education|group head of education|director of schools|superintendent|executive principal|group principal)\b/i,
    ],
  },
  {
    family: "curriculum_teaching_learning",
    base: 50,
    authority: "medium",
    label: "Curriculum / teaching & learning",
    patterns: [
      /\b(curriculum|teaching and learning|teaching & learning|head of learning|assessment lead|director of studies|deputy head academic|pedagog)\b/i,
    ],
  },
  {
    family: "innovation_digital_technology",
    base: 52,
    authority: "medium",
    label: "Innovation / digital / technology",
    patterns: [
      /\b(chief information officer|cio|chief technology officer|cto|chief digital officer|chief innovation officer|director of technology|head of it|head of ict|director of digital|digital learning|edtech|head of innovation|director of innovation|head of digital)\b/i,
    ],
  },
  {
    family: "sen_inclusion_wellbeing",
    base: 48,
    authority: "medium",
    label: "SEN / inclusion / wellbeing / safeguarding",
    patterns: [
      /\b(sen|send|senco|special educational needs|inclusion|learning support|wellbeing|well-being|pastoral|safeguard|designated safeguarding lead|counsell?ing lead|student support|mental health lead)\b/i,
    ],
  },
  {
    family: "procurement_commercial_partnerships",
    base: 50,
    authority: "high",
    label: "Procurement / commercial / partnerships",
    patterns: [
      /\b(procurement|purchasing|sourcing|commercial director|head of commercial|contracts manager|partnership|alliances|business development director|finance director|head of finance)\b/i,
    ],
  },
  {
    family: "marketing_admissions_parent_experience",
    base: 42,
    authority: "medium",
    label: "Marketing / admissions / parent experience",
    patterns: [
      /\b(admission|enrol|enroll|marketing|communications|brand|parent experience|parent relations|customer experience|retention)\b/i,
    ],
  },
  {
    family: "regional_group_leadership",
    base: 54,
    authority: "high",
    label: "Regional / group leadership",
    patterns: [
      /\b(regional director|regional head|regional manager|group director|group head|cluster (head|director)|head of region|country director|country head|vice president|vp)\b/i,
    ],
  },
];

const GROUP_SCOPE = /\b(group|global|international|worldwide|corporate|central|head office|hq|multi-?academy|trust)\b/i;
const REGIONAL_SCOPE = /\b(regional|region|country|cluster|middle east|apac|emea|asia|europe|africa|americas|gcc|uae|mena)\b/i;
const SINGLE_SITE = /\b(school|campus|academy|college)\b/i;

const SENIORITY_BOOSTS: Array<[RegExp, number, string]> = [
  [/\b(chief|c-suite|cxo|ceo|coo|cfo|cio|cto)\b/i, 12, "C-suite title"],
  [/\b(group|global)\b/i, 8, "Group-wide remit"],
  [/\b(director|vice president|\bvp\b)\b/i, 7, "Director-level authority"],
  [/\b(head of)\b/i, 4, "Functional head"],
  [/\b(manager|lead)\b/i, 2, "Manager/lead level"],
];

// Penalised matches — kept but downranked, or dropped as irrelevant.
const PENALTIES: Array<[RegExp, number, string, boolean]> = [
  [/\b(nursery|pre-?school|early years|kindergarten|creche|childcare|eyfs)\b/i, 22, "early_years_only_focus", false],
  [/\b(university|universities|higher education|faculty|professor|lecturer|dean|postgraduate|phd|campus dean|tertiary)\b/i, 26, "tertiary_not_k12", false],
  [/\b(teacher|teaching assistant|classroom assistant|tutor|instructor|coach|substitute|supply teacher|form tutor)\b/i, 24, "classroom_only_no_buying_remit", false],
  [/\b(intern|student|apprentice|volunteer|graduate trainee)\b/i, 40, "not_a_buyer", true],
  [/\b(driver|janitor|caretaker|cleaner|security guard|receptionist|nurse|catering|chef|bus)\b/i, 45, "operational_support_role", true],
  [/\b(recruiter|talent acquisition|hr |human resources|payroll)\b/i, 18, "internal_people_function", false],
];

const RELEVANCE_FLOOR = 25;

/**
 * Deterministic education role score.
 * Same inputs always produce the same output — no AI, no randomness.
 */
export function scoreEducationRole(input: {
  title?: string | null;
  organisation?: string | null;
  seniority?: string | null;
}): EducationRoleScore {
  const title = String(input.title ?? "").trim();
  const org = String(input.organisation ?? "").trim();
  const seniority = String(input.seniority ?? "").trim();
  const hay = `${title} ${seniority}`;
  const reasons: string[] = [];
  const penalties: string[] = [];

  let family: EducationRoleFamily = "unclassified";
  let score = 10;
  let authority: "high" | "medium" | "low" = "low";

  for (const rule of FAMILY_RULES) {
    if (rule.patterns.some((p) => p.test(hay))) {
      family = rule.family;
      score = rule.base;
      authority = rule.authority;
      reasons.push(`${rule.label} match`);
      break;
    }
  }
  if (family === "unclassified") reasons.push("No education role-family match");

  for (const [re, boost, why] of SENIORITY_BOOSTS) {
    if (re.test(hay)) {
      score += boost;
      reasons.push(why);
      break;
    }
  }

  let group_scope: EducationRoleScore["group_scope"] = "unknown";
  if (GROUP_SCOPE.test(hay) || GROUP_SCOPE.test(org)) {
    group_scope = "group";
    score += 8;
    reasons.push("Group/central scope signal");
  } else if (REGIONAL_SCOPE.test(hay)) {
    group_scope = "regional";
    score += 5;
    reasons.push("Regional scope signal");
  } else if (SINGLE_SITE.test(hay)) {
    group_scope = "single_site";
  }

  let hardIrrelevant = false;
  for (const [re, cost, label, hard] of PENALTIES) {
    if (re.test(hay)) {
      score -= cost;
      penalties.push(label);
      if (hard) hardIrrelevant = true;
    }
  }

  if (!title) {
    score -= 15;
    penalties.push("missing_title");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  if (hardIrrelevant) authority = "low";

  return {
    role_family: family,
    score,
    reasons,
    penalties,
    group_scope,
    buying_authority: authority,
    relevant: !hardIrrelevant && family !== "unclassified" && score >= RELEVANCE_FLOOR,
  };
}

/** Education-safe People Search titles. Contains no music/Neon Candy taxonomy. */
export const EDUCATION_SEARCH_TITLES: string[] = [
  "Chief Executive Officer", "Managing Director", "Chief Operating Officer", "Chief Financial Officer",
  "Chief Education Officer", "Chief Academic Officer", "Chief Learning Officer",
  "Director of Education", "Education Director", "Director of Learning", "Head of Education",
  "Director of Teaching and Learning", "Head of Curriculum", "Director of Studies",
  "Chief Information Officer", "Chief Technology Officer", "Chief Digital Officer",
  "Director of Technology", "Head of IT", "Director of Digital Learning", "Head of Innovation",
  "Head of Inclusion", "SENCO", "Director of Wellbeing", "Head of Safeguarding", "Head of Pastoral Care",
  "Head of Procurement", "Procurement Manager", "Commercial Director", "Director of Partnerships",
  "Director of Admissions", "Head of Admissions", "Marketing Director", "Head of Marketing",
  "Regional Director", "Group Director", "Country Director", "Head of School", "Principal",
];

export const EDUCATION_SEARCH_SENIORITIES: string[] = [
  "c_suite", "vp", "director", "head", "manager", "owner", "founder", "partner",
];
