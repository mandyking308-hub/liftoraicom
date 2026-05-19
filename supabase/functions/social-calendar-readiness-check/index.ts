import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({}));
  const business_id = body.business_id; if (!business_id) return json({ ok:false, error:"business_id_required" }, 400);
  const dry_run = body.dry_run !== false;
  if (!dry_run && body.confirmation_phrase !== "SAVE SOCIAL CALENDAR READINESS REVIEW") return json({ ok:false, error:"confirmation_required" }, 400);

  let q = a.admin.from("social_calendar_items").select("status, approval_status, asset_status, compliance_status, queue_readiness, planned_date, platform, block_reason").eq("business_id", business_id);
  if (body.calendar_id) q = q.eq("calendar_id", body.calendar_id);
  const { data: items } = await q;
  const total = (items ?? []).length || 1;
  const blocked = (items ?? []).filter((i:any)=>i.status==="blocked").length;
  const needs_review = (items ?? []).filter((i:any)=>i.status==="needs_review" || i.approval_status==="needs_review").length;
  const missing_assets = (items ?? []).filter((i:any)=>i.asset_status==="missing").length;
  const compliance_blocked = (items ?? []).filter((i:any)=>i.compliance_status==="blocked").length;
  const queue_ready = (items ?? []).filter((i:any)=>i.queue_readiness==="ready_for_review"||i.queue_readiness==="ready_for_queue").length;
  const readiness_score = Math.round(((total - blocked - missing_assets - compliance_blocked) / total) * 100);

  if (!dry_run && body.calendar_id) {
    const gaps: any[] = [];
    if (missing_assets) gaps.push({ business_id, calendar_id: body.calendar_id, gap_type:"missing_asset", gap_description:`${missing_assets} slots missing assets`, severity:"high" });
    if (compliance_blocked) gaps.push({ business_id, calendar_id: body.calendar_id, gap_type:"compliance_blocked", gap_description:`${compliance_blocked} slots compliance-blocked`, severity:"critical" });
    if (gaps.length) await a.admin.from("social_calendar_gap_reviews").insert(gaps);
  }

  return json({ ok:true, dry_run, readiness_score, total_items: items?.length ?? 0,
    blocked, needs_review, missing_assets, compliance_blocked, queue_ready,
    next_actions: [
      missing_assets ? "Add missing assets" : null,
      compliance_blocked ? "Resolve compliance blockers" : null,
      needs_review ? "Run founder approval" : null,
    ].filter(Boolean),
    no_external_action:true });
});
