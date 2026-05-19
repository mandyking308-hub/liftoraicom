import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS } from "../_shared/socialAnalyticsLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({} as any));
  const business_id = body.business_id;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);

  let q: any = a.admin.from("social_performance_metrics").select("*").eq("business_id", business_id).limit(500);
  if (body.platform) q = q.eq("platform", body.platform);
  if (body.import_batch_id) q = q.eq("import_batch_id", body.import_batch_id);
  if (body.period_start) q = q.gte("metric_date", body.period_start);
  if (body.period_end) q = q.lte("metric_date", body.period_end);
  const { data: metrics } = await q;
  const list = (metrics ?? []) as any[];

  const byPlatform: Record<string, { c: number; er: number }> = {};
  const byType: Record<string, { c: number; er: number }> = {};
  for (const m of list) {
    const p = m.platform ?? m.platform_key ?? "unknown";
    byPlatform[p] = byPlatform[p] || { c: 0, er: 0 };
    byPlatform[p].c++; byPlatform[p].er += Number(m.engagement_rate ?? 0);
    const t = m.content_type ?? "unknown";
    byType[t] = byType[t] || { c: 0, er: 0 };
    byType[t].c++; byType[t].er += Number(m.engagement_rate ?? 0);
  }
  const signals: any[] = [];
  const plats = Object.entries(byPlatform).map(([k, v]) => ({ k, c: v.c, avg: v.c ? v.er / v.c : 0 }));
  plats.sort((a, b) => b.avg - a.avg);
  if (plats[0] && plats[0].c >= 3) {
    signals.push({
      signal_type: "platform_working", platform: plats[0].k, signal_title: `${plats[0].k} appears to be a strong platform`,
      evidence_summary: `Avg ER ${(plats[0].avg * 100).toFixed(2)}% across ${plats[0].c} posts`,
      recommendation: `Lean more content into ${plats[0].k} while monitoring.`,
      confidence_score: Math.min(80, plats[0].c * 8), impact_area: "content",
    });
  }
  if (plats.at(-1) && plats.at(-1)!.c >= 3 && plats.at(-1)!.avg < 0.01) {
    const w = plats.at(-1)!;
    signals.push({
      signal_type: "platform_underperforming", platform: w.k, signal_title: `${w.k} appears to underperform`,
      evidence_summary: `Avg ER ${(w.avg * 100).toFixed(2)}% across ${w.c} posts`,
      recommendation: `Reduce volume or change format on ${w.k}.`,
      confidence_score: Math.min(75, w.c * 7), impact_area: "content",
    });
  }
  const types = Object.entries(byType).filter(([k]) => k !== "unknown").map(([k, v]) => ({ k, c: v.c, avg: v.c ? v.er / v.c : 0 }));
  types.sort((a, b) => b.avg - a.avg);
  if (types[0] && types[0].c >= 2) {
    signals.push({
      signal_type: "format_signal", signal_title: `Format performing best: ${types[0].k}`,
      evidence_summary: `Avg ER ${(types[0].avg * 100).toFixed(2)}% across ${types[0].c} posts`,
      recommendation: `Produce more ${types[0].k} content next cycle.`,
      confidence_score: Math.min(70, types[0].c * 10), impact_area: "content",
    });
  }

  return json({ ok: true, business_id, sample: list.length, proposed_signals: signals, caveats: list.length < 5 ? ["Sample size is small."] : [], no_records_mutated: true, ...SAFETY_FLAGS });
});