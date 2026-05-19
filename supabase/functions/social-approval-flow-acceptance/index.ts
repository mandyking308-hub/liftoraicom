import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const checks: Array<{name:string;pass:boolean;detail?:string}> = [];
  const tables = ["social_approval_reviews","social_approval_decisions","social_approval_batches","social_approval_batch_items","social_approval_rules"];
  for (const t of tables) {
    const { error } = await a.admin.from(t).select("id",{head:true,count:"exact"}).limit(1);
    checks.push({ name:`table_${t}`, pass:!error, detail:error?.message });
  }
  const ext = [
    ["social_content_items","founder_approval_review_id, approval_decision_at, approval_blockers, ready_for_queue_at"],
    ["social_content_variants","founder_approval_review_id, approval_decision_at, approval_blockers, ready_for_queue_at"],
    ["social_content_packs","founder_approval_review_id, approval_decision_at, approval_blockers"],
    ["social_calendar_items","founder_approval_review_id, approval_decision_at, approval_blockers, ready_for_queue_at"],
    ["social_calendars","founder_approval_review_id, approval_decision_at, approval_blockers"],
  ];
  for (const [t, cols] of ext) {
    const { error } = await a.admin.from(t).select(cols,{head:true}).limit(1);
    checks.push({ name:`${t}_extended`, pass:!error, detail:error?.message });
  }
  const failed = checks.filter((c)=>!c.pass);
  return json({ ok:true, status: failed.length===0?"PASS":"BLOCKED", checks, blockers: failed,
    no_forbidden_action_audit:{ external_publish:false, external_scheduling:false, provider_jobs_created:0, provider_api:false, dm_send:false, comments_sent:false, apollo:false, smartlead_post:false, email_send:false, auto_send:false, cron:false, external_scheduled_jobs:false, high_risk_bulk_approval:false, blocked_rights_approved:false, blocked_compliance_approved:false, real_data_deletion:false, secrets_exposed:false }
  });
});
