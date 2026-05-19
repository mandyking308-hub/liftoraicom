import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS, SUCCESS_AUDIT_DEFAULTS, detectCopyRisk } from "../_shared/socialCompetitorTrendLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const business_id = b.business_id;
  const obs = b.observation ?? b;
  const dry_run = b.dry_run !== false;
  const phrase = b.confirmation_phrase ?? "";
  if (!business_id || !obs?.observation_text || !obs?.observation_type) return json({ ok: false, error: "missing_fields" }, 400);

  const row = {
    business_id,
    competitor_id: obs.competitor_id ?? null,
    competitor_account_id: obs.competitor_account_id ?? null,
    observation_type: obs.observation_type,
    observation_status: obs.observation_status ?? "recorded",
    platform: obs.platform ?? null,
    source_url: obs.source_url ?? null,
    source_label: obs.source_label ?? null,
    observed_at: obs.observed_at ?? null,
    observation_title: obs.observation_title ?? null,
    observation_text: String(obs.observation_text).slice(0, 6000),
    content_format: obs.content_format ?? null,
    hook_observed: obs.hook_observed ?? null,
    cta_observed: obs.cta_observed ?? null,
    offer_observed: obs.offer_observed ?? null,
    audience_reaction_notes: obs.audience_reaction_notes ?? null,
    apparent_strength: obs.apparent_strength ?? null,
    apparent_weakness: obs.apparent_weakness ?? null,
    evidence_level: obs.evidence_level ?? "manual_unverified",
    risk_flags: Array.from(new Set([...(obs.risk_flags ?? []), ...detectCopyRisk(obs.observation_text)])),
    founder_notes: obs.founder_notes ?? null,
    is_test_data: !!obs.is_test_data,
  };

  if (dry_run) return json({ ok: true, dry_run: true, preview: row, ...SAFETY_FLAGS, no_records_mutated: true });
  if (phrase !== "CREATE SOCIAL COMPETITOR OBSERVATION") return json({ ok: false, error: "confirmation_phrase_required" }, 400);

  const ins = await (a.admin as any).from("social_competitor_observations").insert(row).select().single();
  if (ins.error) return json({ ok: false, error: ins.error.message }, 500);

  await (a.admin as any).from("social_competitor_trend_audit").insert({
    business_id, competitor_id: row.competitor_id, observation_id: ins.data.id,
    action: "observation_created", after_json: ins.data,
    ...SUCCESS_AUDIT_DEFAULTS, is_test_data: row.is_test_data,
  });

  return json({ ok: true, observation: ins.data, ...SAFETY_FLAGS });
});