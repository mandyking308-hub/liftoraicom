import { corsHeaders, json, requireFounder, logAudit, SAFETY_FLAGS } from "../_shared/longformContentLogic.ts";
const PHRASE = "SAVE LONGFORM CONTENT GAP ANALYSIS";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, strategy_id, dry_run = true, confirmation_phrase, is_test_data = false } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const [strats, briefs, drafts, seqs, funnels] = await Promise.all([
    a.admin.from("longform_content_strategies").select("id").eq("business_id", business_id),
    a.admin.from("seo_content_briefs").select("id").eq("business_id", business_id),
    a.admin.from("longform_content_drafts").select("id,draft_type,suggested_cta,unsupported_claims,proof_placeholders").eq("business_id", business_id),
    a.admin.from("newsletter_sequence_plans").select("id").eq("business_id", business_id),
    a.admin.from("website_funnel_strategies").select("id").eq("business_id", business_id),
  ]);
  const draftRows = drafts.data ?? [];
  const gaps: Array<{gap_type: string; gap_description: string; severity: string; recommended_fix: string}> = [];
  if ((strats.data?.length ?? 0) === 0) gaps.push({ gap_type: "missing_blog_strategy", gap_description: "No long-form strategy for this business", severity: "high", recommended_fix: "Create a long-form content strategy" });
  if ((briefs.data?.length ?? 0) === 0) gaps.push({ gap_type: "missing_seo_briefs", gap_description: "No SEO briefs yet", severity: "medium", recommended_fix: "Create at least one SEO content brief" });
  if ((seqs.data?.length ?? 0) === 0) gaps.push({ gap_type: "missing_newsletter_plan", gap_description: "No newsletter sequence plans", severity: "medium", recommended_fix: "Plan a welcome or nurture sequence" });
  if (!draftRows.some((d:any) => d.draft_type === "faq_article")) gaps.push({ gap_type: "missing_faq", gap_description: "No FAQ article drafted", severity: "low", recommended_fix: "Draft an FAQ article" });
  if (!draftRows.some((d:any) => d.draft_type === "support_article")) gaps.push({ gap_type: "missing_support_article", gap_description: "No support article drafted", severity: "low", recommended_fix: "Draft a support article" });
  const unsupported = draftRows.reduce((n:any,d:any) => n + (d.unsupported_claims?.length ?? 0), 0);
  if (unsupported > 0) gaps.push({ gap_type: "unsupported_claims", gap_description: `${unsupported} unsupported claims across drafts`, severity: "high", recommended_fix: "Add verified sources or remove claims" });
  const missingProof = draftRows.filter((d:any) => (d.proof_placeholders?.length ?? 0) > 0).length;
  if (missingProof > 0) gaps.push({ gap_type: "missing_proof", gap_description: `${missingProof} drafts contain proof placeholders`, severity: "medium", recommended_fix: "Provide real proof or remove placeholders" });
  const draftsNoCta = draftRows.filter((d:any) => !d.suggested_cta).length;
  if (draftsNoCta > 0) gaps.push({ gap_type: "missing_cta", gap_description: `${draftsNoCta} drafts have no CTA`, severity: "medium", recommended_fix: "Add a clear single CTA per draft" });
  if ((funnels.data?.length ?? 0) === 0) gaps.push({ gap_type: "no_funnel_destination", gap_description: "No funnel strategies to route CTAs to", severity: "medium", recommended_fix: "Create at least one funnel strategy" });

  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, phrase_required: PHRASE, no_records_mutated: true, gaps, safety: SAFETY_FLAGS });
  }
  if (gaps.length) {
    await a.admin.from("longform_content_gap_reviews").insert(gaps.map((g) => ({
      business_id, strategy_id: strategy_id ?? null, gap_type: g.gap_type, gap_description: g.gap_description, severity: g.severity, recommended_fix: g.recommended_fix, is_test_data,
    })));
  }
  await logAudit(a.admin, { business_id, strategy_id: strategy_id ?? null, action: "gap_review_created", result_json: { count: gaps.length }, is_test_data });
  return json({ ok: true, gaps_saved: gaps.length, gaps, safety: SAFETY_FLAGS });
});