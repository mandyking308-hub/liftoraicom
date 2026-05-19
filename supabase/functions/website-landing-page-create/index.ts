import { corsHeaders, json, requireFounder, genericPageOutline, logAudit, SAFETY_FLAGS } from "../_shared/websiteFunnelLogic.ts";
const PHRASE = "CREATE WEBSITE LANDING PAGE DRAFT";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, page_name, page_type = "landing_page", funnel_strategy_id, target_audience, primary_goal, hero_headline, hero_subheadline, primary_cta, secondary_cta, sections, is_test_data = false, dry_run = true, confirmation_phrase } = body;
  if (!business_id || !page_name) return json({ ok: false, error: "missing_fields" }, 400);
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, phrase_required: PHRASE, no_records_mutated: true, ...SAFETY_FLAGS });
  }
  const outline = genericPageOutline(page_type, target_audience, primary_goal);
  const { data: page, error } = await a.admin.from("website_landing_page_drafts").insert({
    business_id, funnel_strategy_id: funnel_strategy_id ?? null, page_name, page_type,
    target_audience, primary_goal, hero_headline, hero_subheadline, primary_cta, secondary_cta,
    page_outline: outline, approval_status: "needs_review", is_test_data,
  }).select().maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  let sectionRows: any[] = [];
  if (Array.isArray(sections) && sections.length) {
    sectionRows = sections.map((s: any, i: number) => ({
      business_id, page_draft_id: page.id, section_order: s.section_order ?? i,
      section_type: s.section_type ?? "hero", section_title: s.section_title ?? null,
      section_goal: s.section_goal ?? null, section_copy: s.section_copy ?? null,
      cta_text: s.cta_text ?? null, cta_url: s.cta_url ?? null, is_test_data,
    }));
    await a.admin.from("website_page_sections").insert(sectionRows);
  }
  await logAudit(a.admin, { business_id, page_draft_id: page.id, funnel_strategy_id: funnel_strategy_id ?? null, action: "landing_page_created", action_status: "recorded", after_json: page, is_test_data });
  return json({ ok: true, page, sections_created: sectionRows.length, ...SAFETY_FLAGS });
});