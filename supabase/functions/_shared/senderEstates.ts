/**
 * Deterministic sender-estate classification.
 *
 * PURE. No IO, no secrets, no provider calls.
 *
 * Liftor operates more than one physically separate sending estate. Estates are
 * never mixed: a mailbox belongs to exactly one estate for its whole life and
 * an estate's reputation, capacity target and allocation pools are its own.
 *
 *   gsm               Global Solutions Management LLC shared commercial estate
 *                     (Launch 30 + Evergreen 20, target 50 mailboxes).
 *   ghat              Global Health Access Trust dedicated estate
 *                     (globalhealthaccesstrust.org, 10 mailboxes). NEVER counted
 *                     toward GSM targets and never allocatable from GSM pools.
 *   external_non_gsm  Legacy Neon Candy infrastructure. Never joins any estate.
 */

export type EstateClassification = "gsm" | "ghat" | "external_non_gsm";

export const EXTERNAL_NON_GSM_ESTATE = "external_non_gsm" as const;
export const GSM_ESTATE_KEY = "gsm" as const;
export const GHAT_ESTATE_KEY = "ghat" as const;

/** Legacy estate that must never be pulled into any managed estate. */
export const EXTERNAL_NON_GSM_EMAILS = ["hello@neoncandy.online"];
export const EXTERNAL_NON_GSM_DOMAINS = ["neoncandy.online"];

export const GHAT_OWNER_LEGAL_ENTITY = "Global Health Access Trust";
export const GHAT_WINNR_TAG = "GHAT-Outbound";
export const GSM_WINNR_TAG = "GSM-Outbound";
/**
 * Every domain physically owned by the trust estate. The primary .org domain
 * carries the 10 commissioned identities; the .net and .co domains are the
 * trust's additional sending domains (5 mailboxes each, Winnr tag GHAT-Outbound).
 */
export const GHAT_PRIMARY_DOMAIN = "globalhealthaccesstrust.org";
export const GHAT_DOMAINS = [
  GHAT_PRIMARY_DOMAIN,
  "globalhealthaccesstrust.net",
  "globalhealthaccesstrust.co",
];
/** Mailboxes commissioned on the primary trust domain. */
export const GHAT_PRIMARY_DOMAIN_MAILBOXES = 10;
/** Whole trust estate: 10 on .org plus 5 on each secondary domain. */
export const GHAT_TARGET_MAILBOXES = 20;

/** The 10 display identities commissioned on the GHAT domain. */
export const GHAT_EXPECTED_MAILBOXES: { local_part: string; label: string }[] = [
  { local_part: "partnerships", label: "Global Health Access Trust | Partnerships" },
  { local_part: "corporate.partnerships", label: "Global Health Access Trust | Corporate Partnerships" },
  { local_part: "philanthropy", label: "Global Health Access Trust | Philanthropy" },
  { local_part: "grants", label: "Global Health Access Trust | Grants" },
  { local_part: "development", label: "Global Health Access Trust | Development" },
  { local_part: "healthcare", label: "Global Health Access Trust | Healthcare" },
  { local_part: "programmes", label: "Global Health Access Trust | Programmes" },
  { local_part: "community", label: "Global Health Access Trust | Community" },
  { local_part: "outreach", label: "Global Health Access Trust | Outreach" },
  { local_part: "engagement", label: "Global Health Access Trust | Engagement" },
];

export const GHAT_EXPECTED_EMAILS = GHAT_EXPECTED_MAILBOXES.map(
  (m) => `${m.local_part}@${GHAT_DOMAINS[0]}`,
);

function lower(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

export function domainOfEmail(email: string): string {
  const at = lower(email).lastIndexOf("@");
  return at === -1 ? "" : lower(email).slice(at + 1);
}

/** Classify a bare domain. Unknown domains default to the GSM estate. */
export function classifyDomainEstate(domain: string): EstateClassification {
  const d = lower(domain);
  if (!d) return EXTERNAL_NON_GSM_ESTATE;
  if (EXTERNAL_NON_GSM_DOMAINS.map(lower).includes(d)) return EXTERNAL_NON_GSM_ESTATE;
  if (GHAT_DOMAINS.map(lower).includes(d)) return GHAT_ESTATE_KEY;
  return GSM_ESTATE_KEY;
}

/** Classify a mailbox address. Deterministic and total. */
export function classifySenderEstate(email: string): EstateClassification {
  const e = lower(email);
  if (!e) return EXTERNAL_NON_GSM_ESTATE;
  if (EXTERNAL_NON_GSM_EMAILS.map(lower).includes(e)) return EXTERNAL_NON_GSM_ESTATE;
  return classifyDomainEstate(domainOfEmail(e));
}

export function isGhatEstateEmail(email: string): boolean {
  return classifySenderEstate(email) === GHAT_ESTATE_KEY;
}

export function isGsmEstateEmail(email: string): boolean {
  return classifySenderEstate(email) === GSM_ESTATE_KEY;
}

/** Map a Winnr tag payload (JSON string or array) onto an estate, if recognised. */
export function estateFromWinnrTags(tags: unknown): EstateClassification | null {
  let list: unknown[] = [];
  if (Array.isArray(tags)) list = tags;
  else if (typeof tags === "string") {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) list = parsed;
      else list = [tags];
    } catch {
      list = [tags];
    }
  }
  const norm = list.map(lower);
  if (norm.includes(lower(GHAT_WINNR_TAG))) return GHAT_ESTATE_KEY;
  if (norm.includes(lower(GSM_WINNR_TAG))) return GSM_ESTATE_KEY;
  return null;
}

/**
 * Final estate decision for a provider row. The dedicated-domain rule always
 * wins: a GHAT address can never be reclassified as GSM by a provider tag.
 */
export function resolveEstate(email: string, tags?: unknown): EstateClassification {
  const byAddress = classifySenderEstate(email);
  if (byAddress !== GSM_ESTATE_KEY) return byAddress;
  const byTag = estateFromWinnrTags(tags);
  return byTag === GHAT_ESTATE_KEY ? GHAT_ESTATE_KEY : GSM_ESTATE_KEY;
}
