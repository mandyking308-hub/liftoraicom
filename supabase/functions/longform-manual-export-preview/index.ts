import { corsHeaders, json, requireFounder, SAFETY_FLAGS } from "../_shared/longformContentLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, draft_id, sequence_id, export_type = "manual_copy_pack" } = body;
  if (!business_id || (!draft_id && !sequence_id)) return json({ ok: false, error: "draft_id_or_sequence_id_required" }, 400);
  let copy_blocks: any[] = [];
  let warnings: string[] = [];
  if (draft_id) {
    const { data: d } = await a.admin.from("longform_content_drafts").select("*").eq("id", draft_id).eq("business_id", business_id).maybeSingle();
    if (!d) return json({ ok: false, error: "draft_not_found" }, 404);
    copy_blocks = [
      { label: "Title", value: d.draft_title },
      { label: "Meta title", value: d.meta_title ?? d.draft_title },
      { label: "Meta description", value: d.meta_description ?? d.excerpt ?? "" },
      { label: "Slug", value: d.suggested_slug ?? "" },
      { label: "Body", value: d.draft_body ?? "[Body not yet written]" },
      { label: "CTA", value: d.suggested_cta ?? "[Add CTA before publishing]" },
    ];
    if ((d.unsupported_claims ?? []).length) warnings.push(`${(d.unsupported_claims ?? []).length} unsupported claim(s) — verify before publishing.`);
    if ((d.proof_placeholders ?? []).length) warnings.push("Proof placeholders present — replace with real proof.");
  } else if (sequence_id) {
    const { data: s } = await a.admin.from("newsletter_sequence_plans").select("*").eq("id", sequence_id).eq("business_id", business_id).maybeSingle();
    if (!s) return json({ ok: false, error: "sequence_not_found" }, 404);
    copy_blocks = (s.sequence_outline ?? []).map((o:any, i:number) => ({ label: `Email ${o.index ?? i+1} subject`, value: o.subject_idea ?? "" }));
  }
  return json({
    ok: true, no_records_mutated: true, export_type, copy_blocks,
    cms_instructions: ["Open your CMS","Paste title, meta, slug, and body","Replace any [PLACEHOLDER] with real content","Publish manually"],
    newsletter_tool_instructions: ["Open your email tool","Create campaign or sequence","Paste subject + body per email","Configure schedule + sender info","Send manually"],
    validation_warnings: warnings,
    safety: SAFETY_FLAGS,
  });
});