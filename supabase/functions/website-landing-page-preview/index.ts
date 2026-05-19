import { corsHeaders, json, requireFounder, genericPageOutline, complianceWarnings, SAFETY_FLAGS } from "../_shared/websiteFunnelLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, page_type = "landing_page", target_audience, primary_goal, funnel_strategy_id } = body;
  if (!business_id) return json({ ok: false, error: "missing_business_id" }, 400);
  let strategy_type = "lead_generation";
  if (funnel_strategy_id) {
    const { data } = await a.admin.from("website_funnel_strategies").select("strategy_type").eq("id", funnel_strategy_id).maybeSingle();
    if (data?.strategy_type) strategy_type = data.strategy_type;
  }
  return json({
    ok: true, dry_run: true, no_records_mutated: true,
    hero_headline: `Headline for ${target_audience ?? "your audience"} — replace with founder-approved copy`,
    hero_subheadline: `Subheadline explaining ${primary_goal ?? "the outcome"} without invented proof`,
    primary_cta: "Take the next step",
    page_outline: genericPageOutline(page_type, target_audience, primary_goal),
    section_copy: [{ section: "hero", copy: "[Founder edits this — no invented stats]" }],
    faq_blocks: [{ q: "Is this real?", a: "Replace with verified answer." }],
    proof_placeholders: ["[real testimonial]","[real screenshot]"],
    asset_requirements: ["hero image or video","supporting visuals"],
    compliance_warnings: complianceWarnings(strategy_type),
    ...SAFETY_FLAGS,
  });
});