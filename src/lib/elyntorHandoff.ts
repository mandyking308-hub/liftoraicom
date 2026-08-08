export type ElyntorRegulatoryPathway =
  | "principal_corporate_investment"
  | "project_jv"
  | "direct_institutional_bilateral"
  | "counsel_review_required"
  | "authorised_principal_host_required"
  | "not_cleared";

export type ElyntorDealApproachRequest = {
  type: "DEAL_APPROACH_REQUEST";
  source_system: "ELYNTOR";
  deal_id: string;
  deal_code: string;
  sponsor_company?: string | null;
  target_role?: string | null;
  target_person?: string | null;
  known_contacts?: string[];
  contact_route?: string | null;
  reason_for_contact: string;
  request: string;
  priority: "low" | "normal" | "high" | "urgent";
  approved_wording_summary: string;
  desired_outcome: string;
  source_url?: string | null;
  regulatory_pathway: ElyntorRegulatoryPathway;
  founder_approval_required: true;
};

export type ElyntorCapitalPartnerSearchRequest = {
  type: "CAPITAL_PARTNER_SEARCH_REQUEST";
  source_system: "ELYNTOR";
  deal_id: string;
  deal_code: string;
  capital_requirement?: string | null;
  elyntor_participation_concept?: string | null;
  partner_capital_sought?: string | null;
  sector: string;
  geography: string;
  structure?: string | null;
  preferred_partner_profile: string;
  materials_status: "none" | "teaser" | "nda" | "data_room" | "approved_pack";
  regulatory_pathway: Exclude<ElyntorRegulatoryPathway, "not_cleared">;
  founder_approval_required: true;
};

export type ElyntorHandoff =
  | ElyntorDealApproachRequest
  | ElyntorCapitalPartnerSearchRequest;

export type ElyntorHandoffValidation = {
  valid: boolean;
  errors: string[];
};

/**
 * Validates Elyntor's deliberately narrow handoff into Liftor.
 *
 * Liftor does not ingest Elyntor's full radar, underwriting or diligence data.
 * It receives only an approved relationship task after Elyntor has screened the
 * opportunity. Material external outreach remains founder-approved.
 */
export function validateElyntorHandoff(input: unknown): ElyntorHandoffValidation {
  const errors: string[] = [];

  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["Payload must be an object"] };
  }

  const value = input as Record<string, unknown>;

  if (value.source_system !== "ELYNTOR") errors.push("source_system must be ELYNTOR");
  if (value.founder_approval_required !== true) errors.push("founder_approval_required must be true");
  if (typeof value.deal_id !== "string" || !value.deal_id.trim()) errors.push("deal_id is required");
  if (typeof value.deal_code !== "string" || !value.deal_code.trim()) errors.push("deal_code is required");

  if (value.type === "DEAL_APPROACH_REQUEST") {
    if (typeof value.reason_for_contact !== "string" || !value.reason_for_contact.trim()) {
      errors.push("reason_for_contact is required");
    }
    if (typeof value.request !== "string" || !value.request.trim()) errors.push("request is required");
    if (typeof value.approved_wording_summary !== "string" || !value.approved_wording_summary.trim()) {
      errors.push("approved_wording_summary is required");
    }
    if (typeof value.desired_outcome !== "string" || !value.desired_outcome.trim()) {
      errors.push("desired_outcome is required");
    }
  } else if (value.type === "CAPITAL_PARTNER_SEARCH_REQUEST") {
    if (value.regulatory_pathway === "not_cleared") {
      errors.push("capital partner search cannot be accepted while regulatory_pathway is not_cleared");
    }
    if (typeof value.sector !== "string" || !value.sector.trim()) errors.push("sector is required");
    if (typeof value.geography !== "string" || !value.geography.trim()) errors.push("geography is required");
    if (typeof value.preferred_partner_profile !== "string" || !value.preferred_partner_profile.trim()) {
      errors.push("preferred_partner_profile is required");
    }
  } else {
    errors.push("Unsupported Elyntor handoff type");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Human-readable task header for Liftor's existing CRM/outreach workflow.
 * No external send is performed here.
 */
export function describeElyntorHandoff(handoff: ElyntorHandoff): string {
  return handoff.type === "DEAL_APPROACH_REQUEST"
    ? `Elyntor ${handoff.deal_code}: sponsor/deal approach`
    : `Elyntor ${handoff.deal_code}: capital partner search`;
}
