import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(()=>({}));
  const business_id = body.business_id; if (!business_id) return json({ok:false,error:"business_id_required"},400);
  const dry_run = body.dry_run !== false;
  if (!dry_run && body.confirmation_phrase !== "CREATE SOCIAL APPROVAL BATCH") return json({ok:false,error:"confirmation_required"},400);
  const review_ids: string[] = body.review_ids ?? [];
  if (!review_ids.length) return json({ok:false,error:"review_ids_required"},400);

  const { data: reviews } = await a.admin.from("social_approval_reviews").select("id, risk_level, approval_blockers").eq("business_id", business_id).in("id", review_ids);
  const high = (reviews ?? []).filter((r:any)=>r.risk_level==="high").length;
  const critical = (reviews ?? []).filter((r:any)=>r.risk_level==="critical").length;
  const blocked = (reviews ?? []).filter((r:any)=>(r.approval_blockers ?? []).length>0).length;

  if (dry_run) return json({ ok:true, dry_run:true, no_records_mutated:true, will_create: true, item_count: reviews?.length ?? 0, high, critical, blocked });

  const { data: batch, error } = await a.admin.from("social_approval_batches").insert({
    business_id, batch_name: body.batch_name ?? `Batch ${new Date().toISOString().slice(0,16)}`,
    batch_type: body.batch_type ?? "mixed", batch_status: "pending_review",
    item_count: reviews?.length ?? 0, high_risk_count: high, critical_risk_count: critical, blocked_count: blocked,
    is_test_data: !!body.is_test_data,
  }).select("id").single();
  if (error) return json({ok:false,error:error.message},500);
  const rows = (reviews ?? []).map((r:any, i:number)=>({ business_id, batch_id: batch.id, review_id: r.id, sort_order: i }));
  await a.admin.from("social_approval_batch_items").insert(rows);
  return json({ ok:true, batch_id: batch.id, items: rows.length, no_external_action:true });
});
