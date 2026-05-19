import { corsHeaders, json, requireFounder, logAudit, SAFETY_FLAGS } from "../_shared/longformContentLogic.ts";
const PHRASE = "CONFIRM LONGFORM CONTENT MANUALLY PUBLISHED";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, draft_id, sequence_id, export_pack_id, external_url, confirmation_notes, dry_run = true, confirmation_phrase } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  if (dry_run || confirmation_phrase !== PHRASE) return json({ ok: true, dry_run: true, phrase_required: PHRASE, no_records_mutated: true, safety: SAFETY_FLAGS });
  if (draft_id) await a.admin.from("longform_content_drafts").update({ external_publish_status: "manually_published_external", manual_export_status: "exported" }).eq("id", draft_id);
  if (sequence_id) await a.admin.from("newsletter_sequence_plans").update({ sequence_status: "manually_configured_external" }).eq("id", sequence_id);
  if (export_pack_id) await a.admin.from("longform_manual_export_packs").update({ export_status: "live_confirmed_external", confirmed_external_at: new Date().toISOString(), confirmed_external_by: a.user.email ?? "founder" }).eq("id", export_pack_id);
  await logAudit(a.admin, { business_id, draft_id: draft_id ?? null, sequence_id: sequence_id ?? null, export_pack_id: export_pack_id ?? null, action: "live_confirmation_recorded", result_json: { external_url, confirmation_notes } });
  return json({ ok: true, safety: SAFETY_FLAGS });
});