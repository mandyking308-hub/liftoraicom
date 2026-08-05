/**
 * Provider-neutral viral/market intelligence adapter contract.
 *
 * Rule: buy the data, build and own the brain. Providers only supply raw
 * signals. All matching, scoring, briefing and attribution stay in Liftor.
 *
 * No adapter in this file performs an external network call today.
 * The Tubular adapter is deliberately SAFE-OFF until credentials AND a
 * confirmed API contract exist.
 */

import { normaliseSignal, type ViralSignalInput } from "./socialViralLogic.ts";

export const VIRAL_CAPABILITIES = [
  "broad_content_discovery",
  "keyword_topic_search",
  "competitor_account_monitoring",
  "creator_discovery",
  "historical_performance",
  "trend_velocity_metrics",
  "audience_geography_insights",
] as const;
export type ViralCapability = typeof VIRAL_CAPABILITIES[number];

export type CapabilityDeclaration = Record<ViralCapability, boolean>;

export const NO_CAPABILITIES: CapabilityDeclaration = {
  broad_content_discovery: false,
  keyword_topic_search: false,
  competitor_account_monitoring: false,
  creator_discovery: false,
  historical_performance: false,
  trend_velocity_metrics: false,
  audience_geography_insights: false,
};

export type ProviderFetchRequest = {
  business_id: string;
  watchlist_id?: string | null;
  keywords?: string[];
  platforms?: string[];
  competitor_handles?: string[];
  limit?: number;
  /** Manual/import adapters receive already-structured rows here. */
  rows?: unknown[];
};

export type ProviderResult = {
  ok: boolean;
  provider_slug: string;
  /** never "connected" unless a real authenticated call succeeded */
  status: "not_configured" | "manual_mode" | "connected" | "degraded" | "paused";
  code?: string;
  message?: string;
  provider_calls: number;
  signals: ViralSignalInput[];
  errors: Array<{ index: number; reasons: string[] }>;
  warnings: string[];
};

export interface ViralIntelligenceProvider {
  slug: string;
  displayName: string;
  /** Declared capability surface. */
  capabilities(): CapabilityDeclaration;
  /** "unverified" until a real documented + authenticated call has proven it. */
  capabilityVerification(): "unverified" | "declared" | "verified";
  supportedPlatforms(): string[];
  isConfigured(): boolean;
  /** Reports readiness with zero network calls. */
  test(): Promise<ProviderResult>;
  fetchSignals(req: ProviderFetchRequest): Promise<ProviderResult>;
}

function envGet(key: string): string {
  try {
    return ((globalThis as any).Deno?.env?.get(key) as string | undefined) ?? "";
  } catch {
    return "";
  }
}

/** Strips anything that could carry a secret out of an error/message. */
export function sanitiseProviderMessage(input: unknown): string {
  let s = typeof input === "string" ? input : input instanceof Error ? input.message : JSON.stringify(input ?? "");
  if (!s) return "provider_error";
  s = s.replace(/(api[-_ ]?key|authorization|bearer|token|secret|password)\s*[:=]\s*\S+/gi, "$1:[redacted]");
  s = s.replace(/[A-Za-z0-9_\-]{24,}/g, "[redacted]");
  return s.slice(0, 400);
}

/* ------------------------------------------------------------------ */
/* Manual import adapter — founder-supplied structured signals only.   */
/* ------------------------------------------------------------------ */

export class ManualImportAdapter implements ViralIntelligenceProvider {
  slug = "manual_import";
  displayName = "Manual / structured import";

  capabilities(): CapabilityDeclaration {
    return {
      ...NO_CAPABILITIES,
      keyword_topic_search: false,
      historical_performance: true,
      trend_velocity_metrics: true,
    };
  }
  capabilityVerification() { return "verified" as const; }
  supportedPlatforms() {
    return ["tiktok", "instagram", "youtube", "youtube_shorts", "facebook", "linkedin", "x", "pinterest", "other"];
  }
  isConfigured() { return true; }

  async test(): Promise<ProviderResult> {
    return {
      ok: true,
      provider_slug: this.slug,
      status: "manual_mode",
      code: "MANUAL_MODE",
      message: "Manual import is available. No external calls are made.",
      provider_calls: 0,
      signals: [],
      errors: [],
      warnings: [],
    };
  }

  async fetchSignals(req: ProviderFetchRequest): Promise<ProviderResult> {
    const rows = Array.isArray(req.rows) ? req.rows : [];
    const signals: ViralSignalInput[] = [];
    const errors: Array<{ index: number; reasons: string[] }> = [];
    const warnings: string[] = [];
    rows.forEach((raw, index) => {
      const { row, errors: errs, warnings: warns } = normaliseSignal(raw, { provider_slug: this.slug });
      warnings.push(...warns.map((w) => `row_${index}:${w}`));
      if (errs.length) errors.push({ index, reasons: errs });
      else signals.push(row as unknown as ViralSignalInput);
    });
    return {
      ok: true,
      provider_slug: this.slug,
      status: "manual_mode",
      provider_calls: 0,
      signals,
      errors,
      warnings,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Tubular adapter shell — SAFE-OFF. No endpoints are guessed.         */
/* ------------------------------------------------------------------ */

export const TUBULAR_REQUIRED_SECRETS = ["TUBULAR_API_KEY"] as const;

export class TubularAdapter implements ViralIntelligenceProvider {
  slug = "tubular";
  displayName = "Tubular Labs (not configured)";

  /**
   * Declared from Tubular's marketing surface only, and therefore reported as
   * UNVERIFIED. Nothing here is treated as available until documentation and
   * credentials are confirmed.
   */
  capabilities(): CapabilityDeclaration {
    return {
      broad_content_discovery: true,
      keyword_topic_search: true,
      competitor_account_monitoring: true,
      creator_discovery: true,
      historical_performance: true,
      trend_velocity_metrics: true,
      audience_geography_insights: true,
    };
  }
  capabilityVerification() { return "unverified" as const; }
  supportedPlatforms() { return ["youtube", "facebook", "instagram", "x", "tiktok"]; }

  missingSecrets(): string[] {
    return TUBULAR_REQUIRED_SECRETS.filter((k) => !envGet(k).trim());
  }
  isConfigured(): boolean { return this.missingSecrets().length === 0; }

  /** Contract confirmation is an explicit, deliberate server-side switch. */
  contractConfirmed(): boolean {
    return envGet("TUBULAR_API_CONTRACT_CONFIRMED").trim().toLowerCase() === "true";
  }

  private blocked(): ProviderResult {
    const missing = this.missingSecrets();
    const code = missing.length ? "NOT_CONFIGURED" : "API_CONTRACT_UNCONFIRMED";
    return {
      ok: false,
      provider_slug: this.slug,
      status: "not_configured",
      code,
      message:
        code === "NOT_CONFIGURED"
          ? `Tubular is not configured. Missing server-side secret(s): ${missing.join(", ")}.`
          : "Tubular credentials exist but the API contract is unconfirmed. No endpoint will be called until the documented request/response shape and usage rights are supplied.",
      provider_calls: 0,
      signals: [],
      errors: [],
      warnings: ["no_external_call_made"],
    };
  }

  async test(): Promise<ProviderResult> { return this.blocked(); }
  async fetchSignals(_req: ProviderFetchRequest): Promise<ProviderResult> { return this.blocked(); }
}

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

const REGISTRY = new Map<string, () => ViralIntelligenceProvider>([
  ["manual_import", () => new ManualImportAdapter()],
  ["tubular", () => new TubularAdapter()],
]);

export function registerViralProvider(slug: string, factory: () => ViralIntelligenceProvider): void {
  REGISTRY.set(slug, factory);
}

export function getViralProvider(slug?: string | null): ViralIntelligenceProvider {
  const f = REGISTRY.get((slug ?? "manual_import").toLowerCase());
  return f ? f() : new ManualImportAdapter();
}

export function listViralProviders(): Array<{
  slug: string;
  display_name: string;
  capabilities: CapabilityDeclaration;
  capability_verification: string;
  supported_platforms: string[];
  configured: boolean;
}> {
  return Array.from(REGISTRY.values()).map((f) => {
    const p = f();
    return {
      slug: p.slug,
      display_name: p.displayName,
      capabilities: p.capabilities(),
      capability_verification: p.capabilityVerification(),
      supported_platforms: p.supportedPlatforms(),
      configured: p.isConfigured(),
    };
  });
}