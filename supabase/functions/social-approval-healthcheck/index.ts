import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const u = new URL(req.url);
  const business_id = u.searchParams.get("business_id"); if (!business_id) return json({ok:false,error:"business_id_required"},400);
  const c = async (t:string, f?:(q:any)=>any)=>{ let q:any = a.admin.from(t).select("*",{count:"exact",head:true}).eq("business_id",business_id); if (f) q=f(q); const {count}=await q; return count??0; };
  const out = {
    pending_reviews: await c("social_approval_reviews",(q)=>q.eq("review_status","pending")),
    approved_reviews: await c("social_approval_reviews",(q)=>q.eq("review_status","approved")),
    rejected_reviews: await c("social_approval_reviews",(q)=>q.eq("review_status","rejected")),
    needs_edit_reviews: await c("social_approval_reviews",(q)=>q.eq("review_status","needs_edit")),
    parked_reviews: await c("social_approval_reviews",(q)=>q.eq("review_status","parked")),
    escalated_reviews: await c("social_approval_reviews",(q)=>q.eq("review_status","escalated")),
    blocked_reviews: await c("social_approval_reviews",(q)=>q.eq("review_status","blocked")),
    high_risk_pending: await c("social_approval_reviews",(q)=>q.eq("review_status","pending").eq("risk_level","high")),
    critical_risk_pending: await c("social_approval_reviews",(q)=>q.eq("review_status","pending").eq("risk_level","critical")),
    batch_count: await c("social_approval_batches"),
    rules_count: await c("social_approval_rules",(q)=>q.eq("rule_status","active")),
    content_ready_for_queue: await c("social_content_items",(q)=>q.eq("publish_readiness","approved_internal")),
    calendar_items_ready_for_queue: await c("social_calendar_items",(q)=>q.eq("queue_readiness","ready_for_queue")),
  };
  return json({ ok:true, ...out, external_publish_enabled:false, provider_jobs_created:0, no_external_action:true });
});
