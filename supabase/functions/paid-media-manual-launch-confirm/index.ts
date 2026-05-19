import { corsHeaders, json, requireFounder, logAudit, SAFETY_FLAGS } from "../_shared/paidMediaLogic.ts";
const PHRASE_SETUP = "CONFIRM PAID MEDIA MANUAL SETUP";
const PHRASE_LAUNCH = "CONFIRM PAID MEDIA MANUALLY LAUNCHED EXTERNALLY";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  if (!body.business_id) return json({ ok: false, error: "missing_business_id" }, 400);
  if (body.dry_run !== false) return json({ ok: true, dry_run: true, no_records_mutated: true, safety: SAFETY_FLAGS });
  if (body.confirmation_phrase !== PHRASE_SETUP) return json({ ok: false, blocked: true, reason: "confirmation_phrase_required", required_phrase: PHRASE_SETUP }, 400);
  if (body.mark_launched && body.launch_confirmation_phrase !== PHRASE_LAUNCH) {
    return json({ ok: false, blocked: true, reason: "launch_confirmation_phrase_required", required_phrase: PHRASE_LAUNCH }, 400);
  }
  const status = body.mark_launched ? "manually_launched_external" : "manually_configured";
  if (body.campaign_plan_id) {
    await a.admin.from("paid_media_campaign_plans").update({
      manual_launch_status: status,
      campaign_status: body.mark_launched ? "manually_launched_external" : "manually_configured_external",
    }).eq("id", body.campaign_plan_id);
  }
  if (body.export_pack_id) {
    await a.admin.from("paid_media_manual_export_packs").update({
      export_status: body.mark_launched ? "manually_launched_external" : "manually_configured_external",
      confirmed_external_at: new Date().toISOString(),
      confirmed_external_by: a.user.email ?? a.user.id,
    }).eq("id", body.export_pack_id);
  }
  await logAudit(a.admin, {
    business_id: body.business_id, campaign_plan_id: body.campaign_plan_id ?? null,
    export_pack_id: body.export_pack_id ?? null, action: "manual_launch_confirmation_recorded",
    result_json: { status, notes: body.confirmation_notes ?? null },
  });
  return json({ ok: true, status, safety: SAFETY_FLAGS });
});
