import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { bufferGraphQL, bufferKeyPresent, POSTS_QUERY } from "../_shared/bufferClient.ts";
import { audit, getConnection } from "../_shared/socialDistributionDb.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  if (!bufferKeyPresent()) return json({ ok: false, error: "buffer_api_key_missing" });

  const conn = await getConnection(a.admin, business_id);
  if (!conn?.provider_organization_id) return json({ ok: false, error: "provider_organization_missing" });

  const res = await bufferGraphQL<{ posts: any[] }>(POSTS_QUERY, { organizationId: conn.provider_organization_id });
  if (!res.ok) return json({ ok: false, error: res.errorMessage, unchanged: true });

  const byId = new Map<string, any>();
  for (const p of res.data?.posts ?? []) byId.set(String(p.id), p);

  const { data: jobs } = await a.admin.from("social_publish_jobs").select("id, provider_post_id, distribution_status")
    .eq("business_id", business_id).not("provider_post_id", "is", null).limit(500);

  let updated = 0; let unknown = 0;
  for (const j of jobs ?? []) {
    const p = byId.get(String(j.provider_post_id));
    if (!p) { unknown++; continue; }
    const status = String(p.status ?? "").toLowerCase();
    const dist = status === "sent" ? "sent" : status === "error" ? "failed" : "scheduled";
    if (dist !== j.distribution_status) {
      await a.admin.from("social_publish_jobs").update({
        distribution_status: dist, provider_status: p.status ?? null,
        published_at: dist === "sent" ? new Date().toISOString() : null,
      }).eq("id", j.id);
      updated++;
    }
  }
  await audit(a.admin, { business_id, action: "distribution_reconcile", result_json: { updated, not_found_in_provider: unknown } });
  return json({ ok: true, checked: jobs?.length ?? 0, updated, not_found_in_provider: unknown, no_results_invented: true });
});
