import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({}));
  const business_id = body.business_id; if (!business_id) return json({ ok:false, error:"business_id_required" }, 400);
  const dry_run = body.dry_run !== false;
  if (!dry_run && body.confirmation_phrase !== "SAVE SOCIAL CALENDAR GAPS") return json({ ok:false, error:"confirmation_required" }, 400);

  let q = a.admin.from("social_calendar_items").select("*").eq("business_id", business_id);
  if (body.calendar_id) q = q.eq("calendar_id", body.calendar_id);
  const { data: items } = await q;

  const gaps: any[] = [];
  const byDate: Record<string, any[]> = {};
  for (const it of items ?? []) (byDate[it.planned_date] ||= []).push(it);
  for (const [date, list] of Object.entries(byDate)) {
    const platforms = new Set(list.map((i:any)=>i.platform));
    if (list.length > 8) gaps.push({ business_id, calendar_id: body.calendar_id ?? null, gap_type:"overposting", gap_description:`${list.length} posts on ${date}`, severity:"medium", affected_date:date });
    if (list.length < 1) gaps.push({ business_id, calendar_id: body.calendar_id ?? null, gap_type:"underposting", gap_description:`No posts on ${date}`, severity:"medium", affected_date:date });
  }
  for (const it of items ?? []) {
    if ((it as any).asset_status === "missing") gaps.push({ business_id, calendar_id: body.calendar_id ?? null, gap_type:"missing_asset", gap_description:`Missing asset ${(it as any).planned_date} ${(it as any).platform}`, severity:"high", affected_date:(it as any).planned_date, affected_platform:(it as any).platform });
    if ((it as any).compliance_status === "blocked") gaps.push({ business_id, calendar_id: body.calendar_id ?? null, gap_type:"compliance_blocked", gap_description:`Compliance blocked ${(it as any).planned_date} ${(it as any).platform}`, severity:"critical", affected_date:(it as any).planned_date, affected_platform:(it as any).platform });
  }

  if (!dry_run && gaps.length) await a.admin.from("social_calendar_gap_reviews").insert(gaps);
  return json({ ok:true, dry_run, gap_count: gaps.length, gaps, no_external_action:true });
});
