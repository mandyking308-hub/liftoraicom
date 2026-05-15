import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function calcEngagement(m: any): number {
  const denom = Number(m.impressions || m.reach || m.views || 0);
  if (!denom) return 0;
  const num = Number(m.likes || 0) + Number(m.comments || 0) + Number(m.shares || 0) + Number(m.saves || 0);
  return num / denom;
}

function topN<T>(arr: T[], n: number, score: (x: T) => number): T[] {
  return [...arr].sort((a, b) => score(b) - score(a)).slice(0, n);
}

function bottomN<T>(arr: T[], n: number, score: (x: T) => number): T[] {
  return [...arr].sort((a, b) => score(a) - score(b)).slice(0, n);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(url, service);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id);
    const isFounder = (roles ?? []).some((r: any) => r.role === "founder" || r.role === "admin");
    if (!isFounder) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const business_id: string | undefined = body?.business_id;
    if (!business_id) {
      return new Response(JSON.stringify({ error: "business_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [metricsR, draftsR, competitorsR, trendsR, profileR] = await Promise.all([
      admin.from("social_performance_metrics").select("*").eq("business_id", business_id).order("metric_date", { ascending: false }).limit(500),
      admin.from("social_post_drafts").select("id,platform_key,post_type,content_pillar,hook,suggested_time,post_date,approval_status").eq("business_id", business_id).limit(500),
      admin.from("social_competitor_profiles").select("*").eq("business_id", business_id).limit(100),
      admin.from("social_trend_watch_items").select("*").eq("business_id", business_id).order("relevance_score", { ascending: false }).limit(50),
      admin.from("social_business_profiles").select("*").eq("business_id", business_id).maybeSingle(),
    ]);

    const metrics = (metricsR.data ?? []) as any[];
    const drafts = (draftsR.data ?? []) as any[];
    const competitors = (competitorsR.data ?? []) as any[];
    const trends = (trendsR.data ?? []) as any[];
    const profile: any = profileR.data ?? null;

    const draftMap = new Map(drafts.map((d) => [d.id, d]));
    const enriched = metrics.map((m) => {
      const d = m.post_draft_id ? draftMap.get(m.post_draft_id) : null;
      const er = m.engagement_rate != null ? Number(m.engagement_rate) : calcEngagement(m);
      return { ...m, _engagement_rate: er, _draft: d };
    });

    // Aggregations
    const byPlatform: Record<string, { count: number; er_sum: number; views: number; likes: number; comments: number }> = {};
    const byPillar: Record<string, { count: number; er_sum: number }> = {};
    const byHour: Record<string, { count: number; er_sum: number }> = {};
    for (const m of enriched) {
      const p = m.platform_key ?? "unknown";
      byPlatform[p] = byPlatform[p] || { count: 0, er_sum: 0, views: 0, likes: 0, comments: 0 };
      byPlatform[p].count += 1;
      byPlatform[p].er_sum += m._engagement_rate;
      byPlatform[p].views += Number(m.views || 0);
      byPlatform[p].likes += Number(m.likes || 0);
      byPlatform[p].comments += Number(m.comments || 0);

      const pillar = m._draft?.content_pillar ?? "unknown";
      byPillar[pillar] = byPillar[pillar] || { count: 0, er_sum: 0 };
      byPillar[pillar].count += 1;
      byPillar[pillar].er_sum += m._engagement_rate;

      const time = m._draft?.suggested_time as string | undefined;
      if (time) {
        const hour = time.split(":")[0] + ":00";
        byHour[hour] = byHour[hour] || { count: 0, er_sum: 0 };
        byHour[hour].count += 1;
        byHour[hour].er_sum += m._engagement_rate;
      }
    }

    const platformSummary = Object.entries(byPlatform).map(([k, v]) => ({ platform_key: k, samples: v.count, avg_engagement_rate: v.count ? v.er_sum / v.count : 0, total_views: v.views, total_likes: v.likes, total_comments: v.comments }));
    const pillarSummary = Object.entries(byPillar).map(([k, v]) => ({ content_pillar: k, samples: v.count, avg_engagement_rate: v.count ? v.er_sum / v.count : 0 }));
    const hourSummary = Object.entries(byHour).map(([k, v]) => ({ hour: k, samples: v.count, avg_engagement_rate: v.count ? v.er_sum / v.count : 0 }));

    const bestPosts = topN(enriched, 5, (m) => m._engagement_rate).map((m) => ({
      id: m.id, platform: m.platform_key, date: m.metric_date, hook: m._draft?.hook ?? null, post_type: m._draft?.post_type ?? null, engagement_rate: m._engagement_rate, views: m.views, likes: m.likes, comments: m.comments,
    }));
    const weakPosts = bottomN(enriched.filter((m) => m._engagement_rate >= 0), 5, (m) => m._engagement_rate).map((m) => ({
      id: m.id, platform: m.platform_key, date: m.metric_date, hook: m._draft?.hook ?? null, post_type: m._draft?.post_type ?? null, engagement_rate: m._engagement_rate, views: m.views, likes: m.likes, comments: m.comments,
    }));

    const bestPillars = topN(pillarSummary.filter((p) => p.content_pillar !== "unknown"), 3, (p) => p.avg_engagement_rate).map((p) => p.content_pillar);
    const bestHours = topN(hourSummary, 3, (h) => h.avg_engagement_rate).map((h) => h.hour);
    const bestHooks = bestPosts.map((p) => p.hook).filter(Boolean) as string[];
    const underperformingFormats = bottomN(
      Object.entries(enriched.reduce((acc: Record<string, { c: number; s: number }>, m) => {
        const k = m._draft?.post_type ?? "unknown";
        acc[k] = acc[k] || { c: 0, s: 0 };
        acc[k].c += 1; acc[k].s += m._engagement_rate;
        return acc;
      }, {})).map(([k, v]) => ({ format: k, avg_engagement_rate: v.c ? v.s / v.c : 0, samples: v.c })).filter((x) => x.format !== "unknown" && x.samples >= 1),
      3,
      (x) => x.avg_engagement_rate,
    );

    const repurposingOpportunities = bestPosts.slice(0, 3).map((p) => ({
      from_post_id: p.id,
      from_platform: p.platform,
      hook: p.hook,
      suggestion: `Repurpose this top post (${p.platform} · ${p.post_type ?? "post"}) into reels, carousels, shorts and a blog snippet via the Social Repurposing Engine.`,
    }));

    const trendIdeas = topN(trends, 5, (t) => Number(t.relevance_score ?? 0)).map((t) => ({
      trend: t.trend_title, platform: t.platform_key, type: t.trend_type, angle: t.suggested_content_angle,
    }));

    const competitorIdeas = competitors.slice(0, 5).flatMap((c) => {
      const hooks = Array.isArray(c.strong_hooks) ? c.strong_hooks : [];
      return hooks.slice(0, 2).map((h: string) => ({ competitor: c.competitor_name, hook_pattern: h, suggestion: `Write a Liftor/${profile?.business_id ?? "brand"}-native version of this hook in our voice.` }));
    });

    const nextPackIdeas: string[] = [];
    if (bestPillars.length) nextPackIdeas.push(`Double-down pack on top pillars: ${bestPillars.join(", ")}`);
    if (bestHooks.length) nextPackIdeas.push(`Remake variations of these hooks: ${bestHooks.slice(0, 3).join(" | ")}`);
    if (trendIdeas.length) nextPackIdeas.push(`Trend-pegged content: ${trendIdeas.slice(0, 3).map((t) => t.trend).join(", ")}`);
    if (underperformingFormats.length) nextPackIdeas.push(`Pause / iterate weak formats: ${underperformingFormats.map((u) => u.format).join(", ")}`);
    if (competitorIdeas.length) nextPackIdeas.push(`Adapt ${competitorIdeas.length} competitor hook patterns into native posts.`);

    const creatorOpportunities: string[] = [];
    if (competitors.length) creatorOpportunities.push(`Watch ${competitors.length} competitor accounts for collab/feature angles.`);
    if (trends.some((t) => t.trend_type === "creator")) creatorOpportunities.push("Active creator trends — propose collabs / duets / stitches.");
    creatorOpportunities.push("Surface comment authors flagged as creator_signal in the Engagement Inbox for outreach.");

    return new Response(JSON.stringify({
      status: "ok",
      business_id,
      sample_size: { metrics: metrics.length, drafts: drafts.length, competitors: competitors.length, trends: trends.length },
      summary: { by_platform: platformSummary, by_pillar: pillarSummary, by_hour: hourSummary },
      best_posts: bestPosts,
      weak_posts: weakPosts,
      recommendations: {
        best_content_pillars: bestPillars,
        best_posting_times: bestHours,
        best_hooks: bestHooks,
        underperforming_formats: underperformingFormats,
        next_content_pack_ideas: nextPackIdeas,
        repurposing_opportunities: repurposingOpportunities,
        creator_community_opportunities: creatorOpportunities,
        trend_ideas: trendIdeas,
        competitor_inspired_hooks: competitorIdeas,
      },
      safety_audit: { no_external_api_call: true, no_publish: true, no_dm: true, source: "internal data only" },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});