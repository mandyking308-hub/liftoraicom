// Canonical 152-company education account universe (Stage 4).
//
// Maps reviewed CSV/JSON rows into the EXISTING strategic-account tables.
// No new CRM, no contacts, no Relationship Intelligence rows, no Apollo call,
// no Smartlead call, no outreach side effect of any kind.

export const EDUCATION_MASTER_LIST_NAME = "Education 152 — Master Groups";
export const EDUCATION_MASTER_LIST_TYPE = "education_account_universe";
export const EDUCATION_SOURCE_PREFIX = "education_152_master";
export const EDUCATION_RESEARCH_PROGRAM_KEY = "education_152_master_2026_09";

export const ALLOWED_QUALIFICATIONS = [
  "International operator",
  "Review needed",
  "Network route",
  "Domestic reserve",
] as const;

export type EducationQualification = typeof ALLOWED_QUALIFICATIONS[number];

export interface RawEducationAccountRow {
  group_id?: string;
  account_name?: string;
  account_domain?: string;
  qualification?: string;
  operating_footprint?: string;
  review_note?: string;
  primary_source?: string;
  source_version?: string;
  [k: string]: unknown;
}

export interface NormalisedEducationAccount {
  group_id: string;
  source_key: string;
  account_name: string;
  account_domain: string;
  qualification: EducationQualification;
  operating_footprint: string | null;
  review_note: string | null;
  primary_source: string | null;
  source_version: string | null;
}

export interface ValidationIssue {
  row_index: number;
  group_id: string | null;
  field: string;
  problem: string;
}

export interface ValidationOutcome {
  valid: NormalisedEducationAccount[];
  errors: ValidationIssue[];
  received: number;
}

const GROUP_ID_RE = /^EDU-\d{3}$/;

export const normaliseDomain = (value: unknown): string => {
  let v = String(value ?? "").trim().toLowerCase();
  if (!v) return "";
  v = v.replace(/^https?:\/\//, "").replace(/^www\./, "");
  v = v.split("/")[0].split("?")[0];
  return v;
};

export const buildEducationSourceKey = (groupId: string) =>
  `${EDUCATION_SOURCE_PREFIX}:${String(groupId).trim().toUpperCase()}`;

const pick = (row: RawEducationAccountRow, ...keys: string[]): string => {
  for (const k of keys) {
    const v = (row as Record<string, unknown>)[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
};

/** Deterministic validation. Returns rows fit to write plus every problem found. */
export function validateEducationAccounts(rows: RawEducationAccountRow[]): ValidationOutcome {
  const errors: ValidationIssue[] = [];
  const valid: NormalisedEducationAccount[] = [];
  const seenGroups = new Map<string, number>();
  const seenNames = new Map<string, number>();
  const seenDomains = new Map<string, number>();

  rows.forEach((row, index) => {
    const groupId = pick(row, "group_id", "Group ID", "groupId", "edu_id").toUpperCase();
    const name = pick(row, "account_name", "Account Name", "company", "name");
    const domain = normaliseDomain(pick(row, "account_domain", "Website", "website", "domain", "Domain"));
    const qualification = pick(row, "qualification", "Qualification", "category");
    const rowErrors: ValidationIssue[] = [];

    if (!GROUP_ID_RE.test(groupId)) {
      rowErrors.push({ row_index: index, group_id: groupId || null, field: "group_id", problem: "expected EDU-### format" });
    }
    if (!name) {
      rowErrors.push({ row_index: index, group_id: groupId || null, field: "account_name", problem: "missing" });
    }
    if (!domain) {
      rowErrors.push({ row_index: index, group_id: groupId || null, field: "account_domain", problem: "missing" });
    }
    if (!(ALLOWED_QUALIFICATIONS as readonly string[]).includes(qualification)) {
      rowErrors.push({
        row_index: index,
        group_id: groupId || null,
        field: "qualification",
        problem: `must be one of: ${ALLOWED_QUALIFICATIONS.join(" | ")}`,
      });
    }

    if (groupId) {
      const prior = seenGroups.get(groupId);
      if (prior !== undefined) {
        rowErrors.push({ row_index: index, group_id: groupId, field: "group_id", problem: `duplicate of row ${prior}` });
      } else seenGroups.set(groupId, index);
    }
    const nameKey = name.toLowerCase();
    if (nameKey) {
      const prior = seenNames.get(nameKey);
      if (prior !== undefined) {
        rowErrors.push({ row_index: index, group_id: groupId || null, field: "account_name", problem: `duplicate of row ${prior}` });
      } else seenNames.set(nameKey, index);
    }
    if (domain) {
      const prior = seenDomains.get(domain);
      if (prior !== undefined) {
        rowErrors.push({ row_index: index, group_id: groupId || null, field: "account_domain", problem: `duplicate of row ${prior}` });
      } else seenDomains.set(domain, index);
    }

    if (rowErrors.length) {
      errors.push(...rowErrors);
      return;
    }

    valid.push({
      group_id: groupId,
      source_key: buildEducationSourceKey(groupId),
      account_name: name,
      account_domain: domain,
      qualification: qualification as EducationQualification,
      operating_footprint: pick(row, "operating_footprint", "Operating Footprint", "footprint") || null,
      review_note: pick(row, "review_note", "Review Note", "notes") || null,
      primary_source: pick(row, "primary_source", "Primary Source", "source") || null,
      source_version: pick(row, "source_version", "Source Version", "source_date") || null,
    });
  });

  return { valid, errors, received: rows.length };
}

export interface ImportPlanEntry {
  group_id: string;
  source_key: string;
  account_name: string;
  action: "create" | "update" | "unchanged";
  changed_fields: string[];
}

export interface ExistingAccountRow {
  id: string;
  source_key: string | null;
  account_name: string | null;
  account_domain: string | null;
  account_type: string | null;
  geography: string | null;
  source_notes: string | null;
  metadata: Record<string, unknown> | null;
}

/** Pure diff: what a confirmed run would do. Used by dry-run and by the writer. */
export function planEducationImport(
  accounts: NormalisedEducationAccount[],
  existing: ExistingAccountRow[],
): ImportPlanEntry[] {
  const bySourceKey = new Map(existing.filter((e) => e.source_key).map((e) => [e.source_key as string, e]));
  return accounts.map((a) => {
    const found = bySourceKey.get(a.source_key);
    if (!found) {
      return { group_id: a.group_id, source_key: a.source_key, account_name: a.account_name, action: "create" as const, changed_fields: [] };
    }
    const changed: string[] = [];
    if ((found.account_name ?? "") !== a.account_name) changed.push("account_name");
    if (normaliseDomain(found.account_domain) !== a.account_domain) changed.push("account_domain");
    if ((found.account_type ?? "") !== a.qualification) changed.push("qualification");
    if ((found.geography ?? "") !== (a.operating_footprint ?? "")) changed.push("operating_footprint");
    const meta = (found.metadata ?? {}) as Record<string, unknown>;
    if (String(meta.education_group_id ?? "") !== a.group_id) changed.push("education_group_id");
    if (String(meta.review_note ?? "") !== (a.review_note ?? "")) changed.push("review_note");
    if (String(meta.primary_source ?? "") !== (a.primary_source ?? "")) changed.push("primary_source");
    if (String(meta.source_version ?? "") !== (a.source_version ?? "")) changed.push("source_version");
    return {
      group_id: a.group_id,
      source_key: a.source_key,
      account_name: a.account_name,
      action: changed.length ? ("update" as const) : ("unchanged" as const),
      changed_fields: changed,
    };
  });
}

/**
 * Row payload for the canonical CRM `organisations` spine.
 * organisations is the single education company/account record. strategic_target_accounts
 * keeps the research/pipeline view and points back at it via existing_organisation_id.
 */
export function toOrganisationRow(a: NormalisedEducationAccount) {
  return {
    name: a.account_name,
    industry: "Education",
    status: "research_account",
    account_domain: a.account_domain,
    website_url: a.account_domain ? `https://${a.account_domain}` : null,
    source_key: a.source_key,
    education_group_id: a.group_id,
    qualification: a.qualification,
    operating_footprint: a.operating_footprint,
    review_note: a.review_note,
    primary_source: a.primary_source,
    source_version: a.source_version,
    research_program_key: EDUCATION_RESEARCH_PROGRAM_KEY,
    is_education_account: true,
    metadata: {
      education_group_id: a.group_id,
      qualification: a.qualification,
      outreach_eligible: false,
    },
  };
}

/** Row payload for strategic_target_accounts. Research-only; never outreach-eligible. */
export function toTargetAccountRow(
  a: NormalisedEducationAccount,
  listId: string | null,
  organisationId: string | null = null,
) {
  return {
    account_name: a.account_name,
    account_domain: a.account_domain,
    website_url: a.account_domain ? `https://${a.account_domain}` : null,
    industry: "Education",
    geography: a.operating_footprint,
    account_type: a.qualification,
    source_key: a.source_key,
    existing_organisation_id: organisationId,
    source_notes: [a.primary_source, a.source_version].filter(Boolean).join(" · ") || null,
    founder_review_required: true,
    approval_status: "research_only",
    promoted_to_crm: false,
    metadata: {
      education_group_id: a.group_id,
      qualification: a.qualification,
      operating_footprint: a.operating_footprint,
      review_note: a.review_note,
      primary_source: a.primary_source,
      source_version: a.source_version,
      research_program_key: EDUCATION_RESEARCH_PROGRAM_KEY,
      strategic_account_list_id: listId,
      canonical_organisation_id: organisationId,
      outreach_eligible: false,
    },
  };
}
