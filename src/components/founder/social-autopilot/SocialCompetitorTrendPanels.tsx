import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Target, ShieldAlert, Lock } from "lucide-react";

async function call(path: string, body: any) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session?.access_token ?? ""}`,
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

const Tile = ({ l, v }: { l: string; v: any }) => (
  <div className="p-2 rounded bg-secondary/40"><p className="text-[10px] text-muted-foreground uppercase">{l}</p><p className="text-sm font-semibold">{v ?? "—"}</p></div>
);

export function SocialCompetitorTrendHealthPanel({ businessId }: { businessId: string }) {
  const [d, setD] = useState<any>(null);
  const refresh = async () => setD(await call("social-competitor-trend-healthcheck", { business_id: businessId }));
  useEffect(() => { if (businessId) refresh(); }, [businessId]);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Target size={16} /> Competitor & Trend Health</CardTitle>
        <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <Tile l="Competitors" v={d?.competitors_total} />
          <Tile l="Accounts" v={d?.competitor_accounts_total} />
          <Tile l="Observations" v={d?.observations_total} />
          <Tile l="Obs needing review" v={d?.observations_needing_review} />
          <Tile l="Trends" v={d?.trends_total} />
          <Tile l="Trends needing review" v={d?.trends_needing_review} />
          <Tile l="Patterns" v={d?.patterns_total} />
          <Tile l="Patterns needing review" v={d?.patterns_needing_review} />
          <Tile l="Positioning reviews" v={d?.positioning_reviews_total} />
          <Tile l="Market signals" v={d?.market_learning_signals_total} />
          <Tile l="Signals needing review" v={d?.market_learning_needing_review} />
          <Tile l="Recommendations" v={d?.recommendations_total} />
          <Tile l="Provider calls" v={d?.provider_calls_total ?? 0} />
          <Tile l="Scraped pages" v={d?.scraped_pages_total ?? 0} />
          <Tile l="Copied assets" v={d?.copied_assets_created_total ?? 0} />
        </div>
      </CardContent>
    </Card>
  );
}

export function SocialCompetitorProfilePanel({ businessId }: { businessId: string }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("direct_competitor");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [testData, setTestData] = useState(true);
  const [result, setResult] = useState<any>(null);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Create competitor profile</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Competitor name" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Type (direct_competitor, peer, creator…)" value={type} onChange={e => setType(e.target.value)} />
          <Input placeholder="Website URL" value={website} onChange={e => setWebsite(e.target.value)} />
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={testData} onChange={e => setTestData(e.target.checked)} /> mark as test data</label>
        </div>
        <Textarea rows={3} placeholder="Notes / relevance / positioning" value={notes} onChange={e => setNotes(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setResult(await call("social-competitor-profile-create", { business_id: businessId, competitor: { competitor_name: name, competitor_type: type, website_url: website, notes, is_test_data: testData } }))}>Preview</Button>
          <Button size="sm" onClick={async () => setResult(await call("social-competitor-profile-create", { business_id: businessId, competitor: { competitor_name: name, competitor_type: type, website_url: website, notes, is_test_data: testData }, dry_run: false, confirmation_phrase: "CREATE SOCIAL COMPETITOR PROFILE" }))} disabled={!name}>Create (phrase)</Button>
        </div>
        {result && <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-48 overflow-auto">{JSON.stringify(result, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialCompetitorAccountPanel({ businessId }: { businessId: string }) {
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  useEffect(() => {
    if (!businessId) return;
    (supabase as any).from("social_competitor_profiles").select("id,competitor_name").eq("business_id", businessId).then(({ data }: any) => setCompetitors(data ?? []));
    (supabase as any).from("social_competitor_accounts").select("*").eq("business_id", businessId).limit(50).then(({ data }: any) => setAccounts(data ?? []));
  }, [businessId]);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Competitor accounts</CardTitle></CardHeader>
      <CardContent className="text-xs space-y-2">
        <p className="text-muted-foreground">{competitors.length} competitor(s) · {accounts.length} account(s) tracked. Manage account rows directly via competitor profile (no provider API).</p>
        <div className="space-y-1 max-h-48 overflow-auto">
          {accounts.map(a => (
            <div key={a.id} className="flex items-center justify-between bg-secondary/30 p-2 rounded">
              <span>{a.platform} · {a.account_handle ?? "—"}</span>
              <Badge variant="secondary">{a.account_status}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SocialCompetitorObservationPanel({ businessId }: { businessId: string }) {
  const [competitorId, setCompetitorId] = useState("");
  const [obsType, setObsType] = useState("hook");
  const [platform, setPlatform] = useState("instagram");
  const [text, setText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [testData, setTestData] = useState(true);
  const [result, setResult] = useState<any>(null);
  const payload = () => ({ business_id: businessId, observation: { competitor_id: competitorId || null, observation_type: obsType, platform, observation_text: text, source_url: sourceUrl, is_test_data: testData } });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Add competitor observation</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Competitor id (optional)" value={competitorId} onChange={e => setCompetitorId(e.target.value)} />
          <Input placeholder="Observation type (hook, offer, caption…)" value={obsType} onChange={e => setObsType(e.target.value)} />
          <Input placeholder="Platform" value={platform} onChange={e => setPlatform(e.target.value)} />
          <Input placeholder="Source URL (optional)" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} />
        </div>
        <Textarea rows={4} placeholder="Paste manual observation text (no copyrighted asset upload)" value={text} onChange={e => setText(e.target.value)} />
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={testData} onChange={e => setTestData(e.target.checked)} /> mark as test data</label>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setResult(await call("social-competitor-observation-preview", { business_id: businessId, competitor_id: competitorId || null, observation_type: obsType, platform, observation_text: text, source_url: sourceUrl }))}>Preview</Button>
          <Button size="sm" onClick={async () => setResult(await call("social-competitor-observation-create", { ...payload(), dry_run: false, confirmation_phrase: "CREATE SOCIAL COMPETITOR OBSERVATION" }))} disabled={!text}>Create (phrase)</Button>
        </div>
        {result && <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-48 overflow-auto">{JSON.stringify(result, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialCompetitorObservationListPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!businessId) return;
    (supabase as any).from("social_competitor_observations").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50).then(({ data }: any) => setRows(data ?? []));
  }, [businessId]);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Observations ({rows.length})</CardTitle></CardHeader>
      <CardContent className="text-xs space-y-1 max-h-72 overflow-auto">
        {rows.map(r => (
          <div key={r.id} className="bg-secondary/30 p-2 rounded">
            <div className="flex justify-between"><span className="font-semibold">{r.observation_type} · {r.platform ?? "—"}</span><Badge variant="secondary">{r.observation_status}</Badge></div>
            <div className="text-muted-foreground line-clamp-2">{r.observation_text}</div>
            {r.risk_flags?.length > 0 && <div className="text-yellow-400">Risk: {r.risk_flags.join(", ")}</div>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SocialTrendSignalPanel({ businessId }: { businessId: string }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("hook_style");
  const [platform, setPlatform] = useState("instagram");
  const [desc, setDesc] = useState("");
  const [testData, setTestData] = useState(true);
  const [result, setResult] = useState<any>(null);
  const trend = { trend_title: title, trend_type: type, platform, trend_description: desc, is_test_data: testData };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Add trend signal</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Trend title" value={title} onChange={e => setTitle(e.target.value)} />
          <Input placeholder="Trend type (hook_style, meme, audio_trend…)" value={type} onChange={e => setType(e.target.value)} />
          <Input placeholder="Platform" value={platform} onChange={e => setPlatform(e.target.value)} />
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={testData} onChange={e => setTestData(e.target.checked)} /> mark as test data</label>
        </div>
        <Textarea rows={3} placeholder="Describe trend, audience reaction, relevance" value={desc} onChange={e => setDesc(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setResult(await call("social-trend-signal-preview", { business_id: businessId, ...trend }))}>Preview</Button>
          <Button size="sm" onClick={async () => setResult(await call("social-trend-signal-create", { business_id: businessId, trend, dry_run: false, confirmation_phrase: "CREATE SOCIAL TREND SIGNAL" }))} disabled={!title}>Create (phrase)</Button>
        </div>
        {result && <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-48 overflow-auto">{JSON.stringify(result, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialTrendSignalListPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!businessId) return;
    (supabase as any).from("social_trend_signals").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50).then(({ data }: any) => setRows(data ?? []));
  }, [businessId]);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Trend signals ({rows.length})</CardTitle></CardHeader>
      <CardContent className="text-xs space-y-1 max-h-72 overflow-auto">
        {rows.map(r => (
          <div key={r.id} className="bg-secondary/30 p-2 rounded">
            <div className="flex justify-between"><span className="font-semibold">{r.trend_title}</span><Badge variant="secondary">{r.trend_status}</Badge></div>
            <div className="text-muted-foreground">{r.trend_type} · {r.platform ?? "—"}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SocialCompetitorPatternsPanel({ businessId }: { businessId: string }) {
  const [competitorId, setCompetitorId] = useState("");
  const [platform, setPlatform] = useState("");
  const [result, setResult] = useState<any>(null);
  const args = { business_id: businessId, competitor_id: competitorId || undefined, platform: platform || undefined };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Generate competitor patterns</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Competitor id (optional)" value={competitorId} onChange={e => setCompetitorId(e.target.value)} />
          <Input placeholder="Platform (optional)" value={platform} onChange={e => setPlatform(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setResult(await call("social-competitor-patterns-generate", args))}>Preview</Button>
          <Button size="sm" onClick={async () => setResult(await call("social-competitor-patterns-generate", { ...args, dry_run: false, confirmation_phrase: "GENERATE SOCIAL COMPETITOR PATTERNS" }))}>Generate (phrase)</Button>
        </div>
        {result && <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-60 overflow-auto">{JSON.stringify(result, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialMarketPositioningReviewPanel({ businessId }: { businessId: string }) {
  const [name, setName] = useState("Positioning review");
  const [result, setResult] = useState<any>(null);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Generate market positioning review</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Input placeholder="Review name" value={name} onChange={e => setName(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setResult(await call("social-market-positioning-review-generate", { business_id: businessId, review_name: name }))}>Preview</Button>
          <Button size="sm" onClick={async () => setResult(await call("social-market-positioning-review-generate", { business_id: businessId, review_name: name, dry_run: false, confirmation_phrase: "GENERATE SOCIAL MARKET POSITIONING REVIEW" }))}>Generate (phrase)</Button>
        </div>
        {result && <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-60 overflow-auto">{JSON.stringify(result, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialMarketLearningSignalsPanel({ businessId }: { businessId: string }) {
  const [reviewId, setReviewId] = useState("");
  const [result, setResult] = useState<any>(null);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Market learning signals</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Input placeholder="Positioning review id (optional)" value={reviewId} onChange={e => setReviewId(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setResult(await call("social-market-learning-signals-preview", { business_id: businessId, positioning_review_id: reviewId || null }))}>Preview</Button>
          <Button size="sm" onClick={async () => setResult(await call("social-market-learning-signals-create", { business_id: businessId, signals: result?.signals ?? [], dry_run: false, confirmation_phrase: "CREATE SOCIAL MARKET LEARNING SIGNALS" }))} disabled={!result?.signals?.length}>Create (phrase)</Button>
        </div>
        {result && <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-60 overflow-auto">{JSON.stringify(result, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialMarketRecommendationsPanel({ businessId }: { businessId: string }) {
  const [signalId, setSignalId] = useState("");
  const [result, setResult] = useState<any>(null);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Market recommendations</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Input placeholder="Market signal id (optional)" value={signalId} onChange={e => setSignalId(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setResult(await call("social-market-recommendations-preview", { business_id: businessId, market_signal_id: signalId || null }))}>Preview</Button>
          <Button size="sm" onClick={async () => setResult(await call("social-market-recommendations-create", { business_id: businessId, recommendations: result?.recommendations ?? [], dry_run: false, confirmation_phrase: "CREATE SOCIAL MARKET RECOMMENDATIONS" }))} disabled={!result?.recommendations?.length}>Create (phrase)</Button>
        </div>
        {result && <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-60 overflow-auto">{JSON.stringify(result, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialMarketLearningDecisionPanel({ businessId }: { businessId: string }) {
  const [target, setTarget] = useState("market_signal");
  const [id, setId] = useState("");
  const [decision, setDecision] = useState("approve_for_strategy");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<any>(null);
  const submit = async (dry: boolean) => {
    const body: any = { business_id: businessId, decision, founder_notes: notes };
    if (target === "market_signal") body.market_signal_id = id;
    if (target === "pattern") body.pattern_id = id;
    if (target === "trend") body.trend_id = id;
    body.dry_run = dry;
    if (!dry) body.confirmation_phrase = "APPLY SOCIAL MARKET LEARNING DECISION";
    setResult(await call("social-market-learning-decision", body));
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Approve / reject market learning</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Target (market_signal | pattern | trend)" value={target} onChange={e => setTarget(e.target.value)} />
          <Input placeholder="Target id" value={id} onChange={e => setId(e.target.value)} />
          <Input placeholder="Decision (approve_for_strategy | reject | park | archive)" value={decision} onChange={e => setDecision(e.target.value)} />
          <Input placeholder="Founder notes" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => submit(true)}>Preview</Button>
          <Button size="sm" onClick={() => submit(false)} disabled={!id}>Apply (phrase)</Button>
        </div>
        {result && <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-48 overflow-auto">{JSON.stringify(result, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialCompetitorTrendAuditPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!businessId) return;
    (supabase as any).from("social_competitor_trend_audit").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(40).then(({ data }: any) => setRows(data ?? []));
  }, [businessId]);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Audit log ({rows.length})</CardTitle></CardHeader>
      <CardContent className="text-[11px] max-h-64 overflow-auto space-y-1">
        {rows.map(r => (
          <div key={r.id} className="flex justify-between bg-secondary/30 p-1.5 rounded">
            <span>{r.action}</span>
            <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SocialCompetitorTrendDashboard({ businessId }: { businessId: string }) {
  if (!businessId) return <Card><CardContent className="p-4 text-sm text-muted-foreground">Select a business to use the Competitor & Trend layer.</CardContent></Card>;
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-400 flex items-start gap-2">
        <ShieldAlert size={14} className="mt-0.5" />
        <div>
          <p className="font-semibold flex items-center gap-1"><Lock size={10} /> Internal research only · no scraping · no provider/social API call · no competitor claim published · no copied assets</p>
          <p className="text-muted-foreground mt-0.5">All competitor and trend research is manual. Liftor produces legally distinct adaptations only and requires founder approval before strategy changes.</p>
        </div>
      </div>
      <SocialCompetitorTrendHealthPanel businessId={businessId} />
      <div className="grid md:grid-cols-2 gap-3">
        <SocialCompetitorProfilePanel businessId={businessId} />
        <SocialCompetitorAccountPanel businessId={businessId} />
        <SocialCompetitorObservationPanel businessId={businessId} />
        <SocialCompetitorObservationListPanel businessId={businessId} />
        <SocialTrendSignalPanel businessId={businessId} />
        <SocialTrendSignalListPanel businessId={businessId} />
        <SocialCompetitorPatternsPanel businessId={businessId} />
        <SocialMarketPositioningReviewPanel businessId={businessId} />
        <SocialMarketLearningSignalsPanel businessId={businessId} />
        <SocialMarketRecommendationsPanel businessId={businessId} />
        <SocialMarketLearningDecisionPanel businessId={businessId} />
        <SocialCompetitorTrendAuditPanel businessId={businessId} />
      </div>
    </div>
  );
}