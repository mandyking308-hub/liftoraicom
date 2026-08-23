import type { PortfolioCommercialBusiness } from "@/data/portfolioCommercialMap";

export type CrossUseDataLink = {
  businessId: string;
  poolId: string;
  reason: string;
};

/**
 * Additional legitimate cross-sector uses of shared datasets.
 *
 * A business has one primary launch group for sequencing, but it may use many
 * data pools. These links capture uses that are not obvious from the product's
 * home sector. This is deliberately separate from launch grouping so one data
 * asset can unlock businesses across several release clusters.
 */
export const CROSS_USE_DATA_LINKS: CrossUseDataLink[] = [
  {
    businessId: "procitron",
    poolId: "education-leadership",
    reason: "Large education groups and school operators are institutional procurement buyers. The education account universe can therefore be reused to identify procurement/operations buyers for Procitron.",
  },
];

export function getAllDataPoolIdsForBusiness(business: PortfolioCommercialBusiness) {
  const crossUse = CROSS_USE_DATA_LINKS.filter((link) => link.businessId === business.id).map((link) => link.poolId);
  return Array.from(new Set([...business.reusePools, ...crossUse]));
}

export function getCrossUseReasons(businessId: string) {
  return CROSS_USE_DATA_LINKS.filter((link) => link.businessId === businessId);
}
