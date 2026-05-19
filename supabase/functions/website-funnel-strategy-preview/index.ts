import { corsHeaders, json, requireFounder, recommendFunnel, complianceWarnings, SAFETY_FLAGS } from "../_shared/websiteFunnelLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, strategy_type = "lead_generation", target_audience, primary_offer, website_url } = body;
  if (!business_id) return json({ ok: false, error: "missing_business_id" }, 400);
  const rec = recommendFunnel(strategy_type);
  const missing_proof: string[] = [];
  if (!primary_offer) missing_proof.push("primary_offer_missing");
  if (!target_audience) missing_proof.push("target_audience_missing");
  return json({
    ok: true, dry_run: true, no_records_mutated: true,
    recommended_funnel_type: strategy_type,
    recommended_pages: rec.pages,
    primary_cta: rec.primary_cta,
    secondary_cta: rec.secondary_cta,
    recommended_lead_magnet: rec.lead_magnet || null,
    proof_required: ["real customer outcome (no invention)","real credentials","real screenshots if claims are made"],
    missing_proof,
    risk_warnings: complianceWarnings(strategy_type),
    website_url_seen: website_url ?? null,
    ...SAFETY_FLAGS,
  });
});