import { corsHeaders, json, requireFounder, SAFETY_FLAGS } from "../_shared/paidMediaLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const spend = Number(body.planned_spend ?? 0);
  const cpc = Number(body.expected_cpc ?? 0);
  const cpl = Number(body.expected_cpl ?? 0);
  const cac = Number(body.expected_cac ?? 0);
  const conv = Number(body.expected_conversion_rate ?? 0);
  const clicks = cpc > 0 ? Math.floor(spend / cpc) : null;
  const leads = cpl > 0 ? Math.floor(spend / cpl) : null;
  const conversions = leads != null && conv > 0 ? Math.floor(leads * conv) : (cac > 0 ? Math.floor(spend / cac) : null);
  return json({
    ok: true, no_records_mutated: true, evidence_level: "estimate_only",
    estimate: { planned_spend: spend, expected_clicks: clicks, expected_leads: leads, expected_conversions: conversions },
    confidence_score: 0,
    warning_text: "Forecast only. Not real spend or proven performance.",
    assumptions: ["Assumed CPC/CPL/CAC from operator input"],
    caveats: ["No real-world validation", "Platform results vary widely"],
    safety: SAFETY_FLAGS,
  });
});
