import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { rightsRiskFromAsset } from "../_shared/socialAssetLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req);
  if ("error" in g) return g.error;
  const { admin } = g;

  const b = await req.json().catch(() => ({}));
  if (!b.business_id) return json({ ok: false, error: "business_id required" }, 400);

  if (b.asset_id) {
    const { data: a } = await admin.from("social_assets").select("*").eq("id", b.asset_id).eq("business_id", b.business_id).maybeSingle();
    if (!a) return json({ ok: false, error: "asset_not_found" }, 404);
    return json({ ok: true, dry_run: true, no_records_mutated: true, asset_id: a.id, rights: rightsRiskFromAsset(a), asset: a });
  }
  // bulk preview
  const { data: rows } = await admin.from("social_assets").select("*").eq("business_id", b.business_id);
  const flagged = (rows ?? []).map((a: any) => ({
    id: a.id, title: a.title, asset_type: a.asset_type,
    rights_status: a.rights_status, consent_status: a.consent_status,
    expiry: a.rights_expiry_date,
    ...rightsRiskFromAsset(a),
  }));
  return json({
    ok: true, dry_run: true, no_records_mutated: true,
    total: flagged.length,
    unknown: flagged.filter((f: any) => f.rights_status === "unknown").length,
    blocked: flagged.filter((f: any) => f.rights_status === "blocked").length,
    legal_review_required: (rows ?? []).filter((r: any) => r.legal_review_required).length,
    flagged,
  });
});