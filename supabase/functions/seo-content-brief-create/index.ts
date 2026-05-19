import { corsHeaders, json, requireFounder, logAudit, SAFETY_FLAGS, complianceWarnings, detectUnsupportedClaims, genericOutline } from "../_shared/longformContentLogic.ts";
const PHRASE = "CREATE SEO CONTENT BRIEF";
function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,80); }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, brief_name, topic, dry_run = true, confirmation_phrase, is_test_data = false, ...rest } = body;
  if (!business_id || !brief_name || !topic) return json({ ok: false, error: "missing_fields" }, 400);
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, phrase_required: PHRASE, no_records_mutated: true, safety: SAFETY_FLAGS });
  }
  const title = rest.suggested_title ?? (rest.target_keyword ? `${rest.target_keyword} — ${topic}` : topic);
  const row = {
    business_id, brief_name, topic,
    strategy_id: rest.strategy_id ?? null,
    target_keyword: rest.target_keyword ?? null,
    secondary_keywords: rest.secondary_keywords ?? [],
    search_intent: rest.search_intent ?? "informational",
    target_audience: rest.target_audience ?? null,
    article_type: rest.article_type ?? "guide",
    suggested_title: title, suggested_slug: rest.suggested_slug ?? slugify(title),
    meta_title: rest.meta_title ?? title.slice(0,60),
    meta_description: rest.meta_description ?? `${topic} — internal draft.`.slice(0,155),
    outline: rest.outline ?? genericOutline("seo_article", topic),
    internal_links_needed: rest.internal_links_needed ?? [],
    external_sources_needed: rest.external_sources_needed ?? [],
    proof_required: rest.proof_required ?? ["Verifiable statistic source"],
    missing_proof: rest.missing_proof ?? [],
    claims_to_verify: rest.claims_to_verify ?? detectUnsupportedClaims(topic),
    compliance_warnings: rest.compliance_warnings ?? complianceWarnings("seo_article","seo"),
    risk_flags: rest.risk_flags ?? [],
    is_test_data,
  };
  const { data, error } = await a.admin.from("seo_content_briefs").insert(row).select().maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  await logAudit(a.admin, { business_id, seo_brief_id: data?.id, action: "seo_brief_created", after_json: data ?? {}, is_test_data });
  return json({ ok: true, brief: data, safety: SAFETY_FLAGS });
});