import { supabase } from "@/integrations/supabase/client";

export type ArchetypeRow = {
  id: string;
  archetype_name: string;
  archetype_code: string;
  description: string | null;
  default_operating_model: any;
  default_kpis: any;
  default_agents: any;
  default_integrations: any;
  default_compliance_flags: any;
  default_exit_metrics: any;
  active: boolean;
};

export type AssignmentRow = {
  id: string;
  business_id: string;
  primary_archetype_id: string | null;
  secondary_archetype_ids: string[];
  confidence_score: number;
  reason_summary: string | null;
  founder_confirmed: boolean;
  founder_confirmed_at: string | null;
  audit_metadata: any;
  created_at: string;
  updated_at: string;
};

export type QuestionRow = {
  id: string;
  business_id: string;
  question: string;
  answer: string | null;
  answer_source: "founder" | "manual" | "website" | "ai_inferred" | "uploaded_doc";
  confidence_score: number;
};

export type ClassifierInput = {
  business_id: string;
  name?: string;
  description?: string;
  manual_text?: string;
  website?: string;
  products?: string;
  revenue_model?: "subscription" | "one_off" | "usage" | "retainer" | "ads" | "licensing" | "rental" | "lead" | "mixed";
  customer_type?: "b2b" | "b2c" | "both";
  has_supply_side?: boolean;
  delivery_model?: "self_serve" | "team" | "physical" | "content" | "advisory" | "platform" | "on_site";
  compliance_sensitivity?: "low" | "medium" | "high";
  ip_heavy?: boolean;
  local_only?: boolean;
};

export type ClassifierOutput = {
  primary: string; // archetype_code
  secondaries: string[];
  confidence: number;
  reason: string;
  missing_information: string[];
  recommended_setup_tasks: string[];
};

export const REQUIRED_FIELDS: (keyof ClassifierInput)[] = [
  "name", "description", "revenue_model", "customer_type", "delivery_model",
];

/** Pure scoring — internal-only classification, no external action. */
export function classify(input: ClassifierInput): ClassifierOutput {
  const txt = `${input.name ?? ""} ${input.description ?? ""} ${input.products ?? ""} ${input.manual_text ?? ""}`.toLowerCase();
  const scores: Record<string, number> = {};
  const add = (c: string, n: number) => (scores[c] = (scores[c] ?? 0) + n);

  // signal mapping
  if (input.has_supply_side) add("marketplace", 4);
  if (input.revenue_model === "subscription") { add("saas", 3); add("subscription_service", 2); add("membership_community", 1); }
  if (input.revenue_model === "one_off") { add("digital_product", 2); add("ecommerce", 2); }
  if (input.revenue_model === "usage") add("ai_tool_product", 3);
  if (input.revenue_model === "retainer") { add("agency_service", 3); add("consultancy", 2); add("advisory_business", 2); }
  if (input.revenue_model === "ads") add("media_music_content", 3);
  if (input.revenue_model === "licensing") { add("licensing_ip_business", 4); add("media_music_content", 1); }
  if (input.revenue_model === "rental") add("property_rental", 4);
  if (input.revenue_model === "lead") add("lead_generation", 4);
  if (input.delivery_model === "self_serve") add("saas", 2);
  if (input.delivery_model === "platform") add("marketplace", 2);
  if (input.delivery_model === "physical") add("ecommerce", 2);
  if (input.delivery_model === "content") add("media_music_content", 2);
  if (input.delivery_model === "advisory") { add("advisory_business", 2); add("consultancy", 2); }
  if (input.delivery_model === "team") add("agency_service", 2);
  if (input.delivery_model === "on_site") add("local_service", 3);
  if (input.compliance_sensitivity === "high") add("regulated_sensitive", 4);
  if (input.ip_heavy) { add("licensing_ip_business", 2); add("media_music_content", 1); add("creator_brand", 1); }
  if (input.local_only) add("local_service", 2);

  // text signals
  const kw: Array<[RegExp, string, number]> = [
    [/marketplace|two.?sided|sellers?|buyers?/i, "marketplace", 3],
    [/saas|software as a service|web app/i, "saas", 2],
    [/shop|store|product catalog|d2c|dtc/i, "ecommerce", 2],
    [/agency|done.for.you|dfp|dfy/i, "agency_service", 2],
    [/consult/i, "consultancy", 2],
    [/music|song|royalt|catalog|publishing/i, "media_music_content", 3],
    [/course|cohort|lms|curriculum/i, "course_education", 3],
    [/directory|listings? site/i, "directory_listing", 3],
    [/leads?\b|lead gen/i, "lead_generation", 2],
    [/membership|community|patron/i, "membership_community", 2],
    [/airbnb|rental|let|tenant|landlord/i, "property_rental", 3],
    [/ai (tool|product|agent|copilot)|gpt|llm/i, "ai_tool_product", 3],
    [/regulated|finance|gambling|health|clinic|legal/i, "regulated_sensitive", 3],
    [/box|monthly delivery/i, "subscription_service", 2],
    [/template|plugin|preset|asset pack/i, "digital_product", 2],
    [/trade|plumb|electric|local|on-site/i, "local_service", 2],
    [/creator|personal brand|influencer/i, "creator_brand", 2],
    [/licens(e|ing) ip|sub.?license/i, "licensing_ip_business", 3],
    [/advisor|fractional|board seat/i, "advisory_business", 2],
  ];
  for (const [re, code, w] of kw) if (re.test(txt)) add(code, w);

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const totalSignal = ranked.reduce((s, [, v]) => s + v, 0) || 1;
  let primary = ranked[0]?.[0] ?? "hybrid_other";
  const top = ranked[0]?.[1] ?? 0;
  const second = ranked[1]?.[1] ?? 0;
  const hybrid = ranked.length > 1 && second / Math.max(top, 1) >= 0.7;
  const secondaries = ranked.slice(1, 3).filter(([, v]) => v >= 2).map(([c]) => c);
  if (hybrid && secondaries.length >= 1) {
    // keep top primary; mark hybrid in reason
  }
  if (top === 0) primary = "hybrid_other";

  const confidence = Math.min(1, top / Math.max(totalSignal, 6));
  const missing: string[] = [];
  for (const f of REQUIRED_FIELDS) if (!input[f]) missing.push(String(f));
  if (input.has_supply_side === undefined) missing.push("has_supply_side");
  if (!input.compliance_sensitivity) missing.push("compliance_sensitivity");

  const reason = [
    `Primary archetype: ${primary} (score ${top}).`,
    secondaries.length ? `Secondary signals: ${secondaries.join(", ")}.` : "",
    hybrid ? "Hybrid model detected — multiple strong signals." : "",
    missing.length ? `Missing inputs: ${missing.join(", ")}.` : "All key inputs present.",
  ].filter(Boolean).join(" ");

  const recommended_setup_tasks = setupTasksFor(primary, secondaries);

  return { primary, secondaries, confidence, reason, missing_information: missing, recommended_setup_tasks };
}

export function setupTasksFor(primary: string, secondaries: string[]): string[] {
  const base: Record<string, string[]> = {
    saas: ["Enable Revenue Autopilot", "Connect Stripe", "Activate Product QA Agent", "Set churn & MRR KPIs"],
    marketplace: ["Enable Marketplace Engine", "Activate Seller Recruitment", "Set liquidity KPIs", "Set take-rate & GMV targets"],
    ecommerce: ["Connect store / payments", "Activate Fulfilment Agent", "Set AOV / repeat-rate KPIs"],
    agency_service: ["Set up Delivery Engine", "Activate Capacity Agent", "Set utilisation & retainer KPIs"],
    consultancy: ["Set up engagement templates", "Activate Knowledge Governance", "Set day-rate & pipeline KPIs"],
    media_music_content: ["Set royalty audit cadence", "Activate IP Licensing Agent", "Track catalog revenue"],
    course_education: ["Connect LMS", "Set enrolment & completion KPIs"],
    directory_listing: ["Set listing review workflow", "Activate Data Quality Agent", "Track SEO authority"],
    lead_generation: ["Set CPL & payout-per-lead KPIs", "Enable consent log", "Activate Outreach Agent"],
    membership_community: ["Set retention & engagement KPIs", "Configure moderation rules"],
    property_rental: ["Connect PMS", "Track occupancy & ADR", "Add local licensing checks"],
    ai_tool_product: ["Enable AI Cost Controls", "Connect AI Gateway", "Set tokens-per-user & gross-margin KPIs"],
    regulated_sensitive: ["Activate Compliance Agent", "Lock approval gates", "Set incident & SAR KPIs"],
    subscription_service: ["Set MRR / churn KPIs", "Configure recurring fulfilment"],
    digital_product: ["Connect storefront", "Set refund-rate & conversion KPIs"],
    local_service: ["Connect scheduling", "Set route density & avg-ticket KPIs"],
    creator_brand: ["Connect social channels", "Track audience & sponsorship revenue"],
    licensing_ip_business: ["Lock IP chain of title", "Configure royalty accounting"],
    advisory_business: ["Configure retainer / equity tracking"],
    hybrid_other: ["Founder to confirm archetype manually", "Compose KPIs from combined archetypes"],
  };
  const out = [...(base[primary] ?? [])];
  for (const s of secondaries) for (const t of (base[s] ?? [])) if (!out.includes(t)) out.push(t);
  return out;
}

export async function fetchArchetypes() {
  const { data, error } = await supabase.from("business_archetypes").select("*").order("archetype_name");
  if (error) throw error;
  return (data ?? []) as ArchetypeRow[];
}

export async function fetchAssignments() {
  const { data, error } = await supabase.from("business_archetype_assignments").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AssignmentRow[];
}

export async function fetchQuestions(business_id?: string) {
  let q = supabase.from("business_archetype_questions").select("*").order("created_at", { ascending: false });
  if (business_id) q = q.eq("business_id", business_id);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as QuestionRow[];
}

export async function saveAssignment(args: {
  business_id: string;
  output: ClassifierOutput;
  founder_confirmed?: boolean;
}) {
  const archetypes = await fetchArchetypes();
  const byCode = new Map(archetypes.map(a => [a.archetype_code, a.id]));
  const primary_archetype_id = byCode.get(args.output.primary) ?? null;
  const secondary_archetype_ids = args.output.secondaries.map(c => byCode.get(c)).filter(Boolean) as string[];
  const row = {
    business_id: args.business_id,
    primary_archetype_id,
    secondary_archetype_ids,
    confidence_score: args.output.confidence,
    reason_summary: args.output.reason,
    founder_confirmed: !!args.founder_confirmed,
    founder_confirmed_at: args.founder_confirmed ? new Date().toISOString() : null,
    audit_metadata: {
      missing_information: args.output.missing_information,
      recommended_setup_tasks: args.output.recommended_setup_tasks,
      classifier_version: "v1",
    },
  };
  const { data, error } = await supabase.from("business_archetype_assignments").insert(row).select().single();
  if (error) throw error;
  return data as AssignmentRow;
}