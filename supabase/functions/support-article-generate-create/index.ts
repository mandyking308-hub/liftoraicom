import { corsHeaders, json, requireFounder, SUPPORT_SAFETY, detectUnsupportedClaims } from "../_shared/supportAgentLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const { business_id, article, dry_run = true, confirmation_phrase } = b;
  if (!business_id || !article?.article_type) return json({ ok: false, error: "business_id and article.article_type required", safety: SUPPORT_SAFETY }, 400);
  if (dry_run !== false) return json({ ok: true, dry_run: true, would_create: article, safety: SUPPORT_SAFETY });
  if (confirmation_phrase !== "CREATE SUPPORT ARTICLE DRAFT") return json({ ok: false, blocked: true, reason: "confirmation_phrase_required", safety: SUPPORT_SAFETY }, 400);
  const { data: sources } = await a.admin.from("support_knowledge_sources").select("source_name").eq("business_id", business_id).eq("approved_for_support", true);
  const refs = (sources ?? []).map((s: any) => s.source_name);
  const row = {
    business_id,
    source_id: article.source_id ?? null,
    title: article.article_title ?? article.title ?? "Untitled support article",
    article_title: article.article_title ?? article.title ?? "Untitled support article",
    article_type: article.article_type,
    customer_question: article.customer_question ?? null,
    short_answer: article.short_answer ?? null,
    full_answer: article.full_answer ?? null,
    step_by_step: article.step_by_step ?? [],
    source_references: refs.slice(0, 5),
    missing_source_flags: refs.length ? [] : ["no_approved_source"],
    compliance_warnings: detectUnsupportedClaims(`${article.short_answer ?? ""} ${article.full_answer ?? ""}`),
    approval_status: "draft",
    publish_status: "not_published",
    article_status: "draft",
  };
  const { data, error } = await a.admin.from("support_knowledge_articles").insert(row).select().single();
  if (error) return json({ ok: false, error: error.message, safety: SUPPORT_SAFETY }, 500);
  await a.admin.from("support_audit").insert({ business_id, article_id: data.id, action: "article_created", after_json: data });
  return json({ ok: true, created: data, safety: SUPPORT_SAFETY });
});