import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Lock, BarChart3 } from "lucide-react";

async function call(path: string, body: any, method: "GET" | "POST" = "POST") {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${session?.access_token ?? ""}`,
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export function SocialAnalyticsHealthPanel({ businessId }: { businessId: string }) {
  const [d, setD] = useState<any>(null);
  const refresh = async () => setD(await call("social-analytics-healthcheck", { business_id: businessId }));
  useEffect(() => { if (businessId) refresh(); }, [businessId]);
  const stat = (l: string, v: any) => (
    <div className="p-2 rounded bg-secondary/40"><p className="text-[10px] text-muted-foreground uppercase">{l}</p><p className="text-sm font-semibold">{v ?? "—"}</p></div>
  );
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><BarChart3 size={16} /> Analytics Health</CardTitle>
        <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          {stat("Imports", d?.import_batches_total)}
          {stat("Metrics", d?.metrics_total)}
          {stat("Unmatched", d?.metrics_unmatched)}
          {stat("Summaries", d?.summaries_total)}
          {stat("Signals", d?.learning_signals_total)}
          {stat("Signals needing review", d?.learning_signals_needing_review)}
          {stat("Recommendations", d?.recommendations_total)}
          {stat("Recs needing review", d?.recommendations_needing_review)}
          {stat("Top platform", d?.top_platform_by_engagement ?? "—")}
          {stat("Top content type", d?.top_content_type ?? "—")}
          {stat("Data quality", d?.data_quality_score)}
          {stat("Provider calls", d?.provider_calls_total ?? 0)}
          {stat("Scraped pages", d?.scraped_pages_total ?? 0)}
          {stat("Fake metrics", d?.fake_metrics_created_total ?? 0)}
        </div>
      </CardContent>
    </Card>
  );
}

export function SocialPerformanceImportPanel({ businessId }: { businessId: string }) {
  const [name, setName] = useState("Manual import");
  const [platform, setPlatform] = useState("instagram");
  const [pasted, setPasted] = useState("");
  const [result, setResult] = useState<any>(null);
  const [testData, setTestData] = useState(true);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Performance Import (manual / paste)</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Import name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Platform (instagram)" value={platform} onChange={(e) => setPlatform(e.target.value)} />
        </div>
        <Textarea placeholder="Paste CSV/TSV: platform,external_post_id,metric_date,views,likes,comments,shares,saves,clicks" rows={6} value={pasted} onChange={(e) => setPasted(e.target.value)} />
        <div className="flex items-center gap-2 text-xs"><label><input type="checkbox" checked={testData} onChange={(e) => setTestData(e.target.checked)} /> mark as test data</label></div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setResult(await call("social-performance-import-preview", { business_id: businessId, import_name: name, platform, pasted_text: pasted }))}>Preview</Button>
          <Button size="sm" onClick={async () => setResult(await call("social-performance-import-create", { business_id: businessId, import_name: name, platform, rows: result?.sample ?? [], is_test_data: testData, dry_run: false, confirmation_phrase: "IMPORT SOCIAL PERFORMANCE METRICS" }))} disabled={!result?.valid_count}>Import (phrase)</Button>
        </div>
        {result && <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-60 overflow-auto">{JSON.stringify(result, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialManualMetricPanel({ businessId }: { businessId: string }) {
  const [m, setM] = useState<any>({ platform: "instagram", views: 0, likes: 0, comments: 0 });
  const [r, setR] = useState<any>(null);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Manual Metric Entry</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Input placeholder="platform" value={m.platform} onChange={(e) => setM({ ...m, platform: e.target.value })} />
          <Input placeholder="external_post_id" value={m.external_post_id ?? ""} onChange={(e) => setM({ ...m, external_post_id: e.target.value })} />
          <Input placeholder="metric_date YYYY-MM-DD" value={m.metric_date ?? ""} onChange={(e) => setM({ ...m, metric_date: e.target.value })} />
          <Input type="number" placeholder="views" value={m.views ?? 0} onChange={(e) => setM({ ...m, views: Number(e.target.value) })} />
          <Input type="number" placeholder="likes" value={m.likes ?? 0} onChange={(e) => setM({ ...m, likes: Number(e.target.value) })} />
          <Input type="number" placeholder="comments" value={m.comments ?? 0} onChange={(e) => setM({ ...m, comments: Number(e.target.value) })} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setR(await call("social-manual-metric-create", { business_id: businessId, metric: m }))}>Preview</Button>
          <Button size="sm" onClick={async () => setR(await call("social-manual-metric-create", { business_id: businessId, metric: m, dry_run: false, confirmation_phrase: "CREATE SOCIAL MANUAL METRIC" }))}>Create (phrase)</Button>
        </div>
        {r && <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-40 overflow-auto">{JSON.stringify(r, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialPerformanceMetricListPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!businessId) return;
    (supabase as any).from("social_performance_metrics").select("id,platform,platform_key,metric_date,views,likes,comments,engagement_rate,content_item_id,campaign_plan_id,metric_confidence").eq("business_id", businessId).order("metric_date", { ascending: false }).limit(50).then(({ data }: any) => setRows(data ?? []));
  }, [businessId]);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Metrics (latest 50)</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-xs text-muted-foreground">No metrics imported yet.</p> :
          <div className="text-[11px] space-y-1 max-h-80 overflow-auto">
            {rows.map((r) => (
              <div key={r.id} className="flex justify-between p-1 rounded bg-secondary/30">
                <span>{r.metric_date} · {r.platform ?? r.platform_key}</span>
                <span>v{r.views} l{r.likes} c{r.comments} · ER {((r.engagement_rate ?? 0) * 100).toFixed(1)}%</span>
                <span className="text-muted-foreground">{r.content_item_id || r.campaign_plan_id ? "linked" : "unmatched"}</span>
              </div>
            ))}
          </div>}
      </CardContent>
    </Card>
  );
}

export function SocialPerformanceMatchPanel({ businessId }: { businessId: string }) {
  const [d, setD] = useState<any>(null);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Match Metrics → Content / Campaign</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button size="sm" variant="outline" onClick={async () => setD(await call("social-performance-match-preview", { business_id: businessId, limit: 50 }))}>Preview matches</Button>
        {d && <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-60 overflow-auto">{JSON.stringify(d, null, 2)}</pre>}
        <p className="text-[10px] text-muted-foreground">Apply with phrase: APPLY SOCIAL PERFORMANCE MATCH</p>
      </CardContent>
    </Card>
  );
}

export function SocialPerformanceSummaryPanel({ businessId }: { businessId: string }) {
  const [type, setType] = useState("platform");
  const [platform, setPlatform] = useState("instagram");
  const [d, setD] = useState<any>(null);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Generate Performance Summary</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="summary_type" />
          <Input value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="platform (optional)" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setD(await call("social-performance-summary-generate", { business_id: businessId, summary_type: type, platform }))}>Preview</Button>
          <Button size="sm" onClick={async () => setD(await call("social-performance-summary-generate", { business_id: businessId, summary_type: type, platform, dry_run: false, confirmation_phrase: "GENERATE SOCIAL PERFORMANCE SUMMARY" }))}>Generate (phrase)</Button>
        </div>
        {d && <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-60 overflow-auto">{JSON.stringify(d, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialLearningSignalsPanel({ businessId }: { businessId: string }) {
  const [preview, setPreview] = useState<any>(null);
  const [created, setCreated] = useState<any>(null);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Learning Signals</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setPreview(await call("social-learning-signals-preview", { business_id: businessId }))}>Preview signals</Button>
          <Button size="sm" onClick={async () => setCreated(await call("social-learning-signals-create", { business_id: businessId, signals: preview?.proposed_signals ?? [], dry_run: false, confirmation_phrase: "CREATE SOCIAL LEARNING SIGNALS" }))} disabled={!preview?.proposed_signals?.length}>Create (phrase)</Button>
        </div>
        {preview && <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-60 overflow-auto">{JSON.stringify(preview, null, 2)}</pre>}
        {created && <pre className="text-[10px] bg-primary/10 p-2 rounded">{JSON.stringify(created, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialStrategyRecommendationsPanel({ businessId }: { businessId: string }) {
  const [preview, setPreview] = useState<any>(null);
  const [created, setCreated] = useState<any>(null);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Strategy Recommendations</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setPreview(await call("social-strategy-recommendations-preview", { business_id: businessId }))}>Preview</Button>
          <Button size="sm" onClick={async () => setCreated(await call("social-strategy-recommendations-create", { business_id: businessId, recommendations: preview?.recommendations ?? [], dry_run: false, confirmation_phrase: "CREATE SOCIAL STRATEGY RECOMMENDATIONS" }))} disabled={!preview?.recommendations?.length}>Create (phrase)</Button>
        </div>
        {preview && <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-60 overflow-auto">{JSON.stringify(preview, null, 2)}</pre>}
        {created && <pre className="text-[10px] bg-primary/10 p-2 rounded">{JSON.stringify(created, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialAnalyticsDecisionPanel({ businessId }: { businessId: string }) {
  const [recs, setRecs] = useState<any[]>([]);
  const refresh = () => {
    (supabase as any).from("social_strategy_recommendations").select("*").eq("business_id", businessId).in("recommendation_status", ["needs_review","draft"]).order("created_at", { ascending: false }).limit(20)
      .then(({ data }: any) => setRecs(data ?? []));
  };
  useEffect(() => { if (businessId) refresh(); }, [businessId]);
  const decide = async (id: string, decision: string) => {
    await call("social-analytics-recommendation-decision", { business_id: businessId, recommendation_id: id, decision, dry_run: false, confirmation_phrase: "APPLY SOCIAL ANALYTICS DECISION" });
    refresh();
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Recommendation Decisions</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {recs.length === 0 ? <p className="text-xs text-muted-foreground">No recommendations pending review.</p> : recs.map((r) => (
          <div key={r.id} className="p-2 rounded bg-secondary/40 text-xs space-y-1">
            <div className="flex justify-between"><span className="font-semibold">{r.title}</span><Badge variant="secondary">{r.priority}</Badge></div>
            <p className="text-muted-foreground">{r.rationale}</p>
            <div className="flex gap-1 mt-1">
              <Button size="sm" variant="outline" onClick={() => decide(r.id, "approve_internal")}>Approve</Button>
              <Button size="sm" variant="outline" onClick={() => decide(r.id, "reject")}>Reject</Button>
              <Button size="sm" variant="outline" onClick={() => decide(r.id, "mark_actioned")}>Actioned</Button>
              <Button size="sm" variant="outline" onClick={() => decide(r.id, "park")}>Park</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SocialAnalyticsAuditPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!businessId) return;
    (supabase as any).from("social_analytics_audit").select("id,action,action_status,created_at,result_json").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50)
      .then(({ data }: any) => setRows(data ?? []));
  }, [businessId]);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Audit Log</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-xs text-muted-foreground">No audit events yet.</p> :
          <div className="text-[11px] space-y-1 max-h-60 overflow-auto">
            {rows.map((r) => (
              <div key={r.id} className="flex justify-between p-1 rounded bg-secondary/30">
                <span>{r.action} · {r.action_status}</span>
                <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>}
      </CardContent>
    </Card>
  );
}

export function SocialAnalyticsDashboard({ businessId }: { businessId: string }) {
  if (!businessId) return <p className="text-sm text-muted-foreground">Select a business to view analytics.</p>;
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2 text-xs text-yellow-400 flex items-start gap-2">
        <Lock size={12} className="mt-0.5" />
        <div>
          <p className="font-semibold">Analytics: internal only</p>
          <p className="text-muted-foreground">No social API calls. No scraping. No fake metrics. No automatic strategy changes — all recommendations require founder approval.</p>
        </div>
      </div>
      <SocialAnalyticsHealthPanel businessId={businessId} />
      <div className="grid md:grid-cols-2 gap-3">
        <SocialPerformanceImportPanel businessId={businessId} />
        <SocialManualMetricPanel businessId={businessId} />
      </div>
      <SocialPerformanceMetricListPanel businessId={businessId} />
      <div className="grid md:grid-cols-2 gap-3">
        <SocialPerformanceMatchPanel businessId={businessId} />
        <SocialPerformanceSummaryPanel businessId={businessId} />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <SocialLearningSignalsPanel businessId={businessId} />
        <SocialStrategyRecommendationsPanel businessId={businessId} />
      </div>
      <SocialAnalyticsDecisionPanel businessId={businessId} />
      <SocialAnalyticsAuditPanel businessId={businessId} />
    </div>
  );
}