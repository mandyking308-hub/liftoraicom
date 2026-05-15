import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, BarChart3, TrendingUp, Eye, Sparkles, Plus, ShieldCheck } from "lucide-react";

const NEON_CANDY_ID = "b47c4b11-9a96-4af9-9aec-2f5218de9182";
const PLATFORMS = ["instagram","tiktok","youtube_shorts","facebook","x_twitter","linkedin","threads"];

type Business = { id: string; name: string };
type Metric = { id: string; platform_key: string; metric_date: string; impressions: number; views: number; likes: number; comments: number; shares: number; engagement_rate: number | null };
type Competitor = { id: string; competitor_name: string; platform_key: string | null; handle: string | null; status: string; strong_hooks: string[] | null };
type Trend = { id: string; trend_title: string; platform_key: string | null; trend_type: string | null; relevance_score: number | null; suggested_content_angle: string | null; status: string };

export default function SocialAnalyticsTrendPanel() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState(NEON_CANDY_ID);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // metric import
  const [mPlatform, setMPlatform] = useState("instagram");
  const [mImpressions, setMImpressions] = useState(0);
  const [mLikes, setMLikes] = useState(0);
  const [mComments, setMComments] = useState(0);
  const [mShares, setMShares] = useState(0);

  // competitor add
  const [cName, setCName] = useState("");
  const [cHandle, setCHandle] = useState("");
  const [cPlatform, setCPlatform] = useState("instagram");
  const [cHooks, setCHooks] = useState("");

  // trend add
  const [tTitle, setTTitle] = useState("");
  const [tType, setTType] = useState("hook");
  const [tScore, setTScore] = useState(0.7);
  const [tAngle, setTAngle] = useState("");

  useEffect(() => {
    supabase.from("businesses").select("id,name").order("name").then(({ data }) => setBusinesses((data ?? []) as Business[]));
  }, []);

  const reload = async (bid: string) => {
    const [{ data: m }, { data: c }, { data: t }] = await Promise.all([
      (supabase as any).from("social_performance_metrics").select("*").eq("business_id", bid).order("metric_date", { ascending: false }).limit(50),
      (supabase as any).from("social_competitor_profiles").select("*").eq("business_id", bid).order("created_at", { ascending: false }),
      (supabase as any).from("social_trend_watch_items").select("*").eq("business_id", bid).order("relevance_score", { ascending: false }),
    ]);
    setMetrics((m ?? []) as Metric[]);
    setCompetitors((c ?? []) as Competitor[]);
    setTrends((t ?? []) as Trend[]);
  };

  useEffect(() => { reload(businessId); }, [businessId]);

  const importMetric = async () => {
    try {
      const { error } = await (supabase as any).from("social_performance_metrics").insert({
        business_id: businessId,
        platform_key: mPlatform,
        impressions: mImpressions,
        likes: mLikes,
        comments: mComments,
        shares: mShares,
      });
      if (error) throw error;
      setMImpressions(0); setMLikes(0); setMComments(0); setMShares(0);
      await reload(businessId);
    } catch (e: any) { setError(e?.message ?? String(e)); }
  };

  const addCompetitor = async () => {
    if (!cName.trim()) return;
    try {
      const { error } = await (supabase as any).from("social_competitor_profiles").insert({
        business_id: businessId,
        competitor_name: cName.trim(),
        handle: cHandle.trim() || null,
        platform_key: cPlatform,
        strong_hooks: cHooks.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      if (error) throw error;
      setCName(""); setCHandle(""); setCHooks("");
      await reload(businessId);
    } catch (e: any) { setError(e?.message ?? String(e)); }
  };

  const addTrend = async () => {
    if (!tTitle.trim()) return;
    try {
      const { error } = await (supabase as any).from("social_trend_watch_items").insert({
        business_id: businessId,
        trend_title: tTitle.trim(),
        trend_type: tType,
        relevance_score: tScore,
        suggested_content_angle: tAngle.trim() || null,
      });
      if (error) throw error;
      setTTitle(""); setTAngle("");
      await reload(businessId);
    } catch (e: any) { setError(e?.message ?? String(e)); }
  };

  const runInsights = async () => {
    setLoading(true); setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke("social-analytics-insights", { body: { business_id: businessId } });
      if (err) throw err;
      setInsights(data);
    } catch (e: any) { setError(e?.message ?? String(e)); }
    finally { setLoading(false); }
  };

  return (
    <Card className="tech-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" /> Social Analytics + Trend + Competitor Engine
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Learn what's working. Recommend what to create next. <Badge variant="outline" className="ml-1">No scraping · No external API</Badge>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs">Business</Label>
          <select className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Metric import */}
          <div className="rounded-md border border-border/60 bg-card/40 p-3 space-y-2">
            <div className="text-sm font-medium flex items-center gap-2"><Plus className="h-4 w-4" /> Import metric</div>
            <select className="w-full rounded-md border border-border bg-background p-2 text-xs" value={mPlatform} onChange={(e) => setMPlatform(e.target.value)}>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Impressions" value={mImpressions} onChange={(e) => setMImpressions(Number(e.target.value))} />
              <Input type="number" placeholder="Likes" value={mLikes} onChange={(e) => setMLikes(Number(e.target.value))} />
              <Input type="number" placeholder="Comments" value={mComments} onChange={(e) => setMComments(Number(e.target.value))} />
              <Input type="number" placeholder="Shares" value={mShares} onChange={(e) => setMShares(Number(e.target.value))} />
            </div>
            <Button size="sm" onClick={importMetric}>Save metric</Button>
          </div>

          {/* Competitor */}
          <div className="rounded-md border border-border/60 bg-card/40 p-3 space-y-2">
            <div className="text-sm font-medium flex items-center gap-2"><Eye className="h-4 w-4" /> Add competitor</div>
            <Input placeholder="Name" value={cName} onChange={(e) => setCName(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="@handle" value={cHandle} onChange={(e) => setCHandle(e.target.value)} />
              <select className="rounded-md border border-border bg-background p-2 text-xs" value={cPlatform} onChange={(e) => setCPlatform(e.target.value)}>
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <Input placeholder="Strong hooks (one per line)" value={cHooks} onChange={(e) => setCHooks(e.target.value)} />
            <Button size="sm" onClick={addCompetitor} disabled={!cName.trim()}>Save competitor</Button>
          </div>

          {/* Trend */}
          <div className="rounded-md border border-border/60 bg-card/40 p-3 space-y-2">
            <div className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Add trend</div>
            <Input placeholder="Trend title" value={tTitle} onChange={(e) => setTTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <select className="rounded-md border border-border bg-background p-2 text-xs" value={tType} onChange={(e) => setTType(e.target.value)}>
                {["hook","sound","format","topic","creator","challenge"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <Input type="number" step={0.05} min={0} max={1} placeholder="Relevance 0–1" value={tScore} onChange={(e) => setTScore(Number(e.target.value))} />
            </div>
            <Input placeholder="Suggested content angle" value={tAngle} onChange={(e) => setTAngle(e.target.value)} />
            <Button size="sm" onClick={addTrend} disabled={!tTitle.trim()}>Save trend</Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={runInsights} disabled={loading} size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><Sparkles className="h-4 w-4 mr-1" /> Run analytics insights</>)}
          </Button>
          <Badge variant="outline">{metrics.length} metrics</Badge>
          <Badge variant="outline">{competitors.length} competitors</Badge>
          <Badge variant="outline">{trends.length} trends</Badge>
        </div>

        {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        {insights && (
          <div className="space-y-3">
            <div className="rounded-md border border-border/60 bg-card/40 p-3 text-xs">
              <div className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-primary" /> Sample: {insights.sample_size?.metrics} metrics · {insights.sample_size?.competitors} competitors · {insights.sample_size?.trends} trends</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-md border border-border/60 bg-card/40 p-3">
                <div className="text-sm font-medium mb-2">Best posts</div>
                <ul className="space-y-1 text-xs">
                  {(insights.best_posts ?? []).map((p: any) => (
                    <li key={p.id} className="flex items-center gap-2"><Badge variant="outline">{p.platform}</Badge><span>ER {(p.engagement_rate * 100).toFixed(2)}%</span><span className="truncate text-muted-foreground">— {p.hook ?? p.post_type ?? p.date}</span></li>
                  ))}
                  {(!insights.best_posts || insights.best_posts.length === 0) && <li className="text-muted-foreground">No data yet — import metrics to populate.</li>}
                </ul>
              </div>
              <div className="rounded-md border border-border/60 bg-card/40 p-3">
                <div className="text-sm font-medium mb-2">Weak posts</div>
                <ul className="space-y-1 text-xs">
                  {(insights.weak_posts ?? []).map((p: any) => (
                    <li key={p.id} className="flex items-center gap-2"><Badge variant="outline">{p.platform}</Badge><span>ER {(p.engagement_rate * 100).toFixed(2)}%</span><span className="truncate text-muted-foreground">— {p.hook ?? p.post_type ?? p.date}</span></li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-md border border-border/60 bg-card/40 p-3 text-xs">
              <div className="text-sm font-medium mb-2">AI recommendations</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="font-medium">Best content pillars</div>
                  <div className="flex flex-wrap gap-1 mt-1">{(insights.recommendations?.best_content_pillars ?? []).map((p: string) => <Badge key={p}>{p}</Badge>)}</div>
                  <div className="font-medium mt-3">Best posting times</div>
                  <div className="flex flex-wrap gap-1 mt-1">{(insights.recommendations?.best_posting_times ?? []).map((h: string) => <Badge key={h} variant="outline">{h}</Badge>)}</div>
                  <div className="font-medium mt-3">Underperforming formats</div>
                  <div className="flex flex-wrap gap-1 mt-1">{(insights.recommendations?.underperforming_formats ?? []).map((u: any) => <Badge key={u.format} variant="destructive">{u.format} · {(u.avg_engagement_rate*100).toFixed(1)}%</Badge>)}</div>
                </div>
                <div>
                  <div className="font-medium">Best hooks</div>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {(insights.recommendations?.best_hooks ?? []).map((h: string, i: number) => <li key={i}>{h}</li>)}
                  </ul>
                  <div className="font-medium mt-3">Trend ideas</div>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {(insights.recommendations?.trend_ideas ?? []).map((t: any, i: number) => <li key={i}>{t.trend} — {t.angle ?? "no angle"}</li>)}
                  </ul>
                </div>
              </div>
              <div className="mt-3">
                <div className="font-medium">Next content pack ideas</div>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {(insights.recommendations?.next_content_pack_ideas ?? []).map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="font-medium">Repurposing opportunities</div>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {(insights.recommendations?.repurposing_opportunities ?? []).map((r: any, i: number) => <li key={i}>{r.from_platform} · {r.hook ?? "—"}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="font-medium">Creator / community opportunities</div>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {(insights.recommendations?.creator_community_opportunities ?? []).map((c: string, i: number) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border/60 bg-card/40 p-3 text-xs">
              <div className="text-sm font-medium mb-2">By platform</div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="text-left text-muted-foreground"><th className="p-1">Platform</th><th className="p-1">Samples</th><th className="p-1">Avg ER</th><th className="p-1">Views</th><th className="p-1">Likes</th><th className="p-1">Comments</th></tr></thead>
                  <tbody>
                    {(insights.summary?.by_platform ?? []).map((s: any) => (
                      <tr key={s.platform_key} className="border-t border-border/40"><td className="p-1"><Badge variant="outline">{s.platform_key}</Badge></td><td className="p-1">{s.samples}</td><td className="p-1">{(s.avg_engagement_rate*100).toFixed(2)}%</td><td className="p-1">{s.total_views}</td><td className="p-1">{s.total_likes}</td><td className="p-1">{s.total_comments}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}