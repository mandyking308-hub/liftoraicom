import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const checks: Array<{name:string;pass:boolean;detail?:string}> = [];
  const tables = ["social_calendars","social_calendar_items","social_calendar_generation_runs","social_calendar_cadence_rules","social_calendar_gap_reviews"];
  for (const t of tables) {
    const { error } = await a.admin.from(t).select("id", { head: true, count: "exact" }).limit(1);
    checks.push({ name:`table_${t}`, pass: !error, detail: error?.message });
  }
  const { error: ext1 } = await a.admin.from("social_content_items").select("calendar_id, calendar_item_id, planned_at, calendar_status", { head: true }).limit(1);
  checks.push({ name:"social_content_items_extended", pass: !ext1, detail: ext1?.message });
  const { error: ext2 } = await a.admin.from("social_content_packs").select("calendar_id, calendar_generation_status", { head: true }).limit(1);
  checks.push({ name:"social_content_packs_extended", pass: !ext2, detail: ext2?.message });
  const failed = checks.filter(c=>!c.pass);
  return json({ ok:true, status: failed.length===0 ? "PASS":"BLOCKED", checks, blockers: failed,
    no_forbidden_action_audit:{ external_publish:false, external_scheduling:false, metricool:false, dm_send:false, comments_sent:false, apollo:false, smartlead_post:false, email_send:false, auto_send:false, cron:false, real_data_deletion:false, secrets_exposed:false },
  });
});
