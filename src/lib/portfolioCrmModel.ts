export type PortfolioDataPoolId =
  | "education-leadership"
  | "enterprise-operations"
  | "healthcare-enterprise"
  | "hnw-family-office"
  | "founders-investors"
  | "finance-treasury"
  | "governance-risk"
  | "supply-chain-procurement"
  | "hr-people-benefits"
  | "marketing-comms"
  | "media-creative"
  | "consumer-retail-partners"
  | "philanthropy-funders"
  | "professional-learning";

export type BusinessRelevanceLevel = "high" | "medium" | "low" | "review" | "not_relevant";

export const PORTFOLIO_CRM_PRINCIPLES = {
  personTruth: "contacts",
  accountTruth: "crm_accounts (planned); contacts.company remains compatibility data until migration",
  clientOrganisationTruth: "organisations (client/tenant delivery layer only)",
  businessRelationshipTruth: "business_contact_relationships",
  researchTruth: "relationship_intelligence_contacts",
  legacySingleBusinessField: "assigned_business",
  rules: [
    "Store each person once in the master CRM contact registry.",
    "Store each commercial/prospect organisation once as a CRM account and attach people to it.",
    "Do not use the existing client/tenant organisations table as the prospect-account database; link to it only when an account becomes a client/tenant.",
    "A person may have many business relationships without duplication.",
    "Relationship Intelligence remains the research/evidence layer.",
    "Only role/evidence-matched or founder-approved research records are promoted into the operational CRM.",
    "Global suppression overrides every business relationship.",
    "Business-specific DNC remains scoped to the relevant business relationship.",
    "Importing or promoting data never sends outreach automatically.",
  ],
} as const;

export const PORTFOLIO_CRM_PIPELINE = [
  "Data Asset",
  "Buyer Pool",
  "CRM Account",
  "Person",
  "Business Relevance",
  "Campaign Eligibility",
  "Conversation",
  "Proposal",
  "Deal",
  "Customer",
  "Revenue",
] as const;

export const EDUCATION_WAVE_1_POOL: PortfolioDataPoolId = "education-leadership";

export function relevanceLabel(level: BusinessRelevanceLevel) {
  switch (level) {
    case "high": return "High fit";
    case "medium": return "Medium fit";
    case "low": return "Low fit";
    case "not_relevant": return "Not relevant";
    default: return "Review";
  }
}
