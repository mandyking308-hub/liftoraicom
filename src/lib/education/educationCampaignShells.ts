// Canonical education campaign shell configuration.
// These are persisted into public.outreach_campaign_drafts (existing campaign
// architecture) — no parallel campaign silo is created.
//
// SAFETY: every shell ships external_send_blocked = true, smartlead_campaign_id
// = null, founder approval NOT implied, is_live = false.

import { EDUCATION_BUSINESSES, EducationBusinessSlug } from "./educationBusinesses";
import { EDUCATION_CAMPAIGN_COPY } from "./educationCampaignCopy";

export interface EducationCampaignShell {
  campaign_key: string;
  business_slug: EducationBusinessSlug;
  business_name: string;
  campaign_name: string;
  target_account_cohort: {
    include: string[];
    exclude: string[];
    notes: string;
  };
  target_role_families: string[];
  exclusions: string[];
  qualification_threshold: number;
  relationship_eligibility_required: true;
  collision_protection_enabled: true;
  smartlead_campaign_id: null;
  smartlead_mapping_status: "not_mapped";
  status: string;
  founder_approval_state: "not_requested";
  test_state: "not_tested";
  is_live: false;
  external_send_blocked: true;
  batch_min: number;
  batch_max: number;
  batch_guidance: string;
}

const SHARED_COHORT = {
  include: [
    "large education groups / multi-academy trusts",
    "primary schools",
    "secondary schools",
    "sixth form colleges",
  ],
  exclude: ["nurseries", "pre-school / early years only settings", "childminders"],
  notes:
    "Account cohort is resolved from canonical CRM organisations (public.organisations) flagged as education accounts.",
};

const SHARED_EXCLUSIONS = [
  "nursery / early-years-only settings",
  "globally suppressed contacts",
  "hard bounced contacts",
  "unsubscribed or do-not-contact contacts",
  "contacts actively owned by another portfolio brand",
  "contacts inside a cross-brand cooldown window",
  "Neon Candy contacts and any non-education portfolio data",
];

const ROLE_FAMILIES: Record<EducationBusinessSlug, string[]> = {
  "billy-and-the-wild-forest": ["sen", "literacy", "wellbeing", "curriculum", "leadership", "pshe"],
  aurelia: ["digital", "safeguarding", "innovation", "curriculum", "leadership", "procurement", "partnerships"],
  kindnesss: ["wellbeing", "pshe", "sen", "curriculum", "leadership", "parent_experience"],
  "kingsbridge-global": ["international", "partnerships", "leadership", "procurement", "curriculum"],
};

export const EDUCATION_CAMPAIGN_SHELLS: EducationCampaignShell[] = EDUCATION_BUSINESSES.map((b) => {
  const isBilly = b.slug === "billy-and-the-wild-forest";
  return {
    campaign_key: b.campaignKey,
    business_slug: b.slug,
    business_name: b.name,
    campaign_name: isBilly
      ? "Billy and the Wild Forest — Education Groups (Controlled First Campaign)"
      : `${b.name} — Education Groups (Prepared, Non-Live Shell)`,
    target_account_cohort: SHARED_COHORT,
    target_role_families: ROLE_FAMILIES[b.slug],
    exclusions: SHARED_EXCLUSIONS,
    qualification_threshold: isBilly ? 60 : 55,
    relationship_eligibility_required: true,
    collision_protection_enabled: true,
    smartlead_campaign_id: null,
    smartlead_mapping_status: "not_mapped",
    status: isBilly ? "configured_not_live" : "prepared_not_live",
    founder_approval_state: "not_requested",
    test_state: "not_tested",
    is_live: false,
    external_send_blocked: true,
    batch_min: 25,
    batch_max: 50,
    batch_guidance:
      "Controlled initial batch: minimum 25, maximum 50 excellent contacts. No blind hundreds. Each batch requires founder approval plus ready Smartlead mapping and sender infrastructure.",
  };
});

export function shellFor(slug: EducationBusinessSlug): EducationCampaignShell {
  return EDUCATION_CAMPAIGN_SHELLS.find((s) => s.business_slug === slug)!;
}

/** Row payload written into public.outreach_campaign_drafts. */
export function shellToDraftRow(shell: EducationCampaignShell, businessId: string | null) {
  return {
    business_id: businessId,
    campaign_key: shell.campaign_key,
    campaign_name: shell.campaign_name,
    lead_criteria: {
      target_account_cohort: shell.target_account_cohort,
      target_role_families: shell.target_role_families,
      exclusions: shell.exclusions,
      qualification_threshold: shell.qualification_threshold,
      relationship_eligibility_required: shell.relationship_eligibility_required,
      batch_min: shell.batch_min,
      batch_max: shell.batch_max,
      batch_guidance: shell.batch_guidance,
    },
    email_sequence: EDUCATION_CAMPAIGN_COPY[shell.business_slug].sequence,
    smartlead_campaign_id: null as string | null,
    status: shell.status,
    external_send_blocked: true,
    compliance_checked: false,
    unsubscribe_required: true,
    founder_approved_at: null as string | null,
    target_role_families: shell.target_role_families,
    exclusions: shell.exclusions,
    qualification_threshold: shell.qualification_threshold,
    relationship_eligibility_required: true,
    collision_protection_enabled: true,
    is_live: false,
    test_state: shell.test_state,
    founder_approval_state: shell.founder_approval_state,
    batch_min: shell.batch_min,
    batch_max: shell.batch_max,
  };
}
