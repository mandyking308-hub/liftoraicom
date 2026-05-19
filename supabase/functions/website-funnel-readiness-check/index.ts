import { corsHeaders, json, requireFounder, logAudit, SAFETY_FLAGS } from "../_shared/websiteFunnelLogic.ts";
const PHRASE = "SAVE WEBSITE FUNNEL READINESS REVIEW";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, funnel_strategy_id, page_draft_id, lead_magnet_id, dry_run = true, confirmation_phrase, is_test_data = false } = body;
  if (!business_id) return json({ ok: false, error: "missing_business_id" }, 400);
  const gaps: { type: string; description: string; severity: string }[] = [];
  let page: any = null, lm: any = null, strat: any = null;
  if (funnel_strategy_id) ({ data: strat } = await a.admin.from("website_funnel_strategies").select("*").eq("id", funnel_strategy_id).maybeSingle());
  if (page_draft_id) ({ data: page } = await a.admin.from("website_landing_page_drafts").select("*").eq("id", page_draft_id).maybeSingle());
  if (lead_magnet_id) ({ data: lm } = await a.admin.from("lead_magnet_assets").select("*").eq("id", lead_magnet_id).maybeSingle());
  if (page && !page.primary_cta) gaps.push({ type: "no_cta", description: "Landing page missing primary CTA", severity: "high" });
  if (page && !page.hero_headline) gaps.push({ type: "weak_headline", description: "Hero headline missing", severity: "medium" });
  if (page && (page.proof_blocks?.length ?? 0) === 0) gaps.push({ type: "missing_proof", description: "No proof blocks", severity: "medium" });
  if (strat && (strat.recommended_pages?.length ?? 0) > 0 && !page_draft_id) gaps.push({ type: "no_destination_page", description: "Strategy has no linked page draft", severity: "high" });
  if (!lead_magnet_id && strat?.strategy_type === "lead_generation") gaps.push({ type: "no_lead_magnet", description: "Lead-gen strategy without lead magnet", severity: "medium" });
  const total = 5;
  const readiness = Math.max(0, Math.round(((total - gaps.length) / total) * 100));
  if (!dry_run && confirmation_phrase === PHRASE) {
    for (const g of gaps) {
      await a.admin.from("website_funnel_gap_reviews").insert({
        business_id, funnel_strategy_id: funnel_strategy_id ?? null, page_draft_id: page_draft_id ?? null,
        gap_type: g.type, gap_description: g.description, severity: g.severity, is_test_data,
      });
    }
    await logAudit(a.admin, { business_id, funnel_strategy_id: funnel_strategy_id ?? null, page_draft_id: page_draft_id ?? null, lead_magnet_id: lead_magnet_id ?? null, action: "readiness_check", action_status: "recorded", result_json: { readiness, gaps }, is_test_data });
  }
  return json({
    ok: true, dry_run: dry_run || confirmation_phrase !== PHRASE,
    readiness_score: readiness, gaps,
    next_actions: gaps.map((g) => `Resolve ${g.type}`),
    phrase_required: PHRASE,
    ...SAFETY_FLAGS,
  });
});