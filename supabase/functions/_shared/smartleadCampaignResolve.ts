/**
 * Deterministic resolution of a Smartlead campaign for a Liftor campaign.
 *
 * PURE. No IO. Given the campaigns read from Smartlead (read-only GET) and a
 * request, decides whether we can map safely.
 *
 * FAIL CLOSED: anything ambiguous returns `ambiguous` and the caller must NOT
 * create or map anything.
 */

export const CAMPAIGN_RESOLVER_VERSION = "smartlead-campaign-resolver-1.0.0";

export interface ProviderCampaign {
  id?: string | number | null;
  campaign_id?: string | number | null;
  name?: string | null;
  campaign_name?: string | null;
  status?: string | null;
}

export interface NormalizedProviderCampaign {
  provider_campaign_id: string;
  provider_campaign_name: string;
  provider_campaign_status: string | null;
}

export type ResolutionOutcome =
  | "resolved_by_id"
  | "resolved_by_name"
  | "not_found"
  | "ambiguous_name"
  | "no_selector";

export interface ResolutionResult {
  outcome: ResolutionOutcome;
  ok: boolean;
  match: NormalizedProviderCampaign | null;
  candidates: NormalizedProviderCampaign[];
  /** True only when the caller may proceed to create a NEW Smartlead campaign. */
  create_allowed: boolean;
  reason: string | null;
  resolver_version: string;
}

export function normalizeProviderCampaign(c: ProviderCampaign): NormalizedProviderCampaign | null {
  const id = c?.id ?? c?.campaign_id;
  if (id === null || id === undefined || String(id).trim() === "") return null;
  return {
    provider_campaign_id: String(id).trim(),
    provider_campaign_name: String(c?.name ?? c?.campaign_name ?? "").trim(),
    provider_campaign_status: c?.status ? String(c.status) : null,
  };
}

export function normalizeCampaignList(list: unknown): NormalizedProviderCampaign[] {
  const arr: ProviderCampaign[] = Array.isArray(list)
    ? (list as ProviderCampaign[])
    : Array.isArray((list as { data?: unknown })?.data)
      ? ((list as { data: ProviderCampaign[] }).data)
      : Array.isArray((list as { results?: unknown })?.results)
        ? ((list as { results: ProviderCampaign[] }).results)
        : [];
  return arr.map(normalizeProviderCampaign).filter((c): c is NormalizedProviderCampaign => c !== null);
}

/**
 * Deterministic idempotency token for a Liftor campaign.
 * Reused as the Smartlead campaign name suffix so a retried create can always
 * be discovered as an existing campaign instead of creating a duplicate.
 */
export function buildIdempotencyToken(liftorCampaignId: string): string {
  return `liftor-${String(liftorCampaignId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toLowerCase()}`;
}

export function buildDeterministicCampaignName(liftorCampaignName: string, liftorCampaignId: string): string {
  const base = String(liftorCampaignName ?? "").trim().slice(0, 60) || "Liftor Campaign";
  return `${base} [${buildIdempotencyToken(liftorCampaignId)}]`;
}

export interface ResolveRequest {
  /** Explicit provider campaign id supplied by the founder. Strongest selector. */
  provider_campaign_id?: string | null;
  /** Name to match, typically the deterministic name including the token. */
  provider_campaign_name?: string | null;
  /** Deterministic token; matched as a substring of the provider name. */
  idempotency_token?: string | null;
}

export function resolveProviderCampaign(
  campaigns: NormalizedProviderCampaign[],
  req: ResolveRequest,
): ResolutionResult {
  const base = {
    candidates: campaigns,
    resolver_version: CAMPAIGN_RESOLVER_VERSION,
  };

  // 1. Explicit id wins outright.
  const wantId = (req.provider_campaign_id ?? "").trim();
  if (wantId) {
    const hits = campaigns.filter((c) => c.provider_campaign_id === wantId);
    if (hits.length === 1) {
      return { ...base, outcome: "resolved_by_id", ok: true, match: hits[0], create_allowed: false, reason: null };
    }
    return {
      ...base,
      outcome: "not_found",
      ok: false,
      match: null,
      create_allowed: false,
      reason: `provider_campaign_id_not_found:${wantId}`,
    };
  }

  // 2. Deterministic token match — this is what makes retry safe.
  const token = (req.idempotency_token ?? "").trim().toLowerCase();
  if (token) {
    const hits = campaigns.filter((c) => c.provider_campaign_name.toLowerCase().includes(token));
    if (hits.length === 1) {
      return { ...base, outcome: "resolved_by_name", ok: true, match: hits[0], create_allowed: false, reason: null };
    }
    if (hits.length > 1) {
      return {
        ...base,
        candidates: hits,
        outcome: "ambiguous_name",
        ok: false,
        match: null,
        create_allowed: false,
        reason: `multiple_provider_campaigns_share_token:${token}`,
      };
    }
  }

  // 3. Exact name match.
  const wantName = (req.provider_campaign_name ?? "").trim().toLowerCase();
  if (wantName) {
    const hits = campaigns.filter((c) => c.provider_campaign_name.toLowerCase() === wantName);
    if (hits.length === 1) {
      return { ...base, outcome: "resolved_by_name", ok: true, match: hits[0], create_allowed: false, reason: null };
    }
    if (hits.length > 1) {
      return {
        ...base,
        candidates: hits,
        outcome: "ambiguous_name",
        ok: false,
        match: null,
        create_allowed: false,
        reason: `multiple_provider_campaigns_share_name:${wantName}`,
      };
    }
  }

  if (!token && !wantName) {
    return { ...base, outcome: "no_selector", ok: false, match: null, create_allowed: false, reason: "no_selector_supplied" };
  }

  // Nothing matched. Creating is only *permissible* here — the caller still
  // needs an explicit founder confirmation phrase before it may create.
  return {
    ...base,
    outcome: "not_found",
    ok: false,
    match: null,
    create_allowed: true,
    reason: "no_matching_provider_campaign_creation_requires_founder_confirmation",
  };
}
