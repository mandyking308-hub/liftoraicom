import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, Target, Map, ListChecks, Search, Activity } from "lucide-react";

async function call(name: string, body?: any, method: "POST"|"GET" = "POST", q?: Record<string,string>) {
  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`);
  if (q) Object.entries(q).forEach(([k,v]) => v && url.searchParams.set(k,v));
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(url.toString(), {
    method,
    headers: { Authorization: `Bearer ${session?.access_token ?? ""}`, "Content-Type": "application/json" },
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
  });
  return res.json();
}

function Tile({ label, value }: { label: string; value: any }) {
  return (<div className="p-3 rounded bg-secondary/50"><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-semibold">{value ?? "—"}</p></div>);
}

export function SocialCampaignOfferHealthPanel({ businessId }: { businessId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const refresh = async () => { setLoading(true); setData(await call("social-campaign-offer-healthcheck", undefined, "GET", { business_id: businessId })); setLoading(false); };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Activity size={16}/> Campaign / Offer Health</CardTitle>
        <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>{loading?"…":"Refresh"}</Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile label="Campaign plans" value={data?.campaign_plans_count}/>
          <Tile label="Approved" value={data?.approved_campaigns_count}/>
          <Tile label="Revenue strategies" value={data?.revenue_strategies_count}/>
          <Tile label="Journey rules" value={data?.journey_rules_count}/>
          <Tile label="Content maps" value={data?.campaign_content_maps_count}/>
          <Tile label="Readiness reviews" value={data?.readiness_reviews_count}/>
          <Tile label="Blocked" value={data?.campaigns_blocked_count}/>
          <Tile label="Offers w/o content" value={data?.offers_without_content_count}/>
          <Tile label="Rev targets w/o strat." value={data?.revenue_targets_without_strategy_count}/>
          <Tile label="Ready→calendar" value={data?.ready_for_calendar_generation?"yes":"no"}/>
          <Tile label="Ready→approval" value={data?.ready_for_approval_flow?"yes":"no"}/>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Next: {data?.next_action ?? "—"}</p>
      </CardContent>
    </Card>
  );
}

export function SocialCampaignPlanPanel({ businessId }: { businessId: string }) {
  const [type, setType] = useState("awareness");
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<any>(null);
  const onPreview = async () => setPreview(await call("social-campaign-plan-preview", { business_id: businessId, campaign_type: type, campaign_name: name }));
  const onCreate = async () => setResult(await call("social-campaign-plan-create", { business_id: businessId, campaign_type: type, campaign_name: name, dry_run: false, confirmation_phrase: confirm }));
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Megaphone size={16}/> Campaign Plan</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid md:grid-cols-2 gap-2">
          <Input placeholder="campaign name" value={name} onChange={e=>setName(e.target.value)}/>
          <Input placeholder="campaign type (awareness/launch/lead_generation/...)" value={type} onChange={e=>setType(e.target.value)}/>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={onPreview} disabled={!businessId}>Preview</Button>
          <Input className="w-72" placeholder='Type "CREATE SOCIAL CAMPAIGN PLAN"' value={confirm} onChange={e=>setConfirm(e.target.value)}/>
          <Button size="sm" onClick={onCreate} disabled={confirm !== "CREATE SOCIAL CAMPAIGN PLAN"}>Create</Button>
        </div>
        {preview && <pre className="text-[10px] bg-secondary/30 p-2 rounded overflow-auto max-h-40">{JSON.stringify(preview.preview, null, 2)}</pre>}
        {result && <p className="text-xs">{result.ok ? `Created ${result.plan?.id}` : result.error}</p>}
      </CardContent>
    </Card>
  );
}

export function SocialCampaignListPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { if (!businessId) return; supabase.from("social_campaign_plans" as any).select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(30).then(({data}) => setRows((data as any[])??[])); }, [businessId]);
  return (
    <Card><CardHeader><CardTitle className="text-base">Campaigns</CardTitle></CardHeader>
      <CardContent>{!rows.length ? <p className="text-sm text-muted-foreground">No campaigns yet.</p> :
        <div className="space-y-2">{rows.map(r => (
          <div key={r.id} className="p-2 rounded bg-secondary/40 text-sm flex justify-between">
            <div><p className="font-medium">{r.campaign_name}</p><p className="text-xs text-muted-foreground">{r.campaign_type} · {r.funnel_stage} · readiness {r.readiness_score}</p></div>
            <div className="flex gap-1"><Badge variant="secondary">{r.campaign_status}</Badge><Badge variant="outline">{r.approval_status}</Badge></div>
          </div>
        ))}</div>}
      </CardContent></Card>
  );
}

export function SocialCampaignDetailPanel({ businessId }: { businessId: string }) {
  const [id, setId] = useState("");
  const [row, setRow] = useState<any>(null);
  const load = async () => { const { data } = await supabase.from("social_campaign_plans" as any).select("*").eq("id", id).maybeSingle(); setRow(data); };
  return (
    <Card><CardHeader><CardTitle className="text-base">Campaign Detail</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2"><Input placeholder="campaign_plan_id" value={id} onChange={e=>setId(e.target.value)}/><Button size="sm" onClick={load} disabled={!id}>Load</Button></div>
        {row && <pre className="text-[10px] bg-secondary/30 p-2 rounded overflow-auto max-h-60">{JSON.stringify(row, null, 2)}</pre>}
      </CardContent></Card>
  );
}

export function SocialCampaignContentMapPanel({ businessId }: { businessId: string }) {
  const [id, setId] = useState(""); const [pack, setPack] = useState(""); const [preview, setPreview] = useState<any>(null);
  const onPreview = async () => setPreview(await call("social-campaign-content-map-preview", { business_id: businessId, campaign_plan_id: id, content_pack_id: pack || undefined }));
  return (
    <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Map size={16}/> Content Map</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid md:grid-cols-2 gap-2"><Input placeholder="campaign_plan_id" value={id} onChange={e=>setId(e.target.value)}/><Input placeholder="content_pack_id (optional)" value={pack} onChange={e=>setPack(e.target.value)}/></div>
        <Button size="sm" onClick={onPreview} disabled={!id}>Preview mapping</Button>
        {preview && <pre className="text-[10px] bg-secondary/30 p-2 rounded overflow-auto max-h-60">{JSON.stringify(preview, null, 2)}</pre>}
      </CardContent></Card>
  );
}

export function SocialRevenueContentStrategyPanel({ businessId }: { businessId: string }) {
  const [amount, setAmount] = useState(""); const [price, setPrice] = useState(""); const [offer, setOffer] = useState(""); const [confirm, setConfirm] = useState("");
  const [preview, setPreview] = useState<any>(null); const [result, setResult] = useState<any>(null);
  const onPreview = async () => setPreview(await call("social-revenue-content-strategy-preview", { business_id: businessId, target_amount: Number(amount)||undefined, price: Number(price)||undefined, primary_offer: offer }));
  const onCreate = async () => setResult(await call("social-revenue-content-strategy-create", { business_id: businessId, target_amount: Number(amount)||undefined, price: Number(price)||undefined, primary_offer: offer, dry_run: false, confirmation_phrase: confirm }));
  return (
    <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Target size={16}/> Revenue Content Strategy</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid md:grid-cols-3 gap-2">
          <Input placeholder="target_amount" value={amount} onChange={e=>setAmount(e.target.value)}/>
          <Input placeholder="price per unit" value={price} onChange={e=>setPrice(e.target.value)}/>
          <Input placeholder="primary_offer" value={offer} onChange={e=>setOffer(e.target.value)}/>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={onPreview} disabled={!businessId}>Preview</Button>
          <Input className="w-72" placeholder='Type "CREATE SOCIAL REVENUE STRATEGY"' value={confirm} onChange={e=>setConfirm(e.target.value)}/>
          <Button size="sm" onClick={onCreate} disabled={confirm !== "CREATE SOCIAL REVENUE STRATEGY"}>Create</Button>
        </div>
        <p className="text-[10px] text-muted-foreground">Internal estimate only. Not financial advice.</p>
        {preview && <pre className="text-[10px] bg-secondary/30 p-2 rounded overflow-auto max-h-60">{JSON.stringify(preview, null, 2)}</pre>}
        {result && <p className="text-xs">{result.ok ? `Created ${result.strategy?.id}` : result.error}</p>}
      </CardContent></Card>
  );
}

export function SocialJourneyContentRulesPanel({ businessId }: { businessId: string }) {
  const [preview, setPreview] = useState<any>(null); const [confirm, setConfirm] = useState(""); const [result, setResult] = useState<any>(null);
  const onPreview = async () => setPreview(await call("social-journey-content-rules-generate", { business_id: businessId }));
  const onCreate = async () => setResult(await call("social-journey-content-rules-generate", { business_id: businessId, dry_run: false, confirmation_phrase: confirm }));
  return (
    <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><ListChecks size={16}/> Journey Content Rules</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={onPreview} disabled={!businessId}>Preview</Button>
          <Input className="w-72" placeholder='Type "CREATE SOCIAL JOURNEY CONTENT RULES"' value={confirm} onChange={e=>setConfirm(e.target.value)}/>
          <Button size="sm" onClick={onCreate} disabled={confirm !== "CREATE SOCIAL JOURNEY CONTENT RULES"}>Generate</Button>
        </div>
        {preview && <pre className="text-[10px] bg-secondary/30 p-2 rounded overflow-auto max-h-60">{JSON.stringify(preview.rules?.slice(0,3), null, 2)}</pre>}
        {result && <p className="text-xs">{result.ok ? `Inserted ${result.inserted}` : result.error}</p>}
      </CardContent></Card>
  );
}

export function SocialCampaignReadinessPanel({ businessId }: { businessId: string }) {
  const [id, setId] = useState(""); const [preview, setPreview] = useState<any>(null); const [confirm, setConfirm] = useState(""); const [result, setResult] = useState<any>(null);
  const onPreview = async () => setPreview(await call("social-campaign-readiness-check", { business_id: businessId, campaign_plan_id: id }));
  const onSave = async () => setResult(await call("social-campaign-readiness-check", { business_id: businessId, campaign_plan_id: id, dry_run: false, confirmation_phrase: confirm }));
  return (
    <Card><CardHeader><CardTitle className="text-base">Campaign Readiness</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Input placeholder="campaign_plan_id" value={id} onChange={e=>setId(e.target.value)}/>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={onPreview} disabled={!id}>Preview</Button>
          <Input className="w-72" placeholder='Type "SAVE SOCIAL CAMPAIGN READINESS REVIEW"' value={confirm} onChange={e=>setConfirm(e.target.value)}/>
          <Button size="sm" onClick={onSave} disabled={confirm !== "SAVE SOCIAL CAMPAIGN READINESS REVIEW"}>Save</Button>
        </div>
        {preview && <pre className="text-[10px] bg-secondary/30 p-2 rounded overflow-auto max-h-60">{JSON.stringify(preview.review, null, 2)}</pre>}
        {result && <p className="text-xs">{result.ok ? "Saved" : result.error}</p>}
      </CardContent></Card>
  );
}

export function SocialOfferContentGapPanel({ businessId }: { businessId: string }) {
  const [data, setData] = useState<any>(null);
  const run = async () => setData(await call("social-offer-content-gap-analysis", { business_id: businessId }));
  return (
    <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Search size={16}/> Offer / Content Gap</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button size="sm" onClick={run} disabled={!businessId}>Run gap analysis</Button>
        {data && <pre className="text-[10px] bg-secondary/30 p-2 rounded overflow-auto max-h-60">{JSON.stringify(data, null, 2)}</pre>}
      </CardContent></Card>
  );
}

export function SocialCampaignEngineDashboard({ businessId }: { businessId: string }) {
  return (
    <div className="space-y-4">
      <SocialCampaignOfferHealthPanel businessId={businessId}/>
      <SocialCampaignPlanPanel businessId={businessId}/>
      <SocialCampaignListPanel businessId={businessId}/>
      <SocialCampaignDetailPanel businessId={businessId}/>
      <div className="grid md:grid-cols-2 gap-4">
        <SocialCampaignContentMapPanel businessId={businessId}/>
        <SocialCampaignReadinessPanel businessId={businessId}/>
        <SocialRevenueContentStrategyPanel businessId={businessId}/>
        <SocialJourneyContentRulesPanel businessId={businessId}/>
        <SocialOfferContentGapPanel businessId={businessId}/>
      </div>
    </div>
  );
}