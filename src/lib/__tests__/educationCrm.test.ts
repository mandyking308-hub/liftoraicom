import { describe, expect, it } from "vitest";
import {
  normaliseOrganisationName,
  normaliseWebsiteDomain,
  resolveEducationOrganisation,
  safeFreeSearchRefreshPatch,
  toEducationCandidateContact,
} from "../../../supabase/functions/_shared/educationCrm";
import type { NormalisedEducationAccount } from "../../../supabase/functions/_shared/educationAccountUniverse";

const account: NormalisedEducationAccount = {
  group_id: "EDU-001",
  source_key: "education_152_master:EDU-001",
  account_name: "Global Schools Group",
  account_domain: "globalschools.example",
  qualification: "International operator",
  operating_footprint: "Global",
  review_note: null,
  primary_source: "reviewed csv",
  source_version: "2026-09-08",
};

const org = {
  id: "org-1",
  name: "Global Schools Group",
  education_group_id: "EDU-001",
  website_domain: "globalschools.example",
  source_key: "education_152_master:EDU-001",
  is_education_target: true,
};

const score = {
  role_family: "education_academic_leadership" as const,
  score: 88,
  reasons: ["education leadership"],
  penalties: [],
  group_scope: "group" as const,
  buying_authority: "high" as const,
  relevant: true,
};

describe("education CRM organisation resolution", () => {
  it("normalises names and domains consistently", () => {
    expect(normaliseOrganisationName("  Global-Schools Group Ltd. ")).toBe("global schools group ltd");
    expect(normaliseWebsiteDomain("https://WWW.GlobalSchools.Example/about")).toBe("globalschools.example");
  });

  it("prefers the stable education source key", () => {
    const result = resolveEducationOrganisation(account, [org]);
    expect(result.kind).toBe("matched");
    expect(result.reason).toBe("source_key");
    expect(result.organisation?.id).toBe("org-1");
  });

  it("fails closed on an ambiguous domain match", () => {
    const rows = [
      { ...org, id: "org-1", source_key: null, education_group_id: null },
      { ...org, id: "org-2", source_key: null, education_group_id: null },
    ];
    const result = resolveEducationOrganisation(account, rows);
    expect(result.kind).toBe("ambiguous");
    expect(result.reason).toBe("ambiguous_website_domain");
  });

  it("plans a new CRM organisation when nothing matches", () => {
    const result = resolveEducationOrganisation(account, []);
    expect(result.kind).toBe("create");
  });
});

describe("education CRM candidate mapping", () => {
  const person = {
    id: "apollo-1",
    first_name: "Alex",
    last_name: "Buyer",
    title: "Director of Education",
    linkedin_url: "https://linkedin.example/alex",
    country: "United Kingdom",
    organization_id: "apollo-org-1",
  };

  it("creates one non-sendable canonical contact linked to the CRM organisation", () => {
    const row = toEducationCandidateContact({
      person,
      organisation: org as any,
      strategic_target_account_id: "sta-1",
      score,
      research_program_key: "education_152_master_2026_09",
    });
    expect(row.apollo_person_id).toBe("apollo-1");
    expect(row.organisation_id).toBe("org-1");
    expect(row.education_group_id).toBe("EDU-001");
    expect(row.email).toBeNull();
    expect(row.sendable_status).toBe("needs_review");
    expect(row.assigned_business).toBe("");
  });

  it("free-search refresh never contains email, suppression, bounce or DNC fields", () => {
    const patch = safeFreeSearchRefreshPatch({
      person,
      organisation: org as any,
      strategic_target_account_id: "sta-1",
      score,
      research_program_key: "education_152_master_2026_09",
    }) as Record<string, unknown>;
    for (const forbidden of [
      "email",
      "email_verified_status",
      "is_globally_suppressed",
      "hard_bounced",
      "do_not_contact_at",
      "unsubscribed_at",
      "sendable_status",
    ]) {
      expect(patch).not.toHaveProperty(forbidden);
    }
    expect(patch.organisation_id).toBe("org-1");
  });
});
