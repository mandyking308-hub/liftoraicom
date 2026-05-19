import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { buildExtraction } from "../_shared/socialBrainLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { business_id, source_ids, include_unapproved_sources = false } = body ?? {};
  if (!business_id) return json({ ok: false, error: "business_id required" }, 400);

  let q = auth.admin.from("business_social_knowledge_sources").select("*").eq("business_id", business_id);
  if (Array.isArray(source_ids) && source_ids.length > 0) q = q.in("id", source_ids);
  if (!include_unapproved_sources) q = q.eq("approved_for_social_training", true);
  const { data: sources, error } = await q;
  if (error) return json({ ok: false, error: error.message }, 500);

  const extraction = buildExtraction(sources ?? []);
  return json({
    ok: true,
    dry_run: true,
    business_id,
    sources_considered: sources?.length ?? 0,
    extraction,
    no_external_action: true,
    no_records_mutated: true,
  });
});