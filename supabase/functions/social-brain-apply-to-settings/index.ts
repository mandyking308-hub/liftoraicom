import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { business_id, profile_id, dry_run = true, confirmation_phrase } = body ?? {};
  if (!business_id || !profile_id) return json({ ok: false, error: "missing_fields" }, 400);

  const { data: profile } = await auth.admin.from("business_social_brain_profiles")
    .select("*").eq("id", profile_id).eq("business_id", business_id).maybeSingle();
  if (!profile) return json({ ok: false, error: "profile_not_found" }, 404);
  if (profile.profile_status !== "approved" && profile.profile_status !== "applied_to_settings") {
    return json({ ok: false, blocked: true, reason: "profile_not_approved", profile_status: profile.profile_status }, 409);
  }

  const payload = {
    business_id,
    brand_voice: profile.brand_voice,
    core_cta: profile.primary_cta,
    forbidden_phrases: [...(profile.forbidden_phrases ?? []), ...(profile.forbidden_claims ?? [])],
    escalation_rules: profile.escalation_rules ?? {},
    platform_rules_json: profile.platform_recommendations ?? {},
    posting_cadence_json: profile.posting_cadence ?? {},
    dm_rules_json: profile.dm_rules ?? {},
    approval_rules_json: { default: "approval_required", source_profile_id: profile_id },
    // Hard locks — never enable autopilot in this connector
    auto_publish_allowed: false,
    auto_reply_allowed: false,
    cold_dm_allowed: false,
    social_automation_mode: "approval_required",
  };

  if (dry_run !== false) {
    return json({ ok: true, dry_run: true, would_apply: payload, no_external_action: true });
  }
  if (confirmation_phrase !== "APPLY SOCIAL BRAIN SETTINGS") {
    return json({ ok: false, blocked: true, reason: "confirmation_phrase_required" }, 400);
  }

  const { error: settingsErr } = await auth.admin.from("social_automation_settings")
    .upsert(payload, { onConflict: "business_id" });
  if (settingsErr) return json({ ok: false, error: settingsErr.message }, 500);

  const { data: updated } = await auth.admin.from("business_social_brain_profiles")
    .update({ profile_status: "applied_to_settings" }).eq("id", profile_id).select().single();

  await auth.admin.from("business_social_profile_approval_log").insert({
    business_id, profile_id, action: "applied_to_social_settings",
    before_json: profile, after_json: updated,
  });

  return json({
    ok: true, applied: true,
    auto_publish_allowed: false, auto_reply_allowed: false, cold_dm_allowed: false,
    social_automation_mode: "approval_required",
    no_external_action: true,
  });
});