import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { generateCalendarItems, daysForType, DEFAULT_PLATFORMS, addDays, isoDate } from "../_shared/socialCalendarLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({}));
  const business_id = body.business_id; if (!business_id) return json({ ok:false, error:"business_id_required" }, 400);
  const dry_run = body.dry_run !== false;
  if (!dry_run && body.confirmation_phrase !== "CREATE SOCIAL CALENDAR") return json({ ok:false, error:"confirmation_required" }, 400);

  const calendar_type = body.calendar_type ?? "thirty_day";
  const days_count = body.days_count ?? daysForType(calendar_type, 30);
  const start_date = body.start_date ?? new Date().toISOString().slice(0,10);
  const end_date = isoDate(addDays(new Date(start_date+"T00:00:00Z"), days_count-1));
  const platforms = body.platforms?.length ? body.platforms : DEFAULT_PLATFORMS;
  const calendar_name = body.calendar_name ?? `Calendar ${start_date} (${calendar_type})`;

  const { data: biz } = await a.admin.from("businesses").select("name").eq("id", business_id).maybeSingle();
  const { data: cadence } = await a.admin.from("social_calendar_cadence_rules")
    .select("platform, preferred_times, preferred_days, posts_per_day")
    .eq("business_id", business_id).eq("rule_status","active");
  let q = a.admin.from("social_content_items")
    .select("id, platform, asset_readiness_status, compliance_status, publish_readiness")
    .eq("business_id", business_id).limit(500);
  if (body.content_pack_id) q = q.eq("content_pack_id", body.content_pack_id);
  const { data: items } = await q;

  const out = generateCalendarItems({
    start_date, days_count, platforms,
    cadence_rules: (cadence ?? []).map((r:any)=>({ platform:r.platform, preferred_times:(r.preferred_times??[]).map((t:any)=>String(t).slice(0,5)), preferred_days:r.preferred_days, posts_per_day:r.posts_per_day })),
    content_items: items ?? [],
    businessNameLower: (biz?.name ?? "").toLowerCase(),
  });

  if (dry_run) {
    return json({ ok:true, dry_run:true, no_records_mutated:true, proposed:out });
  }

  const { data: cal, error: ce } = await a.admin.from("social_calendars").insert({
    business_id, calendar_name, calendar_type, start_date, end_date,
    platforms, content_pack_id: body.content_pack_id ?? null,
    campaign_plan_id: body.campaign_plan_id ?? null,
    revenue_strategy_id: body.revenue_strategy_id ?? null,
    readiness_score: out.readiness_score, missing_assets: out.missing_assets,
    compliance_warnings: out.compliance_warnings,
    is_test_data: !!body.is_test_data,
  }).select("id").single();
  if (ce) return json({ ok:false, error: ce.message }, 500);

  const rows = out.items.map((it)=>({
    business_id, calendar_id: cal.id,
    content_item_id: it.content_item_id, asset_id: it.asset_id,
    platform: it.platform, planned_date: it.planned_date, planned_time: it.planned_time,
    day_number: it.day_number, week_number: it.week_number, slot_label: it.slot_label,
    status: it.status, approval_status: it.approval_status, asset_status: it.asset_status,
    compliance_status: it.compliance_status, queue_readiness: it.queue_readiness,
    block_reason: it.block_reason, notes: it.notes,
    content_pack_id: body.content_pack_id ?? null,
    campaign_plan_id: body.campaign_plan_id ?? null,
    is_test_data: !!body.is_test_data,
  }));
  const { error: ie, count } = await a.admin.from("social_calendar_items").insert(rows, { count: "exact" });
  if (ie) return json({ ok:false, error: ie.message }, 500);

  const blocked = rows.filter((r)=>r.status==="blocked").length;
  await a.admin.from("social_calendar_generation_runs").insert({
    business_id, run_type:"calendar_create", run_status:"saved",
    requested_start_date:start_date, requested_end_date:end_date, requested_days:days_count,
    requested_platforms:platforms, source_pack_id: body.content_pack_id ?? null,
    source_campaign_id: body.campaign_plan_id ?? null,
    source_revenue_strategy_id: body.revenue_strategy_id ?? null,
    generated_calendar_id: cal.id,
    proposed_items_count: rows.length, saved_items_count: count ?? rows.length,
    blocked_items_count: blocked,
    missing_assets: out.missing_assets, compliance_warnings: out.compliance_warnings,
    confidence_score: out.readiness_score,
    is_test_data: !!body.is_test_data,
  });

  if (body.content_pack_id) {
    await a.admin.from("social_content_packs").update({
      calendar_id: cal.id, calendar_generation_status: "generated"
    }).eq("id", body.content_pack_id);
  }

  return json({ ok:true, calendar_id: cal.id, saved_items: count ?? rows.length, blocked_items: blocked, no_external_action:true });
});
