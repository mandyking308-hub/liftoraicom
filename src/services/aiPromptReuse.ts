import { supabase } from "@/integrations/supabase/client";

/**
 * Prompt reuse, caching and memory efficiency service.
 * Helps Liftor avoid sending long, duplicated prompts by surfacing
 * approved templates and previously cached context blocks.
 *
 * Only summaries and references are stored — full confidential content
 * stays in source systems.
 */

export const CONTEXT_TYPES = [
  "brand_voice",
  "product_summary",
  "business_manual",
  "technical_manual",
  "compliance_rules",
  "customer_faq",
  "campaign_strategy",
  "buyer_profile",
  "investor_profile",
  "competitor_research",
  "market_research",
  "valuation_assumptions",
  "approved_response_pattern",
] as const;
export type ContextType = (typeof CONTEXT_TYPES)[number];

const FRESH_DAYS = 30;

export interface PromptTemplate {
  id: string;
  business_id: string | null;
  template_name: string;
  task_category: string;
  approved_prompt: string;
  model_tier: string | null;
  active: boolean | null;
  usage_count: number | null;
  average_cost: number | null;
  average_roi_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface CachedContextBlock {
  id: string;
  business_id: string | null;
  context_type: string;
  title: string;
  summary: string;
  source_reference: string | null;
  last_verified_at: string | null;
  expires_at: string | null;
  active: boolean | null;
  created_at: string;
  updated_at: string;
}

export function isContextStale(block: Pick<CachedContextBlock, "expires_at" | "last_verified_at">): boolean {
  if (block.expires_at && new Date(block.expires_at).getTime() < Date.now()) return true;
  if (!block.last_verified_at) return true;
  const ageDays = (Date.now() - new Date(block.last_verified_at).getTime()) / (24 * 60 * 60 * 1000);
  return ageDays > FRESH_DAYS;
}

export const STALE_WARNING = "Context may be stale. Review before relying on it.";

/** Lookup the best active template for a (business, category). */
export async function findApprovedTemplate(
  task_category: string,
  business_id?: string | null,
): Promise<PromptTemplate | null> {
  let q = supabase
    .from("ai_prompt_templates")
    .select("*")
    .eq("task_category", task_category)
    .eq("active", true)
    .order("average_roi_score", { ascending: false, nullsFirst: false })
    .limit(1);
  if (business_id) q = q.eq("business_id", business_id);
  const { data, error } = await q;
  if (error) throw error;
  if (data && data.length) return data[0] as PromptTemplate;

  if (business_id) {
    // Fallback to a global template for the category.
    const { data: globalRows } = await supabase
      .from("ai_prompt_templates")
      .select("*")
      .eq("task_category", task_category)
      .eq("active", true)
      .is("business_id", null)
      .order("average_roi_score", { ascending: false, nullsFirst: false })
      .limit(1);
    if (globalRows && globalRows.length) return globalRows[0] as PromptTemplate;
  }
  return null;
}

export async function findCachedContext(
  context_type: ContextType | string,
  business_id?: string | null,
): Promise<CachedContextBlock[]> {
  let q = supabase
    .from("ai_cached_context_blocks")
    .select("*")
    .eq("context_type", context_type)
    .eq("active", true)
    .order("last_verified_at", { ascending: false, nullsFirst: false });
  if (business_id) q = q.eq("business_id", business_id);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as CachedContextBlock[];
}

/** Naive duplicate-research detector based on title/summary token overlap. */
export async function findDuplicateResearch(
  topic: string,
  business_id?: string | null,
  withinDays = 90,
): Promise<CachedContextBlock[]> {
  const researchTypes = ["competitor_research", "market_research", "buyer_profile", "investor_profile"];
  const since = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000).toISOString();
  let q = supabase
    .from("ai_cached_context_blocks")
    .select("*")
    .in("context_type", researchTypes)
    .gte("updated_at", since);
  if (business_id) q = q.eq("business_id", business_id);
  const { data } = await q;
  const rows = (data ?? []) as CachedContextBlock[];
  const needle = tokens(topic);
  return rows
    .map((r) => ({ r, score: overlap(needle, tokens(`${r.title} ${r.summary}`)) }))
    .filter((x) => x.score >= 0.35)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.r);
}

function tokens(s: string): Set<string> {
  return new Set(
    s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3),
  );
}
function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / Math.min(a.size, b.size);
}

export interface EfficiencyInput {
  business_id?: string | null;
  task_category: string;
  prompt_topic?: string;
  estimated_prompt_chars?: number;
  requested_model_tier?: "cheap" | "standard" | "premium";
  recent_retry_count?: number;
  recent_failed_actions?: number;
}
export interface EfficiencyRecommendation {
  recommendation:
    | "use_approved_template"
    | "use_cached_context"
    | "summarise_long_context"
    | "downgrade_model"
    | "avoid_duplicate_research"
    | "human_review_instead";
  reason: string;
  template?: PromptTemplate;
  context_blocks?: CachedContextBlock[];
  duplicates?: CachedContextBlock[];
  estimated_token_saving?: number;
}

export async function recommendPromptEfficiency(input: EfficiencyInput): Promise<EfficiencyRecommendation[]> {
  const recs: EfficiencyRecommendation[] = [];

  const template = await findApprovedTemplate(input.task_category, input.business_id ?? null);
  if (template) {
    recs.push({
      recommendation: "use_approved_template",
      reason: `Approved template "${template.template_name}" exists for ${input.task_category}. Reuse it instead of generating a new prompt.`,
      template,
      estimated_token_saving: 400,
    });
  }

  const ctxType = mapCategoryToContext(input.task_category);
  if (ctxType) {
    const blocks = await findCachedContext(ctxType, input.business_id ?? null);
    if (blocks.length) {
      recs.push({
        recommendation: "use_cached_context",
        reason: `${blocks.length} cached ${ctxType.replace(/_/g, " ")} block(s) available — inject instead of re-explaining.`,
        context_blocks: blocks,
        estimated_token_saving: blocks.length * 250,
      });
    }
  }

  if (input.estimated_prompt_chars && input.estimated_prompt_chars > 6000) {
    recs.push({
      recommendation: "summarise_long_context",
      reason: `Prompt is ~${Math.round(input.estimated_prompt_chars / 4)} tokens. Summarise or chunk to lower cost.`,
      estimated_token_saving: Math.round((input.estimated_prompt_chars - 4000) / 4),
    });
  }

  if (input.requested_model_tier === "premium" && template?.model_tier && template.model_tier !== "premium") {
    recs.push({
      recommendation: "downgrade_model",
      reason: `Approved template runs on ${template.model_tier}; premium is unnecessary for this category.`,
    });
  }

  if (input.prompt_topic) {
    const dupes = await findDuplicateResearch(input.prompt_topic, input.business_id ?? null);
    if (dupes.length) {
      recs.push({
        recommendation: "avoid_duplicate_research",
        reason: "Similar research exists. Reuse cached context instead of spending more AI tokens.",
        duplicates: dupes.slice(0, 5),
      });
    }
  }

  if ((input.recent_retry_count ?? 0) >= 3 || (input.recent_failed_actions ?? 0) >= 3) {
    recs.push({
      recommendation: "human_review_instead",
      reason: "Repeated retries/failures detected. Stop spending and route to human review.",
    });
  }

  return recs;
}

function mapCategoryToContext(cat: string): ContextType | null {
  const c = cat.toLowerCase();
  if (c.includes("brand") || c.includes("voice") || c.includes("copy") || c.includes("content")) return "brand_voice";
  if (c.includes("product")) return "product_summary";
  if (c.includes("compliance")) return "compliance_rules";
  if (c.includes("customer") || c.includes("support") || c.includes("faq")) return "customer_faq";
  if (c.includes("campaign") || c.includes("marketing") || c.includes("outbound")) return "campaign_strategy";
  if (c.includes("buyer") || c.includes("acquisition")) return "buyer_profile";
  if (c.includes("investor")) return "investor_profile";
  if (c.includes("competitor")) return "competitor_research";
  if (c.includes("market")) return "market_research";
  if (c.includes("valuation")) return "valuation_assumptions";
  if (c.includes("manual") || c.includes("technical")) return "technical_manual";
  return null;
}

/** Mark template/context usage in an existing ledger row. Does not log a new event. */
export async function attachReuseToLedger(
  ledger_id: string,
  used: { template_id?: string | null; context_block_ids?: string[]; estimated_token_saving?: number },
): Promise<void> {
  const { data: existing } = await supabase
    .from("ai_usage_ledger")
    .select("audit_metadata")
    .eq("id", ledger_id)
    .maybeSingle();
  const prior = ((existing as any)?.audit_metadata as Record<string, unknown>) ?? {};
  await supabase
    .from("ai_usage_ledger")
    .update({
      audit_metadata: {
        ...prior,
        prompt_reuse: {
          template_id: used.template_id ?? null,
          context_block_ids: used.context_block_ids ?? [],
          estimated_token_saving: used.estimated_token_saving ?? null,
          attached_at: new Date().toISOString(),
        },
      },
    } as any)
    .eq("id", ledger_id);

  if (used.template_id) {
    // bump usage_count
    const { data: t } = await supabase
      .from("ai_prompt_templates")
      .select("usage_count")
      .eq("id", used.template_id)
      .maybeSingle();
    const next = (t?.usage_count ?? 0) + 1;
    await supabase.from("ai_prompt_templates").update({ usage_count: next } as any).eq("id", used.template_id);
  }
}

export async function summariseReuseStats(business_id?: string | null): Promise<{
  templates_available: number;
  context_blocks: number;
  stale_context_blocks: number;
  duplicate_warnings: number;
  estimated_saving_gbp: number;
}> {
  const tplQ = supabase.from("ai_prompt_templates").select("id,active,average_cost,usage_count", { count: "exact" }).eq("active", true);
  const ctxQ = supabase.from("ai_cached_context_blocks").select("id,expires_at,last_verified_at,active,context_type", { count: "exact" }).eq("active", true);
  const [tplRes, ctxRes] = await Promise.all([
    business_id ? tplQ.eq("business_id", business_id) : tplQ,
    business_id ? ctxQ.eq("business_id", business_id) : ctxQ,
  ]);
  const tpls = (tplRes.data ?? []) as { average_cost: number | null; usage_count: number | null }[];
  const ctxs = (ctxRes.data ?? []) as { expires_at: string | null; last_verified_at: string | null; context_type: string }[];

  const stale = ctxs.filter(isContextStale).length;
  const estimated_saving = tpls.reduce((acc, t) => acc + (Number(t.average_cost ?? 0) * Number(t.usage_count ?? 0) * 0.4), 0);

  // crude duplicate detector across research-type blocks
  const research = ctxs.filter((c) => ["competitor_research", "market_research", "buyer_profile", "investor_profile"].includes(c.context_type));
  const duplicate_warnings = Math.max(0, research.length - new Set(research.map((r) => r.context_type)).size);

  return {
    templates_available: tpls.length,
    context_blocks: ctxs.length,
    stale_context_blocks: stale,
    duplicate_warnings,
    estimated_saving_gbp: Math.round(estimated_saving * 100) / 100,
  };
}