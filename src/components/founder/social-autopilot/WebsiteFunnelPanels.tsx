import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Lock, ListChecks } from "lucide-react";

async function call(path: string, body: any) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session?.access_token ?? ""}`, "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify(body),
  });
  return res.json();
}

const Tile = ({ l, v }: { l: string; v: any }) => (
  <div className="p-2 rounded bg-secondary/40"><p className="text-[10px] text-muted-foreground uppercase">{l}</p><p className="text-sm font-semibold">{v ?? "—"}</p></div>
);
const Result = ({ r }: { r: any }) => r ? <pre className="text-[11px] bg-secondary/30 p-2 rounded overflow-auto max-h-48">{JSON.stringify(r, null, 2)}</pre> : null;

export function WebsiteFunnelHealthPanel({ businessId }: { businessId: string }) {
  const [d, setD] = useState<any>(null);
  const refresh = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/website-funnel-healthcheck${businessId ? `?business_id=${businessId}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${session?.access_token ?? ""}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
    setD(await res.json());
  };
  useEffect(() => { if (businessId) refresh(); }, [businessId]);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Globe size={16} /> Website / Funnel Health</CardTitle>
        <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <Tile l="Funnel strategies" v={d?.funnel_strategies_total} />
          <Tile l="Approved" v={d?.approved_funnels} />
          <Tile l="Landing pages" v={d?.landing_pages_total} />
          <Tile l="Lead magnets" v={d?.lead_magnets_total} />
          <Tile l="CTA maps" v={d?.cta_maps_total} />
          <Tile l="Asset packs" v={d?.conversion_asset_packs_total} />
          <Tile l="Open gaps" v={d?.open_gap_reviews} />
          <Tile l="Blocked gaps" v={d?.blocked_gaps} />
          <Tile l="Export-ready" v={d?.pages_export_ready} />
          <Tile l="Manually built" v={d?.manually_built_count} />
          <Tile l="Live confirmed" v={d?.live_confirmed_external_count} />
          <Tile l="Content w/o CTA" v={d?.social_content_without_cta_map} />
          <Tile l="Campaigns w/o funnel" v={d?.campaigns_without_funnel} />
          <Tile l="External API calls" v={d?.external_api_calls_total ?? 0} />
          <Tile l="Pages published" v={d?.pages_published_total ?? 0} />
          <Tile l="Payments" v={d?.payments_created_total ?? 0} />
        </div>
      </CardContent>
    </Card>
  );
}

export function WebsiteFunnelStrategyPanel({ businessId }: { businessId: string }) {
  const [f, setF] = useState({ strategy_name: "", strategy_type: "lead_generation", target_audience: "", primary_offer: "", website_url: "", page_goal: "", value_proposition: "" });
  const [test, setTest] = useState(true);
  const [r, setR] = useState<any>(null);
  const body = { business_id: businessId, ...f, is_test_data: test };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Funnel strategy</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Strategy name" value={f.strategy_name} onChange={e => setF({ ...f, strategy_name: e.target.value })} />
          <Input placeholder="Strategy type (lead_generation, booking, demo_request…)" value={f.strategy_type} onChange={e => setF({ ...f, strategy_type: e.target.value })} />
          <Input placeholder="Target audience" value={f.target_audience} onChange={e => setF({ ...f, target_audience: e.target.value })} />
          <Input placeholder="Primary offer" value={f.primary_offer} onChange={e => setF({ ...f, primary_offer: e.target.value })} />
          <Input placeholder="Website URL (optional)" value={f.website_url} onChange={e => setF({ ...f, website_url: e.target.value })} />
          <Input placeholder="Page goal" value={f.page_goal} onChange={e => setF({ ...f, page_goal: e.target.value })} />
        </div>
        <Textarea rows={2} placeholder="Value proposition" value={f.value_proposition} onChange={e => setF({ ...f, value_proposition: e.target.value })} />
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={test} onChange={e => setTest(e.target.checked)} /> test data</label>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={async () => setR(await call("website-funnel-strategy-preview", body))}>Preview</Button>
          <Button size="sm" onClick={async () => setR(await call("website-funnel-strategy-create", { ...body, dry_run: false, confirmation_phrase: "CREATE WEBSITE FUNNEL STRATEGY" }))}>Create (typed phrase)</Button>
        </div>
        <Result r={r} />
      </CardContent>
    </Card>
  );
}

export function WebsiteLandingPageDraftPanel({ businessId }: { businessId: string }) {
  const [f, setF] = useState({ page_name: "", page_type: "landing_page", funnel_strategy_id: "", target_audience: "", primary_goal: "", hero_headline: "", hero_subheadline: "", primary_cta: "" });
  const [test, setTest] = useState(true);
  const [r, setR] = useState<any>(null);
  const body = { business_id: businessId, ...f, funnel_strategy_id: f.funnel_strategy_id || undefined, is_test_data: test };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Landing page draft</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Page name" value={f.page_name} onChange={e => setF({ ...f, page_name: e.target.value })} />
          <Input placeholder="Page type" value={f.page_type} onChange={e => setF({ ...f, page_type: e.target.value })} />
          <Input placeholder="Funnel strategy id (optional)" value={f.funnel_strategy_id} onChange={e => setF({ ...f, funnel_strategy_id: e.target.value })} />
          <Input placeholder="Target audience" value={f.target_audience} onChange={e => setF({ ...f, target_audience: e.target.value })} />
          <Input placeholder="Primary goal" value={f.primary_goal} onChange={e => setF({ ...f, primary_goal: e.target.value })} />
          <Input placeholder="Primary CTA" value={f.primary_cta} onChange={e => setF({ ...f, primary_cta: e.target.value })} />
        </div>
        <Input placeholder="Hero headline" value={f.hero_headline} onChange={e => setF({ ...f, hero_headline: e.target.value })} />
        <Input placeholder="Hero subheadline" value={f.hero_subheadline} onChange={e => setF({ ...f, hero_subheadline: e.target.value })} />
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={test} onChange={e => setTest(e.target.checked)} /> test data</label>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setR(await call("website-landing-page-preview", body))}>Preview</Button>
          <Button size="sm" onClick={async () => setR(await call("website-landing-page-create", { ...body, dry_run: false, confirmation_phrase: "CREATE WEBSITE LANDING PAGE DRAFT" }))}>Create (typed phrase)</Button>
        </div>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Lock size={11} /> Liftor never publishes pages. Manual build only.</p>
        <Result r={r} />
      </CardContent>
    </Card>
  );
}

export function WebsitePageSectionsPanel({ businessId }: { businessId: string }) {
  const [pageId, setPageId] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const load = async () => {
    if (!pageId) return;
    const { data } = await supabase.from("website_page_sections").select("*").eq("page_draft_id", pageId).order("section_order");
    setRows(data ?? []);
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Page sections</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2">
          <Input placeholder="page_draft_id" value={pageId} onChange={e => setPageId(e.target.value)} />
          <Button size="sm" variant="outline" onClick={load}>Load sections</Button>
        </div>
        {rows.length === 0 ? <p className="text-xs text-muted-foreground">No sections loaded. Create page draft with sections to view here.</p> :
          <div className="space-y-1">{rows.map(r => (
            <div key={r.id} className="p-2 rounded bg-secondary/40 text-xs flex justify-between">
              <span>{r.section_order}. {r.section_type} {r.section_title ? `— ${r.section_title}` : ""}</span>
              <Badge variant="secondary">{r.status}</Badge>
            </div>
          ))}</div>}
      </CardContent>
    </Card>
  );
}

export function WebsiteLeadMagnetPanel({ businessId }: { businessId: string }) {
  const [f, setF] = useState({ lead_magnet_name: "", lead_magnet_type: "guide", target_audience: "", promised_outcome: "", delivery_method: "manual" });
  const [test, setTest] = useState(true);
  const [r, setR] = useState<any>(null);
  const body = { business_id: businessId, ...f, is_test_data: test };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Lead magnet</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Name" value={f.lead_magnet_name} onChange={e => setF({ ...f, lead_magnet_name: e.target.value })} />
          <Input placeholder="Type (guide, checklist, pdf…)" value={f.lead_magnet_type} onChange={e => setF({ ...f, lead_magnet_type: e.target.value })} />
          <Input placeholder="Target audience" value={f.target_audience} onChange={e => setF({ ...f, target_audience: e.target.value })} />
          <Input placeholder="Promised outcome" value={f.promised_outcome} onChange={e => setF({ ...f, promised_outcome: e.target.value })} />
          <Input placeholder="Delivery method" value={f.delivery_method} onChange={e => setF({ ...f, delivery_method: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={test} onChange={e => setTest(e.target.checked)} /> test data</label>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setR(await call("website-lead-magnet-preview", body))}>Preview</Button>
          <Button size="sm" onClick={async () => setR(await call("website-lead-magnet-create", { ...body, dry_run: false, confirmation_phrase: "CREATE WEBSITE LEAD MAGNET" }))}>Create (typed phrase)</Button>
        </div>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Lock size={11} /> No emails sent. No public download created.</p>
        <Result r={r} />
      </CardContent>
    </Card>
  );
}

export function ConversionCTAMapPanel({ businessId }: { businessId: string }) {
  const [f, setF] = useState({ map_name: "", source_type: "social_content", platform: "", cta_text: "", cta_url: "", page_draft_id: "", lead_magnet_id: "", funnel_strategy_id: "", content_item_id: "", calendar_item_id: "" });
  const [test, setTest] = useState(true);
  const [r, setR] = useState<any>(null);
  const clean = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === "" ? undefined : v]));
  const body = { business_id: businessId, ...clean, is_test_data: test };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">CTA map (social → destination)</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Map name" value={f.map_name} onChange={e => setF({ ...f, map_name: e.target.value })} />
          <Input placeholder="Source type" value={f.source_type} onChange={e => setF({ ...f, source_type: e.target.value })} />
          <Input placeholder="Platform" value={f.platform} onChange={e => setF({ ...f, platform: e.target.value })} />
          <Input placeholder="CTA text" value={f.cta_text} onChange={e => setF({ ...f, cta_text: e.target.value })} />
          <Input placeholder="CTA url (intended)" value={f.cta_url} onChange={e => setF({ ...f, cta_url: e.target.value })} />
          <Input placeholder="page_draft_id (optional)" value={f.page_draft_id} onChange={e => setF({ ...f, page_draft_id: e.target.value })} />
          <Input placeholder="lead_magnet_id (optional)" value={f.lead_magnet_id} onChange={e => setF({ ...f, lead_magnet_id: e.target.value })} />
          <Input placeholder="funnel_strategy_id (optional)" value={f.funnel_strategy_id} onChange={e => setF({ ...f, funnel_strategy_id: e.target.value })} />
          <Input placeholder="content_item_id (optional)" value={f.content_item_id} onChange={e => setF({ ...f, content_item_id: e.target.value })} />
          <Input placeholder="calendar_item_id (optional)" value={f.calendar_item_id} onChange={e => setF({ ...f, calendar_item_id: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={test} onChange={e => setTest(e.target.checked)} /> test data</label>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setR(await call("conversion-cta-map-preview", body))}>Preview</Button>
          <Button size="sm" onClick={async () => setR(await call("conversion-cta-map-create", { ...body, dry_run: false, confirmation_phrase: "CREATE CONVERSION CTA MAP" }))}>Create (typed phrase)</Button>
        </div>
        <Result r={r} />
      </CardContent>
    </Card>
  );
}

export function ConversionAssetPackPanel({ businessId }: { businessId: string }) {
  const [f, setF] = useState({ pack_name: "", pack_type: "landing_page_pack", funnel_strategy_id: "", page_draft_id: "", lead_magnet_id: "", builder_instructions: "" });
  const [test, setTest] = useState(true);
  const [r, setR] = useState<any>(null);
  const clean = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === "" ? undefined : v]));
  const body = { business_id: businessId, ...clean, is_test_data: test };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Conversion asset pack</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Pack name" value={f.pack_name} onChange={e => setF({ ...f, pack_name: e.target.value })} />
          <Input placeholder="Pack type (landing_page_pack, lead_magnet_pack…)" value={f.pack_type} onChange={e => setF({ ...f, pack_type: e.target.value })} />
          <Input placeholder="funnel_strategy_id (optional)" value={f.funnel_strategy_id} onChange={e => setF({ ...f, funnel_strategy_id: e.target.value })} />
          <Input placeholder="page_draft_id (optional)" value={f.page_draft_id} onChange={e => setF({ ...f, page_draft_id: e.target.value })} />
          <Input placeholder="lead_magnet_id (optional)" value={f.lead_magnet_id} onChange={e => setF({ ...f, lead_magnet_id: e.target.value })} />
        </div>
        <Textarea rows={2} placeholder="Builder instructions" value={f.builder_instructions} onChange={e => setF({ ...f, builder_instructions: e.target.value })} />
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={test} onChange={e => setTest(e.target.checked)} /> test data</label>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setR(await call("conversion-asset-pack-preview", body))}>Preview</Button>
          <Button size="sm" onClick={async () => setR(await call("conversion-asset-pack-create", { ...body, dry_run: false, confirmation_phrase: "CREATE CONVERSION ASSET PACK" }))}>Create (typed phrase)</Button>
        </div>
        <Result r={r} />
      </CardContent>
    </Card>
  );
}

export function WebsiteBuilderExportPanel({ businessId }: { businessId: string }) {
  const [f, setF] = useState({ builder_type: "manual_operator", asset_pack_id: "", page_draft_id: "" });
  const [r, setR] = useState<any>(null);
  const clean = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === "" ? undefined : v]));
  const body = { business_id: businessId, ...clean };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Builder export pack</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="builder_type (lovable/wix/shopify/webflow/wordpress/manual_operator)" value={f.builder_type} onChange={e => setF({ ...f, builder_type: e.target.value })} />
          <Input placeholder="asset_pack_id (optional)" value={f.asset_pack_id} onChange={e => setF({ ...f, asset_pack_id: e.target.value })} />
          <Input placeholder="page_draft_id (optional)" value={f.page_draft_id} onChange={e => setF({ ...f, page_draft_id: e.target.value })} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setR(await call("website-builder-export-preview", body))}>Preview</Button>
          <Button size="sm" onClick={async () => setR(await call("website-builder-export-create", { ...body, dry_run: false, confirmation_phrase: "CREATE WEBSITE BUILDER EXPORT" }))}>Create export (typed phrase)</Button>
        </div>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Lock size={11} /> No API call to any builder. Manual build only.</p>
        <Result r={r} />
      </CardContent>
    </Card>
  );
}

export function WebsiteFunnelReadinessPanel({ businessId }: { businessId: string }) {
  const [f, setF] = useState({ funnel_strategy_id: "", page_draft_id: "", lead_magnet_id: "" });
  const [r, setR] = useState<any>(null);
  const clean = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === "" ? undefined : v]));
  const body = { business_id: businessId, ...clean };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><ListChecks size={16} /> Readiness check</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <Input placeholder="funnel_strategy_id" value={f.funnel_strategy_id} onChange={e => setF({ ...f, funnel_strategy_id: e.target.value })} />
          <Input placeholder="page_draft_id" value={f.page_draft_id} onChange={e => setF({ ...f, page_draft_id: e.target.value })} />
          <Input placeholder="lead_magnet_id" value={f.lead_magnet_id} onChange={e => setF({ ...f, lead_magnet_id: e.target.value })} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setR(await call("website-funnel-readiness-check", body))}>Preview readiness</Button>
          <Button size="sm" onClick={async () => setR(await call("website-funnel-readiness-check", { ...body, dry_run: false, confirmation_phrase: "SAVE WEBSITE FUNNEL READINESS REVIEW" }))}>Save review (typed phrase)</Button>
        </div>
        <Result r={r} />
      </CardContent>
    </Card>
  );
}

export function WebsiteFunnelGapPanel({ businessId }: { businessId: string }) {
  const [r, setR] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase.from("website_funnel_gap_reviews").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50);
    setRows(data ?? []);
  };
  useEffect(() => { if (businessId) load(); }, [businessId]);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Funnel gap analysis</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setR(await call("website-funnel-gap-analysis", { business_id: businessId }))}>Run gap analysis</Button>
          <Button size="sm" onClick={async () => { await call("website-funnel-gap-analysis", { business_id: businessId, dry_run: false, confirmation_phrase: "SAVE WEBSITE FUNNEL GAP ANALYSIS" }); await load(); }}>Save gaps (typed phrase)</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Result r={r} />
        <div className="mt-2 space-y-1">
          {rows.length === 0 ? <p className="text-xs text-muted-foreground">No gaps recorded yet.</p> :
            rows.map(g => (
              <div key={g.id} className="p-2 rounded bg-secondary/40 text-xs flex justify-between">
                <span>{g.gap_type} — {g.gap_description}</span>
                <Badge variant={g.severity === "critical" || g.severity === "high" ? "destructive" : "secondary"}>{g.severity}/{g.status}</Badge>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function WebsiteLiveConfirmationPanel({ businessId }: { businessId: string }) {
  const [f, setF] = useState({ funnel_strategy_id: "", page_draft_id: "", lead_magnet_id: "", asset_pack_id: "", external_url: "", confirmation_notes: "", mark_live: false });
  const [r, setR] = useState<any>(null);
  const clean: any = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === "" ? undefined : v]));
  const body = { business_id: businessId, ...clean };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Live / manual confirmation</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="funnel_strategy_id" value={f.funnel_strategy_id} onChange={e => setF({ ...f, funnel_strategy_id: e.target.value })} />
          <Input placeholder="page_draft_id" value={f.page_draft_id} onChange={e => setF({ ...f, page_draft_id: e.target.value })} />
          <Input placeholder="lead_magnet_id" value={f.lead_magnet_id} onChange={e => setF({ ...f, lead_magnet_id: e.target.value })} />
          <Input placeholder="asset_pack_id" value={f.asset_pack_id} onChange={e => setF({ ...f, asset_pack_id: e.target.value })} />
          <Input placeholder="External URL" value={f.external_url} onChange={e => setF({ ...f, external_url: e.target.value })} />
        </div>
        <Textarea rows={2} placeholder="Confirmation notes" value={f.confirmation_notes} onChange={e => setF({ ...f, confirmation_notes: e.target.value })} />
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={f.mark_live} onChange={e => setF({ ...f, mark_live: e.target.checked })} /> mark live externally (extra phrase required)</label>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setR(await call("website-live-confirmation-record", body))}>Preview</Button>
          <Button size="sm" onClick={async () => setR(await call("website-live-confirmation-record", { ...body, dry_run: false, confirmation_phrase: "CONFIRM WEBSITE ASSET MANUALLY BUILT", live_confirmation_phrase: f.mark_live ? "CONFIRM WEBSITE ASSET IS LIVE" : undefined }))}>Confirm (typed phrase)</Button>
        </div>
        <Result r={r} />
      </CardContent>
    </Card>
  );
}

export function WebsiteFunnelAuditPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!businessId) return;
    supabase.from("website_funnel_audit").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50).then(({ data }) => setRows(data ?? []));
  }, [businessId]);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Funnel audit log</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-xs text-muted-foreground">No audit rows.</p> :
          <div className="space-y-1">{rows.map(r => (
            <div key={r.id} className="text-[11px] p-1.5 rounded bg-secondary/30 flex justify-between">
              <span>{r.action}</span><span>{new Date(r.created_at).toLocaleString()}</span>
            </div>
          ))}</div>}
      </CardContent>
    </Card>
  );
}

export function WebsiteFunnelDashboard({ businessId }: { businessId: string }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-400 flex items-start gap-2">
        <Lock size={14} className="mt-0.5" />
        <div>
          <p className="font-semibold">No publish, deploy, payment, form or email actions</p>
          <p className="text-muted-foreground mt-0.5">Liftor only drafts internal funnel strategy, landing pages, lead magnets, CTA maps and operator/builder export packs. All external publishing and form/payment/email creation is locked.</p>
        </div>
      </div>
      <WebsiteFunnelHealthPanel businessId={businessId} />
      <WebsiteFunnelStrategyPanel businessId={businessId} />
      <WebsiteLandingPageDraftPanel businessId={businessId} />
      <WebsitePageSectionsPanel businessId={businessId} />
      <WebsiteLeadMagnetPanel businessId={businessId} />
      <ConversionCTAMapPanel businessId={businessId} />
      <ConversionAssetPackPanel businessId={businessId} />
      <WebsiteBuilderExportPanel businessId={businessId} />
      <WebsiteFunnelReadinessPanel businessId={businessId} />
      <WebsiteFunnelGapPanel businessId={businessId} />
      <WebsiteLiveConfirmationPanel businessId={businessId} />
      <WebsiteFunnelAuditPanel businessId={businessId} />
    </div>
  );
}