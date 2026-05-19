import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS, SUCCESS_AUDIT_DEFAULTS } from "../_shared/socialCompetitorTrendLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const business_id = b.business_id;
  const t = b.trend ?? b;
  const dry_run = b.dry_run !== false;
  const phrase = b.confirmation_phrase ?? "";
  if (!business_id || !t?.trend_title || !t?.trend_type) return json({ ok: false, error: "missing_fields" }, 400);

  const row = {
    business_id,
    trend_title: String(t.trend_title).slice(0, 240),
    trend_type: t.trend_type,
    trend_status: t.trend_status ?? "recorded",
    platform: t.platform ?? null,
    source_url: t.source_url ?? null,
    source_label: t.source_label ?? null,
    observed_at: t.observed_at ?? null,
    trend_description: t.trend_description ?? null,
    audience_notes: t.audience_notes ?? null,
    relevance_to_business: t.relevance_to_business ?? null,
    suggested_use: t.suggested_use ?? null,
    risk_flags: t.risk_flags ?? [],
    evidence_level: t.evidence_level ?? "manual_unverified",
    confidence_score: t.confidence_score ?? 0,
    is_test_data: !!t.is_test_data,
  };

  if (dry_run) return json({ ok: true, dry_run: true, preview: row, ...SAFETY_FLAGS, no_records_mutated: true });
  if (phrase !== "CREATE SOCIAL TREND SIGNAL") return json({ ok: false, error: "confirmation_phrase_required" }, 400);

  const ins = await (a.admin as any).from("social_trend_signals").insert(row).select().single();
  if (ins.error) return json({ ok: false, error: ins.error.message }, 500);

  await (a.admin as any).from("social_competitor_trend_audit").insert({
    business_id, trend_id: ins.data.id, action: "trend_created",
    after_json: ins.data, ...SUCCESS_AUDIT_DEFAULTS, is_test_data: row.is_test_data,
  });
  return json({ ok: true, trend: ins.data, ...SAFETY_FLAGS });
});