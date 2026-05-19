import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS } from "../_shared/socialAnalyticsLogic.ts";

const PHRASE = "APPLY SOCIAL PERFORMANCE MATCH";
const ALLOWED_TARGETS = ["content_item","content_variant","calendar_item","campaign_plan","asset"];
const COL_MAP: Record<string, string> = {
  content_item: "content_item_id",
  content_variant: "content_variant_id",
  calendar_item: "calendar_item_id",
  campaign_plan: "campaign_plan_id",
  asset: "asset_id",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({} as any));
  const { business_id, metric_id, target_type, target_id } = body;
  if (!business_id || !metric_id || !target_type || !target_id) return json({ ok: false, error: "missing_fields" }, 400);
  if (!ALLOWED_TARGETS.includes(target_type)) return json({ ok: false, error: "invalid_target_type" }, 400);
  const dry_run = body.dry_run !== false;
  if (dry_run) return json({ ok: true, dry_run: true, will_link: { metric_id, [COL_MAP[target_type]]: target_id }, ...SAFETY_FLAGS });
  if (body.confirmation_phrase !== PHRASE) return json({ ok: false, error: "confirmation_phrase_required", required: PHRASE }, 400);

  const update: any = { [COL_MAP[target_type]]: target_id, updated_at: new Date().toISOString(), attribution_status: "system_matched", metric_confidence: "system_matched" };
  const { error } = await a.admin.from("social_performance_metrics").update(update).eq("id", metric_id).eq("business_id", business_id);
  if (error) return json({ ok: false, error: error.message }, 500);

  // bump counters
  if (target_type === "content_item") {
    const { data: m } = await a.admin.from("social_performance_metrics").select("views,likes,comments,shares,saves").eq("id", metric_id).maybeSingle();
    if (m) {
      const eng = Number(m.likes ?? 0) + Number(m.comments ?? 0) + Number(m.shares ?? 0) + Number(m.saves ?? 0);
      await a.admin.rpc; // no-op
      await a.admin.from("social_content_items").update({
        last_performance_import_at: new Date().toISOString(),
        learning_status: "signals_available",
      }).eq("id", target_id);
    }
  }

  await a.admin.from("social_analytics_audit").insert({
    business_id, metric_id, action: "metric_created", action_status: "matched", result_json: { target_type, target_id },
  });
  return json({ ok: true, metric_id, target_type, target_id, ...SAFETY_FLAGS });
});