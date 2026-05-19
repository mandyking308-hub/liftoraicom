import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { business_id, profile_id, decision, founder_notes, confirmation_phrase } = body ?? {};
  if (!business_id || !profile_id || !decision) return json({ ok: false, error: "missing_fields" }, 400);
  if (!["approve","reject","needs_edit"].includes(decision)) return json({ ok: false, error: "invalid_decision" }, 400);

  const needPhrase = decision === "approve" ? "APPROVE SOCIAL BRAIN PROFILE" : "REVIEW SOCIAL BRAIN PROFILE";
  if (confirmation_phrase !== needPhrase) {
    return json({ ok: false, blocked: true, reason: "confirmation_phrase_required", need: needPhrase }, 400);
  }

  const { data: before } = await auth.admin.from("business_social_brain_profiles")
    .select("*").eq("id", profile_id).eq("business_id", business_id).maybeSingle();
  if (!before) return json({ ok: false, error: "profile_not_found" }, 404);

  const newStatus = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "draft";
  const { data: after, error } = await auth.admin.from("business_social_brain_profiles")
    .update({
      profile_status: newStatus,
      last_approved_at: decision === "approve" ? new Date().toISOString() : before.last_approved_at,
      founder_notes,
    })
    .eq("id", profile_id).select().single();
  if (error) return json({ ok: false, error: error.message }, 500);

  await auth.admin.from("business_social_profile_approval_log").insert({
    business_id, profile_id, action: decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "edited",
    founder_notes, before_json: before, after_json: after,
  });

  return json({ ok: true, profile: after, no_external_action: true });
});