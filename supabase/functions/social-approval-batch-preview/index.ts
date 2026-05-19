import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(()=>({}));
  const business_id = body.business_id; if (!business_id) return json({ok:false,error:"business_id_required"},400);
  let q = a.admin.from("social_approval_reviews").select("*").eq("business_id", business_id).eq("review_status","pending");
  if (body.review_ids?.length) q = q.in("id", body.review_ids);
  const { data } = await q;
  const safe = (data ?? []).filter((r:any)=>r.risk_level !== "high" && r.risk_level !== "critical" && (r.approval_blockers ?? []).length === 0);
  const high = (data ?? []).filter((r:any)=>r.risk_level === "high");
  const critical = (data ?? []).filter((r:any)=>r.risk_level === "critical");
  const blocked = (data ?? []).filter((r:any)=>(r.approval_blockers ?? []).length > 0);
  return json({ ok:true, no_records_mutated:true,
    eligible_count: data?.length ?? 0, safe_count: safe.length,
    high_risk_count: high.length, critical_risk_count: critical.length,
    blocked_count: blocked.length, safe_review_ids: safe.map((r:any)=>r.id),
    requires_individual_review_ids: [...high, ...critical, ...blocked].map((r:any)=>r.id),
  });
});
