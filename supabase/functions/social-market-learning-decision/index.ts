import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS, SUCCESS_AUDIT_DEFAULTS } from "../_shared/socialCompetitorTrendLogic.ts";

const DECISIONS = new Set(["approve_for_strategy", "reject", "park", "archive"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const { business_id, decision, market_signal_id, pattern_id, trend_id, founder_notes } = b;
  const dry_run = b.dry_run !== false;
  const phrase = b.confirmation_phrase ?? "";
  if (!business_id || !decision || !DECISIONS.has(decision)) return json({ ok: false, error: "invalid_decision" }, 400);
  if (!market_signal_id && !pattern_id && !trend_id) return json({ ok: false, error: "missing_target_id" }, 400);

  const statusMap: Record<string, string> = {
    approve_for_strategy: "approved",
    reject: "rejected",
    park: "needs_review",
    archive: "archived",
  };
  const approved = decision === "approve_for_strategy";

  if (dry_run) return json({ ok: true, dry_run: true, decision, ...SAFETY_FLAGS, no_records_mutated: true });
  if (phrase !== "APPLY SOCIAL MARKET LEARNING DECISION") return json({ ok: false, error: "confirmation_phrase_required" }, 400);

  const ad = a.admin as any;
  const updates: any = { signal_status: statusMap[decision], updated_at: new Date().toISOString() };
  if (approved) { updates.approved_for_strategy = true; updates.approved_at = new Date().toISOString(); updates.approved_by = a.user.email ?? a.user.id; }
  let target = "";
  if (market_signal_id) {
    target = "market_signal";
    await ad.from("social_market_learning_signals").update(updates).eq("id", market_signal_id).eq("business_id", business_id);
  } else if (pattern_id) {
    target = "pattern";
    await ad.from("social_competitor_content_patterns").update({
      pattern_status: decision === "reject" ? "rejected" : decision === "archive" ? "archived" : approved ? "approved" : "needs_review",
      approved_for_strategy: approved,
      updated_at: new Date().toISOString(),
    }).eq("id", pattern_id).eq("business_id", business_id);
  } else if (trend_id) {
    target = "trend";
    await ad.from("social_trend_signals").update({
      trend_status: decision === "reject" ? "rejected" : decision === "archive" ? "archived" : approved ? "approved" : "needs_review",
      approved_for_strategy: approved,
      updated_at: new Date().toISOString(),
    }).eq("id", trend_id).eq("business_id", business_id);
  }

  await ad.from("social_competitor_trend_audit").insert({
    business_id,
    market_signal_id: market_signal_id ?? null,
    pattern_id: pattern_id ?? null,
    trend_id: trend_id ?? null,
    action: "decision_applied",
    result_json: { decision, target, founder_notes: founder_notes ?? null },
    ...SUCCESS_AUDIT_DEFAULTS,
  });

  return json({ ok: true, decision, target, ...SAFETY_FLAGS });
});