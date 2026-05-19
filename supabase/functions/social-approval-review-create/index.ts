import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(()=>({}));
  const business_id = body.business_id; if (!business_id) return json({ok:false,error:"business_id_required"},400);
  const dry_run = body.dry_run !== false;
  if (!dry_run && body.confirmation_phrase !== "CREATE SOCIAL APPROVAL REVIEWS") return json({ok:false,error:"confirmation_required"},400);
  const review_type = body.review_type ?? "content_item";

  const proposed: any[] = [];
  if (review_type === "content_item") {
    let q = a.admin.from("social_content_items").select("id, title, hook, platform, asset_readiness_status, compliance_status").eq("business_id", business_id).is("founder_approval_review_id", null).limit(100);
    if (body.source_ids?.length) q = q.in("id", body.source_ids);
    const { data } = await q;
    for (const c of data ?? []) {
      const blockers: string[] = [];
      if (c.asset_readiness_status === "missing") blockers.push("missing_asset");
      if (c.asset_readiness_status === "rights_review_required") blockers.push("rights_review_required");
      if (c.compliance_status === "blocked") blockers.push("compliance_blocked");
      proposed.push({
        business_id, review_type, review_status: blockers.length ? "blocked" : "pending",
        priority: blockers.includes("compliance_blocked") ? "critical" : "normal",
        title: c.title ?? c.hook ?? `Content ${c.id.slice(0,8)}`,
        content_item_id: c.id, asset_status: c.asset_readiness_status ?? "unknown",
        compliance_status: c.compliance_status ?? "not_reviewed",
        approval_blockers: blockers,
        risk_level: blockers.includes("compliance_blocked") ? "critical" : (blockers.length ? "high" : "low"),
        recommended_decision: blockers.length ? "block" : "approve",
        is_test_data: !!body.is_test_data,
      });
    }
  } else if (review_type === "calendar_item") {
    let q = a.admin.from("social_calendar_items").select("id, calendar_id, planned_date, platform, status, asset_status, compliance_status").eq("business_id", business_id).is("founder_approval_review_id", null).limit(200);
    if (body.source_ids?.length) q = q.in("id", body.source_ids);
    const { data } = await q;
    for (const c of data ?? []) {
      const blockers: string[] = [];
      if (c.asset_status === "missing") blockers.push("missing_asset");
      if (c.asset_status === "rights_review_required") blockers.push("rights_review_required");
      if (c.compliance_status === "blocked") blockers.push("compliance_blocked");
      if (c.status === "blocked") blockers.push("status_blocked");
      proposed.push({
        business_id, review_type, review_status: blockers.length ? "blocked" : "pending",
        priority: blockers.includes("compliance_blocked") ? "critical" : "normal",
        title: `${c.platform} ${c.planned_date}`,
        calendar_item_id: c.id, calendar_id: c.calendar_id,
        asset_status: c.asset_status ?? "unknown",
        compliance_status: c.compliance_status ?? "not_reviewed",
        approval_blockers: blockers,
        risk_level: blockers.includes("compliance_blocked") ? "critical" : (blockers.length ? "high" : "low"),
        recommended_decision: blockers.length ? "block" : "approve",
        is_test_data: !!body.is_test_data,
      });
    }
  } else if (review_type === "content_pack") {
    const { data } = await a.admin.from("social_content_packs").select("id, pack_name").eq("business_id", business_id).is("founder_approval_review_id", null).limit(100);
    for (const c of data ?? []) proposed.push({ business_id, review_type, title: c.pack_name, content_pack_id: c.id, is_test_data: !!body.is_test_data });
  }

  if (dry_run) return json({ ok:true, dry_run:true, no_records_mutated:true, proposed_count: proposed.length, proposed: proposed.slice(0,20) });

  const { data: inserted, error } = await a.admin.from("social_approval_reviews").insert(proposed).select("id, content_item_id, calendar_item_id, content_pack_id");
  if (error) return json({ok:false,error:error.message},500);

  // Link back to source
  for (const r of inserted ?? []) {
    if (r.content_item_id) await a.admin.from("social_content_items").update({ founder_approval_review_id: r.id }).eq("id", r.content_item_id);
    if (r.calendar_item_id) await a.admin.from("social_calendar_items").update({ founder_approval_review_id: r.id }).eq("id", r.calendar_item_id);
    if (r.content_pack_id) await a.admin.from("social_content_packs").update({ founder_approval_review_id: r.id }).eq("id", r.content_pack_id);
  }
  return json({ ok:true, created: inserted?.length ?? 0, no_external_action:true });
});
