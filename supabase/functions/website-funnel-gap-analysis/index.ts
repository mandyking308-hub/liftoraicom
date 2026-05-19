import { corsHeaders, json, requireFounder, logAudit, SAFETY_FLAGS } from "../_shared/websiteFunnelLogic.ts";
const PHRASE = "SAVE WEBSITE FUNNEL GAP ANALYSIS";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, dry_run = true, confirmation_phrase, is_test_data = false } = body;
  if (!business_id) return json({ ok: false, error: "missing_business_id" }, 400);
  const safeCount = async (table: string, filter?: Record<string, any>) => {
    try {
      let q: any = (a.admin as any).from(table).select("id", { head: true, count: "exact" }).eq("business_id", business_id);
      if (filter) for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
      const { count } = await q;
      return count ?? 0;
    } catch { return 0; }
  };
  const strategies = await safeCount("website_funnel_strategies");
  const pages = await safeCount("website_landing_page_drafts");
  const leadMagnets = await safeCount("lead_magnet_assets");
  const ctaMaps = await safeCount("conversion_cta_maps");
  let contentWithoutCta = 0, campaignsWithoutFunnel = 0;
  try {
    const { count } = await (a.admin as any).from("social_content_items").select("id", { head: true, count: "exact" }).eq("business_id", business_id).is("cta_map_id", null);
    contentWithoutCta = count ?? 0;
  } catch {}
  try {
    const { count } = await (a.admin as any).from("social_campaign_plans").select("id", { head: true, count: "exact" }).eq("business_id", business_id).is("funnel_strategy_id", null);
    campaignsWithoutFunnel = count ?? 0;
  } catch {}
  const gaps: { type: string; description: string; severity: string }[] = [];
  if (pages === 0) gaps.push({ type: "no_destination_page", description: "No landing page drafts exist", severity: "high" });
  if (contentWithoutCta > 0) gaps.push({ type: "weak_conversion_path", description: `${contentWithoutCta} social content items lack a CTA map`, severity: "medium" });
  if (campaignsWithoutFunnel > 0) gaps.push({ type: "no_clear_offer", description: `${campaignsWithoutFunnel} campaigns lack a funnel strategy`, severity: "medium" });
  if (leadMagnets === 0) gaps.push({ type: "no_lead_magnet", description: "No lead magnets exist", severity: "low" });
  if (!dry_run && confirmation_phrase === PHRASE) {
    for (const g of gaps) {
      await a.admin.from("website_funnel_gap_reviews").insert({
        business_id, gap_type: g.type, gap_description: g.description, severity: g.severity, is_test_data,
      });
    }
    await logAudit(a.admin, { business_id, action: "gap_review_created", action_status: "recorded", result_json: { gaps }, is_test_data });
  }
  return json({
    ok: true, dry_run: dry_run || confirmation_phrase !== PHRASE,
    counts: { strategies, pages, leadMagnets, ctaMaps, contentWithoutCta, campaignsWithoutFunnel },
    gaps, recommended_fixes: gaps.map((g) => `Resolve ${g.type}`),
    phrase_required: PHRASE,
    ...SAFETY_FLAGS,
  });
});