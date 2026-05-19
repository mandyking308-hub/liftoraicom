import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { buildCsv, eligibleJob, validateRow, ExportType } from "../_shared/socialSchedulerBridge.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, export_type = "metricool_csv", publish_job_ids, queue_batch_id, platform, date_range_start, date_range_end } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);

  let q = a.admin.from("social_publish_jobs").select("*").eq("business_id", business_id);
  if (queue_batch_id) q = q.eq("queue_batch_id", queue_batch_id);
  if (publish_job_ids?.length) q = q.in("id", publish_job_ids);
  if (platform) q = q.eq("platform", platform);
  if (date_range_start) q = q.gte("scheduled_for", date_range_start);
  if (date_range_end) q = q.lte("scheduled_for", date_range_end);
  const { data: jobs } = await q.limit(500);

  const rows: any[] = []; const blocked: any[] = [];
  for (const j of jobs || []) {
    const e = eligibleJob(j);
    const sched = j.scheduled_for ? new Date(j.scheduled_for) : null;
    const p = j.publish_payload ?? {};
    const row: any = {
      publish_job_id: j.id, content_item_id: j.content_item_id ?? null,
      platform: j.platform, provider: j.provider,
      scheduled_date: sched ? sched.toISOString().slice(0,10) : null,
      scheduled_time: sched ? sched.toISOString().slice(11,19) : null,
      timezone: "Europe/London",
      caption: p.caption ?? p.text ?? "", title: p.title ?? "",
      link_url: p.link_url ?? "", hashtags: p.hashtags ?? "",
      media_url: p.media_url ?? "", asset_id: p.asset_id ?? null,
      row_status: e.eligible ? "ready" : "blocked",
    };
    row.validation = validateRow(row);
    if (!e.eligible) { row.blocked_reason = e.reason; blocked.push(row); } else { rows.push(row); }
  }
  const csv = buildCsv(rows, export_type as ExportType);
  return json({
    ok: true, no_records_mutated: true, provider_calls: 0, posts_scheduled_externally: 0,
    export_type, total: jobs?.length || 0, eligible: rows.length, blocked: blocked.length,
    rows: rows.slice(0,50), blocked_rows: blocked.slice(0,25),
    csv_preview: csv.split("\n").slice(0,30).join("\n"),
    label: "Metricool-ready export — operator must verify import columns before upload.",
  });
});
