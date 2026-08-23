import { PORTFOLIO_COMMERCIAL_MAP, REUSE_POOLS } from "@/data/portfolioCommercialMap";
import { PORTFOLIO_CRM_POOL_OVERRIDES, PORTFOLIO_POOL_DIMENSIONS } from "@/data/portfolioCrmPoolOverrides";

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const aliases: Record<string, string> = {
  "aurelia": "The Aurelia World",
  "kindness habits": "Kindnesss",
  "procitron": "Procitron",
  "kingsbridge": "Kingsbridge Global",
  "wise wise": "Wise Wise Library",
  "health choices": "Health Choices Global / healthcare rebuild",
  "hcg": "Health Choices Global / healthcare rebuild",
};

export function resolvePortfolioBusiness(businessName: string | null | undefined) {
  const raw = (businessName ?? "").trim();
  if (!raw) return null;
  const key = normalise(raw);

  const direct = PORTFOLIO_COMMERCIAL_MAP.find((b) => normalise(b.business) === key);
  if (direct) return direct;

  const aliasTarget = Object.entries(aliases).find(([alias]) => key.includes(normalise(alias)))?.[1];
  if (aliasTarget) {
    const aliased = PORTFOLIO_COMMERCIAL_MAP.find((b) => b.business === aliasTarget);
    if (aliased) return aliased;
  }

  return PORTFOLIO_COMMERCIAL_MAP.find((b) => {
    const business = normalise(b.business);
    return business.includes(key) || key.includes(business) || b.sourceProjects.some((p) => {
      const project = normalise(p);
      return project === key || project.includes(key) || key.includes(project);
    });
  }) ?? null;
}

export function resolveBusinessPools(businessName: string | null | undefined) {
  const business = resolvePortfolioBusiness(businessName);
  if (!business) return [];
  const overrides = PORTFOLIO_CRM_POOL_OVERRIDES[business.business] ?? [];
  return Array.from(new Set([...business.reusePools, ...overrides]));
}

export function poolLabel(poolId: string) {
  return REUSE_POOLS.find((pool) => pool.id === poolId)?.label ?? poolId;
}

export function poolDimension(poolId: string) {
  return PORTFOLIO_POOL_DIMENSIONS[poolId] ?? "ecosystem";
}

export function uniquePoolsForBusinesses(businessNames: Array<string | null | undefined>) {
  return Array.from(new Set(businessNames.flatMap(resolveBusinessPools)));
}
