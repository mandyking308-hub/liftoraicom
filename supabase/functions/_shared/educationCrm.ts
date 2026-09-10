import type { EducationRoleScore } from "./educationRoleScorer.ts";
import type { NormalisedEducationAccount } from "./educationAccountUniverse.ts";

export interface EducationOrganisationRow {
  id: string;
  name: string;
  education_group_id: string | null;
  website_domain: string | null;
  source_key: string | null;
  is_education_target: boolean | null;
}

export interface OrganisationResolution {
  kind: "matched" | "create" | "ambiguous";
  organisation?: EducationOrganisationRow;
  reason: string;
}

export const normaliseOrganisationName = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const normaliseWebsiteDomain = (value: unknown): string => {
  let v = String(value ?? "").trim().toLowerCase();
  if (!v) return "";
  v = v.replace(/^https?:\/\//, "").replace(/^www\./, "");
  return v.split("/")[0].split("?")[0].split("#")[0];
};

/**
 * Safe CRM organisation resolution for the reviewed Education 152 universe.
 * Strong education identifiers win. Domain/name matches are accepted only when unique.
 */
export function resolveEducationOrganisation(
  account: NormalisedEducationAccount,
  existing: EducationOrganisationRow[],
): OrganisationResolution {
  const bySource = existing.filter((o) => o.source_key === account.source_key);
  if (bySource.length === 1) return { kind: "matched", organisation: bySource[0], reason: "source_key" };
  if (bySource.length > 1) return { kind: "ambiguous", reason: "duplicate_source_key" };

  const byGroup = existing.filter((o) => o.education_group_id === account.group_id);
  if (byGroup.length === 1) return { kind: "matched", organisation: byGroup[0], reason: "education_group_id" };
  if (byGroup.length > 1) return { kind: "ambiguous", reason: "duplicate_education_group_id" };

  const wantedDomain = normaliseWebsiteDomain(account.account_domain);
  const byDomain = wantedDomain
    ? existing.filter((o) => normaliseWebsiteDomain(o.website_domain) === wantedDomain)
    : [];
  if (byDomain.length === 1) return { kind: "matched", organisation: byDomain[0], reason: "website_domain" };
  if (byDomain.length > 1) return { kind: "ambiguous", reason: "ambiguous_website_domain" };

  const wantedName = normaliseOrganisationName(account.account_name);
  const byName = wantedName
    ? existing.filter((o) => normaliseOrganisationName(o.name) === wantedName)
    : [];
  if (byName.length === 1) return { kind: "matched", organisation: byName[0], reason: "normalised_name" };
  if (byName.length > 1) return { kind: "ambiguous", reason: "ambiguous_normalised_name" };

  return { kind: "create", reason: "no_existing_match" };
}

export function toEducationOrganisationPatch(account: NormalisedEducationAccount) {
  return {
    name: account.account_name,
    industry: "Education",
    status: "prospect",
    education_group_id: account.group_id,
    website_domain: account.account_domain,
    qualification: account.qualification,
    operating_footprint: account.operating_footprint,
    source_key: account.source_key,
    source_notes: account.review_note,
    primary_source: account.primary_source,
    is_education_target: true,
  };
}

export interface FreeSearchPerson {
  id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  title?: string | null;
  linkedin_url?: string | null;
  country?: string | null;
  organization_id?: string | null;
  organization?: { id?: string | null } | null;
}

export function toEducationCandidateContact(input: {
  person: FreeSearchPerson;
  organisation: EducationOrganisationRow & { education_group_id: string };
  strategic_target_account_id: string;
  score: EducationRoleScore;
  research_program_key: string;
}) {
  const p = input.person;
  const first = String(p.first_name ?? "").trim();
  const last = String(p.last_name ?? "").trim();
  const display = [first, last].filter(Boolean).join(" ") || String(p.name ?? "").trim() || "Apollo education candidate";
  return {
    email: null,
    name: display,
    first_name: first || null,
    last_name: last || null,
    company: input.organisation.name,
    role: String(p.title ?? "").trim(),
    linkedin_url: p.linkedin_url ?? null,
    country: p.country ?? null,
    source: "apollo_free_search",
    assigned_business: "",
    apollo_person_id: String(p.id ?? "").trim(),
    apollo_organization_id: String(p.organization?.id ?? p.organization_id ?? "").trim() || null,
    organisation_id: input.organisation.id,
    education_group_id: input.organisation.education_group_id,
    strategic_target_account_id: input.strategic_target_account_id,
    education_role_family: input.score.role_family,
    education_role_score: input.score.score,
    research_program_key: input.research_program_key,
    reveal_status: "not_revealed",
    email_verified_status: "unknown",
    sendable_status: "needs_review",
    compliance_status: "pending_review",
    apollo_enrichment_status: "pending",
    tags: ["education", "education_customer_universe", "apollo_free_search", input.score.role_family],
  };
}

/**
 * Free-search refresh patch for an already-known CRM contact.
 * Deliberately excludes email, suppression, bounce, DNC and verification fields so a
 * masked/null free-search result cannot weaken stronger CRM truth.
 */
export function safeFreeSearchRefreshPatch(input: {
  person: FreeSearchPerson;
  organisation: EducationOrganisationRow & { education_group_id: string };
  strategic_target_account_id: string;
  score: EducationRoleScore;
  research_program_key: string;
}) {
  const p = input.person;
  return {
    company: input.organisation.name,
    role: String(p.title ?? "").trim(),
    linkedin_url: p.linkedin_url ?? null,
    country: p.country ?? null,
    organisation_id: input.organisation.id,
    education_group_id: input.organisation.education_group_id,
    strategic_target_account_id: input.strategic_target_account_id,
    education_role_family: input.score.role_family,
    education_role_score: input.score.score,
    research_program_key: input.research_program_key,
  };
}
