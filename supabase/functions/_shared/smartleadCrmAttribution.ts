export interface ScopedCampaignMapping {
  id: string;
  business_id: string | null;
  provider_connection_id: string | null;
  provider_type: string;
  provider_campaign_id: string | null;
  liftor_campaign_id: string | null;
  mapping_status: string;
  is_active: boolean;
}

export interface ScopedLeadMapping {
  id: string;
  business_id: string;
  provider_connection_id: string | null;
  provider_type: string;
  campaign_mapping_id: string | null;
  provider_campaign_id: string | null;
  provider_lead_id: string | null;
  contact_email: string;
  liftor_contact_id: string;
  liftor_campaign_id: string;
  business_contact_relationship_id: string | null;
}

export interface ScopedBusinessContactRelationship {
  id: string;
  business_id: string | null;
  contact_id: string;
}

export interface SmartleadAttributionInput {
  businessId: string;
  providerConnectionId: string;
  providerCampaignId: string | null;
  providerLeadId: string | null;
  email: string | null;
  campaignMappings: readonly ScopedCampaignMapping[];
  leadMappings: readonly ScopedLeadMapping[];
  businessContactRelationships: readonly ScopedBusinessContactRelationship[];
}

export type SmartleadAttributionResult =
  | {
      ok: true;
      campaignMapping: ScopedCampaignMapping;
      leadMapping: ScopedLeadMapping;
      businessContactRelationship: ScopedBusinessContactRelationship;
      contactId: string;
      liftorCampaignId: string;
    }
  | {
      ok: false;
      reason:
        | "campaign_id_missing"
        | "campaign_mapping_unbound"
        | "campaign_mapping_ambiguous"
        | "lead_identity_missing"
        | "lead_mapping_unbound"
        | "lead_mapping_ambiguous"
        | "lead_mapping_email_mismatch"
        | "lead_mapping_campaign_mismatch"
        | "lead_bcr_unbound"
        | "business_contact_relationship_unbound"
        | "business_contact_relationship_ambiguous";
      campaignMapping?: ScopedCampaignMapping;
      leadMapping?: ScopedLeadMapping;
    };

/** Resolve only an explicit business → connection → campaign → lead → BCR chain. */
export function resolveSmartleadAttribution(input: SmartleadAttributionInput): SmartleadAttributionResult {
  if (!input.providerCampaignId) return { ok: false, reason: "campaign_id_missing" };

  const campaigns = input.campaignMappings.filter((mapping) =>
    mapping.business_id === input.businessId &&
    mapping.provider_connection_id === input.providerConnectionId &&
    mapping.provider_type === "smartlead" &&
    mapping.provider_campaign_id === input.providerCampaignId &&
    mapping.mapping_status === "mapped" &&
    mapping.is_active &&
    Boolean(mapping.liftor_campaign_id)
  );
  if (campaigns.length === 0) return { ok: false, reason: "campaign_mapping_unbound" };
  if (campaigns.length !== 1) return { ok: false, reason: "campaign_mapping_ambiguous" };
  const campaignMapping = campaigns[0];

  const normalizedEmail = input.email?.trim().toLowerCase() ?? null;
  if (!input.providerLeadId && !normalizedEmail) {
    return { ok: false, reason: "lead_identity_missing", campaignMapping };
  }
  const leads = input.leadMappings.filter((mapping) =>
    mapping.business_id === input.businessId &&
    mapping.provider_connection_id === input.providerConnectionId &&
    mapping.provider_type === "smartlead" &&
    mapping.campaign_mapping_id === campaignMapping.id &&
    mapping.provider_campaign_id === input.providerCampaignId &&
    mapping.liftor_campaign_id === campaignMapping.liftor_campaign_id &&
    (input.providerLeadId
      ? mapping.provider_lead_id === input.providerLeadId
      : mapping.contact_email.trim().toLowerCase() === normalizedEmail)
  );
  if (leads.length === 0) return { ok: false, reason: "lead_mapping_unbound", campaignMapping };
  if (leads.length !== 1) return { ok: false, reason: "lead_mapping_ambiguous", campaignMapping };
  const leadMapping = leads[0];
  if (normalizedEmail && leadMapping.contact_email.trim().toLowerCase() !== normalizedEmail) {
    return { ok: false, reason: "lead_mapping_email_mismatch", campaignMapping, leadMapping };
  }
  if (!leadMapping.business_contact_relationship_id) {
    return { ok: false, reason: "lead_bcr_unbound", campaignMapping, leadMapping };
  }

  const relationships = input.businessContactRelationships.filter((relationship) =>
    relationship.id === leadMapping.business_contact_relationship_id &&
    relationship.business_id === input.businessId &&
    relationship.contact_id === leadMapping.liftor_contact_id
  );
  if (relationships.length === 0) {
    return { ok: false, reason: "business_contact_relationship_unbound", campaignMapping, leadMapping };
  }
  if (relationships.length !== 1) {
    return { ok: false, reason: "business_contact_relationship_ambiguous", campaignMapping, leadMapping };
  }

  return {
    ok: true,
    campaignMapping,
    leadMapping,
    businessContactRelationship: relationships[0],
    contactId: leadMapping.liftor_contact_id,
    liftorCampaignId: campaignMapping.liftor_campaign_id!,
  };
}
