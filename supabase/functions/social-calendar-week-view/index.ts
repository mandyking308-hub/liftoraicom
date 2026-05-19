import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const u = new URL(req.url);
  const business_id = u.searchParams.get("business_id"); if (!business_id) return json({ok:false,error:"business_id_required"},400);
  const wk = u.searchParams.get("week_start") ?? new Date().toISOString().slice(0,10);
  const end = new Date(wk+"T00:00:00Z"); end.setUTCDate(end.getUTCDate()+6);
  const calendar_id = u.searchParams.get("calendar_id");
  const platform = u.searchParams.get("platform");
  let q = a.admin.from("social_calendar_items").select("*").eq("business_id", business_id)
    .gte("planned_date", wk).lte("planned_date", end.toISOString().slice(0,10)).order("planned_date").order("planned_time");
  if (platform) q = q.eq("platform", platform);
  if (calendar_id) q = q.eq("calendar_id", calendar_id);
  const { data } = await q;
  const by_day: Record<string, any[]> = {};
  for (const it of data ?? []) (by_day[it.planned_date] ||= []).push(it);
  return json({ ok:true, week_start: wk, week_end: end.toISOString().slice(0,10), by_day, items: data ?? [] });
});
