import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(()=>({}));
  const business_id = body.business_id; if (!business_id) return json({ok:false,error:"business_id_required"},400);

  const include_blocked = body.include_blocked !== false;
  let q = a.admin.from("social_approval_reviews").select("*").eq("business_id", business_id);
  if (body.review_type) q = q.eq("review_type", body.review_type);
  if (body.priority) q = q.eq("priority", body.priority);
  const statuses = include_blocked ? ["pending","needs_edit","escalated","blocked","parked"] : ["pending","needs_edit","escalated","parked"];
  q = q.in("review_status", statuses).order("created_at", { ascending: false }).limit(500);
  const { data: reviews } = await q;

  const pending_content = await a.admin.from("social_content_items").select("id, title, hook, platform, asset_readiness_status, compliance_status, publish_readiness", { count: "exact" })
    .eq("business_id", business_id).is("founder_approval_review_id", null).neq("publish_readiness","approved_internal").limit(100);
  const pending_calendar = await a.admin.from("social_calendar_items").select("id, planned_date, planned_time, platform, status, asset_status, compliance_status", { count: "exact" })
    .eq("business_id", business_id).is("founder_approval_review_id", null).in("status",["planned","needs_review","needs_asset","needs_content","blocked"]).limit(200);

  return json({ ok:true, no_records_mutated:true, no_external_action:true,
    reviews: reviews ?? [],
    pending_content: pending_content.data ?? [],
    pending_calendar: pending_calendar.data ?? [],
    counts: { reviews: reviews?.length ?? 0, content_unreviewed: pending_content.count ?? 0, calendar_unreviewed: pending_calendar.count ?? 0 },
  });
});
