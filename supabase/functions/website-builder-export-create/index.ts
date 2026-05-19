import { corsHeaders, json, requireFounder, logAudit, SAFETY_FLAGS } from "../_shared/websiteFunnelLogic.ts";
const PHRASE = "CREATE WEBSITE BUILDER EXPORT";
const BUILDERS = ["lovable","wix","shopify","webflow","wordpress","manual_operator","other"];
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, asset_pack_id, page_draft_id, builder_type = "manual_operator", is_test_data = false, dry_run = true, confirmation_phrase } = body;
  if (!business_id) return json({ ok: false, error: "missing_business_id" }, 400);
  if (!BUILDERS.includes(builder_type)) return json({ ok: false, error: "invalid_builder" }, 400);
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, phrase_required: PHRASE, no_records_mutated: true, ...SAFETY_FLAGS });
  }
  let updated: any = null;
  if (asset_pack_id) {
    const { data } = await a.admin.from("conversion_asset_packs").update({
      manual_export_status: "export_ready",
      export_payload: { builder_type, exported_at: new Date().toISOString() },
      pack_status: "export_ready",
    }).eq("id", asset_pack_id).select().maybeSingle();
    updated = data;
  }
  if (page_draft_id) {
    await a.admin.from("website_landing_page_drafts").update({ builder_export_status: "export_ready" }).eq("id", page_draft_id);
  }
  await logAudit(a.admin, { business_id, asset_pack_id: asset_pack_id ?? null, page_draft_id: page_draft_id ?? null, action: "manual_export_created", action_status: "recorded", after_json: { builder_type, updated }, is_test_data });
  return json({ ok: true, asset_pack: updated, builder_type, ...SAFETY_FLAGS });
});