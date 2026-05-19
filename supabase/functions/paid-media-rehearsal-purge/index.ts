import { corsHeaders, json, requireFounder, SAFETY_FLAGS } from "../_shared/paidMediaLogic.ts";
const PHRASE = "PURGE PAID MEDIA TEST DATA";
const TABLES = ["paid_media_audit","paid_media_manual_export_packs","paid_media_risk_reviews","paid_media_readiness_checks","paid_media_spend_scenarios","paid_media_budget_guards","paid_media_creative_variants","paid_media_audience_segments","paid_media_campaign_plans"];
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  if (body.confirmation_phrase !== PHRASE) return json({ ok: false, blocked: true, reason: "confirmation_phrase_required", required_phrase: PHRASE }, 400);
  const deleted: Record<string, number> = {};
  for (const t of TABLES) {
    let q: any = a.admin.from(t).delete({ count: "exact" }).eq("is_test_data", true);
    if (body.business_id) q = q.eq("business_id", body.business_id);
    const { count, error } = await q;
    if (error) return json({ ok: false, table: t, error: error.message }, 500);
    deleted[t] = count ?? 0;
  }
  return json({ ok: true, deleted, real_data_deleted: false, safety: SAFETY_FLAGS });
});
