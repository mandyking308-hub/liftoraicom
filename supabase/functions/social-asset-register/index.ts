import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req);
  if ("error" in g) return g.error;
  const { admin } = g;

  const b = await req.json().catch(() => ({}));
  if (!b.business_id || !b.title || !b.asset_type)
    return json({ ok: false, error: "business_id, title, asset_type required" }, 400);
  const dry_run = b.dry_run !== false;

  const row = {
    business_id: b.business_id,
    title: b.title,
    asset_type: b.asset_type,
    asset_category: b.asset_category ?? null,
    description: b.description ?? null,
    file_url: b.file_url ?? null,
    storage_path: b.storage_path ?? null,
    platform_fit: b.platform_fit ?? [],
    rights_status: b.rights_status ?? "unknown",
    source_notes: b.source_notes ?? null,
    owner_name: b.owner_name ?? null,
    licence_reference: b.licence_reference ?? null,
    consent_required: !!b.consent_required,
    consent_status: b.consent_status ?? "unknown",
    approved_for_social: false,
    approved_for_ads: false,
    approved_for_proposals: false,
    founder_review_required: true,
    is_test_data: !!b.is_test_data,
  };

  if (dry_run) return json({ ok: true, dry_run: true, no_records_mutated: true, would_insert: row });
  if (b.confirmation_phrase !== "REGISTER SOCIAL ASSET")
    return json({ ok: false, reason: "confirmation_phrase_required", expected: "REGISTER SOCIAL ASSET" }, 400);

  const { data, error } = await admin.from("social_assets").insert(row).select("id,title,asset_type,rights_status").maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, asset: data, no_external_upload: true });
});