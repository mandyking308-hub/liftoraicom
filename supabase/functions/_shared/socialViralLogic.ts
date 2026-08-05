/**
 * Liftor Viral Opportunity Radar — pure domain logic.
 *
 * Commercial virality, not vanity views: reach -> attention -> click -> conversion.
 * Everything in this file is deterministic and side-effect free so it can be
 * unit tested from the frontend test suite. No network, no secrets, no Deno.
 *
 * Language rule: these are POTENTIAL / OPPORTUNITY / CONFIDENCE values.
 * They are never predictions or guarantees of performance.
 */

export const VIRAL_SAFETY_FLAGS = {
  no_scraping: true,
  no_browser_automation: true,
  no_fabricated_provider_data: true,
  no_copied_captions_or_assets: true,
  no_media_download: true,
  no_auto_publish: true,
  founder_review_required: true,
  business_isolated: true,
} as const;

export const VIRAL_CONFIRMATIONS = {
  import_signals: "IMPORT VIRAL SIGNALS",
  persist_score: "SCORE VIRAL OPPORTUNITY",
  create_watchlist: "SAVE VIRAL WATCHLIST",
  review_opportunity: "REVIEW VIRAL OPPORTUNITY",
  create_brief: "CREATE VIRAL CONTENT BRIEF",
  configure_provider: "CONFIGURE VIRAL PROVIDER",
} as const;

export function confirmationAccepted(phrase: unknown, expected: string): boolean {
  return typeof phrase === "string" && phrase.trim() === expected;
}

/* ------------------------------------------------------------------ */
/* Status vocabularies — must match the migration CHECK constraints.   */
/* ------------------------------------------------------------------ */

export const PROVIDER_STATUSES = [
  "not_configured", "manual_mode", "connected", "degraded", "paused", "revoked",
] as const;
export type ProviderStatus = typeof PROVIDER_STATUSES[number];

export const SIGNAL_STATUSES = ["new", "normalised", "scored", "rejected", "expired"] as const;
export type SignalStatus = typeof SIGNAL_STATUSES[number];

export const OPPORTUNITY_STATUSES = [
  "scored", "needs_review", "approved", "rejected", "expired", "converted",
] as const;
export type OpportunityStatus = typeof OPPORTUNITY_STATUSES[number];

export const BRIEF_STATUSES = [
  "draft", "awaiting_founder_approval", "approved", "linked_to_content", "rejected", "expired",
] as const;
export type BriefStatus = typeof BRIEF_STATUSES[number];

export const BUSINESS_OBJECTIVES = [
  "awareness", "clicks", "leads", "enquiries", "donations", "sales", "recruitment", "other",
] as const;
export type BusinessObjective = typeof BUSINESS_OBJECTIVES[number];

export const SUPPORTED_PLATFORMS = [
  "tiktok", "instagram", "youtube", "youtube_shorts", "facebook", "linkedin", "x", "pinterest", "other",
] as const;

/* ------------------------------------------------------------------ */
/* Regulated / high-risk detection                                     */
/* ------------------------------------------------------------------ */

export const REGULATED_PATTERNS: Array<{ category: string; re: RegExp }> = [
  { category: "medical", re: /\b(cure|cures|treatment|diagnos\w*|symptom|patient|clinical|prescription|nhs|therap(y|ist)|medication|weight[- ]loss drug|jab)\b/i },
  { category: "financial", re: /\b(invest\w*|returns?|roi guarantee|crypto|trading|loan|mortgage|pension|financial advice|get rich)\b/i },
  { category: "legal", re: /\b(legal advice|lawsuit|compensation claim|solicitor|immigration status|visa guarantee)\b/i },
  { category: "safeguarding", re: /\b(child|minor|under[- ]?18|vulnerable adult|self[- ]harm|suicide|abuse)\b/i },
  { category: "gambling", re: /\b(betting|casino|gambl\w*|odds boost)\b/i },
];

export function detectRegulatedRisk(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  for (const p of REGULATED_PATTERNS) if (p.re.test(text)) out.push(`regulated:${p.category}`);
  return Array.from(new Set(out));
}

export const COPY_RISK_TERMS = [
  "copy this", "copy their", "verbatim", "same caption", "reuse their footage", "download their video",
];

export function detectCopyRisk(text: string): string[] {
  if (!text) return [];
  const t = text.toLowerCase();
  return COPY_RISK_TERMS.filter((x) => t.includes(x)).map((x) => `copy_risk:${x}`);
}

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

export type SignalMetrics = {
  views?: number | null;
  views_24h?: number | null;
  views_prior_24h?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  creator_followers?: number | null;
  /** 0..1 — how crowded the topic already is (1 = fully saturated). */
  saturation_ratio?: number | null;
};

export type ViralSignalInput = {
  platform: string;
  external_id: string;
  canonical_url?: string | null;
  title?: string | null;
  topic?: string | null;
  creator_handle?: string | null;
  language?: string | null;
  geography?: string | null;
  metrics?: SignalMetrics | null;
  observed_at?: string | null;
  published_at?: string | null;
  freshness_deadline?: string | null;
};

export type BusinessMatchContext = {
  business_id: string;
  niche?: string | null;
  audience_description?: string | null;
  business_objective?: BusinessObjective;
  keywords?: string[];
  platforms?: string[];
  geographies?: string[];
  languages?: string[];
  excluded_topics?: string[];
  /** A real destination for the click: landing page, offer, form, donate page. */
  conversion_route?: string | null;
  /** Set when the business itself operates in a regulated sector. */
  regulated_sector?: boolean;
};

/* ------------------------------------------------------------------ */
/* Scoring — documented deterministic weighted formula (v1)            */
/* ------------------------------------------------------------------ */

export const SCORE_WEIGHTS_V1 = {
  viral_reach: 0.30,
  trend_velocity: 0.20,
  audience_fit: 0.175,
  conversion_potential: 0.175,
  timing_saturation: 0.10,
  safety: 0.05,
} as const;

export const FORMULA_VERSION = "v1";

/** Hard blockers zero the overall score regardless of component strength. */
export const HARD_BLOCKERS = [
  "wrong_audience",
  "excluded_topic",
  "stale_trend",
  "no_conversion_route",
  "prohibited_regulated_risk",
  "missing_evidence",
] as const;
export type HardBlocker = typeof HARD_BLOCKERS[number];

function clamp(n: number, lo = 0, hi = 100): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function tokens(s?: string | null): string[] {
  return (s ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

function hoursBetween(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / 3_600_000;
}

/** Log-scaled reach: 1k views ~ 20, 100k ~ 55, 1M ~ 72, 10M+ ~ 90+. */
export function viralReachScore(m: SignalMetrics | null | undefined): number {
  const views = num(m?.views);
  if (views <= 0) return 0;
  const base = (Math.log10(views) - 2) * 18; // 100 views -> 0
  const shares = num(m?.shares);
  const shareRate = views > 0 ? shares / views : 0;
  const shareBonus = clamp(shareRate * 2000, 0, 15); // 0.75% share rate -> +15
  const followers = num(m?.creator_followers);
  // Outlier bonus: content far outperforming the creator's own audience.
  const outlier = followers > 0 ? views / followers : 0;
  const outlierBonus = outlier >= 10 ? 10 : outlier >= 3 ? 6 : outlier >= 1 ? 3 : 0;
  return round2(clamp(base + shareBonus + outlierBonus));
}

/** Acceleration between the last 24h and the previous 24h, plus recency. */
export function trendVelocityScore(
  m: SignalMetrics | null | undefined,
  opts?: { published_at?: string | null; now?: Date },
): number {
  const now = opts?.now ?? new Date();
  const recent = num(m?.views_24h);
  const prior = num(m?.views_prior_24h);
  let score = 0;
  if (recent > 0 && prior > 0) {
    const ratio = recent / prior;
    score = ratio >= 5 ? 95 : ratio >= 3 ? 85 : ratio >= 2 ? 72 : ratio >= 1.2 ? 55 : ratio >= 1 ? 40 : 20;
  } else if (recent > 0) {
    // Only one window of data — treat as moderate, unproven acceleration.
    score = 45;
  } else {
    return 0;
  }
  const pub = opts?.published_at ? new Date(opts.published_at) : null;
  if (pub && !Number.isNaN(pub.getTime())) {
    const ageH = hoursBetween(now, pub);
    if (ageH <= 48) score += 5;
    else if (ageH > 336) score -= 25; // older than 14 days
    else if (ageH > 168) score -= 12; // older than 7 days
  }
  return round2(clamp(score));
}

export function audienceFitScore(
  signal: ViralSignalInput,
  ctx: BusinessMatchContext,
): { score: number; blockers: string[] } {
  const blockers: string[] = [];
  const hay = tokens(`${signal.title ?? ""} ${signal.topic ?? ""}`);
  const wanted = (ctx.keywords ?? []).map((k) => k.toLowerCase().trim()).filter(Boolean);
  const excluded = (ctx.excluded_topics ?? []).map((k) => k.toLowerCase().trim()).filter(Boolean);
  const text = `${signal.title ?? ""} ${signal.topic ?? ""}`.toLowerCase();

  if (excluded.some((e) => e && text.includes(e))) blockers.push("excluded_topic");

  let score = 20; // unproven baseline
  const hits = wanted.filter((k) => k.split(/\s+/).every((part) => hay.includes(part) || text.includes(part)));
  if (wanted.length) {
    const ratio = hits.length / wanted.length;
    score = 15 + ratio * 60;
    if (hits.length === 0) blockers.push("wrong_audience");
  }
  const platforms = (ctx.platforms ?? []).map((p) => p.toLowerCase());
  if (platforms.length) score += platforms.includes((signal.platform ?? "").toLowerCase()) ? 10 : -15;
  const geos = (ctx.geographies ?? []).map((g) => g.toLowerCase());
  if (geos.length && signal.geography) score += geos.includes(signal.geography.toLowerCase()) ? 8 : -8;
  const langs = (ctx.languages ?? []).map((l) => l.toLowerCase());
  if (langs.length && signal.language) score += langs.includes(signal.language.toLowerCase()) ? 7 : -10;

  return { score: round2(clamp(score)), blockers };
}

const OBJECTIVE_DIFFICULTY: Record<BusinessObjective, number> = {
  awareness: 85,
  clicks: 72,
  leads: 62,
  enquiries: 60,
  donations: 52,
  sales: 48,
  recruitment: 55,
  other: 45,
};

export function conversionPotentialScore(
  signal: ViralSignalInput,
  ctx: BusinessMatchContext,
): { score: number; blockers: string[] } {
  const blockers: string[] = [];
  const route = (ctx.conversion_route ?? "").trim();
  if (!route) {
    blockers.push("no_conversion_route");
    return { score: 0, blockers };
  }
  const objective = (ctx.business_objective ?? "awareness") as BusinessObjective;
  let score = OBJECTIVE_DIFFICULTY[objective] ?? 45;

  const m = signal.metrics ?? {};
  const views = num(m.views);
  const engagements = num(m.likes) + num(m.comments) + num(m.shares) + num(m.saves);
  const engagementRate = views > 0 ? engagements / views : 0;
  // Saves and comments show intent, not just passive scroll reach.
  const intent = views > 0 ? (num(m.saves) + num(m.comments)) / views : 0;
  score += clamp(engagementRate * 300, 0, 10);
  score += clamp(intent * 800, 0, 12);
  if (views > 0 && engagementRate < 0.005) {
    score -= 20; // big reach, no attention — classic empty virality
  }
  return { score: round2(clamp(score)), blockers };
}

export function timingSaturationScore(
  signal: ViralSignalInput,
  opts?: { now?: Date },
): { score: number; blockers: string[] } {
  const now = opts?.now ?? new Date();
  const blockers: string[] = [];
  let score = 60;
  const sat = signal.metrics?.saturation_ratio;
  if (typeof sat === "number" && Number.isFinite(sat)) {
    const s = Math.max(0, Math.min(1, sat));
    score = 100 - s * 90;
    if (s >= 0.85) blockers.push("saturated_topic");
  }
  const deadline = signal.freshness_deadline ? new Date(signal.freshness_deadline) : null;
  if (deadline && !Number.isNaN(deadline.getTime())) {
    const hoursLeft = hoursBetween(deadline, now);
    if (hoursLeft <= 0) {
      blockers.push("stale_trend");
      score = 0;
    } else if (hoursLeft < 24) score -= 15;
    else if (hoursLeft > 336) score -= 5;
  }
  const pub = signal.published_at ? new Date(signal.published_at) : null;
  if (pub && !Number.isNaN(pub.getTime()) && hoursBetween(now, pub) > 720) {
    blockers.push("stale_trend");
    score = Math.min(score, 10);
  }
  return { score: round2(clamp(score)), blockers };
}

export function safetyScore(
  signal: ViralSignalInput,
  ctx: BusinessMatchContext,
): { score: number; blockers: string[]; risk_flags: string[]; requires_compliance_review: boolean } {
  const text = `${signal.title ?? ""} ${signal.topic ?? ""}`;
  const regulated = detectRegulatedRisk(text);
  const copy = detectCopyRisk(text);
  const risk_flags = [...regulated, ...copy];
  const blockers: string[] = [];
  let score = 100;
  if (regulated.length) {
    score = 25;
    blockers.push("prohibited_regulated_risk");
  }
  if (copy.length) {
    score = Math.min(score, 40);
    risk_flags.push("ip_review_required");
  }
  if (ctx.regulated_sector) {
    score = Math.min(score, 70);
    risk_flags.push("business_in_regulated_sector");
  }
  const requires_compliance_review = regulated.length > 0 || copy.length > 0 || !!ctx.regulated_sector;
  return { score: round2(clamp(score)), blockers, risk_flags: Array.from(new Set(risk_flags)), requires_compliance_review };
}

/* ------------------------------------------------------------------ */
/* Confidence — completeness + freshness of the evidence               */
/* ------------------------------------------------------------------ */

export function confidenceFor(
  signal: ViralSignalInput,
  ctx: BusinessMatchContext,
  opts?: { now?: Date; evidence_level?: string },
): { score: number; level: "low" | "medium" | "high"; missing: string[] } {
  const now = opts?.now ?? new Date();
  const m = signal.metrics ?? {};
  const missing: string[] = [];
  let score = 0;
  if (num(m.views) > 0) score += 20; else missing.push("views");
  if (num(m.views_24h) > 0 && num(m.views_prior_24h) > 0) score += 20; else missing.push("velocity_windows");
  if (num(m.likes) + num(m.comments) + num(m.shares) + num(m.saves) > 0) score += 12; else missing.push("engagement");
  if (num(m.creator_followers) > 0) score += 6; else missing.push("creator_followers");
  if (typeof m.saturation_ratio === "number") score += 6; else missing.push("saturation_ratio");
  if (signal.canonical_url) score += 8; else missing.push("canonical_url");
  if (signal.published_at) score += 8; else missing.push("published_at");
  if ((ctx.keywords ?? []).length) score += 8; else missing.push("watchlist_keywords");
  if ((ctx.conversion_route ?? "").trim()) score += 6; else missing.push("conversion_route");

  const observed = signal.observed_at ? new Date(signal.observed_at) : null;
  if (observed && !Number.isNaN(observed.getTime())) {
    const ageH = hoursBetween(now, observed);
    if (ageH <= 48) score += 6;
    else if (ageH > 168) score -= 15; // observation older than a week
  } else {
    missing.push("observed_at");
  }
  if (opts?.evidence_level === "provider_reported") score += 4;
  if (opts?.evidence_level === "manual_unverified") score -= 4;

  const final = round2(clamp(score));
  const level = final >= 70 ? "high" : final >= 45 ? "medium" : "low";
  return { score: final, level, missing };
}

/* ------------------------------------------------------------------ */
/* Overall commercial virality                                         */
/* ------------------------------------------------------------------ */

export type ScoreResult = {
  formula_version: string;
  weights: typeof SCORE_WEIGHTS_V1;
  components: {
    viral_reach: number;
    trend_velocity: number;
    audience_fit: number;
    conversion_potential: number;
    timing_saturation: number;
    safety: number;
  };
  overall_score: number;
  weighted_before_blockers: number;
  confidence_score: number;
  confidence_level: "low" | "medium" | "high";
  confidence_missing: string[];
  blockers: string[];
  hard_blocked: boolean;
  risk_flags: string[];
  requires_compliance_review: boolean;
  recommended_status: OpportunityStatus;
  label: string;
};

export function scoreOpportunity(
  signal: ViralSignalInput,
  ctx: BusinessMatchContext,
  opts?: { now?: Date; evidence_level?: string },
): ScoreResult {
  const now = opts?.now ?? new Date();
  const reach = viralReachScore(signal.metrics);
  const velocity = trendVelocityScore(signal.metrics, { published_at: signal.published_at, now });
  const fit = audienceFitScore(signal, ctx);
  const conv = conversionPotentialScore(signal, ctx);
  const timing = timingSaturationScore(signal, { now });
  const safe = safetyScore(signal, ctx);
  const conf = confidenceFor(signal, ctx, { now, evidence_level: opts?.evidence_level });

  const blockers = new Set<string>([...fit.blockers, ...conv.blockers, ...timing.blockers, ...safe.blockers]);
  if (!num(signal.metrics?.views) && !num(signal.metrics?.views_24h)) blockers.add("missing_evidence");
  // Empty virality guard: huge reach with no measurable conversion route or attention.
  if (reach >= 60 && conv.score < 25) blockers.add("low_conversion_route");

  const w = SCORE_WEIGHTS_V1;
  const weighted =
    reach * w.viral_reach +
    velocity * w.trend_velocity +
    fit.score * w.audience_fit +
    conv.score * w.conversion_potential +
    timing.score * w.timing_saturation +
    safe.score * w.safety;

  const hard = Array.from(blockers).filter((b) => (HARD_BLOCKERS as readonly string[]).includes(b));
  const hard_blocked = hard.length > 0;
  const overall = hard_blocked ? 0 : round2(clamp(weighted));

  const recommended_status: OpportunityStatus = hard_blocked
    ? "needs_review"
    : safe.requires_compliance_review || conf.level === "low"
      ? "needs_review"
      : "scored";

  return {
    formula_version: FORMULA_VERSION,
    weights: w,
    components: {
      viral_reach: reach,
      trend_velocity: velocity,
      audience_fit: fit.score,
      conversion_potential: conv.score,
      timing_saturation: timing.score,
      safety: safe.score,
    },
    overall_score: overall,
    weighted_before_blockers: round2(clamp(weighted)),
    confidence_score: conf.score,
    confidence_level: conf.level,
    confidence_missing: conf.missing,
    blockers: Array.from(blockers).sort(),
    hard_blocked,
    risk_flags: safe.risk_flags,
    requires_compliance_review: safe.requires_compliance_review,
    recommended_status,
    label: hard_blocked
      ? "Blocked — founder review required"
      : `Commercial virality potential ${overall}/100 (${conf.level} confidence) — potential, not guaranteed performance`,
  };
}

/* ------------------------------------------------------------------ */
/* Signal normalisation + idempotency                                  */
/* ------------------------------------------------------------------ */

export function normaliseSignal(
  raw: any,
  defaults?: { provider_slug?: string; platform?: string; now?: Date },
): { row: Record<string, unknown>; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const now = defaults?.now ?? new Date();
  const platform = String(raw?.platform ?? defaults?.platform ?? "").toLowerCase().trim();
  if (!platform) errors.push("platform_required");
  else if (!(SUPPORTED_PLATFORMS as readonly string[]).includes(platform)) warnings.push(`unmapped_platform:${platform}`);

  const url = raw?.canonical_url ? String(raw.canonical_url).trim() : null;
  if (url && !/^https:\/\//i.test(url)) errors.push("canonical_url_must_be_https");

  const external_id = String(raw?.external_id ?? (url ? url.split("?")[0] : "")).trim();
  if (!external_id) errors.push("external_id_or_url_required");

  const metrics: SignalMetrics = {
    views: num(raw?.metrics?.views ?? raw?.views),
    views_24h: num(raw?.metrics?.views_24h ?? raw?.views_24h),
    views_prior_24h: num(raw?.metrics?.views_prior_24h ?? raw?.views_prior_24h),
    likes: num(raw?.metrics?.likes ?? raw?.likes),
    comments: num(raw?.metrics?.comments ?? raw?.comments),
    shares: num(raw?.metrics?.shares ?? raw?.shares),
    saves: num(raw?.metrics?.saves ?? raw?.saves),
    creator_followers: num(raw?.metrics?.creator_followers ?? raw?.creator_followers),
    saturation_ratio:
      typeof (raw?.metrics?.saturation_ratio ?? raw?.saturation_ratio) === "number"
        ? Math.max(0, Math.min(1, Number(raw?.metrics?.saturation_ratio ?? raw?.saturation_ratio)))
        : null,
  };
  if (!metrics.views && !metrics.views_24h) warnings.push("no_reach_metrics");

  const row = {
    provider_slug: String(raw?.provider_slug ?? defaults?.provider_slug ?? "manual_import"),
    source_type: raw?.source_type ?? "manual",
    platform,
    external_id,
    canonical_url: url,
    title: raw?.title ? String(raw.title).slice(0, 300) : null,
    topic: raw?.topic ? String(raw.topic).slice(0, 300) : null,
    creator_handle: raw?.creator_handle ? String(raw.creator_handle).replace(/^@/, "").slice(0, 120) : null,
    language: raw?.language ? String(raw.language).toLowerCase().slice(0, 12) : null,
    geography: raw?.geography ? String(raw.geography).toUpperCase().slice(0, 12) : null,
    metrics,
    observed_at: raw?.observed_at ?? now.toISOString(),
    published_at: raw?.published_at ?? null,
    freshness_deadline: raw?.freshness_deadline ?? null,
    evidence_level: raw?.evidence_level ?? "manual_unverified",
  };
  return { row, errors, warnings };
}

/** Stable idempotency key: business + provider + platform + external id. */
export function signalIdempotencyKey(
  business_id: string,
  provider_slug: string,
  platform: string,
  external_id: string,
): string {
  return [business_id, provider_slug, platform.toLowerCase(), external_id].join("::");
}

export function dedupeSignals<T extends { provider_slug?: string; platform: string; external_id: string }>(
  business_id: string,
  rows: T[],
): { unique: T[]; duplicates: T[] } {
  const seen = new Set<string>();
  const unique: T[] = [];
  const duplicates: T[] = [];
  for (const r of rows) {
    const k = signalIdempotencyKey(business_id, r.provider_slug ?? "manual_import", r.platform, r.external_id);
    if (seen.has(k)) duplicates.push(r);
    else {
      seen.add(k);
      unique.push(r);
    }
  }
  return { unique, duplicates };
}

/* ------------------------------------------------------------------ */
/* Opportunity -> content brief (original angle only, never a copy)    */
/* ------------------------------------------------------------------ */

export type BriefInput = {
  opportunity: {
    id?: string;
    opportunity_title: string;
    opportunity_summary?: string | null;
    platform?: string | null;
    target_audience?: string | null;
    business_objective?: BusinessObjective;
    conversion_route?: string | null;
    freshness_deadline?: string | null;
    opportunity_status?: OpportunityStatus;
    risk_flags?: string[];
    requires_compliance_review?: boolean;
    provenance?: Record<string, unknown>;
  };
  signal?: ViralSignalInput | null;
  score?: ScoreResult | null;
  landing_page?: string | null;
  brand_voice?: string | null;
  now?: Date;
};

const CTA_BY_OBJECTIVE: Record<BusinessObjective, string> = {
  awareness: "Follow for the next part of this breakdown.",
  clicks: "Full breakdown on the page in bio — link in the caption.",
  leads: "Comment the keyword and we will send the free guide.",
  enquiries: "Send a message with your situation and we will answer it.",
  donations: "Donate link is in the bio — every contribution is itemised.",
  sales: "The offer is on the landing page linked in the caption.",
  recruitment: "Roles and how to apply are on the careers page.",
  other: "Details are on the linked page.",
};

export function buildContentBrief(input: BriefInput): {
  brief: Record<string, unknown>;
  blockers: string[];
} {
  const now = input.now ?? new Date();
  const o = input.opportunity;
  const blockers: string[] = [];
  if (o.opportunity_status !== "approved") blockers.push("opportunity_not_approved");
  if (!(o.conversion_route ?? "").trim()) blockers.push("no_conversion_route");
  if (o.requires_compliance_review) blockers.push("compliance_review_required");

  const objective = (o.business_objective ?? "awareness") as BusinessObjective;
  const topic = input.signal?.topic ?? o.opportunity_title;
  const platforms = [o.platform ?? input.signal?.platform ?? "tiktok"];
  const sourceLinks = [input.signal?.canonical_url].filter(Boolean) as string[];

  const publishBy = o.freshness_deadline
    ? o.freshness_deadline
    : new Date(now.getTime() + 72 * 3_600_000).toISOString();

  const brief = {
    brief_title: `Viral angle — ${o.opportunity_title}`.slice(0, 200),
    why_rising:
      o.opportunity_summary ??
      `Observed acceleration on ${platforms[0]} for "${topic}". Reach ${input.score?.components.viral_reach ?? "—"}/100, velocity ${input.score?.components.trend_velocity ?? "—"}/100. Potential, not guaranteed performance.`,
    target_audience: o.target_audience ?? "Defined by the watchlist audience description.",
    intended_outcome: `${objective} via ${o.conversion_route ?? "an approved conversion route"}`,
    source_links: sourceLinks,
    original_angle:
      `Do not copy the source wording, footage, audio or edit. Rebuild the idea from first principles in ` +
      `${input.brand_voice ?? "our own"} voice using our own example, our own footage and our own data on "${topic}".`,
    hook_directions: [
      `Contrarian: the common advice about ${topic} is wrong, and here is what we actually see.`,
      `Specific proof: one real number or result from our own work on ${topic}.`,
      `Cost of inaction: what it costs when ${topic} is handled badly.`,
    ],
    suggested_formats: ["short_form_video", "carousel"],
    suggested_platforms: platforms,
    retention_structure:
      "0-2s visual hook and stated payoff · 2-8s tension or myth · 8-25s concrete proof from our own work · 25-40s one actionable step · close with the CTA and the destination.",
    cta: CTA_BY_OBJECTIVE[objective],
    conversion_route: o.conversion_route ?? null,
    landing_page_mapping: input.landing_page ?? null,
    risk_notes: [
      "No source captions, scripts, audio or footage may be reused.",
      ...((o.risk_flags ?? []).map((r) => `Flagged: ${r}`)),
      ...(o.requires_compliance_review ? ["Founder/compliance review required before approval."] : []),
    ],
    publish_by: publishBy,
    brief_status: "awaiting_founder_approval" as BriefStatus,
    performance_status: "awaiting_performance_data" as const,
    correlation_key: o.id ? `svr::${o.id}` : null,
  };

  return { brief, blockers };
}

/* ------------------------------------------------------------------ */
/* Provider status honesty                                             */
/* ------------------------------------------------------------------ */

/**
 * A provider is only ever CONNECTED after a real authenticated call
 * succeeded. Anything else is NOT_CONFIGURED / MANUAL MODE / DEGRADED.
 */
export function resolveProviderStatus(input: {
  configured: boolean;
  contract_confirmed: boolean;
  last_successful_sync_at?: string | null;
  consecutive_failures?: number;
  paused?: boolean;
  manual_mode?: boolean;
}): { status: ProviderStatus; reason: string; is_live: boolean } {
  if (input.paused) return { status: "paused", reason: "paused_by_founder", is_live: false };
  if (input.manual_mode) return { status: "manual_mode", reason: "manual_import_only", is_live: false };
  if (!input.configured) return { status: "not_configured", reason: "missing_server_side_credentials", is_live: false };
  if (!input.contract_confirmed) {
    return { status: "not_configured", reason: "api_contract_unconfirmed", is_live: false };
  }
  if (!input.last_successful_sync_at) {
    return { status: "not_configured", reason: "no_successful_authenticated_sync_yet", is_live: false };
  }
  if ((input.consecutive_failures ?? 0) >= 3) return { status: "degraded", reason: "repeated_failures", is_live: false };
  return { status: "connected", reason: "authenticated_sync_succeeded", is_live: true };
}

/** Human-readable empty-state guidance, exactly naming what is missing. */
export function emptyStateReasons(input: {
  provider_status: ProviderStatus;
  watchlists: number;
  signals: number;
  opportunities: number;
  approved_opportunities: number;
  conversion_routes: number;
}): string[] {
  const out: string[] = [];
  if (input.provider_status === "not_configured") {
    out.push("No market-data provider is configured. Manual import still works; Tubular needs server-side credentials and a confirmed API contract.");
  }
  if (input.watchlists === 0) out.push("No watchlist yet — add niche, audience, platforms and keywords so signals can be matched.");
  if (input.signals === 0) out.push("No signals yet — import structured signals or connect a provider.");
  if (input.signals > 0 && input.opportunities === 0) out.push("Signals exist but none have been scored yet.");
  if (input.opportunities > 0 && input.approved_opportunities === 0) out.push("Opportunities are awaiting founder review.");
  if (input.conversion_routes === 0) out.push("No conversion route set — reach cannot be converted into clicks, leads, donations or sales.");
  return out;
}