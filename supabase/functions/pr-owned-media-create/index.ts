// Owned-media article record creation. Founder/admin only.
// Template-only draft body. No external publishing, no AI.

import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const ALLOWED_TYPES = new Set([
  "newsroom_update","blog_post","press_note","charity_update",
  "product_announcement","expert_commentary","mini_report","case_study","founder_note",
]);

function buildTemplateBody(r: any, articleType: string, related: any | null, title: string) {
  const name = r.business_name || "the business";
  const oneLine = r.approved_one_line_description || "[ONE-LINE DESCRIPTION PENDING]";
  const fifty = r.approved_50_word_description || "[50-WORD DESCRIPTION PENDING]";
  const oneFifty = r.approved_150_word_description || "[150-WORD DESCRIPTION PENDING]";
  const claims: string[] = Array.isArray(r.approved_claims) ? r.approved_claims : [];
  const quote = r.approved_founder_quote || "[FOUNDER QUOTE PENDING APPROVAL]";
  const missing = Array.isArray(r.missing_items) ? r.missing_items : [];

  const sections: string[] = [
    `# ${title || `${name} — ${articleType.replace(/_/g, " ")}`}`,
    ``,
    `> Draft for founder review. Approved public-safe content only. Do not publish externally without final approval.`,
    ``,
    `## About ${name}`,
    oneFifty,
    ``,
    `## Short summary (50 words)`,
    fifty,
    ``,
    `## One-liner`,
    oneLine,
    ``,
    `## Approved claims`,
    claims.length ? claims.map((c) => `- ${c}`).join("\n") : "[NO APPROVED CLAIMS — ADD BEFORE PUBLISH]",
    ``,
    `## Founder quote`,
    quote,
    ``,
  ];
  if (related) {
    sections.push(`## Related media opportunity`);
    sections.push(`- Title: ${related.title || "—"}`);
    sections.push(`- Publication: ${related.publication_name || "—"}`);
    sections.push(`- Topic: ${related.topic || related.category || "—"}`);
    sections.push(``);
  }
  if (missing.length) {
    sections.push(`## Missing assets checklist`);
    missing.forEach((m: string) => sections.push(`- [ ] ${m}`));
    sections.push(``);
  }
  sections.push(`---`);
  sections.push(`Safety: no implied endorsements; no private architecture / tax / entity / adviser / family details; only approved public claims.`);
  return sections.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await requireFounder(req);
    if ("error" in auth) return auth.error;
    const admin = auth.admin;

    const body = await req.json().catch(() => ({}));
    let { business_id, campaign_id, related_opportunity_id, article_type, title } = body;
    const dryRun = !!body.dry_run;

    if (!article_type || !ALLOWED_TYPES.has(article_type)) {
      return json({ ok: false, reason: "invalid_article_type", allowed: [...ALLOWED_TYPES] }, 400);
    }
    if (!business_id && !campaign_id) {
      return json({ ok: false, reason: "missing_business_or_campaign" }, 400);
    }

    let campaign: any = null;
    if (campaign_id) {
      const { data: c } = await admin.from("quarterly_pr_campaigns").select("id,business_id").eq("id", campaign_id).maybeSingle();
      if (!c) return json({ ok: false, reason: "campaign_not_found" }, 404);
      campaign = c;
      business_id = business_id || c.business_id;
    }

    const { data: readiness } = await admin.from("business_press_readiness").select("*").eq("business_id", business_id).maybeSingle();
    if (!readiness) return json({ ok: false, reason: "readiness_not_found" }, 404);
    if (!readiness.is_active) return json({ ok: false, reason: "business_not_active" }, 422);

    let related: any = null;
    if (related_opportunity_id) {
      const { data: o } = await admin.from("media_opportunities").select("id,title,publication_name,topic,category").eq("id", related_opportunity_id).maybeSingle();
      related = o ?? null;
    }

    const status_pubn = "draft";
    const status_approval = readiness.press_ready_status === "ready" ? "draft" : "needs_assets";
    const draft_body = buildTemplateBody(readiness, article_type, related, title ?? "");
    const finalTitle = title || `${readiness.business_name || "Business"} — ${article_type.replace(/_/g, " ")}`;

    if (dryRun) {
      return json({ ok: true, dry_run: true, preview: { title: finalTitle, article_type, approval_status: status_approval, body_chars: draft_body.length } });
    }

    const { data: inserted, error } = await admin.from("owned_media_articles").insert({
      business_id,
      campaign_id: campaign?.id ?? campaign_id ?? null,
      related_opportunity_id: related_opportunity_id ?? null,
      title: finalTitle,
      article_type,
      draft_body,
      target_keywords: [],
      publication_status: status_pubn,
      approval_status: status_approval,
    }).select("id").single();
    if (error) return json({ ok: false, reason: "insert_failed", message: error.message }, 500);

    await admin.from("pr_audit_events").insert({
      event_type: "owned_media_article_created",
      related_type: "owned_media_articles",
      related_id: inserted.id,
      event_summary: `Created ${article_type} draft "${finalTitle}" (approval_status=${status_approval}).`,
      metadata: { business_id, campaign_id: campaign?.id ?? null, article_type, approval_status: status_approval },
    });

    return json({ ok: true, id: inserted.id, approval_status: status_approval, publication_status: status_pubn });
  } catch (e) {
    return json({ ok: false, reason: "unhandled", message: String((e as Error)?.message ?? e) }, 500);
  }
});