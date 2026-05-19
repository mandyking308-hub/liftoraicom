import { corsHeaders, json, requireFounder, logAudit, requirePhrase, SAFETY_FLAGS, detectUnsupportedClaims } from "../_shared/paidMediaLogic.ts";
const PHRASE = "CREATE PAID MEDIA CREATIVE VARIANTS";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const block = requirePhrase(body, PHRASE); if (block) return block;
  if (!body.business_id) return json({ ok: false, error: "missing_business_id" }, 400);
  const variants = Array.isArray(body.variants) ? body.variants : [];
  if (body.dry_run !== false) return json({ ok: true, dry_run: true, no_records_mutated: true, safety: SAFETY_FLAGS, preview: variants });
  const rows = variants.map((v: any) => ({
    business_id: body.business_id, campaign_plan_id: body.campaign_plan_id ?? null,
    variant_name: v.variant_name, platform: v.platform ?? null,
    creative_type: v.creative_type, headline: v.headline ?? null, primary_text: v.primary_text ?? null,
    description: v.description ?? null, cta_text: v.cta_text ?? null, destination_url: v.destination_url ?? null,
    hook: v.hook ?? null, script_text: v.script_text ?? null, visual_brief: v.visual_brief ?? null,
    asset_id: v.asset_id ?? null, asset_requirements: v.asset_requirements ?? [],
    missing_assets: v.missing_assets ?? [], claims_to_verify: v.claims_to_verify ?? [],
    unsupported_claims: detectUnsupportedClaims(`${v.headline ?? ""} ${v.primary_text ?? ""} ${v.description ?? ""}`),
    compliance_warnings: v.compliance_warnings ?? [], risk_flags: v.risk_flags ?? [],
    is_test_data: !!body.is_test_data,
  }));
  const { data, error } = await a.admin.from("paid_media_creative_variants").insert(rows).select();
  if (error) return json({ ok: false, error: error.message }, 500);
  await logAudit(a.admin, { business_id: body.business_id, campaign_plan_id: body.campaign_plan_id ?? null, action: "creative_variant_created", result_json: { count: data.length } });
  return json({ ok: true, variants: data, safety: SAFETY_FLAGS });
});
