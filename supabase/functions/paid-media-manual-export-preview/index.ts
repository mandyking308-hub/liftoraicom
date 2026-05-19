import { corsHeaders, json, requireFounder, SAFETY_FLAGS } from "../_shared/paidMediaLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  if (!body.business_id || !body.campaign_plan_id || !body.export_type) return json({ ok: false, error: "missing_required_fields" }, 400);
  const { data: plan } = await a.admin.from("paid_media_campaign_plans").select("*").eq("id", body.campaign_plan_id).single();
  const { data: aud } = await a.admin.from("paid_media_audience_segments").select("*").eq("campaign_plan_id", body.campaign_plan_id);
  const { data: cre } = await a.admin.from("paid_media_creative_variants").select("*").eq("campaign_plan_id", body.campaign_plan_id);
  const { data: gd } = await a.admin.from("paid_media_budget_guards").select("*").eq("campaign_plan_id", body.campaign_plan_id);
  return json({
    ok: true, no_records_mutated: true,
    pack: {
      setup_instructions: `Operator: configure ${body.export_type} in the ad platform UI manually. Liftor does NOT call any ad platform API.`,
      campaign: plan, audience_blocks: aud ?? [], creative_blocks: cre ?? [], budget_blocks: gd ?? [],
      destination_url: plan?.funnel_destination_url ?? null,
      operator_checklist: [
        "Verify ad account billing manually",
        "Apply daily + total budget caps",
        "Paste headline + primary text per variant",
        "Upload required assets",
        "Set destination URL",
        "Save campaign as PAUSED before founder approval",
        "Confirm in Liftor only after launching manually",
      ],
    },
    safety: SAFETY_FLAGS,
  });
});
