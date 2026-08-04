import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { autoDispatchApprovedBatch } from "../_shared/socialDistributionAuto.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(()=>({}));
  const business_id = body.business_id; if (!business_id) return json({ok:false,error:"business_id_required"},400);
  const dry_run = body.dry_run !== false;
  if (!dry_run && body.confirmation_phrase !== "APPLY SOCIAL BATCH APPROVAL") return json({ok:false,error:"confirmation_required"},400);
  const decision = body.decision ?? "approve";
  if (!["approve","reject","needs_edit","park"].includes(decision)) return json({ok:false,error:"decision_invalid"},400);

  const { data: items } = await a.admin.from("social_approval_batch_items").select("review_id").eq("batch_id", body.batch_id).eq("business_id", business_id);
  const ids = (items ?? []).map((i:any)=>i.review_id);
  const { data: reviews } = await a.admin.from("social_approval_reviews").select("*").in("id", ids);
  const safe = (reviews ?? []).filter((r:any)=>r.risk_level !== "high" && r.risk_level !== "critical" && (r.approval_blockers ?? []).length === 0);
  const excluded_ids = (reviews ?? []).filter((r:any)=>r.risk_level === "high" || r.risk_level === "critical" || (r.approval_blockers ?? []).length > 0).map((r:any)=>r.id);

  if (dry_run) return json({ ok:true, dry_run:true, no_records_mutated:true, would_apply_to: safe.length, excluded_for_individual_review: excluded_ids.length });

  const now = new Date().toISOString();
  const decided_by = (a.user?.email ?? a.user?.id) ?? "founder";
  let applied = 0;
  for (const r of safe) {
    const next = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : decision === "needs_edit" ? "needs_edit" : "parked";
    await a.admin.from("social_approval_reviews").update({ review_status: next, decided_at: now, decision_by: decided_by }).eq("id", r.id);
    await a.admin.from("social_approval_decisions").insert({ business_id, review_id: r.id, decision, decided_by, before_json:{review_status:r.review_status}, after_json:{review_status:next}, decision_reason:"batch" });
    if (decision === "approve") {
      if (r.content_item_id) await a.admin.from("social_content_items").update({ publish_readiness:"approved_internal", approval_decision_at: now, approval_decision_by: decided_by, ready_for_queue_at: now }).eq("id", r.content_item_id);
      if (r.calendar_item_id) await a.admin.from("social_calendar_items").update({ approval_status:"approved", queue_readiness:"ready_for_queue", approval_decision_at: now, ready_for_queue_at: now }).eq("id", r.calendar_item_id);
    }
    applied++;
  }
  await a.admin.from("social_approval_batches").update({ batch_status: applied === reviews?.length ? "approved_internal" : "partially_approved", approved_count: applied }).eq("id", body.batch_id);

  // Approval-driven autopilot: the founder's batch approval is the
  // authorisation event. Runs server-side, reuses every distribution check.
  let auto_dispatch: unknown = { attempted: false, reason: "not_an_approval" };
  if (decision === "approve" && applied > 0) {
    auto_dispatch = await autoDispatchApprovedBatch(a.admin, {
      business_id,
      batch_id: body.batch_id,
      review_ids: safe.map((r: any) => r.id),
    });
  }

  return json({ ok:true, applied, excluded_for_individual_review: excluded_ids.length, auto_dispatch, no_publish_job_created:true });
});
