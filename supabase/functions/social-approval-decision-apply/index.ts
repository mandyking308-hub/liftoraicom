import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(()=>({}));
  const business_id = body.business_id; if (!business_id) return json({ok:false,error:"business_id_required"},400);
  const dry_run = body.dry_run !== false;
  if (!dry_run && body.confirmation_phrase !== "APPLY SOCIAL APPROVAL DECISION") return json({ok:false,error:"confirmation_required"},400);
  const decision = body.decision; if (!decision) return json({ok:false,error:"decision_required"},400);

  const { data: r } = await a.admin.from("social_approval_reviews").select("*").eq("id", body.review_id).eq("business_id", business_id).maybeSingle();
  if (!r) return json({ok:false,error:"review_not_found"},404);

  const compliance_blocked = r.compliance_status === "blocked";
  const rights_blocked = r.rights_status === "blocked" || r.asset_status === "rights_review_required";
  const asset_blocked = r.asset_status === "blocked" || r.asset_status === "missing";
  const critical = r.risk_level === "critical";

  if (decision === "approve") {
    if (compliance_blocked || rights_blocked || asset_blocked) return json({ok:false,error:"approval_blocked", blockers: r.approval_blockers},409);
    if (critical && body.high_risk_phrase !== "APPROVE HIGH RISK SOCIAL ITEM") return json({ok:false,error:"high_risk_override_required"},409);
  }

  const next = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : decision === "needs_edit" ? "needs_edit" : decision === "park" ? "parked" : decision === "escalate" ? "escalated" : decision === "block" ? "blocked" : r.review_status;

  if (dry_run) return json({ ok:true, dry_run:true, no_records_mutated:true, would_set: next });

  const now = new Date().toISOString();
  const decided_by = (a.user?.email ?? a.user?.id) ?? "founder";
  await a.admin.from("social_approval_reviews").update({
    review_status: next, decided_at: now, decision_by: decided_by,
    founder_notes: body.founder_notes ?? r.founder_notes,
    edit_request: body.edit_request ?? r.edit_request,
  }).eq("id", r.id);

  await a.admin.from("social_approval_decisions").insert({
    business_id, review_id: r.id, decision,
    decision_reason: body.decision_reason ?? null,
    founder_notes: body.founder_notes ?? null,
    before_json: { review_status: r.review_status },
    after_json: { review_status: next },
    decided_by, is_test_data: !!r.is_test_data,
  });

  // Apply to linked object
  if (decision === "approve") {
    if (r.content_item_id) await a.admin.from("social_content_items").update({ publish_readiness: "approved_internal", approval_decision_at: now, approval_decision_by: decided_by, ready_for_queue_at: now }).eq("id", r.content_item_id);
    if (r.calendar_item_id) await a.admin.from("social_calendar_items").update({ approval_status: "approved", queue_readiness: "ready_for_queue", approval_decision_at: now, ready_for_queue_at: now }).eq("id", r.calendar_item_id);
    if (r.content_pack_id) await a.admin.from("social_content_packs").update({ approval_decision_at: now }).eq("id", r.content_pack_id);
  } else if (decision === "reject") {
    if (r.content_item_id) await a.admin.from("social_content_items").update({ publish_readiness: "rejected", approval_decision_at: now }).eq("id", r.content_item_id);
    if (r.calendar_item_id) await a.admin.from("social_calendar_items").update({ approval_status: "rejected", approval_decision_at: now }).eq("id", r.calendar_item_id);
  } else if (decision === "needs_edit") {
    if (r.content_item_id) await a.admin.from("social_content_items").update({ publish_readiness: "needs_review" }).eq("id", r.content_item_id);
    if (r.calendar_item_id) await a.admin.from("social_calendar_items").update({ approval_status: "needs_review", status: "needs_review" }).eq("id", r.calendar_item_id);
  }

  return json({ ok:true, review_status: next, no_external_action: true, no_publish_job_created: true });
});
