import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({}));
  const business_id = body.business_id; if (!business_id) return json({ ok:false, error:"business_id_required" }, 400);
  if (body.confirmation_phrase !== "PURGE SOCIAL CALENDAR TEST DATA") return json({ ok:false, error:"confirmation_required" }, 400);
  const tables = ["social_calendar_gap_reviews","social_calendar_items","social_calendar_generation_runs","social_calendar_cadence_rules","social_calendars"];
  const results: Record<string, number> = {};
  for (const t of tables) {
    const { count } = await a.admin.from(t).delete({ count: "exact" }).eq("business_id", business_id).eq("is_test_data", true);
    results[t] = count ?? 0;
  }
  return json({ ok:true, deleted: results, no_real_data_deleted: true });
});
