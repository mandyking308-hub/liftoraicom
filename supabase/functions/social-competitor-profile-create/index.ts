import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS, SUCCESS_AUDIT_DEFAULTS } from "../_shared/socialCompetitorTrendLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({}));
  const business_id = body.business_id;
  const competitor = body.competitor ?? body;
  const accounts: any[] = body.accounts ?? [];
  const dry_run = body.dry_run !== false;
  const phrase = body.confirmation_phrase ?? "";
  if (!business_id || !competitor?.competitor_name) return json({ ok: false, error: "missing_business_or_name" }, 400);

  const preview = {
    business_id,
    competitor_name: String(competitor.competitor_name).slice(0, 200),
    competitor_type: competitor.competitor_type ?? "direct_competitor",
    website_url: competitor.website_url ?? null,
    notes: competitor.notes ?? null,
    relevance_reason: competitor.relevance_reason ?? null,
    target_audience_notes: competitor.target_audience_notes ?? null,
    offer_notes: competitor.offer_notes ?? null,
    positioning_notes: competitor.positioning_notes ?? null,
    strengths: Array.isArray(competitor.strengths) ? competitor.strengths : [],
    weaknesses: Array.isArray(competitor.weaknesses) ? competitor.weaknesses : [],
    watch_priority: competitor.watch_priority ?? "normal",
    watch_status: "active",
    evidence_level: competitor.evidence_level ?? "manual_unverified",
    founder_notes: competitor.founder_notes ?? null,
    is_test_data: !!competitor.is_test_data,
  };

  if (dry_run) return json({ ok: true, dry_run: true, preview, accounts, ...SAFETY_FLAGS, no_records_mutated: true });
  if (phrase !== "CREATE SOCIAL COMPETITOR PROFILE") return json({ ok: false, error: "confirmation_phrase_required" }, 400);

  const ins = await (a.admin as any).from("social_competitor_profiles").insert(preview).select().single();
  if (ins.error) return json({ ok: false, error: ins.error.message }, 500);
  const competitor_id = ins.data.id;

  let createdAccounts: any[] = [];
  if (accounts.length) {
    const accRows = accounts.map(x => ({
      business_id, competitor_id,
      platform: x.platform ?? "other",
      account_handle: x.account_handle ?? null,
      account_url: x.account_url ?? null,
      account_status: x.account_status ?? "active",
      follower_count: x.follower_count ?? null,
      follower_count_observed_at: x.follower_count_observed_at ?? null,
      notes: x.notes ?? null,
      evidence_level: x.evidence_level ?? "manual_unverified",
      is_test_data: !!x.is_test_data,
    }));
    const aRes = await (a.admin as any).from("social_competitor_accounts").insert(accRows).select();
    if (!aRes.error) createdAccounts = aRes.data ?? [];
  }

  await (a.admin as any).from("social_competitor_trend_audit").insert({
    business_id, competitor_id, action: "competitor_profile_created",
    after_json: ins.data, ...SUCCESS_AUDIT_DEFAULTS,
    is_test_data: !!preview.is_test_data,
  });

  return json({ ok: true, competitor: ins.data, accounts: createdAccounts, ...SAFETY_FLAGS });
});