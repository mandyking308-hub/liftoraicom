import { corsHeaders, json, requireFounder, SAFETY_FLAGS, genericOutline, complianceWarnings, detectUnsupportedClaims } from "../_shared/longformContentLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, draft_type = "blog_post", topic = "(topic)", title, target_audience, primary_goal } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const t = title ?? topic;
  return json({
    ok: true, no_records_mutated: true,
    draft: {
      draft_title: t,
      outline: genericOutline(draft_type, topic),
      draft_body_preview: `[Internal draft skeleton for ${draft_type}] Topic: ${topic}. Audience: ${target_audience ?? "TBD"}. Goal: ${primary_goal ?? "TBD"}.`,
      excerpt: `Internal ${draft_type} draft about ${topic}.`,
      suggested_cta: "Founder approval required before any external CTA wording.",
      proof_placeholders: ["[CUSTOMER_STORY_PLACEHOLDER]","[STATISTIC_PLACEHOLDER]","[SOURCE_LINK_PLACEHOLDER]"],
      unsupported_claims: detectUnsupportedClaims(`${t} ${primary_goal ?? ""}`),
      claims_to_verify: ["Any % stat","Any guarantee","Any third-party claim"],
      compliance_warnings: complianceWarnings(draft_type),
    },
    safety: SAFETY_FLAGS,
  });
});