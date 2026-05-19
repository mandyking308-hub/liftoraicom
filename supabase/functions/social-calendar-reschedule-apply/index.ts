import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({}));
  const business_id = body.business_id; if (!business_id) return json({ ok:false, error:"business_id_required" }, 400);
  const dry_run = body.dry_run !== false;
  if (!dry_run && body.confirmation_phrase !== "APPLY SOCIAL CALENDAR RESCHEDULE") return json({ ok:false, error:"confirmation_required" }, 400);
  const updates = body.reschedule_payload ?? [];
  if (dry_run) return json({ ok:true, dry_run:true, no_records_mutated:true, would_update: updates.length });
  let updated = 0;
  for (const u of updates) {
    const patch: any = {};
    if (u.planned_date) patch.planned_date = u.planned_date;
    if (u.planned_time) patch.planned_time = u.planned_time;
    if (!Object.keys(patch).length) continue;
    const { error } = await a.admin.from("social_calendar_items").update(patch).eq("id", u.id).eq("business_id", business_id);
    if (!error) updated++;
  }
  return json({ ok:true, updated, no_external_action:true });
});
