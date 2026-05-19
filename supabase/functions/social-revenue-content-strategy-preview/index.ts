import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { estimateRevenueStrategy } from "../_shared/socialCampaignLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req); if ("error" in g) return g.error;
  const body = await req.json().catch(() => ({}));
  const { business_id, target_amount, target_count, primary_offer, price, currency, period_start, period_end, revenue_target_id, target_type } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);

  const est = estimateRevenueStrategy({ target_amount, target_count, price, primary_offer });

  const recommended_campaigns =
    target_type === "subscription" ? ["lead_generation", "conversion", "retention"]
    : target_type === "upsell" ? ["upsell", "retention"]
    : target_type === "win_back" ? ["win_back"]
    : ["lead_generation", "conversion", "authority"];

  const recommended_platforms = ["instagram", "linkedin", "tiktok"];
  const recommended_content_mix = {
    educational: 0.4, authority: 0.2, offer: 0.25, social_proof: 0.15,
    note: "Internal estimate. Replace with real channel performance once available.",
  };

  return json({
    ok: true, no_records_mutated: true, dry_run: true,
    disclaimer: "Internal estimate only — not financial advice. Assumptions must be validated with real data.",
    target_summary: target_amount
      ? `${currency || "GBP"} ${target_amount}${period_start ? ` between ${period_start} and ${period_end ?? "?"}` : ""}`
      : target_count ? `${target_count} signups`
      : "No target set",
    target_amount, target_count, currency: currency || "GBP",
    period_start, period_end, primary_offer, revenue_target_id,
    ...est,
    recommended_platforms, recommended_campaigns, recommended_content_mix,
  });
});