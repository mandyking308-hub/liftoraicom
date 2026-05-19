import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS } from "../_shared/socialCompetitorTrendLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  if (!b.business_id || !b.trend_title || !b.trend_type) return json({ ok: false, error: "missing_fields" }, 400);
  const expiry = ["seasonal", "news_hook", "meme", "audio_trend"].includes(b.trend_type);
  const risk_flags: string[] = [];
  if (b.trend_type === "meme" || b.trend_type === "audio_trend") risk_flags.push("rights_check_required");
  if (b.trend_type === "news_hook") risk_flags.push("sensitivity_check_required");
  return json({
    ok: true, dry_run: true,
    parsed: { ...b },
    relevance_note: b.relevance_to_business ?? "Founder must confirm relevance to business positioning.",
    suggested_use: b.suggested_use ?? "Adapt with original wording; do not copy creator's content.",
    risk_flags,
    expiry_warning: expiry ? "Trend likely time-sensitive — capture quickly and re-validate before use." : null,
    evidence_warning: "manual_unverified — confirm source before approving for strategy.",
    ...SAFETY_FLAGS, no_records_mutated: true,
  });
});