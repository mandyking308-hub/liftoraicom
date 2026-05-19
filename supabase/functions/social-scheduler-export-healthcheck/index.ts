import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id } = body;
  const filt = (q: any) => business_id ? q.eq("business_id", business_id) : q;
  const [batches, rows, tasks, audit] = await Promise.all([
    filt(a.admin.from("social_manual_export_batches").select("id,export_status,manual_scheduling_status,validation_status,blocked_rows,row_count")).limit(2000),
    filt(a.admin.from("social_scheduler_export_rows").select("id,row_status,validation_status")).limit(5000),
    filt(a.admin.from("social_operator_scheduling_tasks").select("id,task_status")).limit(2000),
    filt(a.admin.from("social_scheduler_export_audit").select("provider_calls,posts_scheduled_externally")).limit(5000),
  ]);
  const b = batches.data || [], r = rows.data || [], t = tasks.data || [], au = audit.data || [];
  const count = (arr: any[], f: (x: any) => boolean) => arr.filter(f).length;
  return json({
    ok: true,
    export_batches_total: b.length, export_rows_total: r.length,
    export_ready_count: count(b, (x) => x.export_status === "ready" || x.export_status === "generated"),
    downloaded_count: count(b, (x) => x.export_status === "downloaded"),
    manually_scheduled_count: count(b, (x) => x.manual_scheduling_status === "manually_scheduled"),
    blocked_rows: count(r, (x) => x.row_status === "blocked"),
    validation_failed_count: count(r, (x) => x.validation_status === "failed"),
    operator_tasks_open: count(t, (x) => x.task_status === "open" || x.task_status === "in_progress"),
    operator_tasks_completed: count(t, (x) => x.task_status === "completed"),
    provider_calls_total: au.reduce((s, x) => s + (x.provider_calls ?? 0), 0),
    posts_scheduled_externally_total: au.reduce((s, x) => s + (x.posts_scheduled_externally ?? 0), 0),
    ready_for_operator: count(b, (x) => x.manual_scheduling_status === "ready_for_operator") > 0,
    no_external_action: true,
  });
});
