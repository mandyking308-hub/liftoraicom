export type DataAssetStatus = "live" | "repo_ready" | "external_live";

export type DataAsset = {
  id: string;
  name: string;
  category: "funding" | "wealth" | "commercial" | "relationship";
  description: string;
  status: DataAssetStatus;
  system: string;
  repository: string;
  sourceOfTruth: string;
  primaryUse: string;
  recordDefinition: string;
  buyerPools?: string[];
  locations: string[];
  knownStats?: Array<{ label: string; value: number | string; note?: string }>;
  lastReviewed: string;
  retentionRule: string;
  drillThrough?: string;
  repositoryUrl: string;
};

/**
 * Master inventory of strategic data assets owned/built across the portfolio.
 *
 * This file is deliberately explicit rather than inferred. It is the durable
 * map of where each dataset lives so research is not lost when data is split
 * across Liftor Supabase, repository files and other portfolio applications.
 *
 * Portfolio CRM flow:
 * Data Asset -> Buyer Pool -> Organisation -> Person -> Business Relevance ->
 * Campaign Eligibility -> Conversation -> Proposal -> Deal -> Customer -> Revenue.
 *
 * Rule for every future dataset:
 * 1. register it here;
 * 2. identify its source of truth and physical locations;
 * 3. record what a row means and how it is used;
 * 4. map every reusable buyer pool it can feed;
 * 5. preserve non-actionable/history rows rather than silently deleting them.
 */
export const DATA_ASSETS: DataAsset[] = [
  {
    id: "billionaire-intelligence",
    name: "Billionaire Intelligence",
    category: "wealth",
    description:
      "Billionaire universe, wealth snapshots, foundations, family-office/company routes, route verification, GHAT fit and enrichment state.",
    status: "live",
    system: "Liftor Supabase",
    repository: "mandyking308-hub/liftoraicom",
    sourceOfTruth: "billionaire_coverage + billionaire_wealth_snapshots",
    primaryUse: "GHAT fundraising intelligence, relationship mapping and controlled outreach readiness",
    recordDefinition:
      "Person → wealth snapshot → foundation/family office/company routes → evidence → verification → readiness",
    buyerPools: ["hnw-family-office", "founders-investors", "philanthropy-funders"],
    locations: [
      "Supabase: billionaire_coverage",
      "Supabase: billionaire_wealth_snapshots",
      "Supabase: billionaire_enrichment_queue",
      "Supabase: billionaire_candidate_routes",
      "Supabase: philanthropy network evidence mappings",
      "UI: /founder/billionaire-intelligence",
      "Code: src/lib/billionaireCoverage.ts",
      "Portfolio CRM model: src/lib/portfolioCrmModel.ts",
    ],
    knownStats: [
      { label: "2025 source universe", value: 2754, note: "Expected Forbes-derived universe used by the coverage engine" },
      { label: "2026 source snapshot", value: 3428, note: "Expected Forbes 2026 derivative snapshot rows" },
    ],
    lastReviewed: "2026-08-23",
    retentionRule: "Preserve historical wealth, unmatched names, stale records and unverified candidate routes; do not delete useful research.",
    drillThrough: "/founder/billionaire-intelligence",
    repositoryUrl: "https://github.com/mandyking308-hub/liftoraicom",
  },
  {
    id: "next-gen-wealth-networks",
    name: "Rich Kids / Next-Gen Wealth Networks",
    category: "relationship",
    description:
      "Inherited-wealth, next-generation, family-office, philanthropy and impact networks with public institutional contact routes.",
    status: "live",
    system: "Liftor Supabase",
    repository: "mandyking308-hub/liftoraicom",
    sourceOfTruth: "philanthropy_network_registry + philanthropy_network_contacts",
    primaryUse: "Next-gen relationship intelligence, GHAT routes, community/network mapping and future partnerships",
    recordDefinition:
      "Network → focus/audience → access mode → public contact route → source evidence → verification state",
    buyerPools: ["hnw-family-office", "philanthropy-funders", "founders-investors"],
    locations: [
      "Supabase: philanthropy_network_registry",
      "Supabase: philanthropy_network_contacts",
      "UI: /founder/billionaire-intelligence → Next-gen networks",
      "Research note: docs/next-gen-wealth-networks.md",
      "Migration: supabase/migrations/20260822093600_philanthropy_network_intelligence.sql",
      "Portfolio CRM model: src/lib/portfolioCrmModel.ts",
    ],
    lastReviewed: "2026-08-23",
    retentionRule: "Keep historic and currently inaccessible networks; mark verification/freshness instead of deleting them.",
    drillThrough: "/founder/billionaire-intelligence",
    repositoryUrl: "https://github.com/mandyking308-hub/liftoraicom/blob/main/docs/next-gen-wealth-networks.md",
  },
  {
    id: "global-education-sales",
    name: "Global Education Sales Data",
    category: "commercial",
    description:
      "Education groups, premium school operators and named decision-makers built for high-value education outreach and reusable cross-portfolio targeting.",
    status: "repo_ready",
    system: "Liftor GitHub data store",
    repository: "mandyking308-hub/liftoraicom",
    sourceOfTruth: "data/global-education-program-status-2026-08-22.json + listed JSONL source files",
    primaryUse: "Education-sector commercial outreach, account-based sales and reusable functional targeting across Liftor businesses",
    recordDefinition:
      "Education group/account → buyer role → named contact → current employer → verified work email → business relevance → outreach hold/readiness",
    buyerPools: [
      "education-leadership",
      "enterprise-operations",
      "supply-chain-procurement",
      "finance-treasury",
      "governance-risk",
      "hr-people-benefits",
      "marketing-comms",
      "professional-learning",
    ],
    locations: [
      "data/global-education-program-status-2026-08-22.json",
      "data/global-education-buyers-2026-08-22.jsonl",
      "data/global-education-buyers-isp-2026-08-22.jsonl",
      "data/global-education-buyers-gems-2026-08-22.jsonl",
      "data/global-education-buyers-globeducate-2026-08-22.jsonl",
      "data/global-education-buyers-dukes-2026-08-22.jsonl",
      "data/global-education-buyers-taaleem-uae-2026-08-22.jsonl",
      "data/global-education-buyers-sabis-2026-08-22.jsonl",
      "data/global-education-buyers-gulf-batch-2-2026-08-22.jsonl",
      "data/global-education-buyers-premium-batch-3-2026-08-22.jsonl",
      "data/global-education-research-entity-exclusions-2026-08-22.jsonl",
      "Import route: supabase/functions/ri-upsert-import/index.ts",
      "Portfolio CRM architecture: docs/portfolio-crm-architecture-2026-08-23.md",
      "Pool overlays: src/data/portfolioCrmPoolOverrides.ts",
    ],
    knownStats: [
      { label: "Groups seeded", value: 22 },
      { label: "Contacts enriched", value: 146 },
      { label: "Verified work emails", value: 109 },
      { label: "Held / not yet verified", value: 37 },
      { label: "Target groups", value: 120 },
      { label: "Target contacts", value: 2500 },
    ],
    lastReviewed: "2026-08-23",
    retentionRule: "Preserve missing, stale, mismatched and unverified rows in a held state; never discard research merely because it is not send-ready.",
    repositoryUrl: "https://github.com/mandyking308-hub/liftoraicom/tree/main/data",
  },
  {
    id: "montvelle-global-supplier-network",
    name: "Montvelle Global Supplier Network",
    category: "commercial",
    description:
      "Curated 5/6-star global supplier universe for Montvelle spanning luxury networks, private clubs, hotels, aviation, yachts, chauffeurs, destination management, villas, concierge, property, staffing, security, wellness and specialist sourcing.",
    status: "repo_ready",
    system: "Liftor Portfolio CRM",
    repository: "mandyking308-hub/liftoraicom",
    sourceOfTruth: "src/data/montvelleSupplierSeed.ts",
    primaryUse: "Montvelle supplier sourcing, network leverage, supplier outreach planning and relationship conversion",
    recordDefinition:
      "Organisation → supplier category → geographic coverage → multiplier reach → lifecycle status → outreach status → public-name status → relationship",
    buyerPools: ["hnw-family-office", "enterprise-operations", "founders-investors"],
    locations: [
      "Data: src/data/montvelleSupplierSeed.ts",
      "UI: Portfolio CRM → Montvelle Global Supplier Network",
      "Component: src/components/founder/crm/MontvelleSupplierNetworkPanel.tsx",
      "Outreach: separate supplier-contact workstream; do not infer relationship from inclusion",
    ],
    knownStats: [
      { label: "Initial curated suppliers", value: 78 },
      { label: "Supplier verticals", value: 20 },
      { label: "Build priority", value: "Global network multipliers first" },
      { label: "Public naming rule", value: "Factual sourcing reference until relationship confirmed" },
    ],
    lastReviewed: "2026-08-24",
    retentionRule: "Keep identified and held suppliers for future use; update status rather than deleting research. Outreach and relationship evidence remain separate from inclusion in the sourcing universe.",
    repositoryUrl: "https://github.com/mandyking308-hub/liftoraicom/tree/main/src/data",
  },
  {
    id: "montvelle-professional-advisory-network",
    name: "Montvelle Professional Advisory Network",
    category: "commercial",
    description:
      "Curated global institutional advisory network for Montvelle clients spanning private-client law, tax, wealth, fiduciary services, immigration, mobility, property, insurance, security, corporate finance, executive search, reputation, private health, art and philanthropy.",
    status: "repo_ready",
    system: "Liftor Portfolio CRM",
    repository: "mandyking308-hub/liftoraicom",
    sourceOfTruth: "src/data/montvelleAdvisoryNetwork.ts",
    primaryUse: "Montvelle client advisory routing, professional introductions, relationship development and controlled institutional outreach",
    recordDefinition:
      "Organisation → advisory category → global tier → official/public route → best-for cases → outreach status → relationship status",
    buyerPools: ["hnw-family-office", "founders-investors", "enterprise-operations"],
    locations: [
      "Data: src/data/montvelleAdvisoryNetwork.ts",
      "UI: Portfolio CRM → Montvelle Professional Advisory Network",
      "Component: src/components/founder/crm/MontvelleAdvisoryNetworkPanel.tsx",
      "Outreach: public business routes only; never infer private emails or relationship status",
    ],
    knownStats: [
      { label: "Institutional organisations", value: 100 },
      { label: "Advisory verticals", value: 15 },
      { label: "Published business inboxes", value: 9 },
      { label: "Selection rule", value: "Global institutional firms only" },
      { label: "Public route rule", value: "Official/public routes only; no guessed emails" },
    ],
    lastReviewed: "2026-08-24",
    retentionRule: "Preserve identified, held and contacted firms; re-verify routes and update relationship status instead of deleting useful research.",
    repositoryUrl: "https://github.com/mandyking308-hub/liftoraicom/tree/main/src/data",
  },
  {
    id: "ghat-grants",
    name: "GHAT Grants & Funding Database",
    category: "funding",
    description:
      "Funders, grant opportunities, applications, fundable projects, readiness, awards, obligations and funding radar history.",
    status: "external_live",
    system: "GHAT Supabase",
    repository: "mandyking308-hub/globalhealthaccesstrust",
    sourceOfTruth: "GHAT funding_* tables",
    primaryUse: "Global Health Access Trust grant pipeline, applications, funding relationships and post-award reporting",
    recordDefinition:
      "Funder → opportunity → eligibility/deadline → project fit → application → award → reporting obligation",
    buyerPools: ["philanthropy-funders"],
    locations: [
      "GHAT Supabase: funding_funders",
      "GHAT Supabase: funding_opportunities",
      "GHAT Supabase: funding_projects",
      "GHAT Supabase: funding_applications",
      "GHAT Supabase: funding_awards",
      "GHAT Supabase: funding_reporting_obligations",
      "GHAT Supabase: funding_readiness_items",
      "GHAT Supabase: funding_radar_events",
      "GHAT UI: src/pages/admin/AdminFundingPage.tsx",
      "GHAT data model: src/lib/funding.ts",
      "Liftor Portfolio CRM ecosystem pool: philanthropy-funders",
    ],
    lastReviewed: "2026-08-23",
    retentionRule: "Keep closed, expired and currently ineligible opportunities as historical intelligence; update status and dates rather than deleting them.",
    repositoryUrl: "https://github.com/mandyking308-hub/globalhealthaccesstrust",
  },
];

export function getDataAsset(id: string) {
  return DATA_ASSETS.find((asset) => asset.id === id);
}
