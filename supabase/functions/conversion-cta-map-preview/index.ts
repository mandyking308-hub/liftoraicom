import { corsHeaders, json, requireFounder, SAFETY_FLAGS } from "../_shared/websiteFunnelLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, source_type = "social_content", funnel_strategy_id, page_draft_id, lead_magnet_id, platform } = body;
  if (!business_id) return json({ ok: false, error: "missing_business_id" }, 400);
  let destination_status = "draft";
  const warnings: string[] = [];
  if (!page_draft_id && !lead_magnet_id) { destination_status = "needs_build"; warnings.push("No destination page or lead magnet linked"); }
  return json({
    ok: true, dry_run: true, no_records_mutated: true,
    recommended_cta_text: "Tap the link in bio",
    recommended_destination_type: lead_magnet_id ? "lead_magnet" : page_draft_id ? "landing_page" : "website_page",
    destination_status,
    risk_warnings: warnings,
    source_type, platform: platform ?? null,
    ...SAFETY_FLAGS,
  });
});