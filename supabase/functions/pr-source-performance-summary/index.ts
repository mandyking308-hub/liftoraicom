// Source performance summary. Founder/admin only. Read-only aggregation
// across inbound, opportunities, matches, drafts, submissions, coverage.
// Returns a per-source decision recommendation. Saves an audit snapshot
// when save_snapshot=true.

import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

function avg(nums: number[]) {
  const xs = nums.filter((n) => typeof n === "number" && !Number.isNaN(n));
  if (!xs.length) return null;
  return Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100;
}

function recommend(s: any): string {
  const usefulOpps = s.opportunities_extracted;
  const inb = s.inbound_messages;
  const strong = s.strong_matches;
  const approvals = s.founder_approved_drafts;
  const coverage = s.coverage_mentions;
  const risk = s.avg_risk ?? 0;

  if (inb === 0 && usefulOpps === 0) return "needs_more_data";
  if (approvals >= 1 || coverage >= 1 || strong >= 3) {
    return (approvals >= 3 || coverage >= 2) ? "upgrade" : "keep";
  }
  if (inb >= 10 && usefulOpps === 0) return "park";
  if (risk >= 70 && approvals === 0) return "cancel";
  if (inb < 5 && usefulOpps < 2) return "needs_more_data";
  return "monitor";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await requireFounder(req);
    if ("error" in auth) return auth.error;
    const admin = auth.admin;
    const body = await req.json().catch(() => ({}));
    const dateFrom = body.date_from ? new Date(body.date_from).toISOString() : new Date(Date.now() - 90 * 86400 * 1000).toISOString();
    const dateTo = body.date_to ? new Date(body.date_to).toISOString() : new Date().toISOString();
    const sourceId: string | undefined = body.source_id;
    const saveSnapshot = !!body.save_snapshot;

    let sq = admin.from("pr_sources").select("*").order("source_name");
    if (sourceId) sq = sq.eq("id", sourceId);
    const { data: sources, error: sErr } = await sq;
    if (sErr) return json({ ok: false, reason: "sources_query_failed", message: sErr.message }, 500);

    // Bulk fetch
    const sourceIds = (sources ?? []).map((s: any) => s.id);
    const { data: inbound } = await admin.from("pr_inbound_messages")
      .select("id,source_id,received_at").in("source_id", sourceIds)
      .gte("received_at", dateFrom).lte("received_at", dateTo);
    const { data: opps } = await admin.from("media_opportunities")
      .select("id,source_id,urgency_score,risk_score,publication_value_score,seo_value_score,sales_value_score,inbound_message_id,created_at")
      .in("source_id", sourceIds)
      .gte("created_at", dateFrom).lte("created_at", dateTo);
    const oppIds = (opps ?? []).map((o: any) => o.id);
    const { data: matches } = oppIds.length ? await admin.from("media_opportunity_matches")
      .select("id,opportunity_id,match_score,recommended_action").in("opportunity_id", oppIds) : { data: [] as any[] };
    const { data: drafts } = oppIds.length ? await admin.from("media_pitch_drafts")
      .select("id,opportunity_id,approval_status").in("opportunity_id", oppIds) : { data: [] as any[] };
    const draftIds = (drafts ?? []).map((d: any) => d.id);
    const { data: subs } = draftIds.length ? await admin.from("media_pitch_submissions")
      .select("id,pitch_draft_id,submitted_via,gmail_thread_id").in("pitch_draft_id", draftIds) : { data: [] as any[] };
    const { data: coverage } = await admin.from("coverage_mentions")
      .select("id,published_at").gte("published_at", dateFrom).lte("published_at", dateTo);

    const summaries = (sources ?? []).map((s: any) => {
      const inb = (inbound ?? []).filter((x: any) => x.source_id === s.id);
      const sOpps = (opps ?? []).filter((x: any) => x.source_id === s.id);
      const sOppIds = new Set(sOpps.map((o: any) => o.id));
      const sMatches = (matches ?? []).filter((m: any) => sOppIds.has(m.opportunity_id));
      const strong = sMatches.filter((m: any) => (m.match_score ?? 0) >= 75 || m.recommended_action === "draft_pitch").length;
      const sDrafts = (drafts ?? []).filter((d: any) => sOppIds.has(d.opportunity_id));
      const approved = sDrafts.filter((d: any) => d.approval_status === "founder_approved").length;
      const sDraftIds = new Set(sDrafts.map((d: any) => d.id));
      const sSubs = (subs ?? []).filter((u: any) => sDraftIds.has(u.pitch_draft_id));
      const gmail = sSubs.filter((u: any) => u.gmail_thread_id || u.submitted_via === "gmail").length;
      const platform = sSubs.filter((u: any) => u.submitted_via && u.submitted_via !== "gmail").length;
      const out: any = {
        source_id: s.id,
        source_name: s.source_name,
        source_type: s.source_type,
        cost_status: s.cost_status,
        platform_status: s.platform_status,
        inbound_messages: inb.length,
        opportunities_extracted: sOpps.length,
        opportunities_matched: sMatches.length,
        strong_matches: strong,
        pitch_drafts: sDrafts.length,
        founder_approved_drafts: approved,
        gmail_drafts_created: gmail,
        platform_submissions: platform,
        coverage_mentions: 0, // coverage isn't reliably linked to source today; left as 0 for honesty
        avg_urgency: avg(sOpps.map((o: any) => o.urgency_score ?? 0)),
        avg_publication_value: avg(sOpps.map((o: any) => o.publication_value_score ?? 0)),
        avg_seo_value: avg(sOpps.map((o: any) => o.seo_value_score ?? 0)),
        avg_sales_value: avg(sOpps.map((o: any) => o.sales_value_score ?? 0)),
        avg_risk: avg(sOpps.map((o: any) => o.risk_score ?? 0)),
      };
      out.decision_recommendation = recommend(out);
      return out;
    });

    if (saveSnapshot) {
      await admin.from("pr_audit_events").insert({
        event_type: "pr_source_performance_snapshot",
        related_type: "pr_sources",
        event_summary: `Source performance summary (${summaries.length} sources).`,
        metadata: { date_from: dateFrom, date_to: dateTo, summaries, coverage_total: (coverage ?? []).length },
      });
    }

    return json({ ok: true, date_from: dateFrom, date_to: dateTo, summaries, coverage_total: (coverage ?? []).length });
  } catch (e) {
    return json({ ok: false, reason: "unhandled", message: String((e as Error)?.message ?? e) }, 500);
  }
});