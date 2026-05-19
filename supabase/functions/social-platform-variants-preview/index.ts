import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { platformToVariantType } from "../_shared/socialContentFactory.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req); if ("error" in g) return g.error;
  const { admin } = g;
  const body = await req.json().catch(() => ({}));
  const { business_id, content_item_id, concept_payload, platforms } = body;
  if (!business_id || !platforms?.length) return json({ ok: false, error: "business_id_and_platforms_required" }, 400);

  let base: any = concept_payload || {};
  if (content_item_id) {
    const { data } = await admin.from("social_content_items").select("*").eq("id", content_item_id).maybeSingle();
    if (data) base = data;
  }

  const variants = platforms.map((p: string) => ({
    business_id, platform: p, variant_type: platformToVariantType(p),
    title: base.title, hook: base.hook || base.title,
    caption: base.caption, script: base.script,
    carousel_outline: base.carousel_outline || [],
    hashtags: base.hashtags, cta: base.cta, link_url: base.link_url,
    asset_id: base.asset_id, approval_status: "draft",
    risk_flags: base.compliance_status === "needs_review" ? ["sensitive_review"] : [],
    missing_requirements: base.asset_id ? [] : ["visual_asset_required"],
  }));

  return json({ ok: true, no_records_mutated: true, dry_run: true, variants });
});