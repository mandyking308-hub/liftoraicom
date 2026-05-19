import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const guard = await requireFounder(req);
  if ("error" in guard) return guard.error;
  const { admin } = guard;

  const body = await req.json().catch(() => ({}));
  const business_id = body.business_id;
  if (!business_id) return json({ ok: false, error: "business_id required" }, 400);
  const dry_run = body.dry_run !== false;

  const [{ data: brain }, { data: pillars }, { data: rules }, { data: offers }, { data: risks }, { data: last }] = await Promise.all([
    admin.from("business_social_brain_profiles").select("*").eq("business_id", business_id).maybeSingle(),
    admin.from("business_social_content_pillars").select("*").eq("business_id", business_id),
    admin.from("business_social_platform_rules").select("*").eq("business_id", business_id),
    admin.from("business_social_offer_mappings").select("*").eq("business_id", business_id),
    admin.from("business_social_risk_flags").select("*").eq("business_id", business_id),
    admin.from("business_social_profile_versions").select("version_number")
      .eq("business_id", business_id).order("version_number", { ascending: false }).limit(1),
  ]);

  const snapshot = { brain, pillars, rules, offers, risks, captured_at: new Date().toISOString() };
  const nextVersion = ((last?.[0]?.version_number ?? 0) + 1);

  if (dry_run) return json({ ok: true, dry_run: true, would_create_version: nextVersion, no_records_mutated: true });
  if (body.confirmation_phrase !== "CREATE SOCIAL PROFILE VERSION")
    return json({ ok: false, reason: "confirmation_phrase_required", expected: "CREATE SOCIAL PROFILE VERSION" }, 400);

  const { data: ins, error } = await admin.from("business_social_profile_versions").insert({
    business_id, profile_id: brain?.id ?? null,
    version_number: nextVersion, version_status: "draft",
    profile_snapshot: snapshot, change_summary: body.change_summary ?? "Manual snapshot",
    founder_notes: body.founder_notes ?? null,
  }).select("id,version_number").maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, version: ins });
});