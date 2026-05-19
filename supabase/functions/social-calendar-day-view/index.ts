import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const u = new URL(req.url);
  const business_id = u.searchParams.get("business_id"); if (!business_id) return json({ok:false,error:"business_id_required"},400);
  const date = u.searchParams.get("date") ?? new Date().toISOString().slice(0,10);
  const platform = u.searchParams.get("platform");
  const calendar_id = u.searchParams.get("calendar_id");
  let q = a.admin.from("social_calendar_items").select("*").eq("business_id", business_id).eq("planned_date", date).order("planned_time");
  if (platform) q = q.eq("platform", platform);
  if (calendar_id) q = q.eq("calendar_id", calendar_id);
  const { data } = await q;
  return json({ ok:true, date, items: data ?? [] });
});
