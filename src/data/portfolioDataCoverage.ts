import type { PortfolioCommercialBusiness } from "@/data/portfolioCommercialMap";

export type DataCoverageStatus = "covered" | "building" | "partial" | "gap";

export type PoolDataCoverage = {
  poolId: string;
  status: DataCoverageStatus;
  assetNames: string[];
  coverageNote: string;
  nextDecision: string;
  currentLaunchNote?: string;
};

/**
 * Commercial data coverage by reusable buyer pool.
 *
 * The point of this map is portfolio leverage: acquire/enrich a buyer universe once,
 * then link it to every business that can legitimately use it. A pool may therefore
 * unlock several launches without buying the same contacts again.
 */
export const POOL_DATA_COVERAGE: PoolDataCoverage[] = [
  {
    poolId: "education-leadership",
    status: "building",
    assetNames: ["Global Education Sales Data"],
    coverageNote: "22 groups seeded; 146 contacts enriched; 109 verified work emails; building toward 120 groups / 2,500 contacts.",
    nextDecision: "Finish the shared education universe, import it into Liftor, then reuse it across every relevant education proposition before buying more education data.",
    currentLaunchNote: "Current operating plan is a four-business education launch batch using this same shared pool; other education-adjacent businesses remain linked for later use.",
  },
  {
    poolId: "hnw-family-office",
    status: "partial",
    assetNames: ["Billionaire Intelligence", "Rich Kids / Next-Gen Wealth Networks"],
    coverageNote: "Strong wealth and route intelligence exists, but it is not yet a complete family-office/private-client commercial universe.",
    nextDecision: "Measure organisation/contact coverage against all HNW-linked businesses, then buy only the missing family-office, adviser and private-client roles.",
  },
  {
    poolId: "philanthropy-funders",
    status: "partial",
    assetNames: ["Billionaire Intelligence", "Rich Kids / Next-Gen Wealth Networks", "GHAT Grants & Funding Database"],
    coverageNote: "Substantial funder, donor, next-gen and access-route intelligence exists across Liftor and GHAT.",
    nextDecision: "Join the existing assets before new enrichment; fill only missing foundation, CSR, philanthropy-adviser and donor-route contacts.",
  },
  {
    poolId: "founders-investors",
    status: "partial",
    assetNames: ["Billionaire Intelligence", "Rich Kids / Next-Gen Wealth Networks"],
    coverageNote: "Existing wealth/network assets overlap with some founders and investors, but do not yet form a broad founder/VC/accelerator buyer universe.",
    nextDecision: "Reuse known investors first, then build the missing founder, VC, accelerator and venture-ecosystem layer once for all linked businesses.",
  },
  {
    poolId: "enterprise-operations",
    status: "gap",
    assetNames: [],
    coverageNote: "No dedicated portfolio-wide enterprise operations dataset is registered yet.",
    nextDecision: "Candidate shared purchase: build CEO/COO/transformation/operations leadership once and reuse across the large enterprise software cluster.",
  },
  {
    poolId: "healthcare-enterprise",
    status: "gap",
    assetNames: [],
    coverageNote: "Healthcare knowledge exists in individual products, but no dedicated shared commercial healthcare buyer universe is registered yet.",
    nextDecision: "Build healthcare organisations and senior operational/clinical/commercial buyers once for all linked health businesses.",
  },
  {
    poolId: "finance-treasury",
    status: "gap",
    assetNames: [],
    coverageNote: "No dedicated shared CFO/treasury/finance buyer dataset is registered yet.",
    nextDecision: "Candidate shared purchase: CFO, treasurer, controller and finance-operations universe for the finance/fintech cluster.",
  },
  {
    poolId: "governance-risk",
    status: "gap",
    assetNames: [],
    coverageNote: "No dedicated shared governance, legal, risk and compliance buyer dataset is registered yet.",
    nextDecision: "Build general counsel, compliance, risk, governance and audit leadership once for every linked proposition.",
  },
  {
    poolId: "supply-chain-procurement",
    status: "gap",
    assetNames: [],
    coverageNote: "No dedicated shared procurement/supply-chain dataset is registered yet.",
    nextDecision: "Strong candidate next purchase because one CPO/procurement/supply-chain universe can unlock several enterprise businesses.",
  },
  {
    poolId: "hr-people-benefits",
    status: "gap",
    assetNames: [],
    coverageNote: "No dedicated shared HR, benefits and people-leadership dataset is registered yet.",
    nextDecision: "Build CHRO, benefits, reward, mobility and wellbeing buyers once and reuse across insurance, health and learning propositions.",
  },
  {
    poolId: "marketing-comms",
    status: "gap",
    assetNames: [],
    coverageNote: "No dedicated shared marketing/communications buyer universe is registered yet.",
    nextDecision: "Build CMO, marketing, growth, PR and communications leadership once for linked marketing/media/AI businesses.",
  },
  {
    poolId: "media-creative",
    status: "gap",
    assetNames: [],
    coverageNote: "No dedicated shared media, publishing, licensing and creative-partner dataset is registered yet.",
    nextDecision: "Build publishers, media buyers, licensing, distribution and brand-partnership contacts once for all linked creative businesses.",
  },
  {
    poolId: "consumer-retail-partners",
    status: "gap",
    assetNames: [],
    coverageNote: "Consumer audiences are product-specific, but the B2B retail/distribution/partnership layer has not yet been built as a shared asset.",
    nextDecision: "Build retailers, distributors, marketplaces and partnership buyers once; keep end-consumer acquisition separate by brand.",
  },
  {
    poolId: "professional-learning",
    status: "gap",
    assetNames: [],
    coverageNote: "No dedicated shared L&D/professional-learning buyer universe is registered yet.",
    nextDecision: "Build L&D, membership, occupational-health and employer learning contacts once for the linked learning/wellbeing propositions.",
  },
];

export function getPoolDataCoverage(poolId: string) {
  return POOL_DATA_COVERAGE.find((item) => item.poolId === poolId);
}

export function getBusinessDataDecision(business: PortfolioCommercialBusiness) {
  if (business.status === "internal") {
    return {
      status: "covered" as const,
      label: "No sales data required",
      detail: "Internal-only product. Keep it visible in the portfolio, but do not allocate commercial data or Apollo credits.",
    };
  }

  if (business.status === "review" || business.apolloPriority === "review") {
    return {
      status: "partial" as const,
      label: "Review before data spend",
      detail: "Project is accounted for, but proposition/ICP must be confirmed before allocating a shared buyer pool or enrichment credits.",
    };
  }

  if (business.reusePools.length === 0) {
    return {
      status: "gap" as const,
      label: "Data pool unassigned",
      detail: "Commercial project is visible but has no shared buyer pool yet. This is an explicit action item, not an omission.",
    };
  }

  const coverages = business.reusePools
    .map((poolId) => getPoolDataCoverage(poolId))
    .filter((item): item is PoolDataCoverage => Boolean(item));

  const rank: Record<DataCoverageStatus, number> = { covered: 4, building: 3, partial: 2, gap: 1 };
  const best = [...coverages].sort((a, b) => rank[b.status] - rank[a.status])[0];

  if (!best) {
    return {
      status: "gap" as const,
      label: "Coverage not assessed",
      detail: "Shared buyer pools are assigned but their data coverage has not yet been assessed.",
    };
  }

  return {
    status: best.status,
    label:
      best.status === "covered"
        ? "Shared data covered"
        : best.status === "building"
          ? "Shared data building"
          : best.status === "partial"
            ? "Shared data partial"
            : "Shared data needed",
    detail: best.coverageNote,
  };
}
