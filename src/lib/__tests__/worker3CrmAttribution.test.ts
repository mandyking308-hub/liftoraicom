import { describe, expect, it } from "vitest";
import {
  resolveSmartleadAttribution,
  type ScopedBusinessContactRelationship,
  type ScopedCampaignMapping,
  type ScopedLeadMapping,
} from "../../../supabase/functions/_shared/smartleadCrmAttribution";

const campaign: ScopedCampaignMapping = {
  id: "campaign-map-a",
  business_id: "business-a",
  provider_connection_id: "connection-a",
  provider_type: "smartlead",
  provider_campaign_id: "sl-campaign-a",
  liftor_campaign_id: "liftor-campaign-a",
  mapping_status: "mapped",
  is_active: true,
};

const lead: ScopedLeadMapping = {
  id: "lead-map-a",
  business_id: "business-a",
  provider_connection_id: "connection-a",
  provider_type: "smartlead",
  campaign_mapping_id: "campaign-map-a",
  provider_campaign_id: "sl-campaign-a",
  provider_lead_id: "sl-lead-a",
  contact_email: "person@example.com",
  liftor_contact_id: "contact-a",
  liftor_campaign_id: "liftor-campaign-a",
  business_contact_relationship_id: "bcr-a",
};

const bcr: ScopedBusinessContactRelationship = {
  id: "bcr-a",
  business_id: "business-a",
  contact_id: "contact-a",
};

const input = {
  businessId: "business-a",
  providerConnectionId: "connection-a",
  providerCampaignId: "sl-campaign-a",
  providerLeadId: "sl-lead-a",
  email: "person@example.com",
  campaignMappings: [campaign],
  leadMappings: [lead],
  businessContactRelationships: [bcr],
};

describe("Worker 3 CRM/BCR attribution", () => {
  it("resolves the full business-owned provider mapping chain to a canonical contact", () => {
    expect(resolveSmartleadAttribution(input)).toMatchObject({
      ok: true,
      contactId: "contact-a",
      liftorCampaignId: "liftor-campaign-a",
      campaignMapping: { id: "campaign-map-a" },
      leadMapping: { id: "lead-map-a" },
      businessContactRelationship: { id: "bcr-a" },
    });
  });

  it("rejects campaigns, lead maps, and BCRs owned by another business or connection", () => {
    expect(resolveSmartleadAttribution({
      ...input,
      businessId: "business-b",
      campaignMappings: [campaign],
    })).toMatchObject({ ok: false, reason: "campaign_mapping_unbound" });

    expect(resolveSmartleadAttribution({
      ...input,
      providerConnectionId: "connection-b",
    })).toMatchObject({ ok: false, reason: "campaign_mapping_unbound" });

    expect(resolveSmartleadAttribution({
      ...input,
      businessContactRelationships: [{ ...bcr, business_id: "business-b" }],
    })).toMatchObject({ ok: false, reason: "business_contact_relationship_unbound" });

    expect(resolveSmartleadAttribution({
      ...input,
      leadMappings: [{ ...lead, business_id: "business-b" }],
    })).toMatchObject({ ok: false, reason: "lead_mapping_unbound" });
  });

  it("fails closed for ambiguous or legacy unbound mappings", () => {
    expect(resolveSmartleadAttribution({
      ...input,
      campaignMappings: [campaign, { ...campaign, id: "campaign-map-duplicate" }],
    })).toMatchObject({ ok: false, reason: "campaign_mapping_ambiguous" });

    expect(resolveSmartleadAttribution({
      ...input,
      leadMappings: [{ ...lead, business_contact_relationship_id: null }],
    })).toMatchObject({ ok: false, reason: "lead_bcr_unbound" });

    expect(resolveSmartleadAttribution({
      ...input,
      businessContactRelationships: [bcr, bcr],
    })).toMatchObject({ ok: false, reason: "business_contact_relationship_ambiguous" });
  });

  it("permits email identity only inside the exact provider campaign and tenant mapping", () => {
    expect(resolveSmartleadAttribution({
      ...input,
      providerLeadId: null,
    })).toMatchObject({ ok: true, contactId: "contact-a" });
    expect(resolveSmartleadAttribution({
      ...input,
      providerLeadId: null,
      email: "other@example.com",
    })).toMatchObject({ ok: false, reason: "lead_mapping_unbound" });
  });

  it("rejects email and Liftor campaign mismatches even when provider IDs match", () => {
    expect(resolveSmartleadAttribution({
      ...input,
      email: "other@example.com",
    })).toMatchObject({ ok: false, reason: "lead_mapping_email_mismatch" });

    expect(resolveSmartleadAttribution({
      ...input,
      leadMappings: [{ ...lead, liftor_campaign_id: "another-campaign" }],
    })).toMatchObject({ ok: false, reason: "lead_mapping_unbound" });
  });
});
