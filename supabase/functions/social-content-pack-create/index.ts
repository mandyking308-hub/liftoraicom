import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { generatePack } from "../_shared/socialContentFactory.ts";

const CONFIRM = "CREATE SOCIAL CONTENT PACK";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req); if ("error" in g) return g.error;
  const { admin } = g;
  const body = await req.json().catch(() => ({}));
  const business_id = body.business_id;
  const dry_run = body.dry_run !== false;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  if (!dry_run && body.confirmation_phrase !== CONFIRM)
    return json({ ok: false, error: `confirmation_phrase_required:${CONFIRM}` }, 400);

  const days = Number(body.days_count ?? 30);
  const platforms: string[] = (body.platforms?.length ? body.platforms : ["instagram", "tiktok"]);

  const [pillars, rules, offers, risks, assets, hooks, brain] = await Promise.all([
    admin.from("business_social_content_pillars").select("id,name,funnel_stage").eq("business_id", business_id),
    admin.from("business_social_platform_rules").select("platform,suitability,cadence").eq("business_id", business_id),
    admin.from("business_social_offer_mappings").select("id,offer_name,cta,pain_point").eq("business_id", business_id),
    admin.from("business_social_risk_flags").select("category,severity,rule").eq("business_id", business_id),
    admin.from("social_assets").select("id,consent_status,asset_type,title").eq("business_id", business_id).limit(50),
    admin.from("social_hook_caption_bank").select("hook,platform").eq("business_id", business_id).limit(50),
    admin.from("business_social_brain_profiles").select("brand_voice,icp_summary").eq("business_id", business_id).maybeSingle(),
  ]);

  const out = generatePack({
    inputs: {
      businessId: business_id,
      businessName: body.business_name,
      businessType: body.business_type,
      brandVoice: (brain.data as any)?.brand_voice,
      pillars: pillars.data || [],
      platformRules: rules.data || [],
      offers: offers.data || [],
      riskFlags: risks.data || [],
      assets: assets.data || [],
      hookBank: hooks.data || [],
      knowledgeSummary: (brain.data as any)?.icp_summary,
    },
    days, platforms,
    startDate: body.start_date,
    goal: body.goal || body.pack_type,
  });

  if (dry_run) {
    return json({ ok: true, dry_run: true, no_records_mutated: true, preview: out });
  }

  const isTest = !!body.is_test_data;
  const { data: packRow, error: packErr } = await admin
    .from("social_content_packs")
    .insert({ ...out.pack, is_test_data: isTest })
    .select("*").single();
  if (packErr) return json({ ok: false, error: packErr.message }, 500);

  const itemsToInsert = out.items.map((i: any) => {
    const { _idx, ...rest } = i;
    return { ...rest, pack_id: packRow.id, is_test_data: isTest };
  });
  const { data: insertedItems, error: itemsErr } = await admin
    .from("social_content_items").insert(itemsToInsert).select("id");
  if (itemsErr) return json({ ok: false, error: itemsErr.message }, 500);

  const packItems = (insertedItems || []).map((it, i) => ({
    business_id, pack_id: packRow.id, content_item_id: it.id,
    day_number: out.items[i].metadata?.day_number ?? (i + 1),
    sort_order: i, planned_date: out.items[i].scheduled_date,
    planned_time: out.items[i].scheduled_time, platform: out.items[i].platform,
    content_pillar_id: out.items[i].content_pillar_id,
    offer_mapping_id: out.items[i].offer_mapping_id,
    asset_id: out.items[i].asset_id,
    status: out.items[i].asset_readiness_status === "missing_asset" ? "needs_asset" : "planned",
    is_test_data: isTest,
  }));
  await admin.from("social_content_pack_items").insert(packItems);

  const variantRows = out.variants.map((v: any) => {
    const { _item_idx, ...rest } = v;
    return {
      ...rest, pack_id: packRow.id,
      content_item_id: insertedItems?.[_item_idx]?.id,
      is_test_data: isTest,
    };
  });
  if (variantRows.length) await admin.from("social_content_variants").insert(variantRows);

  const { data: run } = await admin.from("social_content_generation_runs").insert({
    business_id, run_type: "content_pack", run_status: "saved",
    requested_days: days, requested_platforms: platforms,
    source_summary: out.pack.generated_from_sources,
    output_summary: { items: itemsToInsert.length, variants: variantRows.length },
    created_pack_id: packRow.id,
    generated_count: itemsToInsert.length,
    missing_assets: out.missing_assets,
    compliance_warnings: out.compliance_warnings,
    confidence_score: out.confidence,
    is_test_data: isTest,
  }).select("*").single();

  return json({ ok: true, pack: packRow, item_count: itemsToInsert.length, variant_count: variantRows.length, run });
});