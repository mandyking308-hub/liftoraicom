import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({}));
  const business_id = body.business_id; if (!business_id) return json({ ok:false, error:"business_id_required" }, 400);
  const calendar_id = body.calendar_id; if (!calendar_id) return json({ ok:false, error:"calendar_id_required" }, 400);
  let q = a.admin.from("social_calendar_items").select("id, planned_date, planned_time, platform, status").eq("business_id", business_id).eq("calendar_id", calendar_id);
  if (body.item_ids?.length) q = q.in("id", body.item_ids);
  const { data } = await q;
  const shift = body.shift_days ?? 0;
  const proposed = (data ?? []).map((it:any)=>{
    const d = new Date(it.planned_date+"T00:00:00Z"); d.setUTCDate(d.getUTCDate()+shift);
    return { id: it.id, from: it.planned_date, to: d.toISOString().slice(0,10), time: it.planned_time, platform: it.platform };
  });
  return json({ ok:true, no_records_mutated:true, proposed, count: proposed.length });
});
