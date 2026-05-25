// Product Sales Knowledge Completeness scoring
// Hard rule: <70 = sales agent may only answer basic questions and collect info; must not attempt to close.

export type ProductRow = {
  id: string;
  product_name: string;
  product_type?: string | null;
  description?: string | null;
  target_customer?: string | null;
  customer_pain_points?: string[] | null;
  outcomes_promised?: string[] | null;
  features?: string[] | null;
  benefits?: string[] | null;
  proof_points?: string[] | null;
  pricing_type?: string | null;
  price_amount?: number | null;
  price_range_min?: number | null;
  price_range_max?: number | null;
  price_currency?: string | null;
  billing_frequency?: string | null;
  refund_policy?: string | null;
  guarantee_terms?: string | null;
  eligibility_rules?: string | null;
  compliance_notes?: string | null;
  faqs?: Array<{ q?: string; a?: string }> | null;
  do_not_say?: string[] | null;
  escalation_rules?: string | null;
  active?: boolean;
};

export type OfferRow = {
  id: string;
  product_id: string | null;
  offer_name: string;
  offer_stage?: string | null;
  active?: boolean;
  approved_claims?: string[] | null;
  prohibited_claims?: string[] | null;
  close_type?: string | null;
  requires_founder_approval?: boolean | null;
  price_amount?: number | null;
  price_currency?: string | null;
  discount_allowed?: boolean | null;
  discount_rules?: string | null;
};

export type ObjectionRow = {
  id: string;
  product_id: string | null;
  objection: string;
  approved_response?: string | null;
  active?: boolean;
};

export type KnowledgeRow = {
  id: string;
  source_type?: string | null;
  title: string;
  summary?: string | null;
  verified_by_founder?: boolean;
  active?: boolean;
};

export type Check = {
  key: string;
  label: string;
  ok: boolean;
  weight: number;
  critical?: boolean;
  hint?: string;
};

export type CompletenessResult = {
  score: number;
  band: "ready" | "watch" | "missing" | "do_not_sell";
  bandLabel: string;
  canClose: boolean;
  missing: Check[];
  passed: Check[];
  checks: Check[];
};

function arr(x: any): any[] { return Array.isArray(x) ? x : []; }
function txt(x: any): string { return typeof x === "string" ? x.trim() : ""; }

export function scoreProduct(
  p: ProductRow,
  offers: OfferRow[],
  objections: ObjectionRow[],
): CompletenessResult {
  const productOffers = offers.filter(o => o.product_id === p.id);
  const activeOffer = productOffers.find(o => o.active && o.offer_stage === "active") ?? productOffers.find(o => o.active);
  const approvedClaims = new Set<string>();
  const prohibitedClaims = new Set<string>();
  productOffers.forEach(o => {
    arr(o.approved_claims).forEach(c => approvedClaims.add(String(c)));
    arr(o.prohibited_claims).forEach(c => prohibitedClaims.add(String(c)));
  });
  const productObjections = objections.filter(o => o.product_id === p.id && o.active !== false);

  const hasPrice =
    (p.pricing_type === "quote_required") ||
    !!p.price_amount ||
    (!!p.price_range_min && !!p.price_range_max);

  const checks: Check[] = [
    { key: "name", label: "Product name", ok: !!txt(p.product_name), weight: 4, critical: true },
    { key: "description", label: "Description", ok: !!txt(p.description), weight: 6 },
    { key: "target_customer", label: "Target customer", ok: !!txt(p.target_customer), weight: 10, critical: true, hint: "Who is this for? Without this Liftor cannot qualify." },
    { key: "pain_points", label: "Customer pain points", ok: arr(p.customer_pain_points).length > 0, weight: 6 },
    { key: "outcomes", label: "Outcomes promised", ok: arr(p.outcomes_promised).length > 0, weight: 10, critical: true, hint: "What result does the customer get?" },
    { key: "features", label: "Features", ok: arr(p.features).length > 0, weight: 4 },
    { key: "benefits", label: "Benefits", ok: arr(p.benefits).length > 0, weight: 4 },
    { key: "pricing", label: "Pricing known", ok: hasPrice, weight: 12, critical: true, hint: "Set fixed price, range, or mark as quote_required." },
    { key: "billing", label: "Billing frequency", ok: !!txt(p.billing_frequency) || p.pricing_type !== "subscription", weight: 2 },
    { key: "refund", label: "Refund / guarantee terms", ok: !!txt(p.refund_policy) || !!txt(p.guarantee_terms), weight: 8, critical: true, hint: "Required before agent may discuss a close." },
    { key: "eligibility", label: "Eligibility rules", ok: !!txt(p.eligibility_rules), weight: 4 },
    { key: "compliance", label: "Compliance notes", ok: !!txt(p.compliance_notes), weight: 6, critical: true, hint: "Mandatory disclosures, regulated claims, jurisdiction limits." },
    { key: "proof", label: "Proof points / case studies", ok: arr(p.proof_points).length > 0, weight: 4 },
    { key: "faqs", label: "FAQs (>=3)", ok: arr(p.faqs).length >= 3, weight: 4 },
    { key: "approved_claims", label: "Approved claims (via offers)", ok: approvedClaims.size > 0, weight: 6, critical: true, hint: "What the agent IS allowed to say." },
    { key: "prohibited_claims", label: "Prohibited claims (via offers)", ok: prohibitedClaims.size > 0, weight: 4 },
    { key: "objections", label: "Objection responses (>=3)", ok: productObjections.length >= 3, weight: 8, critical: true, hint: "Top objections + approved responses." },
    { key: "do_not_say", label: "Do-not-say rules", ok: arr(p.do_not_say).length > 0, weight: 4 },
    { key: "escalation", label: "Escalation rules", ok: !!txt(p.escalation_rules), weight: 6, critical: true, hint: "When to hand off to Mandy / human." },
    { key: "active_offer", label: "Active offer present", ok: !!activeOffer, weight: 8, critical: true, hint: "An offer ties product + price + close path." },
  ];

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + (c.ok ? c.weight : 0), 0);
  const score = Math.round((earned / totalWeight) * 100);

  const band: CompletenessResult["band"] =
    score >= 90 ? "ready" : score >= 70 ? "watch" : score >= 40 ? "missing" : "do_not_sell";

  const bandLabel =
    band === "ready" ? "Knowledge Complete — ready to sell internally / can draft close path"
    : band === "watch" ? "Watch — can discuss but escalate price/terms"
    : band === "missing" ? "Missing Critical Info — only answer basic questions"
    : "Do Not Sell — collect missing info";

  return {
    score, band, bandLabel,
    canClose: score >= 70,
    missing: checks.filter(c => !c.ok),
    passed: checks.filter(c => c.ok),
    checks,
  };
}

export function buildVoiceAgentBrief(
  p: ProductRow,
  offers: OfferRow[],
  objections: ObjectionRow[],
  result: CompletenessResult,
): string {
  const productOffers = offers.filter(o => o.product_id === p.id);
  const activeOffer = productOffers.find(o => o.active && o.offer_stage === "active") ?? productOffers.find(o => o.active);
  const approved = new Set<string>(); const prohibited = new Set<string>();
  productOffers.forEach(o => {
    arr(o.approved_claims).forEach(c => approved.add(String(c)));
    arr(o.prohibited_claims).forEach(c => prohibited.add(String(c)));
  });
  const priceLine =
    p.price_amount ? `${p.price_amount} ${p.price_currency ?? ""}${p.billing_frequency ? "/" + p.billing_frequency : ""}`
    : (p.price_range_min ? `${p.price_range_min}–${p.price_range_max} ${p.price_currency ?? ""}` : "quote required");

  const lines: string[] = [];
  lines.push(`# Voice Agent Brief — ${p.product_name}`);
  lines.push("");
  lines.push(`Knowledge band: ${result.band.toUpperCase()} (${result.score}/100)`);
  lines.push(result.canClose
    ? "Authorisation: agent may discuss pricing and propose a close path, subject to founder approval on send."
    : "Authorisation: knowledge is below 70 — agent may only answer basic questions and collect missing information. Do NOT attempt to close. Hand off to Mandy/human.");
  lines.push("");
  lines.push("## Product summary");
  lines.push(p.description?.trim() || "(missing — add a one-paragraph description)");
  lines.push(`Type: ${p.product_type ?? "—"} · Pricing: ${p.pricing_type ?? "—"} · ${priceLine}`);
  if (p.refund_policy || p.guarantee_terms) lines.push(`Refund/guarantee: ${[p.refund_policy, p.guarantee_terms].filter(Boolean).join(" · ")}`);
  if (p.compliance_notes) lines.push(`Compliance: ${p.compliance_notes}`);
  lines.push("");
  lines.push("## Target customer");
  lines.push(p.target_customer?.trim() || "(missing)");
  if (arr(p.customer_pain_points).length) lines.push(`Pain points: ${arr(p.customer_pain_points).join("; ")}`);
  lines.push("");
  lines.push("## Core pitch");
  if (arr(p.outcomes_promised).length) lines.push(`Outcomes: ${arr(p.outcomes_promised).join("; ")}`);
  if (arr(p.benefits).length) lines.push(`Benefits: ${arr(p.benefits).join("; ")}`);
  if (arr(p.features).length) lines.push(`Features: ${arr(p.features).join("; ")}`);
  if (arr(p.proof_points).length) lines.push(`Proof: ${arr(p.proof_points).join("; ")}`);
  lines.push("");
  lines.push("## Discovery questions");
  const discovery = [
    `Tell me a bit about your ${p.target_customer ? "situation" : "needs"}.`,
    arr(p.customer_pain_points)[0] ? `Are you currently dealing with ${arr(p.customer_pain_points)[0]}?` : "What's the biggest pain you're trying to fix?",
    arr(p.outcomes_promised)[0] ? `If you could ${arr(p.outcomes_promised)[0]}, what would that change for you?` : "What outcome would success look like?",
    "What have you tried before, and what didn't work?",
    "What's your timeline for solving this?",
    p.pricing_type === "quote_required" ? "Do you have a budget range in mind?" : "Is the price band we listed workable for you?",
  ];
  discovery.forEach((d, i) => lines.push(`${i + 1}. ${d}`));
  lines.push("");
  lines.push("## Objection responses");
  if (objections.filter(o => o.product_id === p.id).length === 0) {
    lines.push("(no objections recorded — agent must escalate any objection)");
  } else {
    objections.filter(o => o.product_id === p.id).slice(0, 10).forEach(o => {
      lines.push(`- ${o.objection}`);
      if (o.approved_response) lines.push(`  → ${o.approved_response}`);
    });
  }
  lines.push("");
  lines.push("## Close path");
  if (activeOffer) {
    lines.push(`Offer: ${activeOffer.offer_name} · close via ${activeOffer.close_type ?? "manual_review"}`);
    lines.push(`Approval on send: ${activeOffer.requires_founder_approval ? "REQUIRED (founder)" : "auto (rules-permitted)"}`);
    if (activeOffer.discount_allowed) lines.push(`Discounts: ${activeOffer.discount_rules ?? "rules unspecified"}`);
  } else {
    lines.push("No active offer — agent may not propose a close path. Hand off to Mandy.");
  }
  lines.push("");
  lines.push("## Approval limits");
  lines.push("- Outbound calls: founder approval required until provider live.");
  lines.push("- Payment links / invoices: founder approval required.");
  lines.push("- Contracts / bookings: founder approval required.");
  lines.push(result.canClose ? "- Agent may verbalise the close path; sending remains gated." : "- Agent must NOT attempt a close while knowledge band < 70.");
  lines.push("");
  lines.push("## Approved claims (agent MAY say)");
  if (approved.size === 0) lines.push("(none recorded — agent may not make value claims)");
  Array.from(approved).forEach(c => lines.push(`- ${c}`));
  lines.push("");
  lines.push("## Do-not-say");
  const dns = [...arr(p.do_not_say).map(String), ...Array.from(prohibited)];
  if (dns.length === 0) lines.push("(none recorded — agent must avoid all unverified claims by default)");
  dns.forEach(d => lines.push(`- ${d}`));
  lines.push("");
  lines.push("## Escalation rules");
  lines.push(p.escalation_rules?.trim() || "(missing — default: escalate any pricing, legal, refund, complaint, or unrecognised objection to Mandy/human)");
  if (result.missing.length) {
    lines.push("");
    lines.push("## Missing knowledge");
    result.missing.forEach(m => lines.push(`- ${m.label}${m.hint ? " — " + m.hint : ""}`));
  }
  return lines.join("\n");
}