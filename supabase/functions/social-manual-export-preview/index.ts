import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, batch_id, publish_job_ids, export_type } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  let q = a.admin.from("social_publish_jobs").select("*").eq("business_id", business_id);
  if (batch_id) q = q.eq("queue_batch_id", batch_id);
  else if (publish_job_ids?.length) q = q.in("id", publish_job_ids);
  const { data: jobs } = await q.limit(1000);
  const exportable = (jobs || []).filter((j: any) => j.status !== "blocked" && j.status !== "cancelled");
  const rows = exportable.map((j: any) => ({
    job_id: j.id, platform: j.platform, provider: j.provider, scheduled_for: j.scheduled_for,
    job_type: j.job_type, capability: j.provider_capability_required,
    missing_fields: !j.scheduled_for ? ["scheduled_for"] : [],
  }));
  return json({ ok: true, no_records_mutated: true, export_type: export_type || "generic_csv", total: jobs?.length || 0, exportable: rows.length, rows, label: "Manual/operator export only — no API call" });
});