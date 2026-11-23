/**
 * Retirement & Succession acquisition research — pure logic (no network, no provider calls).
 * Rules: owner retiring ≠ distressed; third-party loans ≠ seller finance; seller finance is
 * only "explicit" with quoted listing proof; unknown money values stay null (never 0).
 */
export type SellerFinance = "explicit" | "possible" | "none" | "unknown";
export type RetirementConfidence = "explicit" | "implied" | "unknown";

export interface CandidateInput {
  source_key: string;
  source_url: string;
  source_listing_id?: string | null;
  title: string;
  sector?: string | null;
  location?: string | null;
  country?: string | null;
  years_trading?: number | null;
  asking_price?: number | null;
  turnover?: number | null;
  profit?: number | null;
  currency?: string | null;
  staff_count?: number | null;
  owner_role?: string | null;
  owner_hours_per_week?: number | null;
  replacement_manager_cost?: number | null;
  recurring_revenue?: "yes" | "no" | "unknown" | null;
  is_franchise?: boolean | null;
  premises_only?: boolean | null;
  sale_reason?: string | null;
  listing_text?: string | null; // public listing excerpt used for evidence classification
  seller_finance_evidence?: string | null;
  evidence_url?: string | null;
  evidence_summary?: string | null;
  verified_fields?: string[]; // fields the founder has checked against the public listing
  listing_availability?: "available" | "under_offer" | "sold" | "removed" | "unknown" | null;
  is_test?: boolean;
}

export interface CandidateRow extends Omit<CandidateInput, "listing_text" | "verified_fields"> {
  normalized_url: string;
  retirement_confidence: RetirementConfidence;
  seller_finance_status: SellerFinance;
  third_party_finance_note: string | null;
  deposit_required: string;
  evidence_quality: "verified" | "partial" | "unverified";
  unverified_fields: string[];
  score: number;
  red_flags: string[];
  next_action: string;
}

export const MONEY_FIELDS = ["asking_price", "turnover", "profit"] as const;
export const PRIORITY_SECTORS = ["b2b", "it", "software", "saas", "education", "training", "wholesale", "distribution", "beauty", "manager", "remote", "online"];

const TRACKING = /^(utm_|gclid|fbclid|ref$|source$|mc_)/i;

export function normalizeListingUrl(raw: string): string | null {
  let u: URL;
  try { u = new URL(String(raw ?? "").trim()); } catch { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (!u.hostname.includes(".") || u.username || u.password) return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const params = [...u.searchParams.entries()].filter(([k]) => !TRACKING.test(k)).sort(([a], [b]) => a.localeCompare(b));
  const q = params.length ? "?" + new URLSearchParams(params).toString() : "";
  const path = u.pathname.replace(/\/+$/, "") || "";
  return `https://${host}${path}${q}`;
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(\+44\s?7\d{3}|\b07\d{3})\s?\d{3}\s?\d{3}\b|\+44\s?\(?0?\)?\s?\d{2,4}\s?\d{3,4}\s?\d{3,4}/;
const NI_RE = /\b[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/i;

/** Private personal details (emails, phone numbers, NI numbers) must never be stored. */
export function findPrivateDetails(obj: Record<string, unknown>): string[] {
  const hits: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v !== "string" || k === "source_url" || k === "evidence_url") continue;
    if (EMAIL_RE.test(v)) hits.push(`${k}: email address`);
    if (PHONE_RE.test(v)) hits.push(`${k}: phone number`);
    if (NI_RE.test(v)) hits.push(`${k}: NI number`);
  }
  return hits;
}

const EXPLICIT_SF = /(seller|vendor|owner)[\s-]*(financ|finance|loan)|deferred (consideration|payment)|staged payments? to (the )?(vendor|seller|owner)|vendor will (accept|consider) (staged|deferred|instal)|earn[\s-]?out/i;
const POSSIBLE_SF = /flexible (terms|deal structure|payment)|open to (deal )?structur|vendor (may|might) consider|terms (can be|negotiable)|structured deal/i;
const THIRD_PARTY = /(finance|funding|loan)s? (is )?available|bank (finance|loan)|asset finance|lender|funding partner|apply for (finance|a loan)/i;

export function classifySellerFinance(listingText?: string | null, quotedEvidence?: string | null): { status: SellerFinance; evidence: string | null; thirdParty: string | null } {
  const text = `${listingText ?? ""}`;
  const quote = quotedEvidence?.trim() || null;
  const thirdParty = THIRD_PARTY.test(text) ? (text.match(THIRD_PARTY)?.[0] ?? null) : null;
  // Explicit only when the quoted listing evidence itself says seller/vendor finance.
  if (quote && EXPLICIT_SF.test(quote)) return { status: "explicit", evidence: quote, thirdParty };
  if (EXPLICIT_SF.test(text) || POSSIBLE_SF.test(text) || (quote && POSSIBLE_SF.test(quote))) {
    return { status: "possible", evidence: null, thirdParty };
  }
  return { status: "unknown", evidence: null, thirdParty };
}

const EXPLICIT_RET = /retir(e|ing|ement)|succession|owner (is )?stepping (down|back)|handover|hand over|after \d+ years/i;
const IMPLIED_RET = /relocat|lifestyle change|other (business )?interests|health reasons/i;
export function classifyRetirement(...texts: (string | null | undefined)[]): RetirementConfidence {
  const t = texts.filter(Boolean).join(" ");
  if (EXPLICIT_RET.test(t)) return "explicit";
  if (IMPLIED_RET.test(t)) return "implied";
  return "unknown";
}

export interface Economics { multiple: number | null; ownerAdjustedProfit: number | null; instalmentHeadroom: number | null; unknowns: string[] }

/** Asking/profit multiple and surplus after replacing the owner. Unknowns stay null and are listed. */
export function economics(c: Pick<CandidateInput, "asking_price" | "profit" | "replacement_manager_cost">): Economics {
  const unknowns: string[] = [];
  if (c.profit == null) unknowns.push("profit");
  if (c.asking_price == null) unknowns.push("asking price");
  if (c.replacement_manager_cost == null) unknowns.push("manager replacement cost");
  unknowns.push("working capital", "debts", "tax", "lease cost");
  const multiple = c.profit != null && c.asking_price != null && c.profit > 0 ? +(c.asking_price / c.profit).toFixed(2) : null;
  const ownerAdjustedProfit = c.profit != null && c.replacement_manager_cost != null ? c.profit - c.replacement_manager_cost : null;
  // Conservative: half of owner-adjusted profit treated as available for seller instalments.
  const instalmentHeadroom = ownerAdjustedProfit != null ? Math.max(0, Math.round(ownerAdjustedProfit * 0.5)) : null;
  return { multiple, ownerAdjustedProfit, instalmentHeadroom, unknowns };
}

export function redFlags(c: CandidateInput, ret: RetirementConfidence): string[] {
  const f: string[] = [];
  if (c.is_franchise) f.push("Franchise (excluded by default)");
  if (c.premises_only) f.push("Empty premises / leasehold only (excluded by default)");
  if (c.years_trading != null && c.years_trading < 2) f.push("Trading under 2 years");
  if ((c.owner_hours_per_week ?? 0) >= 40 && c.replacement_manager_cost == null) f.push("Owner works full-time; no manager cost known");
  if (c.profit != null && c.profit <= 0) f.push("Not profitable");
  if (c.profit == null) f.push("Profit unknown");
  if (ret === "unknown") f.push("No retirement/succession evidence");
  if (c.country && c.country !== "UK") f.push("Outside UK");
  return f;
}

export function scoreCandidate(c: CandidateInput, ret: RetirementConfidence, sf: SellerFinance): number {
  let s = 50;
  if (ret === "explicit") s += 15; else if (ret === "implied") s += 5; else s -= 10;
  if (sf === "explicit") s += 15; else if (sf === "possible") s += 5;
  if (c.recurring_revenue === "yes") s += 10;
  if ((c.years_trading ?? 0) >= 2) s += 5; else if (c.years_trading != null) s -= 20;
  const e = economics(c);
  if (e.multiple != null) s += e.multiple <= 3 ? 10 : e.multiple <= 5 ? 0 : -10;
  // Missing-data penalties
  if (c.profit == null) s -= 15;
  if (c.asking_price == null) s -= 10;
  if (c.turnover == null) s -= 5;
  if (c.is_franchise) s -= 40;
  if (c.premises_only) s -= 40;
  if ((c.owner_hours_per_week ?? 0) >= 40 && c.replacement_manager_cost == null) s -= 15;
  const sector = `${c.sector ?? ""} ${c.title ?? ""} ${c.owner_role ?? ""}`.toLowerCase();
  if (PRIORITY_SECTORS.some((k) => new RegExp(`\\b${k}\\b`).test(sector))) s += 5;
  return Math.max(0, Math.min(100, Math.round(s)));
}

export function isDueDiligenceReady(row: Pick<CandidateRow, "profit" | "asking_price" | "turnover" | "evidence_quality" | "retirement_confidence" | "red_flags">): boolean {
  return row.profit != null && row.asking_price != null && row.turnover != null && row.evidence_quality === "verified"
    && row.retirement_confidence === "explicit" && row.red_flags.length === 0;
}

export function nextAction(row: Pick<CandidateRow, "profit" | "asking_price" | "turnover" | "evidence_quality" | "retirement_confidence" | "red_flags" | "seller_finance_status" | "is_franchise" | "premises_only">): string {
  if (row.is_franchise || row.premises_only) return "Reject unless you want an exception";
  if (row.profit == null || row.asking_price == null) return "Read listing / request info pack for profit and price";
  if (row.retirement_confidence !== "explicit") return "Confirm sale reason from listing or broker pack";
  if (row.evidence_quality !== "verified") return "Verify figures against the public listing";
  if (row.seller_finance_status !== "explicit") return "Ask broker whether vendor would accept staged payments (founder decision)";
  if (isDueDiligenceReady(row)) return "Due-diligence ready: founder review";
  return "Founder review";
}

export type BuildResult = { ok: true; row: CandidateRow } | { ok: false; errors: string[] };

export function buildCandidate(input: CandidateInput, knownSources: string[]): BuildResult {
  const errors: string[] = [];
  if (!input.source_key || !knownSources.includes(input.source_key)) errors.push("Missing or unknown source");
  const normalized = normalizeListingUrl(input.source_url);
  if (!normalized) errors.push("Malformed listing URL (must be http/https)");
  if (input.evidence_url && !normalizeListingUrl(input.evidence_url)) errors.push("Malformed evidence URL");
  if (!input.title?.trim()) errors.push("Missing title");
  for (const k of MONEY_FIELDS) {
    const v = input[k];
    if (v != null && (typeof v !== "number" || !Number.isFinite(v))) errors.push(`${k} must be a number or blank`);
  }
  errors.push(...findPrivateDetails(input as unknown as Record<string, unknown>).map((h) => `Private detail not allowed — ${h}`));
  if (errors.length) return { ok: false, errors };

  const ret = classifyRetirement(input.sale_reason, input.listing_text, input.title);
  const sf = classifySellerFinance(input.listing_text, input.seller_finance_evidence);
  const verified = new Set(input.verified_fields ?? []);
  const checkable = ["asking_price", "turnover", "profit", "sale_reason", "staff_count", "owner_role", "years_trading"] as const;
  const present = checkable.filter((k) => input[k] != null && input[k] !== "");
  const unverified = present.filter((k) => !verified.has(k));
  const evidence_quality = present.length > 0 && unverified.length === 0 && input.evidence_url ? "verified" : verified.size > 0 ? "partial" : "unverified";
  const flags = redFlags(input, ret);
  const { listing_text: _lt, verified_fields: _vf, ...rest } = input;
  const row: CandidateRow = {
    ...rest,
    source_url: input.source_url.trim(),
    normalized_url: normalized!,
    profit: input.profit ?? null,
    asking_price: input.asking_price ?? null,
    turnover: input.turnover ?? null,
    currency: input.currency || "GBP",
    recurring_revenue: input.recurring_revenue ?? "unknown",
    retirement_confidence: ret,
    seller_finance_status: sf.status,
    seller_finance_evidence: sf.evidence,
    third_party_finance_note: sf.thirdParty,
    deposit_required: "unknown",
    evidence_quality,
    unverified_fields: unverified,
    score: scoreCandidate(input, ret, sf.status),
    red_flags: flags,
    next_action: "",
    listing_availability: input.listing_availability ?? "unknown",
    is_test: !!input.is_test,
  };
  row.next_action = nextAction(row);
  return { ok: true, row };
}

/** Same listing twice in one batch (by normalized URL or source+listing id) keeps the last one. */
export function dedupeRows(rows: CandidateRow[]): { rows: CandidateRow[]; duplicates: number } {
  const map = new Map<string, CandidateRow>();
  for (const r of rows) {
    const k = r.source_listing_id ? `${r.source_key}#${r.source_listing_id}` : r.normalized_url;
    map.set(k, r);
  }
  const byUrl = new Map<string, CandidateRow>();
  for (const r of map.values()) byUrl.set(r.normalized_url, r);
  return { rows: [...byUrl.values()], duplicates: rows.length - byUrl.size };
}

const NUM = (v: string | undefined) => {
  if (v == null) return null;
  const t = v.replace(/[£$€,\s]/g, "").trim();
  if (t === "" || /^(unknown|n\/?a|-|tbc|poa)$/i.test(t)) return null;
  const m = t.match(/^(-?\d+(?:\.\d+)?)([km])?$/i);
  if (!m) return NaN;
  return Number(m[1]) * (m[2]?.toLowerCase() === "k" ? 1e3 : m[2]?.toLowerCase() === "m" ? 1e6 : 1);
};
const BOOL = (v: string | undefined) => (v == null || v.trim() === "" ? null : /^(true|yes|y|1)$/i.test(v.trim()));

function splitCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ",") { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function fromRecord(r: Record<string, unknown>): CandidateInput {
  const g = (k: string) => (r[k] == null ? undefined : String(r[k]));
  const n = (k: string) => (typeof r[k] === "number" ? (r[k] as number) : NUM(g(k)));
  return {
    source_key: g("source_key") ?? "", source_url: g("source_url") ?? "", source_listing_id: g("source_listing_id") || null,
    title: g("title") ?? "", sector: g("sector") || null, location: g("location") || null,
    years_trading: n("years_trading"), asking_price: n("asking_price"), turnover: n("turnover"), profit: n("profit"),
    currency: g("currency") || "GBP", staff_count: n("staff_count"), owner_role: g("owner_role") || null,
    owner_hours_per_week: n("owner_hours_per_week"), replacement_manager_cost: n("replacement_manager_cost"),
    recurring_revenue: (["yes", "no"].includes((g("recurring_revenue") ?? "").toLowerCase()) ? g("recurring_revenue")!.toLowerCase() : "unknown") as "yes" | "no" | "unknown",
    is_franchise: typeof r.is_franchise === "boolean" ? r.is_franchise : BOOL(g("is_franchise")),
    premises_only: typeof r.premises_only === "boolean" ? r.premises_only : BOOL(g("premises_only")),
    sale_reason: g("sale_reason") || null, listing_text: g("listing_text") || null,
    seller_finance_evidence: g("seller_finance_evidence") || null, evidence_url: g("evidence_url") || null,
    evidence_summary: g("evidence_summary") || null,
    verified_fields: Array.isArray(r.verified_fields) ? (r.verified_fields as string[]) : (g("verified_fields") ?? "").split(/[;|]/).map((s) => s.trim()).filter(Boolean),
    listing_availability: (g("listing_availability") as CandidateInput["listing_availability"]) || "unknown",
  };
}

/** Accepts a JSON array/object or CSV with a header row. */
export function parseBulk(text: string): CandidateInput[] {
  const t = text.trim();
  if (!t) return [];
  if (t.startsWith("[") || t.startsWith("{")) {
    const j = JSON.parse(t);
    return (Array.isArray(j) ? j : [j]).map((r) => fromRecord(r as Record<string, unknown>));
  }
  const lines = t.split(/\r?\n/).filter((l) => l.trim());
  const head = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((l) => {
    const cells = splitCsvLine(l);
    return fromRecord(Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ""])));
  });
}

export const SOURCE_STATUS_LABEL: Record<string, string> = {
  needs_setup: "Needs account/alert setup",
  manual_public: "Manual/public search",
  receiving_verified: "Receiving verified alerts",
};
export const SELLER_FINANCE_LABEL: Record<SellerFinance, string> = {
  explicit: "Seller finance (listing proof)",
  possible: "Seller finance possible",
  none: "No seller finance",
  unknown: "Seller finance unknown",
};
export const fmtMoney = (v: number | null | undefined, cur = "GBP") =>
  v == null ? "Unknown" : new Intl.NumberFormat("en-GB", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(v);
