import { corsHeaders, json, requireFounder, SAFETY_FLAGS } from "../_shared/websiteFunnelLogic.ts";
const BUILDERS = ["lovable","wix","shopify","webflow","wordpress","manual_operator","other"];
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, builder_type = "manual_operator", asset_pack_id, page_draft_id } = body;
  if (!business_id) return json({ ok: false, error: "missing_business_id" }, 400);
  if (!BUILDERS.includes(builder_type)) return json({ ok: false, error: "invalid_builder" }, 400);
  let pack: any = null, page: any = null;
  if (asset_pack_id) ({ data: pack } = await a.admin.from("conversion_asset_packs").select("*").eq("id", asset_pack_id).maybeSingle());
  if (page_draft_id) ({ data: page } = await a.admin.from("website_landing_page_drafts").select("*").eq("id", page_draft_id).maybeSingle());
  return json({
    ok: true, dry_run: true, no_records_mutated: true,
    builder_type,
    builder_instructions: `Manual ${builder_type} build only — Liftor does NOT call ${builder_type} APIs or deploy anything.`,
    copy_blocks: pack?.copy_blocks ?? [],
    page_structure: page?.page_outline ?? [],
    asset_checklist: pack?.asset_requirements ?? page?.asset_requirements ?? [],
    safety_warnings: ["No deploy from Liftor","No external API call","Founder must build and confirm manually"],
    ...SAFETY_FLAGS,
  });
});