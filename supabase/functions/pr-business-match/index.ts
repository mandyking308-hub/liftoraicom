// Rules-based matcher: media_opportunities × business_press_readiness.
// Writes media_opportunity_matches. Founder/admin only.
// No AI. No sending. No drafting. No scraping.

import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const STRONG = 75;
const POSSIBLE = 50;
const WEAK = 25;

function norm(s?: string | null): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function tokens(s?: string | null): Set<string> {
  return new Set(norm(s).split(" ").filter((t) => t.length >= 3));
}
function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0; for (const t of a) if (b.has(t)) n++; return n;
}
function asArr(v: any): any[] { return Array.isArray(v) ? v : []; }
function nonEmpty(v: any): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function readinessOk(r: any): boolean {
  return (r?.press_ready_status === "ready" || r?.press_ready_status === "press_ready");
}
function complianceOk(r: any): boolean {
  const s = (r?.compliance_clearance_status || "").toLowerCase();
  return s === "approved" || s === "clear" || s === "not_required" || s === "cleared";
}

function detectMissing(r: any): string[] {
  const missing: string[] = [];
  if (!nonEmpty(r.approved_one_line_description)) missing.push("one_line_description");
  if (!nonEmpty(r.approved_50_word_description)) missing.push("50_word_description");
  if (!nonEmpty(r.approved_150_word_description)) missing.push("150_word_description");
  if (!nonEmpty(r.approved_logo)) missing.push("logo");
  if (!nonEmpty(r.approved_images)) missing.push("product_or_service_images");
  if (!nonEmpty(r.approved_founder_quote) && !nonEmpty(r.approved_company_quotes)) missing.push("founder_or_company_quote");
  if (!nonEmpty(r.approved_claims)) missing.push("approved_claims");
  if (!nonEmpty(r.approved_case_studies)) missing.push("case_study_or_proof");
  if (!nonEmpty(r.approved_press_contact)) missing.push("press_contact");
  if (!r.website_live && !r.public_offer_live) missing.push("website_or_public_url");
  if (!r.public_offer_live) missing.push("public_offer");
  if (!complianceOk(r)) missing.push("compliance_clearance");
  return missing;
}

function blockedTopicHit(opp: any, r: any): string | null {
  const blocked = asArr(r.blocked_topics).map((t) => String(t).toLowerCase()).filter(Boolean);
  if (!blocked.length) return null;
  const hay = [opp.title, opp.topic, opp.beat, opp.category, opp.request_summary, opp.exact_ask]
    .map((s) => (s || "").toLowerCase()).join(" \n ");
  for (const t of blocked) if (t && hay.includes(t)) return t;
  return null;
}

function scoreMatch(opp: any, r: any): { score: number; reasons: string[]; missing: string[]; blockedTopic: string | null } {
  const reasons: string[] = [];
  let score = 0;

  // Keyword/category overlap across opportunity vs readiness descriptions/claims.
  const oppTokens = tokens([opp.title, opp.topic, opp.beat, opp.category, opp.request_summary, opp.exact_ask].join(" "));
  const bizTokens = tokens([
    r.business_name,
    r.approved_one_line_description,
    r.approved_50_word_description,
    r.approved_150_word_description,
    ...asArr(r.approved_claims).map((c: any) => typeof c === "string" ? c : JSON.stringify(c)),
  ].join(" "));
  const ov = overlap(oppTokens, bizTokens);
  if (ov >= 4) { score += 30; reasons.push(`keyword overlap (${ov})`); }
  else if (ov >= 2) { score += 15; reasons.push(`weak keyword overlap (${ov})`); }

  // Direct product/service/business relevance via business_name in opportunity text.
  if (r.business_name && norm([opp.title, opp.request_summary, opp.exact_ask].join(" ")).includes(norm(r.business_name))) {
    score += 20; reasons.push("business name referenced");
  }

  // Market/country fit (light heuristic).
  const oppCountry = (opp.country_market || "").toLowerCase();
  if (oppCountry && (oppCountry === "uk" || oppCountry === "us" || oppCountry === "global")) {
    score += 15; reasons.push(`market ${oppCountry}`);
  }

  // Outlet/SEO/business value.
  const pv = Number(opp.publication_value_score ?? 0);
  const sv = Number(opp.seo_value_score ?? 0);
  const bv = Number(opp.sales_value_score ?? 0);
  if (pv >= 70 || sv >= 70 || bv >= 70) { score += 10; reasons.push("high outlet/SEO/business value"); }

  // Opportunity type fit (always small bonus; specific types weighted later).
  if (opp.opportunity_type) { score += 10; reasons.push(`type ${opp.opportunity_type}`); }

  // Active business with live presence.
  if (r.is_active && (r.website_live || r.public_offer_live)) {
    score += 10; reasons.push("active business with live presence");
  }

  // Has relevant approved assets.
  if (nonEmpty(r.approved_claims) || nonEmpty(r.approved_company_quotes) || nonEmpty(r.approved_founder_quote)) {
    score += 10; reasons.push("approved assets present");
  }

  const blockedTopic = blockedTopicHit(opp, r);
  if (blockedTopic) { score -= 20; reasons.push(`blocked topic: ${blockedTopic}`); }

  if (Number(opp.risk_score ?? 0) >= 60 && !complianceOk(r)) {
    score -= 20; reasons.push("high risk, no compliance clearance");
  }
  if (!readinessOk(r)) { score -= 15; reasons.push("not press-ready"); }
  if (!r.is_active) { score -= 50; reasons.push("inactive business"); }

  const missing = detectMissing(r);
  return { score, reasons, missing, blockedTopic };
}

function recommend(opp: any, r: any, score: number, missing: string[], blockedTopic: string | null): { action: string; gate: string; readiness: string } {
  const gate = r.is_active ? "active" : "inactive";
  const readiness = readinessOk(r) && complianceOk(r) ? "ready" : (r.is_active ? "needs_assets" : "blocked");
  if (blockedTopic) return { action: "block", gate, readiness: "blocked" };
  if (!r.is_active) return { action: "block", gate, readiness: "blocked" };
  if (score >= STRONG && readiness === "ready" && (r.website_live || r.public_offer_live) && missing.length === 0) {
    return { action: "draft_pitch", gate, readiness };
  }
  if (score >= POSSIBLE) {
    if (missing.length > 0 || !readinessOk(r)) return { action: "request_assets", gate, readiness: "needs_assets" };
    if (Number(opp.risk_score ?? 0) >= 60 || !opp.deadline_at) return { action: "prepare_only", gate, readiness };
    return { action: "prepare_only", gate, readiness };
  }
  if (score >= WEAK) return { action: "park", gate, readiness };
  return { action: "reject", gate, readiness };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await requireFounder(req);
    if ("error" in auth) return auth.error;
    const admin = auth.admin;

    const body = await req.json().catch(() => ({}));
    const opportunityId: string | undefined = body.opportunity_id;
    const businessId: string | undefined = body.business_id;
    const limit = Math.max(1, Math.min(200, Number(body.limit) || 50));
    const dryRun = !!body.dry_run;
    const forceRematch = !!body.force_rematch;
    const includeNeedsReview = body.include_needs_review !== false;

    // 1. Load businesses (manual readiness records are the source of truth).
    let bq = admin.from("business_press_readiness").select("*").eq("is_active", true);
    if (businessId) bq = admin.from("business_press_readiness").select("*").eq("business_id", businessId);
    const { data: businesses, error: bErr } = await bq;
    if (bErr) return json({ ok: false, reason: "businesses_query_failed", message: bErr.message }, 500);
    if (!businesses || businesses.length === 0) {
      return json({ ok: true, reason: "no_active_businesses", businesses_seen: 0, opportunities_seen: 0, matches_inserted: 0, matches_updated: 0 });
    }

    // 2. Load candidate opportunities.
    const statuses = includeNeedsReview ? ["new", "needs_review"] : ["new"];
    let oq = admin.from("media_opportunities")
      .select("id,title,category,topic,beat,request_summary,exact_ask,publication_name,opportunity_type,country_market,urgency_score,publication_value_score,seo_value_score,sales_value_score,risk_score,deadline_at,status")
      .in("status", statuses)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (opportunityId) oq = oq.eq("id", opportunityId);
    const { data: opps, error: oErr } = await oq;
    if (oErr) return json({ ok: false, reason: "opps_query_failed", message: oErr.message }, 500);
    const opportunities = opps ?? [];

    // 3. Existing matches for dedupe.
    const oppIds = opportunities.map((o: any) => o.id);
    const { data: existing } = oppIds.length
      ? await admin.from("media_opportunity_matches").select("id,opportunity_id,business_id").in("opportunity_id", oppIds)
      : { data: [] as any[] } as any;
    const existingKey = new Map<string, string>();
    (existing ?? []).forEach((m: any) => existingKey.set(`${m.opportunity_id}|${m.business_id}`, m.id));

    const counts = { draft_pitch: 0, request_assets: 0, prepare_only: 0, park: 0, reject: 0, block: 0 };
    let inserted = 0, updated = 0, skipped = 0;
    const proposed: any[] = [];

    for (const opp of opportunities) {
      for (const r of businesses) {
        const key = `${opp.id}|${r.business_id}`;
        const existingId = existingKey.get(key);
        if (existingId && !forceRematch) { skipped++; continue; }
        const { score, reasons, missing, blockedTopic } = scoreMatch(opp, r);
        const rec = recommend(opp, r, score, missing, blockedTopic);
        (counts as any)[rec.action] = ((counts as any)[rec.action] ?? 0) + 1;

        const patch = {
          opportunity_id: opp.id,
          business_id: r.business_id,
          match_score: Math.max(-100, Math.min(100, score)),
          match_reason: reasons.join("; ").slice(0, 1000) || null,
          active_business_gate_status: rec.gate,
          press_readiness_status: rec.readiness,
          missing_assets: missing,
          risk_notes: blockedTopic ? `blocked_topic:${blockedTopic}` : (Number(opp.risk_score ?? 0) >= 60 ? "high_risk_opportunity" : null),
          recommended_action: rec.action,
        };

        if (dryRun) { proposed.push(patch); continue; }
        if (existingId) {
          const { error } = await admin.from("media_opportunity_matches").update(patch).eq("id", existingId);
          if (!error) updated++;
        } else {
          const { error } = await admin.from("media_opportunity_matches").insert(patch);
          if (!error) inserted++;
        }
      }
    }

    if (!dryRun) {
      await admin.from("pr_audit_events").insert({
        event_type: "opportunity_business_match_run",
        related_type: "media_opportunity_matches",
        event_summary: `Matched ${opportunities.length} opportunities × ${businesses.length} businesses → +${inserted}, ~${updated}.`,
        metadata: { opportunities_seen: opportunities.length, businesses_seen: businesses.length, inserted, updated, skipped, counts, opportunity_id: opportunityId ?? null, business_id: businessId ?? null, force_rematch: forceRematch },
      });
    }

    return json({
      ok: true,
      dry_run: dryRun,
      opportunities_seen: opportunities.length,
      businesses_seen: businesses.length,
      matches_inserted: inserted,
      matches_updated: updated,
      matches_skipped: skipped,
      ...counts,
      preview: dryRun ? proposed.slice(0, 50) : undefined,
    });
  } catch (e: any) {
    return json({ ok: false, reason: "exception", message: String(e?.message ?? e) }, 500);
  }
});