import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { defaultJourneyRules } from "../_shared/socialCampaignLogic.ts";

const CONFIRM = "CREATE SOCIAL JOURNEY CONTENT RULES";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req); if ("error" in g) return g.error;
  const { admin } = g;
  const body = await req.json().catch(() => ({}));
  const business_id = body.business_id;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const dry_run = body.dry_run !== false;
  if (!dry_run && body.confirmation_phrase !== CONFIRM)
    return json({ ok: false, error: `confirmation_phrase_required:${CONFIRM}` }, 400);

  const { data: rules } = await admin.from("business_social_platform_rules").select("platform").eq("business_id", business_id);
  const platforms = (rules || []).map((r: any) => r.platform).filter(Boolean);

  const seeds = defaultJourneyRules().map(r => ({
    business_id,
    journey_stage: r.journey_stage,
    rule_name: r.rule_name,
    rule_description: r.rule_description,
    recommended_content_types: r.recommended_content_types,
    recommended_platforms: platforms.length ? platforms : ["instagram","linkedin"],
    recommended_ctas: r.recommended_ctas,
    proof_needed: r.proof_needed,
    tone_notes: r.tone_notes,
    risk_notes: "Founder review required before publish.",
    approval_required: true, is_active: true,
    is_test_data: !!body.is_test_data,
  }));

  if (dry_run) return json({ ok: true, dry_run: true, no_records_mutated: true, rules: seeds });

  const { data, error } = await admin.from("social_customer_journey_content_rules").insert(seeds).select("id");
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, inserted: data?.length ?? 0 });
});