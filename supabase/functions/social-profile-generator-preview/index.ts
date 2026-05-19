import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { buildSocialOperatingProfile } from "../_shared/socialProfileGenerator.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const guard = await requireFounder(req);
  if ("error" in guard) return guard.error;
  const { admin } = guard;

  let body: any = {};
  try { body = await req.json(); } catch { /* GET-ish */ }
  const business_id = body.business_id;
  if (!business_id) return json({ ok: false, error: "business_id required" }, 400);

  const include_existing = body.include_existing_profile !== false;
  const include_sources = body.include_sources !== false;

  const [{ data: brain }, { data: sources }, { data: biz }] = await Promise.all([
    include_existing
      ? admin.from("business_social_brain_profiles").select("*").eq("business_id", business_id).maybeSingle()
      : Promise.resolve({ data: null } as any),
    include_sources
      ? admin.from("business_social_knowledge_sources").select("id,source_type,title,pasted_text,summary,approved_for_social_training")
          .eq("business_id", business_id)
      : Promise.resolve({ data: [] } as any),
    admin.from("businesses").select("id,name").eq("id", business_id).maybeSingle().then((r: any) => r).catch(() => ({ data: null })),
  ]);

  const generated = buildSocialOperatingProfile({
    business_id,
    business_name: biz?.name ?? body.business_name,
    business_category: body.business_category,
    brain,
    sources: (sources ?? []).filter((s: any) => s.approved_for_social_training !== false),
    founder_notes: body.founder_notes ?? null,
  });

  return json({
    ok: true,
    dry_run: true,
    no_records_mutated: true,
    sources_considered: (sources ?? []).length,
    brain_present: !!brain,
    generated_profile: generated,
    safety_audit: {
      provider_calls: false,
      published: false,
      dms_sent: false,
      emails_sent: false,
    },
  });
});