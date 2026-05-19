import { corsHeaders, json, requireFounder, logAudit, SAFETY_FLAGS } from "../_shared/longformContentLogic.ts";
const PHRASE = "CREATE LONGFORM REPURPOSING MAP";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, source_draft_id, target_outputs = [], map_name, create_social_drafts = false, dry_run = true, confirmation_phrase, is_test_data = false } = body;
  if (!business_id || !source_draft_id || !map_name) return json({ ok: false, error: "missing_fields" }, 400);
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, phrase_required: PHRASE, no_records_mutated: true, safety: SAFETY_FLAGS });
  }
  const plan = (target_outputs as string[]).map((t) => ({ target: t, status: "draft", approval_required: true }));
  const { data: map, error } = await a.admin.from("longform_repurposing_maps").insert({
    business_id, source_draft_id, map_name, target_outputs, repurposing_plan: plan, is_test_data,
  }).select().maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  await logAudit(a.admin, { business_id, repurposing_map_id: map?.id, draft_id: source_draft_id, action: "repurposing_map_created", after_json: map ?? {}, is_test_data });
  return json({ ok: true, map, social_drafts_created: 0, social_drafts_requested: create_social_drafts, safety: SAFETY_FLAGS });
});