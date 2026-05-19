import { corsHeaders, json, requireFounder, SAFETY_FLAGS } from "../_shared/websiteFunnelLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, pack_type = "landing_page_pack" } = body;
  if (!business_id) return json({ ok: false, error: "missing_business_id" }, 400);
  return json({
    ok: true, dry_run: true, no_records_mutated: true,
    copy_blocks: [
      { id: "hero_headline", content: "[Founder edits]" },
      { id: "hero_subheadline", content: "[Founder edits]" },
      { id: "primary_cta", content: "[Founder edits]" },
    ],
    builder_instructions: `Operator: build a ${pack_type} using approved copy only. No invented testimonials or stats.`,
    asset_requirements: ["hero visual","supporting visuals","brand logo"],
    operator_checklist: [
      { step: 1, action: "Receive copy blocks" },
      { step: 2, action: "Add real assets" },
      { step: 3, action: "Add privacy/terms links" },
      { step: 4, action: "Send back manual confirmation when live" },
    ],
    export_payload_preview: { pack_type, blocks: 3 },
    validation_warnings: ["No proof attached yet"],
    ...SAFETY_FLAGS,
  });
});