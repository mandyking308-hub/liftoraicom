import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS } from "../_shared/socialAnalyticsLogic.ts";

const MAP: Record<string, { type: string; title: (s: any) => string; action: string }> = {
  platform_working: { type: "change_platform_focus", title: (s) => `Lean into ${s.platform}`, action: "Increase cadence on this platform next 2 weeks." },
  platform_underperforming: { type: "reduce_content_type", title: (s) => `Reduce volume on ${s.platform}`, action: "Cut cadence and test a different format." },
  hook_working: { type: "change_hook_style", title: () => "Use this hook pattern more often", action: "Apply to next content pack." },
  hook_underperforming: { type: "change_hook_style", title: () => "Retire underperforming hook pattern", action: "Replace with stronger variant in factory." },
  format_signal: { type: "create_more_content_like_this", title: (s) => `Produce more of: ${s.signal_title}`, action: "Add to next content pack brief." },
  cta_underperforming: { type: "change_cta", title: () => "Revise CTA approach", action: "Test stronger CTA variants." },
  asset_working: { type: "improve_asset", title: () => "Repurpose top-performing asset", action: "Create derivative variants in repurposing engine." },
  campaign_underperforming: { type: "adjust_campaign", title: () => "Adjust campaign creative/offer", action: "Revisit offer, proof, CTA." },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({} as any));
  const business_id = body.business_id;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);

  let q: any = a.admin.from("social_learning_signals").select("*").eq("business_id", business_id).limit(100);
  if (body.learning_signal_id) q = q.eq("id", body.learning_signal_id);
  const { data: signals } = await q;
  const list = (signals ?? []) as any[];

  const recs = list.map((s) => {
    const m = MAP[s.signal_type];
    if (!m) return null;
    const evidence_level = s.confidence_score >= 70 ? "high" : s.confidence_score >= 40 ? "medium" : "low";
    return {
      recommendation_type: m.type,
      priority: s.signal_type.endsWith("_underperforming") || s.signal_type === "complaint_signal" ? "high" : "normal",
      title: m.title(s),
      description: s.signal_description,
      rationale: s.evidence_summary,
      linked_learning_signal_id: s.id,
      recommended_action: m.action,
      expected_impact: "Incremental — monitor next cycle for change.",
      evidence_level,
      confidence_score: s.confidence_score,
    };
  }).filter(Boolean);

  return json({ ok: true, business_id, evaluated: list.length, recommendations: recs, no_records_mutated: true, ...SAFETY_FLAGS });
});