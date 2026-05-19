import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { operatorChecklist } from "../_shared/socialSchedulerBridge.ts";
const PHRASE = "CREATE SOCIAL OPERATOR PACK";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, export_batch_id, assigned_to, dry_run = true, confirmation_phrase, is_test_data = false } = body;
  if (!business_id || !export_batch_id) return json({ ok: false, error: "missing_fields" }, 400);
  const { data: batch } = await a.admin.from("social_manual_export_batches").select("*").eq("id", export_batch_id).maybeSingle();
  if (!batch) return json({ ok: false, error: "batch_not_found" }, 404);
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, phrase_required: PHRASE, checklist: operatorChecklist(), no_records_mutated: true });
  }
  const { data: task, error } = await a.admin.from("social_operator_scheduling_tasks").insert({
    business_id, export_batch_id, task_title: `Manually schedule: ${batch.export_name}`,
    task_status: "open", assigned_to: assigned_to ?? null,
    instructions: "Open scheduler, upload media, paste caption, schedule, then mark as manually scheduled in Liftor.",
    checklist: operatorChecklist(), is_test_data,
  }).select().maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  await a.admin.from("social_manual_export_batches").update({ manual_scheduling_status: "ready_for_operator" }).eq("id", export_batch_id);
  await a.admin.from("social_scheduler_export_audit").insert({
    business_id, export_batch_id, action: "manual_scheduling_task_created", action_status: "recorded",
    after_json: task ?? {}, provider_calls: 0,
  });
  return json({ ok: true, task, no_external_action: true });
});
