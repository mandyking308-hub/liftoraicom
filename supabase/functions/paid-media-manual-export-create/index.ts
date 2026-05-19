import { corsHeaders, json, requireFounder, logAudit, requirePhrase, SAFETY_FLAGS } from "../_shared/paidMediaLogic.ts";
const PHRASE = "CREATE PAID MEDIA MANUAL EXPORT";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const block = requirePhrase(body, PHRASE); if (block) return block;
  if (!body.business_id || !body.campaign_plan_id || !body.export_type || !body.export_name) return json({ ok: false, error: "missing_required_fields" }, 400);
  if (body.dry_run !== false) return json({ ok: true, dry_run: true, no_records_mutated: true, safety: SAFETY_FLAGS });
  const { data, error } = await a.admin.from("paid_media_manual_export_packs").insert({
    business_id: body.business_id, campaign_plan_id: body.campaign_plan_id,
    export_name: body.export_name, export_type: body.export_type, export_status: "ready",
    platform: body.platform ?? null, export_payload: body.export_payload ?? {},
    setup_instructions: body.setup_instructions ?? null,
    copy_blocks: body.copy_blocks ?? [], audience_blocks: body.audience_blocks ?? [],
    creative_blocks: body.creative_blocks ?? [], budget_blocks: body.budget_blocks ?? [],
    operator_checklist: body.operator_checklist ?? [], validation_status: "passed",
    is_test_data: !!body.is_test_data,
  }).select().single();
  if (error) return json({ ok: false, error: error.message }, 500);
  await logAudit(a.admin, { business_id: body.business_id, campaign_plan_id: body.campaign_plan_id, export_pack_id: data.id, action: "manual_export_created", after_json: data });
  return json({ ok: true, pack: data, safety: SAFETY_FLAGS });
});
