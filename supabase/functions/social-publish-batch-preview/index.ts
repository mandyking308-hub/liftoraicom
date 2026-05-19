import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, provider, platform, date_from, date_to, campaign_plan_id } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  let q = a.admin.from("social_publish_jobs").select("*").eq("business_id", business_id).is("queue_batch_id", null);
  if (provider) q = q.eq("provider", provider);
  if (platform) q = q.eq("platform", platform);
  if (campaign_plan_id) q = q.eq("campaign_plan_id", campaign_plan_id);
  if (date_from) q = q.gte("scheduled_for", date_from);
  if (date_to) q = q.lte("scheduled_for", date_to);
  const { data: jobs } = await q.limit(500);
  const ready = (jobs || []).filter((j: any) => j.status !== "blocked" && j.status !== "cancelled" && j.status !== "failed");
  const blocked = (jobs || []).filter((j: any) => j.status === "blocked");
  return json({ ok: true, no_records_mutated: true, total: jobs?.length || 0, ready_count: ready.length, blocked_count: blocked.length, jobs, ready, blocked });
});