import { corsHeaders, json, requireFounder, logAudit, SAFETY_FLAGS } from "../_shared/longformContentLogic.ts";
const PHRASE = "CREATE LONGFORM MANUAL EXPORT";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, draft_id, sequence_id, export_type = "manual_copy_pack", export_name, dry_run = true, confirmation_phrase, is_test_data = false } = body;
  if (!business_id || !export_name) return json({ ok: false, error: "missing_fields" }, 400);
  if (dry_run || confirmation_phrase !== PHRASE) return json({ ok: true, dry_run: true, phrase_required: PHRASE, no_records_mutated: true, safety: SAFETY_FLAGS });
  let copy_blocks: any[] = [];
  if (draft_id) {
    const { data: d } = await a.admin.from("longform_content_drafts").select("*").eq("id", draft_id).maybeSingle();
    if (d) copy_blocks = [
      { label: "Title", value: d.draft_title },
      { label: "Meta title", value: d.meta_title ?? d.draft_title },
      { label: "Body", value: d.draft_body ?? "" },
      { label: "CTA", value: d.suggested_cta ?? "" },
    ];
  }
  const { data: pack, error } = await a.admin.from("longform_manual_export_packs").insert({
    business_id, export_name, export_type, export_status: "ready",
    draft_id: draft_id ?? null, sequence_id: sequence_id ?? null,
    copy_blocks, export_payload: { copy_blocks },
    cms_instructions: "Paste blocks into your CMS and publish manually.",
    newsletter_tool_instructions: "Paste blocks into your email tool and send manually.",
    validation_status: "passed", is_test_data,
  }).select().maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  if (draft_id) await a.admin.from("longform_content_drafts").update({ manual_export_status: "export_ready" }).eq("id", draft_id);
  await logAudit(a.admin, { business_id, draft_id: draft_id ?? null, sequence_id: sequence_id ?? null, export_pack_id: pack?.id, action: "manual_export_created", after_json: pack ?? {}, is_test_data });
  return json({ ok: true, pack, safety: SAFETY_FLAGS });
});