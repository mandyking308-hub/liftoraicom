// Generate a safe template-based PR pitch draft for one media_opportunity_match.
// Founder/admin only. No external sending. No Gmail send. No AI calls in this build
// (AI Gateway routing deferred to a later phase — template generator is the safe path).

import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

function asArr(v: any): any[] { return Array.isArray(v) ? v : []; }
function nonEmpty(v: any): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}
function complianceOk(r: any): boolean {
  const s = String(r?.compliance_clearance_status || "").toLowerCase();
  return s === "approved" || s === "clear" || s === "cleared" || s === "not_required";
}
function readinessOk(r: any): boolean {
  const s = String(r?.press_ready_status || "").toLowerCase();
  return s === "ready" || s === "press_ready";
}
function clip(s: string, n = 280): string { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

function pickFirstString(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v)) {
    for (const item of v) {
      if (typeof item === "string" && item.trim()) return item.trim();
      if (item && typeof item === "object") {
        const t = item.text || item.quote || item.value || item.url;
        if (typeof t === "string" && t.trim()) return t.trim();
      }
    }
  }
  if (typeof v === "object") {
    const t = (v as any).text || (v as any).quote || (v as any).value || (v as any).url;
    if (typeof t === "string" && t.trim()) return t.trim();
  }
  return null;
}

function detectMissingAssets(r: any, opp: any): string[] {
  const missing: string[] = [];
  if (!nonEmpty(r.approved_one_line_description) && !nonEmpty(r.approved_50_word_description)) missing.push("short_description");
  if (!nonEmpty(r.approved_150_word_description)) missing.push("long_description");
  if (!nonEmpty(r.approved_logo)) missing.push("logo");
  if (!nonEmpty(r.approved_images)) missing.push("product_images");
  if (!nonEmpty(r.approved_founder_quote) && !nonEmpty(r.approved_company_quotes)) missing.push("approved_quote");
  if (!nonEmpty(r.approved_case_studies)) missing.push("case_study");
  if (!nonEmpty(r.approved_press_contact)) missing.push("press_contact");
  if (!r.website_live && !r.public_offer_live) missing.push("public_website_or_offer");
  if (!complianceOk(r)) missing.push("compliance_clearance");
  if (opp?.opportunity_type === "image_request" && !nonEmpty(r.approved_images)) missing.push("hi_res_imagery");
  return missing;
}

function pickSendMethod(opp: any, journalist: any): string {
  const route = String(journalist?.contact_route || "").toLowerCase();
  const platform = String(journalist?.platform_name || opp?.platform_name || "").toLowerCase();
  const email = String(journalist?.email || opp?.pitch_email || "").trim();
  if (platform.includes("qwoted") || platform.includes("haro") || route === "platform_only") return "platform_copy_paste";
  if (route === "email_allowed" && email && /@/.test(email)) return "gmail_draft";
  if (email && /@/.test(email) && route !== "do_not_contact") return "gmail_draft";
  return "manual_review_only";
}

function riskLevel(opp: any, r: any, missing: string[]): "low" | "medium" | "high" {
  const risk = Number(opp?.risk_score ?? 0);
  if (risk >= 70) return "high";
  if (!complianceOk(r)) return "high";
  if (missing.length >= 3) return "high";
  if (risk >= 40 || missing.length > 0) return "medium";
  return "low";
}

function buildTemplate(opts: {
  opp: any; r: any; journalist: any; outlet: any; missing: string[]; sendMethod: string;
}): { subject: string; body: string; quoteOptions: any[]; platformInstructions: string | null } {
  const { opp, r, journalist, outlet, missing, sendMethod } = opts;

  const bizName = r.business_name || "the business";
  const oneLine = r.approved_one_line_description || r.approved_50_word_description || "";
  const longDesc = r.approved_150_word_description || r.approved_50_word_description || oneLine;
  const approvedQuote = pickFirstString(r.approved_founder_quote) || pickFirstString(r.approved_company_quotes);
  const websiteUrl = pickFirstString((r as any).website_url) || null;
  const logoUrl = pickFirstString(r.approved_logo);
  const imageUrl = pickFirstString(r.approved_images);
  const caseStudy = pickFirstString(r.approved_case_studies);
  const pressContact = r.approved_press_contact || "Mandy King";
  const claims = asArr(r.approved_claims).map((c: any) => typeof c === "string" ? c : (c?.text || c?.claim || "")).filter(Boolean).slice(0, 3);

  const oppTitle = opp.title || opp.request_summary || "your request";
  const oppAsk = clip(opp.exact_ask || opp.request_summary || oppTitle, 240);
  const pub = opp.publication_name || outlet?.outlet_name || "your outlet";
  const journalistName = journalist?.name?.split(/\s+/)?.[0] || "there";

  const subject = clip(`Re: ${oppTitle} — ${bizName}`, 140);

  const bullets: string[] = [];
  if (oneLine) bullets.push(oneLine);
  for (const c of claims) bullets.push(c);
  if (caseStudy) bullets.push(`Proof point: ${clip(caseStudy, 180)}`);
  while (bullets.length < 3) bullets.push("[add detail — approved fact required before sending]");

  const assetLines: string[] = [];
  if (websiteUrl) assetLines.push(`- Website: ${websiteUrl}`);
  if (logoUrl) assetLines.push(`- Logo: ${logoUrl}`);
  if (imageUrl) assetLines.push(`- Imagery available on request`);
  if (!assetLines.length) assetLines.push("- Assets pending — see asset checklist before sending.");

  const quoteBlock = approvedQuote
    ? `Possible quote:\n"${clip(approvedQuote, 320)}"`
    : `Possible quote:\n"[quote required — none approved yet. Do not send without an approved quote.]"`;

  const greeting = sendMethod === "platform_copy_paste"
    ? `Hi ${journalistName !== "there" ? journalistName : "there"},`
    : `Hi ${journalistName},`;

  const intro = `Responding to your request on ${pub}: ${oppAsk}`;
  const close = `Happy to provide more detail, an additional quote or hi-res imagery on request.\n\nBest,\n${pressContact}`;

  const body = [
    greeting,
    "",
    intro,
    "",
    `Why ${bizName} fits:`,
    ...bullets.map((b) => `- ${b}`),
    "",
    quoteBlock,
    "",
    "Available assets:",
    ...assetLines,
    "",
    close,
  ].join("\n");

  let platformInstructions: string | null = null;
  if (sendMethod === "platform_copy_paste") {
    const platform = journalist?.platform_name || opp?.platform_name || "the platform";
    platformInstructions = [
      `Open ${platform} manually and locate the request: ${oppTitle}`,
      "Paste the prepared message above into the platform reply box.",
      "Do not contact the journalist outside the platform unless a separate lawful contact route is recorded.",
      "When submitted, return here and mark the draft as 'Submitted manually'.",
    ].join("\n");
  }

  const quoteOptions = approvedQuote ? [{ text: approvedQuote, source: "approved_press_pack" }] : [];

  return { subject, body, quoteOptions, platformInstructions };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await requireFounder(req);
    if ("error" in auth) return auth.error;
    const admin = auth.admin;
    const user = auth.user;

    const body = await req.json().catch(() => ({}));
    const matchId: string | undefined = body.match_id;
    const draftMode: string = body.draft_mode === "ai_gateway" ? "ai_gateway" : "template";
    const dryRun = !!body.dry_run;
    const forceRegenerate = !!body.force_regenerate;
    if (!matchId) return json({ ok: false, reason: "match_id_required" }, 400);

    // Load match
    const { data: match, error: mErr } = await admin.from("media_opportunity_matches").select("*").eq("id", matchId).maybeSingle();
    if (mErr) return json({ ok: false, reason: "match_query_failed", message: mErr.message }, 500);
    if (!match) return json({ ok: false, reason: "match_not_found" }, 404);

    const [{ data: opp }, { data: readiness }] = await Promise.all([
      admin.from("media_opportunities").select("*").eq("id", match.opportunity_id).maybeSingle(),
      admin.from("business_press_readiness").select("*").eq("business_id", match.business_id).maybeSingle(),
    ]);
    if (!opp) return json({ ok: false, reason: "opportunity_not_found" }, 404);
    if (!readiness) return json({ ok: false, reason: "press_readiness_not_found" }, 404);

    // Hard gates
    if (!readiness.is_active) return json({ ok: false, reason: "business_not_active" }, 422);
    if (!readinessOk(readiness)) return json({ ok: false, reason: "business_not_press_ready", press_ready_status: readiness.press_ready_status }, 422);
    if (!complianceOk(readiness)) return json({ ok: false, reason: "compliance_not_cleared", compliance_clearance_status: readiness.compliance_clearance_status }, 422);
    const rec = String(match.recommended_action || "").toLowerCase();
    if (rec === "block" || rec === "reject" || rec === "park") return json({ ok: false, reason: "match_blocked_or_parked", recommended_action: rec }, 422);

    // Blocked topic check (defence in depth)
    const blockedTopics = asArr(readiness.blocked_topics).map((t: any) => String(t).toLowerCase()).filter(Boolean);
    const hay = [opp.title, opp.topic, opp.beat, opp.category, opp.request_summary, opp.exact_ask].map((s: any) => String(s || "").toLowerCase()).join(" \n ");
    const blockedHit = blockedTopics.find((t) => hay.includes(t));
    if (blockedHit) return json({ ok: false, reason: "blocked_topic_conflict", blocked_topic: blockedHit }, 422);

    if (Number(opp.risk_score ?? 0) >= 70 && !complianceOk(readiness)) {
      return json({ ok: false, reason: "high_risk_no_compliance" }, 422);
    }

    // Optional outlet / journalist
    let journalist: any = null; let outlet: any = null;
    if (opp.publication_name) {
      const { data: jrs } = await admin.from("journalist_relationships").select("*").eq("publication_name", opp.publication_name).limit(1);
      journalist = jrs?.[0] ?? null;
      if (journalist?.outlet_id) {
        const { data: o } = await admin.from("media_outlets").select("*").eq("id", journalist.outlet_id).maybeSingle();
        outlet = o ?? null;
      }
    }

    const missing = detectMissingAssets(readiness, opp);
    const sendMethod = pickSendMethod(opp, journalist);
    const risk = riskLevel(opp, readiness, missing);

    // Approval status determination
    let approvalStatus = "draft";
    const needsReview = rec === "request_assets" || rec === "prepare_only" || missing.length > 0 || risk === "high";
    if (needsReview) approvalStatus = "needs_review";

    const t = buildTemplate({ opp, r: readiness, journalist, outlet, missing, sendMethod });

    const complianceNotes = [
      rec === "request_assets" ? "Match flagged request_assets — review missing items before approving." : null,
      rec === "prepare_only" ? "Match flagged prepare_only — no external action without founder approval." : null,
      missing.length ? `Missing assets: ${missing.join(", ")}.` : null,
      "Do not include private Liftor architecture, tax/entity/adviser structure, family/school details or non-public founder strategy.",
      "Only approved press-pack wording, claims and quotes may be used.",
      "No external send. Approval enables Gmail draft creation or platform copy/paste only.",
    ].filter(Boolean).join(" ");

    // Dedupe: existing draft for same opportunity+business
    const { data: existing } = await admin.from("media_pitch_drafts")
      .select("id,approval_status,created_at")
      .eq("opportunity_id", opp.id)
      .eq("business_id", readiness.business_id)
      .order("created_at", { ascending: false })
      .limit(1);
    const existingDraft = existing?.[0] ?? null;
    if (existingDraft && !forceRegenerate) {
      return json({
        ok: true, deduped: true, draft_id: existingDraft.id, approval_status: existingDraft.approval_status,
        send_method: sendMethod, risk_level: risk, missing_assets: missing,
        draft_mode: "template", dry_run: dryRun, ai_used: false,
      });
    }

    const payload: any = {
      opportunity_id: opp.id,
      business_id: readiness.business_id,
      journalist_relationship_id: journalist?.id ?? null,
      outlet_id: outlet?.id ?? journalist?.outlet_id ?? null,
      draft_subject: t.subject,
      draft_body: t.body,
      quote_options: t.quoteOptions,
      asset_checklist: missing.map((m) => ({ item: m, status: "missing" })),
      send_method: sendMethod,
      platform_instructions: t.platformInstructions,
      risk_level: risk,
      compliance_notes: complianceNotes,
      approval_status: approvalStatus,
      created_by_ai: false,
      ai_usage_id: null,
    };

    if (dryRun) {
      return json({
        ok: true, dry_run: true, draft_mode: "template", ai_used: false,
        send_method: sendMethod, risk_level: risk, approval_status: approvalStatus, missing_assets: missing,
        preview: { subject: t.subject, body_preview: clip(t.body, 800), platform_instructions: t.platformInstructions },
      });
    }

    let draftId: string | null = existingDraft?.id ?? null;
    if (existingDraft && forceRegenerate) {
      const { error: uErr } = await admin.from("media_pitch_drafts").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", existingDraft.id);
      if (uErr) return json({ ok: false, reason: "update_failed", message: uErr.message }, 500);
      draftId = existingDraft.id;
    } else {
      const { data: ins, error: iErr } = await admin.from("media_pitch_drafts").insert(payload).select("id").maybeSingle();
      if (iErr) return json({ ok: false, reason: "insert_failed", message: iErr.message }, 500);
      draftId = ins?.id ?? null;
    }

    await admin.from("pr_audit_events").insert({
      event_type: "pr_pitch_draft_generated",
      actor_user_id: user.id,
      summary: `Draft ${forceRegenerate ? "regenerated" : "generated"} (template) · risk=${risk} · send=${sendMethod} · missing=${missing.length}`,
      metadata: { draft_id: draftId, opportunity_id: opp.id, business_id: readiness.business_id, draft_mode: "template", ai_used: false, ai_requested: draftMode === "ai_gateway" },
    });

    return json({
      ok: true, draft_id: draftId, draft_mode: "template", ai_used: false,
      ai_deferred: draftMode === "ai_gateway",
      send_method: sendMethod, risk_level: risk, approval_status: approvalStatus, missing_assets: missing,
    });
  } catch (e: any) {
    return json({ ok: false, reason: "exception", message: e?.message || String(e) }, 500);
  }
});