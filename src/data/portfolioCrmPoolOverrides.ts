export type PortfolioPoolDimension = "sector" | "function" | "ecosystem";

/**
 * CRM-specific many-to-many overlays.
 *
 * The commercial map records each proposition's core reusable pools. This overlay captures
 * additional sector/function combinations revealed by portfolio CRM planning without
 * rewriting product positioning. Example: Procitron is functionally Procurement, but an
 * Education organisation dataset can still feed Procitron by selecting procurement/COO/CFO
 * roles inside those school groups.
 */
export const PORTFOLIO_CRM_POOL_OVERRIDES: Record<string, string[]> = {
  "Procitron": ["education-leadership", "healthcare-enterprise"],
  "Kinetiva Energy": ["education-leadership", "healthcare-enterprise"],
  "Nexara Systems": ["education-leadership"],
  "Governexa": ["education-leadership", "healthcare-enterprise"],
  "Velocity": ["education-leadership", "healthcare-enterprise"],
  "Wise Wise Library": ["education-leadership"],
  "Verisora": ["education-leadership"],
  "RIVRA": ["healthcare-enterprise"],
  "Aivantis Global": ["healthcare-enterprise"],
  "Legaion": ["healthcare-enterprise"],
};

export const PORTFOLIO_POOL_DIMENSIONS: Record<string, PortfolioPoolDimension> = {
  "education-leadership": "sector",
  "healthcare-enterprise": "sector",
  "enterprise-operations": "function",
  "finance-treasury": "function",
  "governance-risk": "function",
  "supply-chain-procurement": "function",
  "hr-people-benefits": "function",
  "marketing-comms": "function",
  "professional-learning": "function",
  "hnw-family-office": "ecosystem",
  "founders-investors": "ecosystem",
  "media-creative": "ecosystem",
  "consumer-retail-partners": "ecosystem",
  "philanthropy-funders": "ecosystem",
};

export const PORTFOLIO_POOL_DIMENSION_HELP: Record<PortfolioPoolDimension, string> = {
  sector: "Which organisations are in the universe (for example education or healthcare).",
  function: "Which job/function is being targeted inside those organisations (for example procurement, finance or marketing).",
  ecosystem: "Which relationship ecosystem the organisation/person belongs to (for example HNW/family office, founders/investors or philanthropy).",
};
