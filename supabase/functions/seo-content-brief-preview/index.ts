import { corsHeaders, json, requireFounder, SAFETY_FLAGS, complianceWarnings, detectUnsupportedClaims, genericOutline } from "../_shared/longformContentLogic.ts";
function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,80); }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, topic, target_keyword, secondary_keywords = [], search_intent = "informational", article_type = "guide" } = body;
  if (!business_id || !topic) return json({ ok: false, error: "missing_fields" }, 400);
  const title = target_keyword ? `${target_keyword} — ${topic}` : topic;
  return json({
    ok: true, no_records_mutated: true,
    brief: {
      suggested_title: title,
      suggested_slug: slugify(title),
      meta_title: title.slice(0,60),
      meta_description: `${topic} — practical guide. Internal draft, no SEO API used.`.slice(0,155),
      outline: genericOutline("seo_article", topic),
      internal_links_needed: ["pillar page","related FAQ"],
      external_sources_needed: ["1 authoritative source per claim"],
      proof_required: ["Verifiable statistic source","Real example or case"],
      missing_proof: ["No source attached yet"],
      claims_to_verify: detectUnsupportedClaims(topic + " " + (secondary_keywords||[]).join(" ")),
      compliance_warnings: complianceWarnings("seo_article","seo"),
      search_intent, article_type, target_keyword: target_keyword ?? null, secondary_keywords,
    },
    safety: SAFETY_FLAGS,
  });
});