import { PORTFOLIO_COMMERCIAL_MAP } from "@/data/portfolioCommercialMap";

export type DatasetPlanStatus = "existing" | "building" | "partial" | "to_buy" | "none" | "review";
export type ReleaseState = "locked" | "to_decide" | "blocked" | "internal";

export type PortfolioLaunchGroup = {
  id: string;
  name: string;
  rationale: string;
  businessIds: string[];
  datasetPlan: string;
  datasetStatus: DatasetPlanStatus;
  releaseOrder: number | null;
  releaseState: ReleaseState;
  releaseNote: string;
};

/**
 * Exclusive primary launch grouping for the full portfolio.
 * Every business family belongs to exactly one primary group here.
 * Secondary overlaps remain in portfolioCommercialMap, but this file is the
 * operational grouping used to decide shared datasets and release order.
 */
export const PORTFOLIO_LAUNCH_GROUPS: PortfolioLaunchGroup[] = [
  {
    id: "education",
    name: "Education — shared school/group buyer universe",
    rationale: "Four education business families can use the same school-group and education-leadership account universe, with proposition-specific campaigns layered on top.",
    businessIds: ["aurelia", "kingsbridge", "kindnesss", "squishy-d"],
    datasetPlan: "Global Education Sales Data — education groups, schools and named senior decision-makers. Current target: 120 groups / 2,500 contacts.",
    datasetStatus: "building",
    releaseOrder: 1,
    releaseState: "locked",
    releaseNote: "Wave 1 agreed: finish/import the shared education dataset and release these four business families together into Liftor.",
  },
  {
    id: "finance-treasury",
    name: "Finance, treasury & payments",
    rationale: "The same CFO, treasury, controller, payments and finance-operations universe can serve four closely related finance/fintech propositions.",
    businessIds: ["aivantis", "rivra", "vault-route", "chainvault"],
    datasetPlan: "Shared CFO / treasury / payments universe — CFOs, treasurers, controllers, heads of payments, finance operations and relevant compliance leadership.",
    datasetStatus: "to_buy",
    releaseOrder: null,
    releaseState: "to_decide",
    releaseNote: "Candidate early wave because one dataset unlocks four businesses; order is not yet decided.",
  },
  {
    id: "procurement-supply-chain",
    name: "Procurement, supply chain & operations",
    rationale: "CPO, procurement, sourcing, supply-chain and operations buyers overlap heavily across this enterprise cluster.",
    businessIds: ["procitron", "orchelo", "foodorigin", "kinetiva"],
    datasetPlan: "Shared procurement / supply-chain universe — CPOs, procurement directors, supply-chain directors, logistics, sourcing, sustainability and operations leaders.",
    datasetStatus: "to_buy",
    releaseOrder: null,
    releaseState: "to_decide",
    releaseNote: "High-leverage four-business cluster; decide against finance and the other clusters after reviewing launch readiness.",
  },
  {
    id: "private-wealth",
    name: "Private wealth, family office & luxury",
    rationale: "These propositions sell into the same private-capital/family-office ecosystem, while the exact role used differs by offer.",
    businessIds: ["montvelle", "elyntor", "elorea", "eira"],
    datasetPlan: "Reuse Billionaire Intelligence + Rich Kids / Next-Gen Wealth Networks, then enrich only missing family-office principals, private-client advisers, luxury intermediaries and collector/investment routes.",
    datasetStatus: "partial",
    releaseOrder: null,
    releaseState: "to_decide",
    releaseNote: "Audit the data already owned before buying more. Purchase only the missing commercial layer.",
  },
  {
    id: "healthcare",
    name: "Healthcare organisations & clinical networks",
    rationale: "Healthcare groups, providers, commissioners, insurer/provider networks and clinical leadership can be reused across four health propositions.",
    businessIds: ["orvena", "health-choices-global", "oro-mental-health", "clinicianscheck"],
    datasetPlan: "Shared healthcare organisation and leadership universe — CEOs/COOs, clinical operations, provider networks, medical directors, commissioners, partnerships and relevant procurement roles.",
    datasetStatus: "to_buy",
    releaseOrder: null,
    releaseState: "to_decide",
    releaseNote: "Build once for the healthcare cluster; keep patient/consumer acquisition separate from B2B organisation data.",
  },
  {
    id: "enterprise-tech-governance",
    name: "Enterprise technology, operations & governance",
    rationale: "Large-company operational leadership is the common account layer; technology, governance and legal role selection then varies by proposition.",
    businessIds: ["liftor", "nexara", "governexa", "legaion", "global-solutions"],
    datasetPlan: "Enterprise leadership universe with CEO/COO/CIO/CTO/transformation plus governance, legal, risk and compliance role enrichment.",
    datasetStatus: "to_buy",
    releaseOrder: null,
    releaseState: "to_decide",
    releaseNote: "Largest core B2B cluster; likely one broad enterprise account base with role-specific sub-pools rather than separate company lists.",
  },
  {
    id: "founder-investor",
    name: "Founders, investors & responsible capital",
    rationale: "Founder-development and integrity propositions share founders, accelerators, funds, investors and ecosystem intermediaries.",
    businessIds: ["ardentis", "duty-of-care"],
    datasetPlan: "Founder / VC / accelerator / investor universe, reusing relevant existing billionaire and next-gen wealth records before enrichment.",
    datasetStatus: "partial",
    releaseOrder: null,
    releaseState: "to_decide",
    releaseNote: "Existing investor/wealth intelligence reduces the amount of new data required; fill founder and ecosystem gaps only.",
  },
  {
    id: "media-marketing-creative",
    name: "Marketing, media, publishing & creative",
    rationale: "Marketing, communications, publishing, media, licensing and brand-partnership relationships form a reusable commercial ecosystem across this group.",
    businessIds: ["velocity", "catalyst-narrative", "daily-world-news", "neoncandy", "billy", "christine"],
    datasetPlan: "Shared marketing/comms + media/creative universe — CMOs, PR/comms, publishers, media buyers, licensing, distribution and brand-partnership contacts.",
    datasetStatus: "to_buy",
    releaseOrder: null,
    releaseState: "to_decide",
    releaseNote: "Six-business cluster. Child/youth-related propositions use adult-managed institutional routes only.",
  },
  {
    id: "consumer-retail-travel",
    name: "Consumer brands, retail & distribution",
    rationale: "End consumers differ by brand, but the B2B route through retailers, distributors, marketplaces, affiliates and commercial partners can be shared.",
    businessIds: ["cloth-glitter", "globlast", "global-travel-online"],
    datasetPlan: "Retail / distribution / marketplace / affiliate / partnership universe. Keep paid-social and direct-consumer audiences brand-specific.",
    datasetStatus: "to_buy",
    releaseOrder: null,
    releaseState: "to_decide",
    releaseNote: "Treat shared B2B channel data as the asset; do not merge distinct end-consumer audiences into one list.",
  },
  {
    id: "hr-benefits-learning",
    name: "HR, benefits & professional learning",
    rationale: "Employer HR, benefits, wellbeing, mobility and L&D leadership overlaps strongly across these propositions.",
    businessIds: ["verisora", "wise-wise-library"],
    datasetPlan: "Shared CHRO / HR / benefits / reward / mobility / wellbeing / L&D buyer universe.",
    datasetStatus: "to_buy",
    releaseOrder: null,
    releaseState: "to_decide",
    releaseNote: "Small but clean shared buyer cluster; release order remains to be decided.",
  },
  {
    id: "charity-funding",
    name: "Charity, grants & philanthropy",
    rationale: "GHAT has its own funding workflow but benefits from the portfolio's billionaire, next-gen and philanthropy intelligence.",
    businessIds: ["ghat"],
    datasetPlan: "Reuse GHAT Grants & Funding Database + Billionaire Intelligence + Rich Kids / Next-Gen Wealth Networks; perform gap enrichment only where funder/donor routes are missing.",
    datasetStatus: "existing",
    releaseOrder: null,
    releaseState: "to_decide",
    releaseNote: "Operational data already exists; no duplicate full Apollo purchase is required.",
  },
  {
    id: "internal",
    name: "Internal-only tools",
    rationale: "These remain visible in the portfolio but are not commercial launch/data-buy candidates.",
    businessIds: ["autism-report-assistant"],
    datasetPlan: "No commercial sales dataset required.",
    datasetStatus: "none",
    releaseOrder: null,
    releaseState: "internal",
    releaseNote: "Keep in Liftor inventory and operations, but exclude from Apollo/data-buy prioritisation.",
  },
  {
    id: "review-queue",
    name: "Review before grouping/data spend",
    rationale: "These projects stay visible but are not forced into a commercial wave until the proposition and ICP are confirmed.",
    businessIds: ["prompt-genie", "trade2", "hedge-fund-platform", "vivid-verde"],
    datasetPlan: "No data purchase until each proposition, buyer and reusable pool is confirmed.",
    datasetStatus: "review",
    releaseOrder: null,
    releaseState: "blocked",
    releaseNote: "Unfinished/unclear does not mean omitted. These projects remain on the master list and are explicitly blocked from data spend until reviewed.",
  },
];

export const PRIMARY_GROUP_BY_BUSINESS = Object.fromEntries(
  PORTFOLIO_LAUNCH_GROUPS.flatMap((group) => group.businessIds.map((businessId) => [businessId, group.id])),
) as Record<string, string>;

export function getLaunchGroup(groupId: string) {
  return PORTFOLIO_LAUNCH_GROUPS.find((group) => group.id === groupId);
}

export function getBusinessLaunchGroup(businessId: string) {
  const groupId = PRIMARY_GROUP_BY_BUSINESS[businessId];
  return groupId ? getLaunchGroup(groupId) : undefined;
}

export const UNGROUPED_PORTFOLIO_BUSINESSES = PORTFOLIO_COMMERCIAL_MAP.filter(
  (business) => !PRIMARY_GROUP_BY_BUSINESS[business.id],
);

export const GROUPED_SOURCE_PROJECT_COUNT = PORTFOLIO_LAUNCH_GROUPS.reduce((total, group) => {
  return total + group.businessIds.reduce((groupTotal, businessId) => {
    const business = PORTFOLIO_COMMERCIAL_MAP.find((item) => item.id === businessId);
    return groupTotal + (business?.sourceProjects.length ?? 0);
  }, 0);
}, 0);
