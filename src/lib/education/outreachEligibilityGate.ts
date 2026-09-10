// Single reusable outreach preflight gate for the education commercial layer.
// Mirrored server-side by supabase/functions/education-outreach-eligibility.
//
// Returns eligible ONLY when every gate is satisfied. Smartlead mapping readiness
// and sender infrastructure readiness are owned by Chat 2 and are expected to be
// false today, which keeps sending blocked.

import { CollisionDecision } from "./portfolioCollision";

export const ELIGIBILITY_GATE_VERSION = "edu-eligibility-1.0.0";

export type EligibilityGateCode =
  | "missing_organisation_link"
  | "no_business_relationship"
  | "relationship_not_eligible"
  | "relationship_do_not_contact"
  | "globally_suppressed"
  | "hard_bounced"
  | "unsubscribed_or_dnc"
  | "collision_blocked"
  | "no_usable_work_email"
  | "campaign_not_approved"
  | "campaign_not_live"
  | "smartlead_mapping_not_ready"
  | "sender_infrastructure_not_ready"
  | "external_send_blocked";

export interface EligibilityContact {
  id: string;
  organisation_id?: string | null;
  email?: string | null;
  email_verified_status?: string | null;
  sendable_status?: string | null;
  reveal_status?: string | null;
  is_globally_suppressed?: boolean | null;
  hard_bounced?: boolean | null;
  unsubscribed_at?: string | null;
  do_not_contact_at?: string | null;
}

export interface EligibilityRelationship {
  business_name: string;
  campaign_eligible?: boolean | null;
  do_not_contact?: boolean | null;
  business_relevance_score?: number | null;
  qualification?: string | null;
}

export interface EligibilityCampaign {
  campaign_key: string;
  business_name: string;
  founder_approval_state?: string | null;
  founder_approved_at?: string | null;
  is_live?: boolean | null;
  external_send_blocked?: boolean | null;
  qualification_threshold?: number | null;
  smartlead_campaign_id?: string | null;
}

export interface EligibilityInfrastructure {
  smartlead_mapping_ready: boolean;
  sender_infrastructure_ready: boolean;
}

export interface EligibilityInput {
  contact: EligibilityContact;
  relationship?: EligibilityRelationship | null;
  campaign: EligibilityCampaign;
  collision: CollisionDecision;
  infrastructure: EligibilityInfrastructure;
}

export interface EligibilityResult {
  eligible: boolean;
  send_allowed: boolean;
  blockers: EligibilityGateCode[];
  warnings: string[];
  gate_version: string;
  summary: string;
}

function hasUsableWorkEmail(c: EligibilityContact): boolean {
  if (!c.email || !c.email.includes("@")) return false;
  if (c.sendable_status && !["sendable", "verified_sendable"].includes(c.sendable_status)) return false;
  if (c.email_verified_status && ["invalid", "unknown", "catch_all_risky"].includes(c.email_verified_status)) {
    return false;
  }
  return true;
}

export function evaluateOutreachEligibility(input: EligibilityInput): EligibilityResult {
  const blockers: EligibilityGateCode[] = [];
  const warnings: string[] = [];
  const { contact: c, relationship: r, campaign: k, collision, infrastructure } = input;

  if (!c.organisation_id) blockers.push("missing_organisation_link");

  if (!r) blockers.push("no_business_relationship");
  else {
    if (r.business_name !== k.business_name) blockers.push("no_business_relationship");
    if (r.do_not_contact) blockers.push("relationship_do_not_contact");
    if (!r.campaign_eligible) blockers.push("relationship_not_eligible");
    const threshold = k.qualification_threshold ?? 40;
    if ((r.business_relevance_score ?? 0) < threshold) blockers.push("relationship_not_eligible");
  }

  if (c.is_globally_suppressed) blockers.push("globally_suppressed");
  if (c.hard_bounced) blockers.push("hard_bounced");
  if (c.unsubscribed_at || c.do_not_contact_at) blockers.push("unsubscribed_or_dnc");

  if (collision.decision !== "allowed") blockers.push("collision_blocked");

  if (!hasUsableWorkEmail(c)) blockers.push("no_usable_work_email");

  const approved = !!k.founder_approved_at || k.founder_approval_state === "approved";
  if (!approved) blockers.push("campaign_not_approved");
  if (!k.is_live) blockers.push("campaign_not_live");
  if (k.external_send_blocked !== false) blockers.push("external_send_blocked");

  if (!infrastructure.smartlead_mapping_ready) blockers.push("smartlead_mapping_not_ready");
  if (!infrastructure.sender_infrastructure_ready) blockers.push("sender_infrastructure_not_ready");

  if (collision.founder_override_applied) {
    warnings.push(`founder_override_applied: ${collision.reason_codes.join(", ")}`);
  }

  const unique = Array.from(new Set(blockers));
  const eligible = unique.length === 0;
  return {
    eligible,
    send_allowed: eligible,
    blockers: unique,
    warnings,
    gate_version: ELIGIBILITY_GATE_VERSION,
    summary: eligible
      ? "All education outreach gates satisfied."
      : `Send blocked by ${unique.length} gate(s): ${unique.join(", ")}`,
  };
}
