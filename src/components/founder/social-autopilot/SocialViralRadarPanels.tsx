import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Radar, ShieldAlert, Flame, Link2 } from "lucide-react";

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
  <div className="p-2 rounded bg-secondary/40">
    <p className="text-[10px] text-muted-foreground uppercase">{l}</p>
    <p className="text-sm font-semibold">{v ?? "—"}</p>
  </div>
);

const STATUS_TONE: Record<string, string> = {
  connected: "text-emerald-400",
  manual_mode: "text-sky-400",
  degraded: "text-yellow-400",
  paused: "text-yellow-400",
  not_configured: "text-muted-foreground",
  revoked: "text-red-400",
};

function Disclaimer() {
  return (
    <p className="text-[10px] text-muted-foreground">
      Commercial virality, not vanity views · Reach → attention → click → conversion · Potential, not guaranteed performance.
    </p>
  );
}

function ConfirmField({ phrase, value, onChange }: { phrase: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground">Type <span className="font-mono">{phrase}</span> to confirm</p>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={phrase} />
    </div>
  );
}

/* ---------------------------------------------------------------- */

export function ViralRadarHealthPanel({ businessId }: { businessId: string }) {
  const [d, setD] = useState<any>(null);
  const refresh = useCallback(async () => {
    if (!businessId) return;
    setD(await call("social-viral-intelligence-healthcheck", { business_id: businessId }));
  }, [businessId]);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Radar size={16} /> Viral Opportunity Radar — health</CardTitle>
        <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Disclaimer />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <Tile l="Watchlists" v={d?.watchlists_total} />
          <Tile l="Active watchlists" v={d?.watchlists_active} />
          <Tile l="Signals" v={d?.signals_total} />
          <Tile l="Opportunities" v={d?.opportunities_total} />
          <Tile l="Needing review" v={d?.opportunities_needing_review} />
          <Tile l="Approved" v={d?.opportunities_approved} />
          <Tile l="Briefs" v={d?.briefs_total} />
          <Tile l="Briefs awaiting approval" v={d?.briefs_awaiting_approval} />
          <Tile l="Briefs linked to content" v={d?.briefs_linked} />
          <Tile l="Import runs" v={d?.runs_total} />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Providers</p>
          {(d?.providers ?? []).length === 0 && <p className="text-xs">No provider record yet — manual import is always available.</p>}
          {(d?.providers ?? []).map((p: any) => (
            <div key={p.provider_slug} className="flex items-center justify-between p-2 rounded bg-secondary/40 text-xs">
              <span className="font-medium">{p.display_name}</span>
              <span className={STATUS_TONE[p.resolved_status] ?? ""}>
                {p.resolved_status.toUpperCase()} — {p.reason}
              </span>
            </div>
          ))}
        </div>
        {(d?.empty_state_reasons ?? []).length > 0 && (
          <div className="p-2 rounded border border-yellow-500/30 bg-yellow-500/5 space-y-1">
            <p className="text-xs font-medium flex items-center gap-1"><ShieldAlert size={12} /> What is missing</p>
            {d.empty_state_reasons.map((r: string) => <p key={r} className="text-[11px] text-muted-foreground">• {r}</p>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ViralProviderPanel({ businessId }: { businessId: string }) {
  const [d, setD] = useState<any>(null);
  const [phrase, setPhrase] = useState("");
  const [result, setResult] = useState<any>(null);
  const refresh = useCallback(async () => {
    if (!businessId) return;
    setD(await call("social-viral-provider", { business_id: businessId, action: "status" }));
  }, [businessId]);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Market-data providers (buy the data, own the brain)</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {(d?.providers ?? []).map((p: any) => (
          <div key={p.provider_slug} className="p-3 rounded bg-secondary/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{p.display_name}</span>
              <span className={`text-xs ${STATUS_TONE[p.resolved_status] ?? ""}`}>{p.resolved_status.toUpperCase()}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">{p.reason}</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(p.capabilities ?? {}).filter(([, v]) => v).map(([k]) => (
                <Badge key={k} variant="outline" className="text-[10px]">{k}</Badge>
              ))}
              <Badge variant="secondary" className="text-[10px]">capabilities {p.capability_verification}</Badge>
            </div>
            {(p.missing_secrets ?? []).length > 0 && (
              <p className="text-[11px] text-yellow-400">Missing server-side secret(s): {p.missing_secrets.join(", ")}</p>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={async () => setResult(await call("social-viral-provider", { business_id: businessId, action: "test", provider_slug: p.provider_slug }))}>
                Test (no external call unless configured)
              </Button>
              <Button size="sm" variant="outline" onClick={async () => setResult(await call("social-viral-provider", { business_id: businessId, action: "configure", provider_slug: p.provider_slug }))}>
                Preview save
              </Button>
              <Button size="sm" disabled={!phrase} onClick={async () => {
                setResult(await call("social-viral-provider", { business_id: businessId, action: "configure", provider_slug: p.provider_slug, dry_run: false, confirmation_phrase: phrase }));
                refresh();
              }}>Save</Button>
            </div>
          </div>
        ))}
        <ConfirmField phrase="CONFIGURE VIRAL PROVIDER" value={phrase} onChange={setPhrase} />
        {result && <pre className="text-[10px] p-2 bg-secondary/40 rounded overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function ViralWatchlistPanel({ businessId }: { businessId: string }) {
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ watchlist_name: "", niche: "", audience_description: "", business_objective: "leads", platforms: "tiktok,instagram", keywords: "", geographies: "GB", languages: "en", excluded_topics: "", conversion_route: "", is_test_data: true });
  const [phrase, setPhrase] = useState("");
  const [result, setResult] = useState<any>(null);
  const refresh = useCallback(async () => {
    if (!businessId) return;
    const r = await call("social-viral-watchlists", { business_id: businessId, action: "list" });
    setList(r.watchlists ?? []);
  }, [businessId]);
  useEffect(() => { refresh(); }, [refresh]);
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Watchlists</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid md:grid-cols-2 gap-2">
          <Input placeholder="Watchlist name" value={form.watchlist_name} onChange={set("watchlist_name")} />
          <Input placeholder="Niche" value={form.niche} onChange={set("niche")} />
          <Input placeholder="Business objective (leads, sales, donations…)" value={form.business_objective} onChange={set("business_objective")} />
          <Input placeholder="Platforms (comma separated)" value={form.platforms} onChange={set("platforms")} />
          <Input placeholder="Keywords / topics (comma separated)" value={form.keywords} onChange={set("keywords")} />
          <Input placeholder="Excluded topics (comma separated)" value={form.excluded_topics} onChange={set("excluded_topics")} />
          <Input placeholder="Geographies (GB, US…)" value={form.geographies} onChange={set("geographies")} />
          <Input placeholder="Languages (en…)" value={form.languages} onChange={set("languages")} />
          <Input placeholder="Conversion route (landing page / offer / donate page)" value={form.conversion_route} onChange={set("conversion_route")} />
        </div>
        <Textarea rows={2} placeholder="Audience description" value={form.audience_description} onChange={set("audience_description")} />
        <ConfirmField phrase="SAVE VIRAL WATCHLIST" value={phrase} onChange={setPhrase} />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setResult(await call("social-viral-watchlists", { business_id: businessId, action: "create", watchlist: form }))}>Preview</Button>
          <Button size="sm" disabled={!phrase || !form.watchlist_name} onClick={async () => {
            setResult(await call("social-viral-watchlists", { business_id: businessId, action: "create", watchlist: form, dry_run: false, confirmation_phrase: phrase }));
            refresh();
          }}>Save watchlist</Button>
        </div>
        <div className="space-y-1">
          {list.length === 0 && <p className="text-xs text-muted-foreground">No watchlist yet — add niche, audience, platforms, keywords and a conversion route.</p>}
          {list.map((w) => (
            <div key={w.id} className="flex items-center justify-between p-2 rounded bg-secondary/40 text-xs">
              <span>{w.watchlist_name} · {w.business_objective} · {(w.platforms ?? []).join(", ") || "any platform"}{w.conversion_route ? "" : " · no conversion route"}</span>
              <div className="flex gap-2 items-center">
                <Badge variant="secondary">{w.watchlist_status}</Badge>
                <Button size="sm" variant="ghost" onClick={async () => { await call("social-viral-watchlists", { business_id: businessId, action: w.watchlist_status === "active" ? "pause" : "resume", watchlist_id: w.id }); refresh(); }}>
                  {w.watchlist_status === "active" ? "Pause" : "Resume"}
                </Button>
              </div>
            </div>
          ))}
        </div>
        {result && <pre className="text-[10px] p-2 bg-secondary/40 rounded overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

const SAMPLE = JSON.stringify([{
  platform: "tiktok",
  external_id: "demo-1",
  canonical_url: "https://www.tiktok.com/@example/video/000",
  title: "Demo signal — replace with a real observed post",
  topic: "example topic",
  creator_handle: "example",
  language: "en",
  geography: "GB",
  published_at: new Date().toISOString(),
  metrics: { views: 480000, views_24h: 300000, views_prior_24h: 90000, likes: 42000, comments: 1600, shares: 5200, saves: 3100, creator_followers: 60000, saturation_ratio: 0.2 },
}], null, 2);

export function ViralSignalImportPanel({ businessId }: { businessId: string }) {
  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [watchlistId, setWatchlistId] = useState("");
  const [rowsJson, setRowsJson] = useState(SAMPLE);
  const [phrase, setPhrase] = useState("");
  const [testData, setTestData] = useState(true);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    (async () => {
      if (!businessId) return;
      const r = await call("social-viral-watchlists", { business_id: businessId, action: "list" });
      setWatchlists(r.watchlists ?? []);
    })();
  }, [businessId]);

  const send = (dry: boolean) => call("social-viral-signal-import", {
    business_id: businessId,
    provider_slug: "manual_import",
    watchlist_id: watchlistId || null,
    rows_json: rowsJson,
    is_test_data: testData,
    dry_run: dry,
    confirmation_phrase: dry ? undefined : phrase,
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Import signals (manual / structured)</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <p className="text-[11px] text-muted-foreground">
          Metrics and provenance only. Never paste captions, scripts or downloaded media from a source post.
        </p>
        <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={watchlistId} onChange={(e) => setWatchlistId(e.target.value)}>
          <option value="">No watchlist (unmatched)</option>
          {watchlists.map((w) => <option key={w.id} value={w.id}>{w.watchlist_name}</option>)}
        </select>
        <Textarea rows={10} className="font-mono text-[11px]" value={rowsJson} onChange={(e) => setRowsJson(e.target.value)} />
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={testData} onChange={(e) => setTestData(e.target.checked)} /> mark as test data
        </label>
        <ConfirmField phrase="IMPORT VIRAL SIGNALS" value={phrase} onChange={setPhrase} />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setResult(await send(true))}>Preview</Button>
          <Button size="sm" disabled={!phrase} onClick={async () => setResult(await send(false))}>Import</Button>
        </div>
        {result && <pre className="text-[10px] p-2 bg-secondary/40 rounded overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function ViralOpportunityBoardPanel({ businessId }: { businessId: string }) {
  const [signals, setSignals] = useState<any[]>([]);
  const [opps, setOpps] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>({ status: "", platform: "", min_score: "", only_fresh: false, exclude_risky: false });
  const [phrase, setPhrase] = useState("");
  const [result, setResult] = useState<any>(null);

  const refresh = useCallback(async () => {
    if (!businessId) return;
    const r = await call("social-viral-opportunities", {
      business_id: businessId, action: "list",
      status: filters.status || undefined,
      platform: filters.platform || undefined,
      min_score: filters.min_score ? Number(filters.min_score) : undefined,
      only_fresh: filters.only_fresh || undefined,
      exclude_risky: filters.exclude_risky || undefined,
    });
    setOpps(r.opportunities ?? []);
    const { data } = await supabase.from("social_viral_signals" as any)
      .select("id, title, platform, external_id, signal_status")
      .eq("business_id", businessId).order("observed_at", { ascending: false }).limit(50);
    setSignals((data as any[]) ?? []);
  }, [businessId, filters]);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Flame size={16} /> Ranked opportunities</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Disclaimer />
        <div className="grid md:grid-cols-5 gap-2 text-xs">
          <Input placeholder="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} />
          <Input placeholder="Platform" value={filters.platform} onChange={(e) => setFilters({ ...filters, platform: e.target.value })} />
          <Input placeholder="Min score" value={filters.min_score} onChange={(e) => setFilters({ ...filters, min_score: e.target.value })} />
          <label className="flex items-center gap-2"><input type="checkbox" checked={filters.only_fresh} onChange={(e) => setFilters({ ...filters, only_fresh: e.target.checked })} /> fresh only</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={filters.exclude_risky} onChange={(e) => setFilters({ ...filters, exclude_risky: e.target.checked })} /> hide risk-flagged</label>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Unscored signals</p>
          {signals.filter((s) => s.signal_status !== "scored").length === 0 && <p className="text-[11px] text-muted-foreground">No unscored signals.</p>}
          {signals.filter((s) => s.signal_status !== "scored").slice(0, 10).map((s) => (
            <div key={s.id} className="flex items-center justify-between p-2 rounded bg-secondary/40 text-xs">
              <span>{s.title ?? s.external_id} · {s.platform}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={async () => setResult(await call("social-viral-opportunity-score", { business_id: businessId, signal_id: s.id }))}>Score preview</Button>
                <Button size="sm" disabled={phrase !== "SCORE VIRAL OPPORTUNITY"} onClick={async () => {
                  setResult(await call("social-viral-opportunity-score", { business_id: businessId, signal_id: s.id, dry_run: false, confirmation_phrase: phrase }));
                  refresh();
                }}>Score</Button>
              </div>
            </div>
          ))}
          <ConfirmField phrase="SCORE VIRAL OPPORTUNITY" value={phrase} onChange={setPhrase} />
        </div>

        <div className="space-y-2">
          {opps.length === 0 && <p className="text-xs text-muted-foreground">No opportunities yet — import signals and score them.</p>}
          {opps.map((o) => <OpportunityCard key={o.id} businessId={businessId} o={o} onChanged={refresh} />)}
        </div>
        {result && <pre className="text-[10px] p-2 bg-secondary/40 rounded overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

function OpportunityCard({ businessId, o, onChanged }: { businessId: string; o: any; onChanged: () => void }) {
  const [phrase, setPhrase] = useState("");
  const [briefPhrase, setBriefPhrase] = useState("");
  const [out, setOut] = useState<any>(null);
  const blocked = (o.blockers ?? []).length > 0;
  return (
    <div className="p-3 rounded border bg-secondary/20 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{o.opportunity_title}</p>
          <p className="text-[11px] text-muted-foreground">
            {o.platform} · objective {o.business_objective} · route {o.conversion_route ?? "none"} · fresh until {o.freshness_deadline ?? "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">{o.overall_score}</p>
          <p className="text-[10px] text-muted-foreground">{o.confidence_level} confidence</p>
        </div>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-[10px]">
        <Tile l="Reach" v={o.viral_reach_score} />
        <Tile l="Velocity" v={o.trend_velocity_score} />
        <Tile l="Audience" v={o.audience_fit_score} />
        <Tile l="Conversion" v={o.conversion_potential_score} />
        <Tile l="Timing" v={o.timing_saturation_score} />
        <Tile l="Safety" v={o.safety_score} />
      </div>
      <div className="flex flex-wrap gap-1">
        <Badge variant="secondary">{o.opportunity_status}</Badge>
        {(o.blockers ?? []).map((x: string) => <Badge key={x} variant="destructive" className="text-[10px]">{x}</Badge>)}
        {(o.risk_flags ?? []).map((x: string) => <Badge key={x} variant="outline" className="text-[10px]">{x}</Badge>)}
        {o.provenance?.canonical_url && (
          <a className="text-[10px] underline flex items-center gap-1" href={o.provenance.canonical_url} target="_blank" rel="noreferrer">
            <Link2 size={10} /> source
          </a>
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-2">
        <div className="space-y-1">
          <ConfirmField phrase="REVIEW VIRAL OPPORTUNITY" value={phrase} onChange={setPhrase} />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={phrase !== "REVIEW VIRAL OPPORTUNITY"} onClick={async () => {
              setOut(await call("social-viral-opportunities", { business_id: businessId, action: "review", opportunity_id: o.id, decision: "approved", dry_run: false, confirmation_phrase: phrase, override_blockers: blocked, compliance_reviewed: o.requires_compliance_review }));
              onChanged();
            }}>Approve</Button>
            <Button size="sm" variant="ghost" disabled={phrase !== "REVIEW VIRAL OPPORTUNITY"} onClick={async () => {
              setOut(await call("social-viral-opportunities", { business_id: businessId, action: "review", opportunity_id: o.id, decision: "rejected", dry_run: false, confirmation_phrase: phrase }));
              onChanged();
            }}>Reject</Button>
          </div>
        </div>
        <div className="space-y-1">
          <ConfirmField phrase="CREATE VIRAL CONTENT BRIEF" value={briefPhrase} onChange={setBriefPhrase} />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={async () => setOut(await call("social-viral-opportunity-to-brief", { business_id: businessId, opportunity_id: o.id }))}>Preview brief</Button>
            <Button
              size="sm"
              disabled={o.opportunity_status !== "approved" || briefPhrase !== "CREATE VIRAL CONTENT BRIEF"}
              title={o.opportunity_status !== "approved" ? "Approve the opportunity first" : undefined}
              onClick={async () => {
                setOut(await call("social-viral-opportunity-to-brief", { business_id: businessId, opportunity_id: o.id, dry_run: false, confirmation_phrase: briefPhrase }));
                onChanged();
              }}
            >Create content brief</Button>
          </div>
        </div>
      </div>
      {out && <pre className="text-[10px] p-2 bg-secondary/40 rounded overflow-x-auto">{JSON.stringify(out, null, 2)}</pre>}
    </div>
  );
}

export function ViralBriefsPanel({ businessId }: { businessId: string }) {
  const [briefs, setBriefs] = useState<any[]>([]);
  const [phrase, setPhrase] = useState("");
  const [out, setOut] = useState<any>(null);
  const refresh = useCallback(async () => {
    if (!businessId) return;
    const r = await call("social-viral-opportunity-to-brief", { business_id: businessId, action: "list" });
    setBriefs(r.briefs ?? []);
  }, [businessId]);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Approved briefs → Content Factory</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <p className="text-[11px] text-muted-foreground">
          Briefs never publish. They flow into the existing Content Factory, founder approval, calendar and Buffer pipeline.
        </p>
        {briefs.length === 0 && <p className="text-xs text-muted-foreground">No briefs yet — approve an opportunity and create a brief.</p>}
        {briefs.map((b) => (
          <div key={b.id} className="p-2 rounded bg-secondary/40 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">{b.brief_title}</span>
              <div className="flex gap-1 items-center">
                <Badge variant="secondary">{b.brief_status}</Badge>
                <Badge variant="outline">{b.performance_status.replace(/_/g, " ")}</Badge>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">Publish by {b.publish_by ?? "—"} · CTA: {b.cta ?? "—"} · route: {b.conversion_route ?? "—"}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={phrase !== "CREATE VIRAL CONTENT BRIEF" || b.brief_status !== "awaiting_founder_approval"}
                onClick={async () => { setOut(await call("social-viral-opportunity-to-brief", { business_id: businessId, action: "approve_brief", brief_id: b.id, dry_run: false, confirmation_phrase: phrase })); refresh(); }}>
                Approve brief
              </Button>
              <Button size="sm" variant="ghost" disabled={phrase !== "CREATE VIRAL CONTENT BRIEF" || b.brief_status !== "approved"}
                onClick={async () => { setOut(await call("social-viral-opportunity-to-brief", { business_id: businessId, action: "link_content", brief_id: b.id, content_pack_id: b.content_pack_id, dry_run: false, confirmation_phrase: phrase })); refresh(); }}>
                Mark linked to content
              </Button>
            </div>
          </div>
        ))}
        <ConfirmField phrase="CREATE VIRAL CONTENT BRIEF" value={phrase} onChange={setPhrase} />
        {out && <pre className="text-[10px] p-2 bg-secondary/40 rounded overflow-x-auto">{JSON.stringify(out, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialViralRadarDashboard({ businessId }: { businessId: string }) {
  if (!businessId) return <p className="text-sm text-muted-foreground">Select a business to open the Viral Opportunity Radar.</p>;
  return (
    <div className="space-y-4">
      <ViralRadarHealthPanel businessId={businessId} />
      <ViralProviderPanel businessId={businessId} />
      <ViralWatchlistPanel businessId={businessId} />
      <ViralSignalImportPanel businessId={businessId} />
      <ViralOpportunityBoardPanel businessId={businessId} />
      <ViralBriefsPanel businessId={businessId} />
    </div>
  );
}