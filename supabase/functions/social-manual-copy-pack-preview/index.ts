import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, export_batch_id, publish_job_ids } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  let q = a.admin.from("social_scheduler_export_rows").select("*").eq("business_id", business_id);
  if (export_batch_id) q = q.eq("export_batch_id", export_batch_id);
  if (publish_job_ids?.length) q = q.in("publish_job_id", publish_job_ids);
  const { data: rows } = await q.limit(500);
  const grouped: Record<string, any[]> = {};
  for (const r of rows || []) {
    const k = `${r.platform ?? "unknown"}__${r.scheduled_date ?? "no-date"}`;
    (grouped[k] ||= []).push({
      platform: r.platform, date: r.scheduled_date, time: r.scheduled_time,
      caption: r.caption, hashtags: r.hashtags, link: r.link_url,
      asset_reference: r.media_url ?? r.asset_id,
      cta: (r.metadata as any)?.cta ?? null,
      operator_notes: (r.metadata as any)?.notes ?? null,
    });
  }
  const sections = Object.entries(grouped).map(([k, items]) => ({ key: k, items }));
  return json({ ok: true, no_records_mutated: true, sections, total_rows: rows?.length ?? 0 });
});
