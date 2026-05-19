import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;
  const url = new URL(req.url);
  const business_id = url.searchParams.get("business_id");
  if (!business_id) return json({ ok: false, error: "business_id required" }, 400);

  const [{ count: sources_count }, { count: approved_sources_count }, { count: extraction_count }] = await Promise.all([
    auth.admin.from("business_social_knowledge_sources").select("id", { count: "exact", head: true }).eq("business_id", business_id),
    auth.admin.from("business_social_knowledge_sources").select("id", { count: "exact", head: true }).eq("business_id", business_id).eq("approved_for_social_training", true),
    auth.admin.from("business_social_brain_extractions").select("id", { count: "exact", head: true }).eq("business_id", business_id),
  ]);

  const { data: profile } = await auth.admin.from("business_social_brain_profiles")
    .select("*").eq("business_id", business_id).maybeSingle();
  const { data: settings } = await auth.admin.from("social_automation_settings")
    .select("business_id, brand_voice, core_cta, social_automation_mode")
    .eq("business_id", business_id).maybeSingle();

  const ready =
    !!profile &&
    profile.profile_status === "applied_to_settings" &&
    (profile.confidence_score ?? 0) >= 60 &&
    (profile.missing_inputs ?? []).length === 0;

  return json({
    ok: true,
    business_id,
    sources_count: sources_count ?? 0,
    approved_sources_count: approved_sources_count ?? 0,
    extraction_count: extraction_count ?? 0,
    profile_exists: !!profile,
    profile_status: profile?.profile_status ?? null,
    confidence_score: profile?.confidence_score ?? 0,
    missing_inputs: profile?.missing_inputs ?? [],
    settings_exist: !!settings,
    settings_applied: settings?.brand_voice != null && settings?.core_cta != null,
    ready_for_content_generation: ready,
    no_external_action: true,
  });
});