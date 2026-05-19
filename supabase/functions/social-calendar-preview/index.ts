import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { generateCalendarItems, daysForType, DEFAULT_PLATFORMS } from "../_shared/socialCalendarLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({}));
  const business_id = body.business_id; if (!business_id) return json({ ok:false, error:"business_id_required" }, 400);
  const calendar_type = body.calendar_type ?? "thirty_day";
  const days_count = body.days_count ?? daysForType(calendar_type, 30);
  const start_date = body.start_date ?? new Date().toISOString().slice(0,10);
  const platforms = body.platforms?.length ? body.platforms : DEFAULT_PLATFORMS;

  const { data: biz } = await a.admin.from("businesses").select("name").eq("id", business_id).maybeSingle();
  const { data: cadence } = await a.admin.from("social_calendar_cadence_rules")
    .select("platform, preferred_times, preferred_days, posts_per_day")
    .eq("business_id", business_id).eq("rule_status","active");

  let q = a.admin.from("social_content_items")
    .select("id, platform, asset_readiness_status, compliance_status, publish_readiness, hook, title")
    .eq("business_id", business_id).limit(500);
  if (body.content_pack_id) q = q.eq("content_pack_id", body.content_pack_id);
  const { data: items } = await q;

  const out = generateCalendarItems({
    start_date, days_count, platforms,
    cadence_rules: (cadence ?? []).map((r:any)=>({ platform:r.platform, preferred_times: (r.preferred_times ?? []).map((t:any)=>String(t).slice(0,5)), preferred_days:r.preferred_days, posts_per_day:r.posts_per_day })),
    content_items: items ?? [],
    businessNameLower: (biz?.name ?? "").toLowerCase(),
  });
  return json({ ok:true, no_records_mutated:true, no_external_action:true, calendar:{calendar_type,start_date,days_count,platforms}, ...out, proposed_count: out.items.length });
});
