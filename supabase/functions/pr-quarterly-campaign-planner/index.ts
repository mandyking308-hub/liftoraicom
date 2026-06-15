// Quarterly PR campaign planner. Founder/admin only.
// Rules-based; no AI. Creates/updates one quarterly_pr_campaigns row per
// active + (ready|partially_ready) business per quarter/year. Does not
// overwrite founder-entered fields unless force_update=true.

import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

function currentQuarter(d = new Date()): { quarter: string; year: number } {
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return { quarter: `Q${q}`, year: d.getUTCFullYear() };
}
function quarterDueDate(quarter: string, year: number): string {
  const qn = Number(quarter.replace(/[^0-9]/g, "")) || 1;
  const endMonth = qn * 3; // 3,6,9,12
  const last = new Date(Date.UTC(year, endMonth, 0));
  return last.toISOString().slice(0, 10);
}
function uniq<T>(a: T[]) { return Array.from(new Set(a)); }

function buildSuggestion(r: any, recentOpps: any[]) {
  const name = r.business_name || "Business";
  const oneLine = r.approved_one_line_description || "";
  const claims: string[] = Array.isArray(r.approved_claims) ? r.approved_claims.slice(0, 3) : [];
  const cats = uniq(recentOpps.map((o) => o.category).filter(Boolean)).slice(0, 4);
  const themeBits = [oneLine, claims[0]].filter(Boolean);
  const theme = themeBits.length ? `${name}: ${themeBits.join(" — ")}` : `${name}: quarterly PR storyline`;
  const angle = [
    claims.length ? `Approved claims: ${claims.join("; ")}` : null,
    cats.length ? `Recent active categories: ${cats.join(", ")}` : null,
    "Founder to review angle before any outreach.",
  ].filter(Boolean).join("\n");
  const required = [
    r.approved_one_line_description ? null : "one_line_description",
    r.approved_50_word_description ? null : "50_word_description",
    r.approved_150_word_description ? null : "150_word_description",
    (r.approved_logo && Object.keys(r.approved_logo || {}).length) ? null : "logo",
    (Array.isArray(r.approved_images) && r.approved_images.length) ? null : "product_or_service_images",
    r.approved_founder_quote ? null : "founder_quote",
    claims.length ? null : "approved_claims",
    r.compliance_clearance_status === "approved" ? null : "compliance_clearance",
  ].filter(Boolean) as string[];
  return { theme, angle, required };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await requireFounder(req);
    if ("error" in auth) return auth.error;
    const admin = auth.admin;

    const body = await req.json().catch(() => ({}));
    const cq = currentQuarter();
    const quarter: string = body.quarter || cq.quarter;
    const year: number = Number(body.year) || cq.year;
    const businessId: string | undefined = body.business_id;
    const dryRun = !!body.dry_run;
    const forceUpdate = !!body.force_update;

    let q = admin.from("business_press_readiness")
      .select("*")
      .eq("is_active", true)
      .in("press_ready_status", ["ready", "partially_ready"]);
    if (businessId) q = q.eq("business_id", businessId);
    const { data: readiness, error } = await q;
    if (error) return json({ ok: false, reason: "readiness_query_failed", message: error.message }, 500);
    const eligible = readiness ?? [];

    if (eligible.length === 0) {
      return json({ ok: true, dry_run: dryRun, quarter, year, eligible: 0, inserted: 0, updated: 0, skipped: 0 });
    }

    const bizIds = eligible.map((r: any) => r.business_id);
    const { data: existing } = await admin.from("quarterly_pr_campaigns")
      .select("*").in("business_id", bizIds).eq("quarter", quarter).eq("year", year);
    const byBiz = new Map<string, any>();
    (existing ?? []).forEach((r: any) => byBiz.set(r.business_id, r));

    // recent opportunity hints (last 60 days)
    const cutoff = new Date(Date.now() - 60 * 86400 * 1000).toISOString();
    const { data: recentMatches } = await admin.from("media_opportunity_matches")
      .select("business_id,opportunity_id").in("business_id", bizIds);
    const oppIds = uniq((recentMatches ?? []).map((m: any) => m.opportunity_id).filter(Boolean));
    const { data: opps } = oppIds.length
      ? await admin.from("media_opportunities").select("id,category,topic,country_market,created_at").in("id", oppIds).gte("created_at", cutoff)
      : { data: [] as any[] };
    const oppsById = new Map<string, any>(); (opps ?? []).forEach((o: any) => oppsById.set(o.id, o));
    const oppsByBiz = new Map<string, any[]>();
    for (const m of (recentMatches ?? [])) {
      const o = oppsById.get(m.opportunity_id); if (!o) continue;
      const arr = oppsByBiz.get(m.business_id) ?? []; arr.push(o); oppsByBiz.set(m.business_id, arr);
    }

    let inserted = 0, updated = 0, skipped = 0;
    const due_date = quarterDueDate(quarter, year);

    for (const r of eligible) {
      const recent = oppsByBiz.get(r.business_id) ?? [];
      const sug = buildSuggestion(r, recent);
      const markets = uniq(recent.map((o: any) => o.country_market).filter(Boolean)).slice(0, 5);
      const cur = byBiz.get(r.business_id);
      if (!cur) {
        if (!dryRun) {
          const { error: ie } = await admin.from("quarterly_pr_campaigns").insert({
            business_id: r.business_id,
            quarter, year,
            campaign_theme: sug.theme,
            pitch_angle: sug.angle,
            target_markets: markets,
            target_outlet_types: [],
            target_journalists: [],
            target_sector_leaders: [],
            required_assets: sug.required,
            owned_article_needed: r.press_ready_status === "partially_ready" || sug.required.length > 0,
            status: sug.required.length ? "needs_assets" : "planned",
            due_date,
            founder_approval_status: "not_requested",
          });
          if (ie) { skipped++; continue; }
        }
        inserted++;
      } else if (forceUpdate) {
        const patch: any = {
          campaign_theme: sug.theme,
          pitch_angle: sug.angle,
          target_markets: markets,
          required_assets: sug.required,
          owned_article_needed: cur.owned_article_needed ?? (sug.required.length > 0),
          due_date,
        };
        if (!dryRun) {
          const { error: ue } = await admin.from("quarterly_pr_campaigns").update(patch).eq("id", cur.id);
          if (ue) { skipped++; continue; }
        }
        updated++;
      } else {
        skipped++;
      }
    }

    if (!dryRun) {
      await admin.from("pr_audit_events").insert({
        event_type: "quarterly_pr_campaign_plan_run",
        related_type: "quarterly_pr_campaigns",
        event_summary: `Planned ${quarter} ${year}: inserted ${inserted}, updated ${updated}, skipped ${skipped} (eligible ${eligible.length}).`,
        metadata: { quarter, year, inserted, updated, skipped, eligible: eligible.length, force_update: forceUpdate, business_id: businessId ?? null },
      });
    }
    return json({ ok: true, dry_run: dryRun, quarter, year, eligible: eligible.length, inserted, updated, skipped });
  } catch (e) {
    return json({ ok: false, reason: "unhandled", message: String((e as Error)?.message ?? e) }, 500);
  }
});