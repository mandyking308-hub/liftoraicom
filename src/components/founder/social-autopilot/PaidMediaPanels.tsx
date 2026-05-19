import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Lock, ShieldCheck, Megaphone } from "lucide-react";

async function invoke(name: string, body: any) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) return { ok: false, error: error.message };
  return data;
}

const Banner = () => (
  <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-400 flex items-start gap-2">
    <Lock size={14} className="mt-0.5" />
    <div>
      <p className="font-semibold">No ads, no spend, no ad-platform API calls.</p>
      <p className="text-muted-foreground mt-0.5">
        Liftor plans paid media internally only. All spend scenarios are estimates. A human operator
        must configure and launch ads externally and then confirm manually in Liftor.
      </p>
    </div>
  </div>
);

function ResultBox({ result }: { result: any }) {
  if (!result) return null;
  return <pre className="text-[10px] bg-secondary/40 p-2 rounded max-h-60 overflow-auto">{JSON.stringify(result, null, 2)}</pre>;
}

export function PaidMediaCampaignPlanPanel({ businessId }: { businessId: string }) {
  const [campaignName, setCampaignName] = useState("New paid campaign");
  const [campaignType, setCampaignType] = useState("lead_generation");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [offerName, setOfferName] = useState("");
  const [platforms, setPlatforms] = useState("meta,google");
  const [budgetTotal, setBudgetTotal] = useState("");
  const [destUrl, setDestUrl] = useState("");
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<any>(null);
  const payload = () => ({
    business_id: businessId, campaign_name: campaignName, campaign_type: campaignType,
    primary_goal: primaryGoal || null, offer_name: offerName || null,
    platform_list: platforms.split(",").map(p => p.trim()).filter(Boolean),
    budget_total: budgetTotal ? Number(budgetTotal) : null,
    funnel_destination_url: destUrl || null,
  });
  return (
    <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Megaphone size={16} /> Campaign Plan</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Campaign name" value={campaignName} onChange={e => setCampaignName(e.target.value)} />
          <Input placeholder="Campaign type" value={campaignType} onChange={e => setCampaignType(e.target.value)} />
          <Input placeholder="Primary goal" value={primaryGoal} onChange={e => setPrimaryGoal(e.target.value)} />
          <Input placeholder="Offer name" value={offerName} onChange={e => setOfferName(e.target.value)} />
          <Input placeholder="Platforms (comma)" value={platforms} onChange={e => setPlatforms(e.target.value)} />
          <Input placeholder="Budget total" value={budgetTotal} onChange={e => setBudgetTotal(e.target.value)} />
          <Input className="col-span-2" placeholder="Funnel destination URL" value={destUrl} onChange={e => setDestUrl(e.target.value)} />
          <Input className="col-span-2" placeholder="Confirmation: CREATE PAID MEDIA CAMPAIGN PLAN" value={confirm} onChange={e => setConfirm(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setResult(await invoke("paid-media-campaign-plan-preview", { ...payload(), dry_run: true }))}>Preview</Button>
          <Button size="sm" onClick={async () => setResult(await invoke("paid-media-campaign-plan-create", { ...payload(), dry_run: false, confirmation_phrase: confirm }))}>Create</Button>
        </div>
        <ResultBox result={result} />
      </CardContent></Card>
  );
}

export function PaidMediaAudiencePanel({ businessId }: { businessId: string }) {
  const [campaignId, setCampaignId] = useState("");
  const [name, setName] = useState("Cold interest");
  const [type, setType] = useState("cold_interest");
  const [platform, setPlatform] = useState("meta");
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<any>(null);
  return (
    <Card><CardHeader><CardTitle className="text-base">Audience Plan</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Input placeholder="Campaign plan id (optional)" value={campaignId} onChange={e => setCampaignId(e.target.value)} />
        <div className="grid grid-cols-3 gap-2">
          <Input placeholder="Segment name" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Segment type" value={type} onChange={e => setType(e.target.value)} />
          <Input placeholder="Platform" value={platform} onChange={e => setPlatform(e.target.value)} />
        </div>
        <Input placeholder="Confirmation: CREATE PAID MEDIA AUDIENCE PLAN" value={confirm} onChange={e => setConfirm(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setResult(await invoke("paid-media-audience-preview", { business_id: businessId, platform, dry_run: true }))}>Preview</Button>
          <Button size="sm" onClick={async () => setResult(await invoke("paid-media-audience-create", {
            business_id: businessId, campaign_plan_id: campaignId || null,
            segments: [{ segment_name: name, segment_type: type, platform }],
            dry_run: false, confirmation_phrase: confirm,
          }))}>Create</Button>
        </div>
        <p className="text-[10px] text-yellow-400 flex items-center gap-1"><AlertTriangle size={10} /> Privacy: customer lists need consent and DPA.</p>
        <ResultBox result={result} />
      </CardContent></Card>
  );
}

export function PaidMediaCreativePanel({ businessId }: { businessId: string }) {
  const [campaignId, setCampaignId] = useState("");
  const [name, setName] = useState("Variant A");
  const [type, setType] = useState("single_image");
  const [headline, setHeadline] = useState("");
  const [primaryText, setPrimaryText] = useState("");
  const [cta, setCta] = useState("Learn More");
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<any>(null);
  return (
    <Card><CardHeader><CardTitle className="text-base">Creative Variants</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Input placeholder="Campaign plan id" value={campaignId} onChange={e => setCampaignId(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Variant name" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Creative type" value={type} onChange={e => setType(e.target.value)} />
          <Input className="col-span-2" placeholder="Headline" value={headline} onChange={e => setHeadline(e.target.value)} />
          <Textarea className="col-span-2" placeholder="Primary text" value={primaryText} onChange={e => setPrimaryText(e.target.value)} />
          <Input placeholder="CTA" value={cta} onChange={e => setCta(e.target.value)} />
        </div>
        <Input placeholder="Confirmation: CREATE PAID MEDIA CREATIVE VARIANTS" value={confirm} onChange={e => setConfirm(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setResult(await invoke("paid-media-creative-preview", { business_id: businessId, offer: headline, dry_run: true }))}>Preview</Button>
          <Button size="sm" onClick={async () => setResult(await invoke("paid-media-creative-create", {
            business_id: businessId, campaign_plan_id: campaignId || null,
            variants: [{ variant_name: name, creative_type: type, headline, primary_text: primaryText, cta_text: cta }],
            dry_run: false, confirmation_phrase: confirm,
          }))}>Create</Button>
        </div>
        <p className="text-[10px] text-muted-foreground">Unsupported claims are auto-flagged (no "guarantee", "#1", "10x", "risk-free", etc.).</p>
        <ResultBox result={result} />
      </CardContent></Card>
  );
}

export function PaidMediaBudgetGuardPanel({ businessId }: { businessId: string }) {
  const [campaignId, setCampaignId] = useState("");
  const [name, setName] = useState("Default guard");
  const [total, setTotal] = useState("");
  const [daily, setDaily] = useState("");
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<any>(null);
  return (
    <Card><CardHeader><CardTitle className="text-base">Budget Guard</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Input placeholder="Campaign plan id" value={campaignId} onChange={e => setCampaignId(e.target.value)} />
        <div className="grid grid-cols-3 gap-2">
          <Input placeholder="Guard name" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Total cap" value={total} onChange={e => setTotal(e.target.value)} />
          <Input placeholder="Daily cap" value={daily} onChange={e => setDaily(e.target.value)} />
        </div>
        <Input placeholder="Confirmation: CREATE PAID MEDIA BUDGET GUARD" value={confirm} onChange={e => setConfirm(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setResult(await invoke("paid-media-budget-guard-preview", { business_id: businessId, total_budget_cap: Number(total) || null, daily_budget_cap: Number(daily) || null, dry_run: true }))}>Preview</Button>
          <Button size="sm" onClick={async () => setResult(await invoke("paid-media-budget-guard-create", {
            business_id: businessId, campaign_plan_id: campaignId || null,
            guard_name: name, total_budget_cap: Number(total) || null, daily_budget_cap: Number(daily) || null,
            dry_run: false, confirmation_phrase: confirm,
          }))}>Create</Button>
        </div>
        <p className="text-[10px] text-muted-foreground">Liftor cannot enforce spend. Operator must apply caps inside the ad platform.</p>
        <ResultBox result={result} />
      </CardContent></Card>
  );
}

export function PaidMediaSpendScenarioPanel({ businessId }: { businessId: string }) {
  const [campaignId, setCampaignId] = useState("");
  const [name, setName] = useState("Baseline forecast");
  const [spend, setSpend] = useState("");
  const [cpc, setCpc] = useState("");
  const [cpl, setCpl] = useState("");
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<any>(null);
  return (
    <Card><CardHeader><CardTitle className="text-base">Spend Scenario (estimate only)</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Input placeholder="Campaign plan id" value={campaignId} onChange={e => setCampaignId(e.target.value)} />
        <div className="grid grid-cols-4 gap-2">
          <Input placeholder="Scenario name" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Planned spend" value={spend} onChange={e => setSpend(e.target.value)} />
          <Input placeholder="Expected CPC" value={cpc} onChange={e => setCpc(e.target.value)} />
          <Input placeholder="Expected CPL" value={cpl} onChange={e => setCpl(e.target.value)} />
        </div>
        <Input placeholder="Confirmation: CREATE PAID MEDIA SPEND SCENARIO" value={confirm} onChange={e => setConfirm(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setResult(await invoke("paid-media-spend-scenario-preview", { business_id: businessId, planned_spend: Number(spend) || 0, expected_cpc: Number(cpc) || 0, expected_cpl: Number(cpl) || 0, dry_run: true }))}>Preview</Button>
          <Button size="sm" onClick={async () => setResult(await invoke("paid-media-spend-scenario-create", {
            business_id: businessId, campaign_plan_id: campaignId || null, scenario_name: name,
            planned_spend: Number(spend) || null, expected_cpc: Number(cpc) || null, expected_cpl: Number(cpl) || null,
            dry_run: false, confirmation_phrase: confirm,
          }))}>Create</Button>
        </div>
        <Badge variant="outline">Forecast only — not real spend or proven performance.</Badge>
        <ResultBox result={result} />
      </CardContent></Card>
  );
}

export function PaidMediaRiskReviewPanel({ businessId }: { businessId: string }) {
  const [campaignId, setCampaignId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<any>(null);
  return (
    <Card><CardHeader><CardTitle className="text-base">Risk / Compliance Review</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Input placeholder="Campaign plan id (optional)" value={campaignId} onChange={e => setCampaignId(e.target.value)} />
        <Input placeholder="Creative variant id (optional)" value={variantId} onChange={e => setVariantId(e.target.value)} />
        <Input placeholder="Confirmation: GENERATE PAID MEDIA RISK REVIEW" value={confirm} onChange={e => setConfirm(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setResult(await invoke("paid-media-risk-review-generate", { business_id: businessId, campaign_plan_id: campaignId || null, creative_variant_id: variantId || null, dry_run: true }))}>Preview</Button>
          <Button size="sm" onClick={async () => setResult(await invoke("paid-media-risk-review-generate", { business_id: businessId, campaign_plan_id: campaignId || null, creative_variant_id: variantId || null, dry_run: false, confirmation_phrase: confirm }))}>Generate</Button>
        </div>
        <ResultBox result={result} />
      </CardContent></Card>
  );
}

export function PaidMediaReadinessPanel({ businessId }: { businessId: string }) {
  const [campaignId, setCampaignId] = useState("");
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<any>(null);
  return (
    <Card><CardHeader><CardTitle className="text-base">Readiness Check</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Input placeholder="Campaign plan id" value={campaignId} onChange={e => setCampaignId(e.target.value)} />
        <Input placeholder="Confirmation: SAVE PAID MEDIA READINESS CHECK" value={confirm} onChange={e => setConfirm(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setResult(await invoke("paid-media-readiness-check", { business_id: businessId, campaign_plan_id: campaignId, dry_run: true }))}>Preview</Button>
          <Button size="sm" onClick={async () => setResult(await invoke("paid-media-readiness-check", { business_id: businessId, campaign_plan_id: campaignId, dry_run: false, confirmation_phrase: confirm }))}>Save</Button>
        </div>
        <ResultBox result={result} />
      </CardContent></Card>
  );
}

export function PaidMediaManualExportPanel({ businessId }: { businessId: string }) {
  const [campaignId, setCampaignId] = useState("");
  const [name, setName] = useState("Operator pack");
  const [type, setType] = useState("meta_ads_operator");
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<any>(null);
  return (
    <Card><CardHeader><CardTitle className="text-base">Manual Ad Platform Export</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Input placeholder="Campaign plan id" value={campaignId} onChange={e => setCampaignId(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Export name" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Export type" value={type} onChange={e => setType(e.target.value)} />
        </div>
        <Input placeholder="Confirmation: CREATE PAID MEDIA MANUAL EXPORT" value={confirm} onChange={e => setConfirm(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setResult(await invoke("paid-media-manual-export-preview", { business_id: businessId, campaign_plan_id: campaignId, export_type: type, dry_run: true }))}>Preview</Button>
          <Button size="sm" onClick={async () => setResult(await invoke("paid-media-manual-export-create", { business_id: businessId, campaign_plan_id: campaignId, export_type: type, export_name: name, dry_run: false, confirmation_phrase: confirm }))}>Create</Button>
        </div>
        <ResultBox result={result} />
      </CardContent></Card>
  );
}

export function PaidMediaManualLaunchConfirmPanel({ businessId }: { businessId: string }) {
  const [campaignId, setCampaignId] = useState("");
  const [exportId, setExportId] = useState("");
  const [notes, setNotes] = useState("");
  const [markLaunched, setMarkLaunched] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [launchConfirm, setLaunchConfirm] = useState("");
  const [result, setResult] = useState<any>(null);
  return (
    <Card><CardHeader><CardTitle className="text-base">Confirm Manual Launch (operator)</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Input placeholder="Campaign plan id" value={campaignId} onChange={e => setCampaignId(e.target.value)} />
        <Input placeholder="Export pack id" value={exportId} onChange={e => setExportId(e.target.value)} />
        <Textarea placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
        <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={markLaunched} onChange={e => setMarkLaunched(e.target.checked)} /> Mark as launched externally</label>
        <Input placeholder="Confirmation: CONFIRM PAID MEDIA MANUAL SETUP" value={confirm} onChange={e => setConfirm(e.target.value)} />
        {markLaunched && <Input placeholder="Launch confirmation: CONFIRM PAID MEDIA MANUALLY LAUNCHED EXTERNALLY" value={launchConfirm} onChange={e => setLaunchConfirm(e.target.value)} />}
        <Button size="sm" onClick={async () => setResult(await invoke("paid-media-manual-launch-confirm", {
          business_id: businessId, campaign_plan_id: campaignId || null, export_pack_id: exportId || null,
          confirmation_notes: notes, mark_launched: markLaunched,
          dry_run: false, confirmation_phrase: confirm, launch_confirmation_phrase: launchConfirm,
        }))}>Record</Button>
        <p className="text-[10px] text-muted-foreground">Does not call ad platform. Does not record performance. Internal status only.</p>
        <ResultBox result={result} />
      </CardContent></Card>
  );
}

export function PaidMediaHealthPanel({ businessId }: { businessId: string }) {
  const [data, setData] = useState<any>(null);
  const refresh = async () => setData(await invoke("paid-media-healthcheck", {}));
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);
  const tile = (label: string, v: any) => (
    <div className="p-2 rounded bg-secondary/40"><p className="text-[10px] text-muted-foreground">{label}</p><p className="font-semibold">{v ?? "—"}</p></div>
  );
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="text-base flex items-center gap-2"><ShieldCheck size={16} /> Paid Media Health</CardTitle>
      <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
    </CardHeader>
      <CardContent className="grid grid-cols-3 md:grid-cols-5 gap-2 text-xs">
        {tile("Campaigns", data?.campaign_plans_total)}
        {tile("Audiences", data?.audience_segments_total)}
        {tile("Creatives", data?.creative_variants_total)}
        {tile("Budget guards", data?.budget_guards_total)}
        {tile("Scenarios", data?.spend_scenarios_total)}
        {tile("Readiness", data?.readiness_checks_total)}
        {tile("Risk reviews", data?.risk_reviews_total)}
        {tile("Export packs", data?.manual_exports_total)}
        {tile("Manually launched", data?.manually_launched_external_count)}
        {tile("Money spent", `£${data?.money_spent_total ?? 0}`)}
        {tile("Campaigns launched", data?.campaigns_launched_total ?? 0)}
        {tile("External API calls", data?.external_api_calls_total ?? 0)}
      </CardContent></Card>
  );
}

export function PaidMediaAuditPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!businessId) return;
    (supabase as any).from("paid_media_audit").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50).then(({ data }: any) => setRows(data ?? []));
  }, [businessId]);
  return (
    <Card><CardHeader><CardTitle className="text-base">Audit Log</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-xs text-muted-foreground">No audit entries.</p> :
          <div className="space-y-1 text-xs max-h-72 overflow-auto">{rows.map(r => (
            <div key={r.id} className="p-2 rounded bg-secondary/40 flex justify-between">
              <span>{r.action}</span><span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
            </div>))}</div>}
      </CardContent></Card>
  );
}

export function PaidMediaDashboard({ businessId }: { businessId: string }) {
  return (
    <div className="space-y-4">
      <Banner />
      <PaidMediaHealthPanel businessId={businessId} />
      <div className="grid md:grid-cols-2 gap-4">
        <PaidMediaCampaignPlanPanel businessId={businessId} />
        <PaidMediaAudiencePanel businessId={businessId} />
        <PaidMediaCreativePanel businessId={businessId} />
        <PaidMediaBudgetGuardPanel businessId={businessId} />
        <PaidMediaSpendScenarioPanel businessId={businessId} />
        <PaidMediaRiskReviewPanel businessId={businessId} />
        <PaidMediaReadinessPanel businessId={businessId} />
        <PaidMediaManualExportPanel businessId={businessId} />
        <PaidMediaManualLaunchConfirmPanel businessId={businessId} />
      </div>
      <PaidMediaAuditPanel businessId={businessId} />
    </div>
  );
}

export default PaidMediaDashboard;