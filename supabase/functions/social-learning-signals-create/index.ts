import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS, ALLOWED_SIGNAL_TYPES } from "../_shared/socialAnalyticsLogic.ts";

const PHRASE = "CREATE SOCIAL LEARNING SIGNALS";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({} as any));
  const business_id = body.business_id;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const dry_run = body.dry_run !== false;
  const signals: any[] = Array.isArray(body.signals) ? body.signals : [];
  const valid = signals.filter((s) => s.signal_type && ALLOWED_SIGNAL_TYPES.includes(s.signal_type) && s.signal_title);
  if (dry_run) return json({ ok: true, dry_run: true, will_create: valid.length, no_records_mutated: true, ...SAFETY_FLAGS });
  if (body.confirmation_phrase !== PHRASE) return json({ ok: false, error: "confirmation_phrase_required", required: PHRASE }, 400);

  const payload = valid.map((s) => ({
    business_id,
    signal_type: s.signal_type,
    signal_status: "needs_review",
    source_metric_id: s.source_metric_id ?? null,
    source_summary_id: s.source_summary_id ?? null,
    platform: s.platform ?? null,
    content_item_id: s.content_item_id ?? null,
    campaign_plan_id: s.campaign_plan_id ?? null,
    asset_id: s.asset_id ?? null,
    signal_title: s.signal_title,
    signal_description: s.signal_description ?? null,
    evidence_summary: s.evidence_summary ?? null,
    recommendation: s.recommendation ?? null,
    confidence_score: Number(s.confidence_score ?? 0),
    impact_area: s.impact_area ?? "content",
    founder_review_required: true,
    is_test_data: !!body.is_test_data,
  }));
  const { data, error } = await a.admin.from("social_learning_signals").insert(payload).select("id");
  if (error) return json({ ok: false, error: error.message }, 500);
  await a.admin.from("social_analytics_audit").insert({
    business_id, action: "learning_signal_generated", action_status: "recorded",
    result_json: { created: data?.length ?? 0 }, is_test_data: !!body.is_test_data,
  });
  return json({ ok: true, created: data?.length ?? 0, ...SAFETY_FLAGS });
});