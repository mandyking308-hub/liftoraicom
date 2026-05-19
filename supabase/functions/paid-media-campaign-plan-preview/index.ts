import { corsHeaders, json, requireFounder, SAFETY_FLAGS } from "../_shared/paidMediaLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const platforms: string[] = body.platform_list?.length ? body.platform_list : ["meta", "google"];
  const warnings: string[] = [];
  if (!body.funnel_destination_url && !body.linked_landing_page_id) warnings.push("missing_funnel_destination");
  if (!body.budget_total) warnings.push("no_budget_cap_set");
  if (!body.primary_goal) warnings.push("missing_primary_goal");
  return json({
    ok: true, no_records_mutated: true,
    recommended: {
      platforms, objective: body.primary_goal ?? "lead_generation",
      audience_approach: "cold_interest + retargeting_later",
      creative_needs: ["1 hook video", "2 image variants", "2 headline variants"],
      funnel_requirements: ["landing page", "lead magnet or offer", "thank-you page"],
    },
    warnings, assumptions: ["estimate only", "no real performance data"], caveats: ["Liftor never launches ads"],
    safety: SAFETY_FLAGS,
  });
});