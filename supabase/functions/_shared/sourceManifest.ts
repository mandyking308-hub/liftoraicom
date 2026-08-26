/**
 * Business Source Manifest — shared, dependency-free logic.
 *
 * Used by:
 *  - business-source-manifest-register (parse + hash + store)
 *  - business-source-fidelity-check (deterministic compare vs derived understanding)
 *  - src/lib tests (pure TS, no Deno imports — keep it that way)
 *
 * NOTHING in this file performs I/O or any external action.
 */

export const MANIFEST_SOURCE_TYPES = [
  "lovable_project_manifest",
  "uploaded_manual",
  "pasted_manifest",
  "github_manifest",
  "website_manifest",
] as const;
export type ManifestSourceType = (typeof MANIFEST_SOURCE_TYPES)[number];

/** Canonical manifest sections. Order matters for display. */
export const MANIFEST_FIELDS = [
  "business_identity",
  "purpose",
  "icp",
  "offers",
  "pricing",
  "brand_tone",
  "website_positioning",
  "customer_journey",
  "sales_outreach_rules",
  "onboarding_delivery_support",
  "marketing_social_pr",
  "finance_revenue_model",
  "policies_compliance",
  "integrations_providers",
  "important_routes_features",
  "live_vs_placeholder",
  "approval_rules",
  "risks_gaps",
] as const;
export type ManifestField = (typeof MANIFEST_FIELDS)[number];

/** Fields that block activation when contradicted. */
export const CRITICAL_FIELDS: ManifestField[] = [
  "purpose",
  "icp",
  "offers",
  "pricing",
  "brand_tone",
  "approval_rules",
];

const HEADING_ALIASES: Record<string, ManifestField> = {
  "business identity": "business_identity",
  "business name": "business_identity",
  identity: "business_identity",
  name: "business_identity",
  purpose: "purpose",
  "what the business does": "purpose",
  mission: "purpose",
  icp: "icp",
  customer: "icp",
  "ideal customer": "icp",
  "icp customer": "icp",
  "target customer": "icp",
  offers: "offers",
  products: "offers",
  services: "offers",
  "products services": "offers",
  "products services offers": "offers",
  pricing: "pricing",
  price: "pricing",
  brand: "brand_tone",
  tone: "brand_tone",
  "brand tone": "brand_tone",
  "brand constraints": "brand_tone",
  website: "website_positioning",
  "public positioning": "website_positioning",
  "website public positioning": "website_positioning",
  "customer journey": "customer_journey",
  journey: "customer_journey",
  "sales rules": "sales_outreach_rules",
  outreach: "sales_outreach_rules",
  "sales outreach rules": "sales_outreach_rules",
  onboarding: "onboarding_delivery_support",
  delivery: "onboarding_delivery_support",
  support: "onboarding_delivery_support",
  complaints: "onboarding_delivery_support",
  renewal: "onboarding_delivery_support",
  "onboarding delivery support": "onboarding_delivery_support",
  marketing: "marketing_social_pr",
  social: "marketing_social_pr",
  pr: "marketing_social_pr",
  "marketing social pr": "marketing_social_pr",
  finance: "finance_revenue_model",
  "revenue model": "finance_revenue_model",
  "finance revenue model": "finance_revenue_model",
  policies: "policies_compliance",
  compliance: "policies_compliance",
  "policies compliance": "policies_compliance",
  integrations: "integrations_providers",
  providers: "integrations_providers",
  "integrations providers": "integrations_providers",
  routes: "important_routes_features",
  features: "important_routes_features",
  "important routes features": "important_routes_features",
  "live vs placeholder": "live_vs_placeholder",
  "live functionality": "live_vs_placeholder",
  "approval rules": "approval_rules",
  approvals: "approval_rules",
  safety: "approval_rules",
  risks: "risks_gaps",
  gaps: "risks_gaps",
  "risks gaps": "risks_gaps",
};

export interface ParsedManifest {
  format: "json" | "markdown";
  sections: Partial<Record<ManifestField, string>>;
  missing_fields: ManifestField[];
  unknown_headings: string[];
}

const normHeading = (h: string) =>
  h.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

const asText = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) return v.map(asText).filter(Boolean).join("; ");
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${k}: ${asText(val)}`)
      .join("; ");
  }
  return String(v);
};

export function parseManifest(raw: string): ParsedManifest {
  const trimmed = (raw ?? "").trim();
  const sections: Partial<Record<ManifestField, string>> = {};
  const unknown: string[] = [];

  let format: "json" | "markdown" = "markdown";
  let obj: Record<string, unknown> | null = null;
  if (trimmed.startsWith("{")) {
    try {
      obj = JSON.parse(trimmed) as Record<string, unknown>;
      format = "json";
    } catch {
      obj = null;
    }
  }

  if (obj) {
    const flat: Record<string, unknown> =
      obj.manifest && typeof obj.manifest === "object"
        ? { ...(obj as Record<string, unknown>), ...(obj.manifest as Record<string, unknown>) }
        : obj;
    for (const [k, v] of Object.entries(flat)) {
      const key = normHeading(k);
      const field =
        (MANIFEST_FIELDS as readonly string[]).includes(key.replace(/ /g, "_"))
          ? (key.replace(/ /g, "_") as ManifestField)
          : HEADING_ALIASES[key];
      if (!field) {
        if (!["manifest", "source type", "source ref", "source version", "source hash"].includes(key)) {
          unknown.push(k);
        }
        continue;
      }
      const text = asText(v);
      if (text) sections[field] = sections[field] ? `${sections[field]}; ${text}` : text;
    }
  } else {
    const lines = trimmed.split(/\r?\n/);
    let current: ManifestField | null = null;
    let buffer: string[] = [];
    const flush = () => {
      if (current && buffer.length) {
        const text = buffer.join("\n").trim();
        if (text) sections[current] = sections[current] ? `${sections[current]}\n${text}` : text;
      }
      buffer = [];
    };
    for (const line of lines) {
      const m = /^#{1,6}\s+(.*)$/.exec(line) ?? /^\s*\*\*(.+?)\*\*\s*:?\s*$/.exec(line);
      const kv = /^\s*[-*]?\s*([A-Za-z][A-Za-z /_-]{2,40}?)\s*:\s*(.+)$/.exec(line);
      if (m) {
        flush();
        const key = normHeading(m[1]);
        const field = HEADING_ALIASES[key] ??
          ((MANIFEST_FIELDS as readonly string[]).includes(key.replace(/ /g, "_"))
            ? (key.replace(/ /g, "_") as ManifestField)
            : null);
        if (field) current = field;
        else {
          current = null;
          unknown.push(m[1].trim());
        }
      } else if (!current && kv) {
        const key = normHeading(kv[1]);
        const field = HEADING_ALIASES[key] ??
          ((MANIFEST_FIELDS as readonly string[]).includes(key.replace(/ /g, "_"))
            ? (key.replace(/ /g, "_") as ManifestField)
            : null);
        if (field) sections[field] = sections[field] ? `${sections[field]}; ${kv[2].trim()}` : kv[2].trim();
        else unknown.push(kv[1].trim());
      } else {
        buffer.push(line);
      }
    }
    flush();
  }

  const missing = MANIFEST_FIELDS.filter((f) => !(sections[f] ?? "").trim());
  return { format, sections, missing_fields: missing, unknown_headings: unknown };
}

/** Deterministic non-cryptographic content hash (stable across runs). */
export function manifestHash(raw: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const s = (raw ?? "").replace(/\s+/g, " ").trim();
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c + i, 2246822519) >>> 0;
  }
  return `fnv1a-${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

const STOP = new Set(
  ("the a an and or of for to in on with by is are be we our your you it its this that as at from " +
    "not no yes all any more most other into over under than then them they will can may must should " +
    "business company customers customer client clients service services product products offer offers")
    .split(" "),
);

export function significantTokens(text: string): string[] {
  return (text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 3 && !STOP.has(t));
}

export type FieldStatus =
  | "MATCH"
  | "WEAK_MATCH"
  | "CONTRADICTION"
  | "MISSING_IN_SOURCE"
  | "NOT_FOUND_IN_DERIVED";

export interface FieldComparison {
  field: ManifestField;
  critical: boolean;
  status: FieldStatus;
  overlap: number;
  source_value: string | null;
  derived_value: string | null;
}

export interface FidelityResult {
  verdict: "FIDELITY_PASS" | "FIDELITY_REVIEW" | "FIDELITY_FAIL";
  score: number;
  comparisons: FieldComparison[];
  mismatches: FieldComparison[];
  missing_in_source: ManifestField[];
  not_found_in_derived: ManifestField[];
  blocks_activation: boolean;
}

const clip = (s: string | null | undefined, n = 400) =>
  s == null ? null : s.length > n ? `${s.slice(0, n)}…` : s;

export function compareField(
  field: ManifestField,
  sourceValue: string | null,
  derivedValue: string | null,
): FieldComparison {
  const critical = CRITICAL_FIELDS.includes(field);
  const src = (sourceValue ?? "").trim();
  const der = (derivedValue ?? "").trim();
  if (!src) {
    return {
      field, critical, status: "MISSING_IN_SOURCE", overlap: 0,
      source_value: null, derived_value: clip(der || null),
    };
  }
  if (!der) {
    return {
      field, critical, status: "NOT_FOUND_IN_DERIVED", overlap: 0,
      source_value: clip(src), derived_value: null,
    };
  }
  const a = new Set(significantTokens(src));
  const b = new Set(significantTokens(der));
  if (a.size === 0 || b.size === 0) {
    return {
      field, critical, status: "WEAK_MATCH", overlap: 0,
      source_value: clip(src), derived_value: clip(der),
    };
  }
  let hits = 0;
  for (const t of a) if (b.has(t)) hits++;
  const overlap = Math.round((hits / a.size) * 100) / 100;
  // Critical fields are held to a stricter bar: near-zero overlap on purpose /
  // ICP / offers / pricing / brand / approval rules is treated as a contradiction.
  const weakFloor = critical ? 0.25 : 0.12;
  const status: FieldStatus =
    overlap >= 0.34 ? "MATCH" : overlap >= weakFloor ? "WEAK_MATCH" : "CONTRADICTION";
  return { field, critical, status, overlap, source_value: clip(src), derived_value: clip(der) };
}

export function runFidelityCheck(
  source: Partial<Record<ManifestField, string>>,
  derived: Partial<Record<ManifestField, string>>,
): FidelityResult {
  const comparisons = MANIFEST_FIELDS.map((f) =>
    compareField(f, source[f] ?? null, derived[f] ?? null),
  );
  const scored = comparisons.filter(
    (c) => c.status === "MATCH" || c.status === "WEAK_MATCH" || c.status === "CONTRADICTION",
  );
  const score = scored.length
    ? Math.round(
        (scored.reduce(
          (acc, c) => acc + (c.status === "MATCH" ? 1 : c.status === "WEAK_MATCH" ? 0.5 : 0),
          0,
        ) /
          scored.length) *
          100,
      )
    : 0;
  const mismatches = comparisons.filter((c) => c.status === "CONTRADICTION");
  const criticalContradiction = mismatches.some((c) => c.critical);
  const verdict = criticalContradiction
    ? "FIDELITY_FAIL"
    : mismatches.length > 0 || score < 50
      ? "FIDELITY_REVIEW"
      : "FIDELITY_PASS";
  return {
    verdict,
    score,
    comparisons,
    mismatches,
    missing_in_source: comparisons.filter((c) => c.status === "MISSING_IN_SOURCE").map((c) => c.field),
    not_found_in_derived: comparisons
      .filter((c) => c.status === "NOT_FOUND_IN_DERIVED")
      .map((c) => c.field),
    blocks_activation: criticalContradiction,
  };
}

/** Map Liftor's derived understanding rows onto manifest fields. Never invents data. */
export function deriveFromLiftor(
  profile: Record<string, any> | null,
  pack: Record<string, any> | null,
  business: Record<string, any> | null,
): Partial<Record<ManifestField, string>> {
  const t = (v: unknown) => {
    const s = asText(v);
    return s ? s : undefined;
  };
  return {
    business_identity: t(business?.name),
    purpose: t(profile?.business_summary) ?? t(pack?.business_summary),
    icp: t(profile?.ideal_customer_profile) ?? t(profile?.target_customer) ?? t(pack?.icp_summary),
    offers: t(profile?.offer_summary) ?? t(pack?.offers),
    pricing: t(pack?.offers && (pack.offers as any)) ?? t(profile?.proposal_rules),
    brand_tone: t(profile?.approved_tone) ?? t(pack?.approved_tone),
    sales_outreach_rules: t(profile?.outreach_rules),
    onboarding_delivery_support: t(pack?.onboarding_flow) ?? t(pack?.complaints_flow),
    marketing_social_pr: t(pack?.social_content_plan) ?? t(pack?.marketing_assets_needed),
    policies_compliance: t(profile?.compliance_notes) ?? t(profile?.required_disclaimers),
    approval_rules: t(profile?.escalation_rules) ?? t(pack?.go_live_blockers),
    risks_gaps: t(pack?.go_live_blockers),
  };
}
