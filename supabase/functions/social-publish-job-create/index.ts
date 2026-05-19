import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { evaluateContentItem, evaluateCalendarItem, buildJobIdempotencyKey, type EligibilityCheck } from "../_shared/socialPublishLogic.ts";

const PHRASE = "CREATE SOCIAL PUBLISH JOBS";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, calendar_item_ids, content_item_ids, dry_run = true, confirmation_phrase, is_test_data = false } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);

  const evals: EligibilityCheck[] = [];
  if (content_item_ids?.length) {
    const { data } = await a.admin.from("social_content_items").select("*").eq("business_id", business_id).in("id", content_item_ids);
    (data || []).forEach((r: any) => evals.push(evaluateContentItem(r)));
  }
  if (calendar_item_ids?.length) {
    const { data } = await a.admin.from("social_calendar_items").select("*, content_item:social_content_items(*)").eq("business_id", business_id).in("id", calendar_item_ids);
    (data || []).forEach((r: any) => evals.push(evaluateCalendarItem(r, r.content_item)));
  }

  const eligible = evals.filter((e) => e.eligible);
  const blocked = evals.filter((e) => !e.eligible);

  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, would_create: eligible.length, blocked: blocked.length, eligible, blocked_items: blocked, phrase_required: PHRASE, no_records_mutated: true });
  }

  const created: any[] = []; const skipped: any[] = [];
  for (const e of eligible) {
    const idem = buildJobIdempotencyKey(e);
    const { data: existing } = await a.admin.from("social_publish_jobs").select("id").eq("idempotency_key", idem).maybeSingle();
    if (existing) { skipped.push({ idempotency_key: idem, existing_id: existing.id }); continue; }
    const insert = {
      business_id, content_item_id: e.content_item_id, calendar_item_id: e.calendar_item_id,
      content_variant_id: e.content_variant_id, campaign_plan_id: e.campaign_plan_id, content_pack_id: e.content_pack_id,
      approval_review_id: e.approval_review_id, provider: e.provider || "manual", platform: e.platform || "unknown",
      job_type: e.job_type, scheduled_for: e.scheduled_for, status: "provider_locked",
      execution_gate_status: "locked", execution_attempt_allowed: false, external_execution_attempted: false,
      manual_export_status: "not_exported", founder_final_approval_required: true,
      idempotency_key: idem, provider_capability_required: e.provider_capability_required,
      publish_payload: { source: e.source, source_id: e.source_id }, is_test_data,
    };
    const { data: ins, error } = await a.admin.from("social_publish_jobs").insert(insert).select().maybeSingle();
    if (error) { skipped.push({ idempotency_key: idem, error: error.message }); continue; }
    created.push(ins);
    await a.admin.from("social_publish_queue_audit").insert({
      business_id, publish_job_id: ins?.id, action: "job_created", action_status: "recorded",
      provider: e.provider, platform: e.platform, after_json: ins ?? {}, is_test_data,
    });
  }
  for (const b of blocked) {
    await a.admin.from("social_publish_queue_audit").insert({
      business_id, action: "job_blocked", action_status: "recorded",
      provider: b.provider, platform: b.platform, result_json: { blockers: b.blockers, source_id: b.source_id }, is_test_data,
    });
  }

  return json({ ok: true, created_count: created.length, skipped_count: skipped.length, blocked_count: blocked.length, created, skipped, blocked_items: blocked, no_provider_call: true });
});