import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { readinessFromCounts } from "../_shared/socialProfileGenerator.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const guard = await requireFounder(req);
  if ("error" in guard) return guard.error;
  const { admin } = guard;

  const url = new URL(req.url);
  let business_id = url.searchParams.get("business_id");
  if (!business_id && req.method === "POST") {
    const b = await req.json().catch(() => ({}));
    business_id = b.business_id;
  }
  if (!business_id) return json({ ok: false, error: "business_id required" }, 400);

  const [{ data: brain }, pillarsAll, pillarsApproved, rulesAll, rulesActive, offers, risksOpen, risksCrit] = await Promise.all([
    admin.from("business_social_brain_profiles").select("id,profile_status,confidence_score,missing_inputs").eq("business_id", business_id).maybeSingle(),
    admin.from("business_social_content_pillars").select("id", { count: "exact", head: true }).eq("business_id", business_id),
    admin.from("business_social_content_pillars").select("id", { count: "exact", head: true }).eq("business_id", business_id).eq("approval_status","approved"),
    admin.from("business_social_platform_rules").select("id", { count: "exact", head: true }).eq("business_id", business_id),
    admin.from("business_social_platform_rules").select("id", { count: "exact", head: true }).eq("business_id", business_id).eq("is_active", true),
    admin.from("business_social_offer_mappings").select("id", { count: "exact", head: true }).eq("business_id", business_id),
    admin.from("business_social_risk_flags").select("id", { count: "exact", head: true }).eq("business_id", business_id).eq("status","open"),
    admin.from("business_social_risk_flags").select("id", { count: "exact", head: true }).eq("business_id", business_id).eq("status","open").eq("risk_level","critical"),
  ]);

  const c = {
    profile_exists: !!brain,
    profile_status: brain?.profile_status ?? null,
    confidence_score: brain?.confidence_score ?? 0,
    content_pillars_count: pillarsAll.count ?? 0,
    approved_pillars_count: pillarsApproved.count ?? 0,
    platform_rules_count: rulesAll.count ?? 0,
    active_platform_rules_count: rulesActive.count ?? 0,
    offer_mappings_count: offers.count ?? 0,
    risk_flags_open: risksOpen.count ?? 0,
    critical_risk_flags: risksCrit.count ?? 0,
    missing_inputs: brain?.missing_inputs ?? [],
  };
  const r = readinessFromCounts(c);
  return json({ ok: true, ...c, ...r, no_external_action: true });
});