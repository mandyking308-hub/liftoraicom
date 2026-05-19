import { corsHeaders, json, requireFounder, SAFETY_FLAGS } from "../_shared/longformContentLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, source_draft_id, target_outputs = [] } = body;
  if (!business_id || !source_draft_id) return json({ ok: false, error: "missing_fields" }, 400);
  const { data: src } = await a.admin.from("longform_content_drafts").select("id,draft_title,draft_type,excerpt").eq("id", source_draft_id).eq("business_id", business_id).maybeSingle();
  if (!src) return json({ ok: false, error: "source_draft_not_found" }, 404);
  const plan = (target_outputs as string[]).map((out) => ({
    target: out,
    suggestion: out === "blog" ? `Long-form rewrite of "${src.draft_title}"` :
                out === "newsletter" ? `Newsletter snippet derived from "${src.draft_title}"` :
                out === "lead_magnet" ? `Lead magnet upgrade based on "${src.draft_title}"` :
                `Short social post derived from "${src.draft_title}"`,
    approval_required: true,
  }));
  return json({ ok: true, no_records_mutated: true, source: src, repurposing_plan: plan, approval_required: true, safety: SAFETY_FLAGS });
});