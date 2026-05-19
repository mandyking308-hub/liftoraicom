import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { generateAssetRequirementSeeds } from "../_shared/socialAssetLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req);
  if ("error" in g) return g.error;
  const { admin } = g;

  const b = await req.json().catch(() => ({}));
  if (!b.business_id) return json({ ok: false, error: "business_id required" }, 400);
  const dry_run = b.dry_run !== false;

  const [{ data: ver }, { data: rules }, { data: offers }] = await Promise.all([
    admin.from("business_social_profile_versions").select("profile_snapshot")
      .eq("business_id", b.business_id).order("version_number", { ascending: false }).limit(1),
    admin.from("business_social_platform_rules").select("platform,is_active").eq("business_id", b.business_id).eq("is_active", true),
    admin.from("business_social_offer_mappings").select("id").eq("business_id", b.business_id).limit(1),
  ]);
  const snapshot = ver?.[0]?.profile_snapshot as any;
  const business_type = b.business_type ?? snapshot?.business_type ?? "generic";
  const active_platforms = (rules ?? []).map((r: any) => r.platform);
  const has_offer = (offers ?? []).length > 0;

  const seeds = generateAssetRequirementSeeds({ business_type, active_platforms, has_offer });

  if (dry_run) return json({
    ok: true, dry_run: true, no_records_mutated: true,
    business_type, active_platforms, has_offer,
    would_create: seeds.length, requirements: seeds,
  });
  if (b.confirmation_phrase !== "CREATE SOCIAL ASSET REQUIREMENTS")
    return json({ ok: false, reason: "confirmation_phrase_required", expected: "CREATE SOCIAL ASSET REQUIREMENTS" }, 400);

  const { data: existing } = await admin.from("social_asset_requirements")
    .select("requirement_name").eq("business_id", b.business_id);
  const have = new Set((existing ?? []).map((r: any) => r.requirement_name));
  const toInsert = seeds.filter(s => !have.has(s.requirement_name)).map(s => ({
    business_id: b.business_id,
    requirement_name: s.requirement_name,
    asset_type: s.asset_type,
    platform: s.platform ?? null,
    required_for: s.required_for,
    priority: s.priority,
    notes: s.notes ?? null,
    status: "missing",
  }));
  if (!toInsert.length) return json({ ok: true, inserted: 0, note: "All seeds already exist." });
  const { data, error } = await admin.from("social_asset_requirements").insert(toInsert).select("id");
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, inserted: data?.length ?? 0 });
});
