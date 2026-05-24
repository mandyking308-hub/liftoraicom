import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, Target, ArrowLeft, AlertTriangle, Sparkles, TrendingUp, Lock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import MARecordDialog, { FieldDef } from "@/components/founder/ma/MARecordDialog";

const VAL_METHODS = ["revenue_multiple","arr_multiple","ebitda_multiple","ip_premium","strategic_premium","mixed"] as const;
const WARMTHS = ["cold","aware","engaged","warm","strategic_conversation","exit_ready"] as const;
const AGENTS = ["outreach","crm","inbox","content","reporting","compliance","buyer_warmup","founder_approval","data_room"] as const;
const ASSET_TYPES = ["brand","SaaS","service_business","media_ip","ecommerce","marketplace","ai_tool","other"];
const opt = (a: readonly string[] | string[]) => a.map((v) => ({ value: v, label: v.replace(/_/g, " ") }));

const fmtMoney = (n: number | null | undefined, c = "USD") => {
  if (n == null || isNaN(Number(n))) return "—";
  const num = Number(n);
  const sym = c === "GBP" ? "£" : c === "EUR" ? "€" : "$";
  if (Math.abs(num) >= 1_000_000) return `${sym}${(num / 1_000_000).toFixed(2)}M`;
  if (Math.abs(num) >= 1_000) return `${sym}${(num / 1_000).toFixed(1)}k`;
  return `${sym}${num.toFixed(0)}`;
};
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

type Calc = {
  desired_exit_value: number;
  currency: string;
  valuation_method: typeof VAL_METHODS[number];
  assumed_multiple: number;
  target_timeline_months: number;
  avg_annual_customer_value: number;
  conversion_rate: number; // qualified→customer
  lead_to_qualified_rate: number;
  close_rate: number;
  current_monthly_revenue: number;
  profit_margin: number;
  pipeline_coverage: number;
};

const SCENARIO_PRESETS = [
  { label: "£5m", desired: 5_000_000 },
  { label: "£10m", desired: 10_000_000 },
  { label: "£25m", desired: 25_000_000 },
  { label: "£50m", desired: 50_000_000 },
];

function calcOutputs(i: Calc) {
  const isProfit = i.valuation_method === "ebitda_multiple";
  const mult = Math.max(0.0001, Number(i.assumed_multiple) || 0);
  let requiredAnnualRevenue = 0;
  let requiredAnnualProfit = 0;
  const margin = Math.max(0.01, Math.min(0.99, Number(i.profit_margin) || 0.2));
  if (i.valuation_method === "ip_premium" || i.valuation_method === "strategic_premium") {
    // treat exit value as premium over base; show "required base revenue" using base multiple
    requiredAnnualRevenue = i.desired_exit_value / mult;
    requiredAnnualProfit = requiredAnnualRevenue * margin;
  } else if (isProfit) {
    requiredAnnualProfit = i.desired_exit_value / mult;
    requiredAnnualRevenue = requiredAnnualProfit / margin;
  } else {
    requiredAnnualRevenue = i.desired_exit_value / mult;
    requiredAnnualProfit = requiredAnnualRevenue * margin;
  }
  const requiredMonthlyRevenue = requiredAnnualRevenue / 12;
  const requiredMonthlyProfit = requiredAnnualProfit / 12;
  const requiredCustomerCount = i.avg_annual_customer_value > 0 ? Math.ceil(requiredAnnualRevenue / i.avg_annual_customer_value) : 0;
  const requiredQualifiedLeads = i.conversion_rate > 0 ? Math.ceil(requiredCustomerCount / i.conversion_rate) : 0;
  const requiredRawLeads = i.lead_to_qualified_rate > 0 ? Math.ceil(requiredQualifiedLeads / i.lead_to_qualified_rate) : 0;
  const months = Math.max(1, Number(i.target_timeline_months) || 12);
  const monthlyOutreach = i.close_rate > 0 ? Math.ceil(requiredRawLeads / months / i.close_rate) : Math.ceil(requiredRawLeads / months);
  const requiredPipelineValue = requiredAnnualRevenue * (Number(i.pipeline_coverage) || 3);
  const buyerWarmthTarget: typeof WARMTHS[number] =
    i.desired_exit_value >= 25_000_000 ? "exit_ready"
    : i.desired_exit_value >= 10_000_000 ? "strategic_conversation"
    : i.desired_exit_value >= 3_000_000 ? "warm"
    : "engaged";
  // Monthly growth needed from current MRR to required MRR over timeline (months)
  const cmr = Math.max(1, Number(i.current_monthly_revenue) || 1);
  const ratio = requiredMonthlyRevenue / cmr;
  const monthlyGrowthRate = ratio > 0 ? Math.pow(ratio, 1 / months) - 1 : 0;
  return {
    requiredAnnualRevenue, requiredMonthlyRevenue, requiredAnnualProfit, requiredMonthlyProfit,
    requiredPipelineValue, requiredCustomerCount, requiredQualifiedLeads, requiredRawLeads,
    monthlyOutreach, buyerWarmthTarget, monthlyGrowthRate,
  };
}

function defaultsFor(asset: any | undefined): Calc {
  return {
    desired_exit_value: 10_000_000,
    currency: "USD",
    valuation_method: "revenue_multiple",
    assumed_multiple: 4,
    target_timeline_months: 36,
    avg_annual_customer_value: 5_000,
    conversion_rate: 0.2,
    lead_to_qualified_rate: 0.2,
    close_rate: 0.25,
    current_monthly_revenue: Number(asset?.current_monthly_revenue ?? 0),
    profit_margin: 0.2,
    pipeline_coverage: 3,
  };
}

export default function ExitValuationEngine() {
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const assetIdParam = params.get("asset");
  const [tab, setTab] = useState("calculator");

  const assetsQ = useQuery({
    queryKey: ["ma_portfolio_assets_full"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ma_portfolio_assets").select("*").order("asset_name");
      if (error) throw error; return data ?? [];
    },
  });
  const assets = assetsQ.data ?? [];
  const assetId = assetIdParam ?? assets[0]?.id ?? "";
  const asset = assets.find((a: any) => a.id === assetId);

  const [calc, setCalc] = useState<Calc>(defaultsFor(asset));
  const [assumptions, setAssumptions] = useState("");
  const [risks, setRisks] = useState("");
  const [confidence, setConfidence] = useState(0.6);

  useEffect(() => { setCalc(defaultsFor(asset)); }, [assetId]);

  const out = useMemo(() => calcOutputs(calc), [calc]);

  const exitTargetsQ = useQuery({
    queryKey: ["ma_exit_targets", assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ma_exit_targets").select("*").eq("portfolio_asset_id", assetId).order("desired_exit_value", { ascending: true });
      if (error) throw error; return data ?? [];
    },
  });
  const benchmarksQ = useQuery({
    queryKey: ["ma_valuation_benchmarks"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ma_valuation_benchmarks").select("*, ma_intelligence_sources:source_id(source_name,licence_status)").order("sector", { ascending: true });
      if (error) throw error; return data ?? [];
    },
  });
  const dealsQ = useQuery({
    queryKey: ["ma_deals_full"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ma_deals").select("*, target:target_company_id(company_name,sector), buyer:buyer_company_id(company_name), investor:investor_id(investor_name)").order("deal_date", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });
  const sourcesQ = useQuery({
    queryKey: ["ma_intelligence_sources_min"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ma_intelligence_sources").select("id,source_name,licence_status").order("source_name");
      if (error) throw error; return data ?? [];
    },
  });
  const executionTargetsQ = useQuery({
    queryKey: ["ma_execution_targets", assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ma_execution_targets").select("*").eq("portfolio_asset_id", assetId).order("target_period_start", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });

  // Comparables — match sector and have revenue/ARR/EBITDA so we can compute multiples
  const comparables = useMemo(() => {
    const all = dealsQ.data ?? [];
    const sec = asset?.sector ?? null;
    return all
      .filter((d: any) => d.valuation || d.amount)
      .map((d: any) => {
        const v = Number(d.valuation ?? d.amount ?? 0);
        const revM = d.revenue_at_deal ? v / Number(d.revenue_at_deal) : null;
        const arrM = d.arr_at_deal ? v / Number(d.arr_at_deal) : null;
        const ebitdaM = d.ebitda_at_deal ? v / Number(d.ebitda_at_deal) : null;
        return { ...d, _revM: revM, _arrM: arrM, _ebitdaM: ebitdaM };
      })
      .filter((d: any) => !sec || (d.target?.sector ?? "").toLowerCase() === String(sec).toLowerCase() || true)
      .slice(0, 50);
  }, [dealsQ.data, asset]);

  const applyBenchmark = (b: any) => {
    setCalc({ ...calc, valuation_method: b.valuation_method, assumed_multiple: Number(b.base_multiple ?? b.low_multiple ?? b.high_multiple ?? calc.assumed_multiple) });
    toast.success(`Applied benchmark: ${b.sector ?? ""} ${b.valuation_method} ×${b.base_multiple ?? ""}`);
  };

  const saveScenario = async (label?: string) => {
    if (!assetId) return;
    const payload: any = {
      portfolio_asset_id: assetId,
      desired_exit_value: calc.desired_exit_value,
      currency: calc.currency,
      valuation_method: calc.valuation_method,
      assumed_multiple: calc.assumed_multiple,
      target_exit_timeline_months: calc.target_timeline_months,
      required_annual_revenue: out.requiredAnnualRevenue,
      required_monthly_revenue: out.requiredMonthlyRevenue,
      required_annual_profit: out.requiredAnnualProfit,
      required_monthly_profit: out.requiredMonthlyProfit,
      required_pipeline_value: out.requiredPipelineValue,
      required_customer_count: out.requiredCustomerCount,
      required_growth_rate: out.monthlyGrowthRate,
      required_buyer_warmth_level: out.buyerWarmthTarget,
      notes: [
        label ? `[scenario] ${label}` : null,
        `confidence: ${confidence}`,
        assumptions ? `assumptions: ${assumptions}` : null,
        risks ? `risks: ${risks}` : null,
        `qualified_leads:${out.requiredQualifiedLeads}, raw_leads:${out.requiredRawLeads}, monthly_outreach:${out.monthlyOutreach}`,
        `disclaimer: planning estimate only, not financial advice`,
      ].filter(Boolean).join("\n"),
    };
    const { error } = await (supabase as any).from("ma_exit_targets").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Scenario saved");
    qc.invalidateQueries({ queryKey: ["ma_exit_targets", assetId] });
  };

  const generateExecutionTargets = async (exitTarget?: any) => {
    if (!assetId) return;
    const src = exitTarget ?? {
      id: null,
      required_monthly_revenue: out.requiredMonthlyRevenue,
      required_monthly_profit: out.requiredMonthlyProfit,
      required_pipeline_value: out.requiredPipelineValue,
      target_exit_timeline_months: calc.target_timeline_months,
    };
    const months = Math.max(1, Number(src.target_exit_timeline_months ?? calc.target_timeline_months) || 12);
    const totalQualified = (out.requiredQualifiedLeads || 0);
    const qLeadsPerMonth = Math.ceil(totalQualified / months);
    const outreachPerMonth = Math.ceil((out.monthlyOutreach || 0));
    const start = new Date();
    const records = [] as any[];
    const agentRotation: typeof AGENTS[number][] = ["outreach","crm","content","buyer_warmup","inbox","reporting"];
    for (let i = 0; i < 6; i++) {
      const periodStart = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const periodEnd = new Date(start.getFullYear(), start.getMonth() + i + 1, 0);
      records.push({
        portfolio_asset_id: assetId,
        exit_target_id: src.id,
        target_period_start: periodStart.toISOString().slice(0,10),
        target_period_end: periodEnd.toISOString().slice(0,10),
        monthly_revenue_target: Number(src.required_monthly_revenue ?? out.requiredMonthlyRevenue) || 0,
        monthly_profit_target: Number(src.required_monthly_profit ?? out.requiredMonthlyProfit) || 0,
        pipeline_target: Number(src.required_pipeline_value ?? out.requiredPipelineValue) || 0,
        qualified_leads_target: qLeadsPerMonth,
        outreach_target: outreachPerMonth,
        content_output_target: Math.max(4, Math.ceil(outreachPerMonth / 50)),
        buyer_warmup_target: Math.max(1, Math.ceil(qLeadsPerMonth / 20)),
        crm_opportunity_target: Math.max(1, Math.ceil(qLeadsPerMonth / 2)),
        inbox_response_sla: "<= 4h business hours",
        assigned_agent: agentRotation[i % agentRotation.length],
        status: "planned",
        notes: `Generated from exit target ${src.id ?? "(unsaved calc)"} on ${new Date().toISOString().slice(0,10)}. Planning estimate only.`,
      });
    }
    const { error } = await (supabase as any).from("ma_execution_targets").insert(records);
    if (error) { toast.error(error.message); return; }
    toast.success(`Generated ${records.length} monthly execution targets`);
    qc.invalidateQueries({ queryKey: ["ma_execution_targets", assetId] });
  };

  const deleteScenario = async (id: string) => {
    const { error } = await (supabase as any).from("ma_exit_targets").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["ma_exit_targets", assetId] });
  };

  const benchmarkFields: FieldDef[] = [
    { name: "sector", label: "Sector" },
    { name: "subsector", label: "Sub-sector" },
    { name: "asset_type", label: "Asset type", type: "select", options: opt(ASSET_TYPES) },
    { name: "valuation_method", label: "Valuation method", type: "select", options: opt(VAL_METHODS as any), required: true },
    { name: "low_multiple", label: "Low multiple", type: "number" },
    { name: "base_multiple", label: "Base multiple", type: "number" },
    { name: "high_multiple", label: "High multiple", type: "number" },
    { name: "source_id", label: "Source", type: "select", options: (sourcesQ.data ?? []).map((s: any) => ({ value: s.id, label: `${s.source_name} (${s.licence_status})` })) },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  // Gap analysis
  const gap = useMemo(() => {
    if (!asset) return null;
    const cmr = Number(asset.current_monthly_revenue ?? 0);
    const pipeline = Number(asset.current_pipeline_value ?? 0);
    const gaps = [
      { k: "Monthly revenue", cur: cmr, req: out.requiredMonthlyRevenue, money: true, currency: calc.currency },
      { k: "Annual revenue", cur: cmr * 12, req: out.requiredAnnualRevenue, money: true, currency: calc.currency },
      { k: "Monthly profit", cur: cmr * (Number(calc.profit_margin) || 0.2), req: out.requiredMonthlyProfit, money: true, currency: calc.currency },
      { k: "Pipeline value", cur: pipeline, req: out.requiredPipelineValue, money: true, currency: calc.currency },
      { k: "Liftor operability score", cur: Number(asset.liftor_operability_score ?? 0), req: 80, money: false },
      { k: "Data room readiness", cur: Number(asset.data_room_readiness_score ?? 0), req: 90, money: false },
      { k: "Founder dependency (lower = better)", cur: Number(asset.founder_dependency_score ?? 0), req: 30, money: false, invert: true },
      { k: "Buyer warmth", cur: 0, req: 0, warmth: true, currentWarmth: "—", requiredWarmth: out.buyerWarmthTarget },
    ];
    return gaps;
  }, [asset, out, calc.currency, calc.profit_margin]);

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <Button asChild variant="ghost" size="sm" className="h-7"><Link to="/founder/portfolio-exit"><ArrowLeft className="h-4 w-4 mr-1" />Portfolio & Exit</Link></Button>
            <h1 className="text-3xl font-bold flex items-center gap-2 mt-1"><Calculator className="h-7 w-7 text-primary" />Exit Valuation Engine</h1>
            <p className="text-muted-foreground mt-1 max-w-3xl">Backwards-solve from a target exit value into revenue, profit, pipeline, leads, outreach, and buyer warmth. Generate monthly execution targets to feed the operating loop.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-400"><AlertTriangle className="h-3 w-3" /> Planning estimates only — not formal financial advice</Badge>
            <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> External outreach LOCKED_BY_DESIGN</Badge>
          </div>
        </div>

        {/* Asset switcher */}
        <Card className="tech-card">
          <CardContent className="p-4 flex items-center gap-3 flex-wrap">
            <Label className="text-xs">Portfolio asset</Label>
            <Select value={assetId} onValueChange={(v) => { const p = new URLSearchParams(params); p.set("asset", v); setParams(p); }}>
              <SelectTrigger className="w-72"><SelectValue placeholder="Select asset" /></SelectTrigger>
              <SelectContent>
                {assets.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.asset_name} <span className="text-xs text-muted-foreground">({a.asset_type})</span></SelectItem>)}
              </SelectContent>
            </Select>
            {asset && (
              <div className="text-xs text-muted-foreground flex items-center gap-3">
                <span>Sector: <span className="text-foreground">{asset.sector ?? "—"}</span></span>
                <span>MRR: <span className="text-foreground">{fmtMoney(asset.current_monthly_revenue, calc.currency)}</span></span>
                <span>Pipeline: <span className="text-foreground">{fmtMoney(asset.current_pipeline_value, calc.currency)}</span></span>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="calculator"><Calculator className="h-4 w-4 mr-1" />Calculator</TabsTrigger>
            <TabsTrigger value="scenarios"><Target className="h-4 w-4 mr-1" />Scenarios</TabsTrigger>
            <TabsTrigger value="gap"><TrendingUp className="h-4 w-4 mr-1" />Gap analysis</TabsTrigger>
            <TabsTrigger value="targets"><Sparkles className="h-4 w-4 mr-1" />Execution targets</TabsTrigger>
            <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
            <TabsTrigger value="comparables">Comparable deals</TabsTrigger>
          </TabsList>

          {/* CALCULATOR */}
          <TabsContent value="calculator">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="tech-card">
                <CardHeader><CardTitle className="text-base">Inputs</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <NumField label="Desired exit value" value={calc.desired_exit_value} onChange={(v) => setCalc({ ...calc, desired_exit_value: v })} />
                  <div>
                    <Label className="text-xs">Currency</Label>
                    <Select value={calc.currency} onValueChange={(v) => setCalc({ ...calc, currency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["USD","GBP","EUR"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Valuation method</Label>
                    <Select value={calc.valuation_method} onValueChange={(v: any) => setCalc({ ...calc, valuation_method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{VAL_METHODS.map(v => <SelectItem key={v} value={v}>{v.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <NumField label="Assumed multiple (×)" value={calc.assumed_multiple} step="0.1" onChange={(v) => setCalc({ ...calc, assumed_multiple: v })} />
                  <NumField label="Target timeline (months)" value={calc.target_timeline_months} onChange={(v) => setCalc({ ...calc, target_timeline_months: v })} />
                  <NumField label="Avg annual customer value" value={calc.avg_annual_customer_value} onChange={(v) => setCalc({ ...calc, avg_annual_customer_value: v })} />
                  <NumField label="Profit margin (0–1)" step="0.01" value={calc.profit_margin} onChange={(v) => setCalc({ ...calc, profit_margin: v })} />
                  <NumField label="Qualified → customer rate" step="0.01" value={calc.conversion_rate} onChange={(v) => setCalc({ ...calc, conversion_rate: v })} />
                  <NumField label="Lead → qualified rate" step="0.01" value={calc.lead_to_qualified_rate} onChange={(v) => setCalc({ ...calc, lead_to_qualified_rate: v })} />
                  <NumField label="Outreach close rate" step="0.01" value={calc.close_rate} onChange={(v) => setCalc({ ...calc, close_rate: v })} />
                  <NumField label="Pipeline coverage (×ARR)" step="0.1" value={calc.pipeline_coverage} onChange={(v) => setCalc({ ...calc, pipeline_coverage: v })} />
                  <NumField label="Current MRR" value={calc.current_monthly_revenue} onChange={(v) => setCalc({ ...calc, current_monthly_revenue: v })} />
                  <NumField label="Confidence (0–1)" step="0.05" value={confidence} onChange={(v) => setConfidence(v)} />
                  <div className="col-span-2"><Label className="text-xs">Key assumptions</Label><Textarea rows={2} value={assumptions} onChange={(e) => setAssumptions(e.target.value)} placeholder="What this scenario assumes…" /></div>
                  <div className="col-span-2"><Label className="text-xs">Risks</Label><Textarea rows={2} value={risks} onChange={(e) => setRisks(e.target.value)} placeholder="Key risks to the assumption…" /></div>
                </CardContent>
              </Card>

              <Card className="tech-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Outputs</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => saveScenario()}>Save scenario</Button>
                    <Button size="sm" onClick={() => generateExecutionTargets()}><Sparkles className="h-4 w-4 mr-1" />Generate Execution Targets</Button>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <Out label="Required annual revenue" value={fmtMoney(out.requiredAnnualRevenue, calc.currency)} />
                  <Out label="Required monthly revenue" value={fmtMoney(out.requiredMonthlyRevenue, calc.currency)} />
                  <Out label="Required annual profit / EBITDA" value={fmtMoney(out.requiredAnnualProfit, calc.currency)} />
                  <Out label="Required monthly profit / EBITDA" value={fmtMoney(out.requiredMonthlyProfit, calc.currency)} />
                  <Out label="Required pipeline value" value={fmtMoney(out.requiredPipelineValue, calc.currency)} />
                  <Out label="Required customers" value={out.requiredCustomerCount.toLocaleString()} />
                  <Out label="Required qualified leads" value={out.requiredQualifiedLeads.toLocaleString()} />
                  <Out label="Required raw leads" value={out.requiredRawLeads.toLocaleString()} />
                  <Out label="Monthly outreach / activity" value={out.monthlyOutreach.toLocaleString()} />
                  <Out label="Buyer warmth target" value={out.buyerWarmthTarget.replace(/_/g," ")} />
                  <Out label="Monthly growth rate needed" value={pct(out.monthlyGrowthRate)} />
                  <Out label="Timeline" value={`${calc.target_timeline_months} months`} />
                  <div className="col-span-2 mt-1 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 mt-0.5" /> Planning estimates only. Outputs depend on the assumptions above. Not formal financial advice. Cross-check with benchmarks, comparables and adviser input before any commitment.
                  </div>
                </CardContent>
              </Card>

              {/* Preset chips */}
              <Card className="tech-card lg:col-span-2">
                <CardContent className="p-4 flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-muted-foreground mr-2">Quick scenario:</span>
                  {SCENARIO_PRESETS.map((p) => (
                    <Button key={p.label} size="sm" variant="outline" onClick={() => { setCalc({ ...calc, desired_exit_value: p.desired, currency: "GBP" }); saveScenario(p.label); }}>{p.label} exit</Button>
                  ))}
                  <span className="text-xs text-muted-foreground ml-3">Saves current inputs as a scenario for this asset.</span>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* SCENARIOS */}
          <TabsContent value="scenarios">
            <Card className="tech-card">
              <CardHeader><CardTitle>Exit target scenarios</CardTitle></CardHeader>
              <CardContent>
                {!exitTargetsQ.data?.length ? <p className="text-sm text-muted-foreground">No scenarios saved yet. Use the calculator to save one.</p> : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Exit value</TableHead><TableHead>Method</TableHead><TableHead>Multiple</TableHead>
                      <TableHead className="text-right">Required ARR</TableHead><TableHead className="text-right">Required profit</TableHead>
                      <TableHead className="text-right">Pipeline</TableHead><TableHead>Customers</TableHead>
                      <TableHead>Growth/mo</TableHead><TableHead>Warmth</TableHead><TableHead>Timeline</TableHead>
                      <TableHead>Notes</TableHead><TableHead></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {(exitTargetsQ.data ?? []).map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{fmtMoney(t.desired_exit_value, t.currency)}</TableCell>
                          <TableCell className="text-xs">{t.valuation_method}</TableCell>
                          <TableCell className="text-xs">×{t.assumed_multiple ?? "—"}</TableCell>
                          <TableCell className="text-right text-xs">{fmtMoney(t.required_annual_revenue, t.currency)}</TableCell>
                          <TableCell className="text-right text-xs">{fmtMoney(t.required_annual_profit, t.currency)}</TableCell>
                          <TableCell className="text-right text-xs">{fmtMoney(t.required_pipeline_value, t.currency)}</TableCell>
                          <TableCell className="text-xs">{t.required_customer_count ?? "—"}</TableCell>
                          <TableCell className="text-xs">{t.required_growth_rate != null ? pct(Number(t.required_growth_rate)) : "—"}</TableCell>
                          <TableCell className="text-xs">{t.required_buyer_warmth_level ?? "—"}</TableCell>
                          <TableCell className="text-xs">{t.target_exit_timeline_months ?? "—"}m</TableCell>
                          <TableCell className="text-xs max-w-[260px] truncate" title={t.notes ?? ""}>{t.notes ?? "—"}</TableCell>
                          <TableCell className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => generateExecutionTargets(t)} title="Generate execution targets"><Sparkles className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteScenario(t.id)} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* GAP */}
          <TabsContent value="gap">
            <Card className="tech-card">
              <CardHeader><CardTitle>Gap analysis — current vs required</CardTitle></CardHeader>
              <CardContent>
                {!asset ? <p className="text-sm text-muted-foreground">Select an asset.</p> : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Metric</TableHead><TableHead className="text-right">Current</TableHead><TableHead className="text-right">Required</TableHead>
                      <TableHead className="text-right">Gap</TableHead><TableHead>Status</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {(gap ?? []).map((g: any) => {
                        if (g.warmth) {
                          return (
                            <TableRow key={g.k}>
                              <TableCell>{g.k}</TableCell>
                              <TableCell className="text-right text-xs">{g.currentWarmth}</TableCell>
                              <TableCell className="text-right text-xs">{g.requiredWarmth}</TableCell>
                              <TableCell className="text-right text-xs">—</TableCell>
                              <TableCell><Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400">below</Badge></TableCell>
                            </TableRow>
                          );
                        }
                        const diff = Number(g.req) - Number(g.cur);
                        const ok = g.invert ? Number(g.cur) <= Number(g.req) : Number(g.cur) >= Number(g.req);
                        return (
                          <TableRow key={g.k}>
                            <TableCell>{g.k}</TableCell>
                            <TableCell className="text-right text-xs">{g.money ? fmtMoney(g.cur, g.currency) : Math.round(Number(g.cur))}</TableCell>
                            <TableCell className="text-right text-xs">{g.money ? fmtMoney(g.req, g.currency) : Math.round(Number(g.req))}</TableCell>
                            <TableCell className="text-right text-xs">{g.money ? fmtMoney(diff, g.currency) : Math.round(diff)}</TableCell>
                            <TableCell><Badge variant="outline" className={`text-[10px] ${ok ? "border-emerald-500/40 text-emerald-400" : "border-amber-500/40 text-amber-400"}`}>{ok ? "on track" : "gap"}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* EXECUTION TARGETS */}
          <TabsContent value="targets">
            <Card className="tech-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Execution targets for this asset</CardTitle>
                <Button size="sm" onClick={() => generateExecutionTargets()}><Sparkles className="h-4 w-4 mr-1" />Generate 6 months from current calculator</Button>
              </CardHeader>
              <CardContent>
                {!executionTargetsQ.data?.length ? <p className="text-sm text-muted-foreground">No execution targets yet. Generate from a saved scenario or from the calculator.</p> : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Period</TableHead><TableHead>Status</TableHead><TableHead>Agent</TableHead>
                      <TableHead className="text-right">Rev</TableHead><TableHead className="text-right">Profit</TableHead><TableHead className="text-right">Pipeline</TableHead>
                      <TableHead>Qualified</TableHead><TableHead>Outreach</TableHead><TableHead>Content</TableHead><TableHead>Warm-ups</TableHead><TableHead>CRM opps</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {(executionTargetsQ.data ?? []).map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-xs">{t.target_period_start} → {t.target_period_end}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{t.status}</Badge></TableCell>
                          <TableCell className="text-xs">{t.assigned_agent ?? "—"}</TableCell>
                          <TableCell className="text-right text-xs">{fmtMoney(t.monthly_revenue_target)}</TableCell>
                          <TableCell className="text-right text-xs">{fmtMoney(t.monthly_profit_target)}</TableCell>
                          <TableCell className="text-right text-xs">{fmtMoney(t.pipeline_target)}</TableCell>
                          <TableCell className="text-xs">{t.qualified_leads_target}</TableCell>
                          <TableCell className="text-xs">{t.outreach_target}</TableCell>
                          <TableCell className="text-xs">{t.content_output_target}</TableCell>
                          <TableCell className="text-xs">{t.buyer_warmup_target}</TableCell>
                          <TableCell className="text-xs">{t.crm_opportunity_target}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* BENCHMARKS */}
          <TabsContent value="benchmarks">
            <Card className="tech-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Valuation benchmark library</CardTitle>
                <MARecordDialog trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Add benchmark</Button>} title="Add valuation benchmark" table="ma_valuation_benchmarks" fields={benchmarkFields} invalidateKey="ma_valuation_benchmarks" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">Benchmarks must reference a registered source or include a manual note explanation. Do not invent market multiples.</p>
                {!benchmarksQ.data?.length ? <p className="text-sm text-muted-foreground">No benchmarks yet.</p> : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Sector</TableHead><TableHead>Sub-sector</TableHead><TableHead>Asset type</TableHead><TableHead>Method</TableHead>
                      <TableHead>Low</TableHead><TableHead>Base</TableHead><TableHead>High</TableHead><TableHead>Source</TableHead><TableHead>Notes</TableHead><TableHead></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {(benchmarksQ.data ?? []).map((b: any) => (
                        <TableRow key={b.id}>
                          <TableCell className="text-xs">{b.sector ?? "—"}</TableCell>
                          <TableCell className="text-xs">{b.subsector ?? "—"}</TableCell>
                          <TableCell className="text-xs">{b.asset_type ?? "—"}</TableCell>
                          <TableCell className="text-xs">{b.valuation_method}</TableCell>
                          <TableCell className="text-xs">×{b.low_multiple ?? "—"}</TableCell>
                          <TableCell className="text-xs">×{b.base_multiple ?? "—"}</TableCell>
                          <TableCell className="text-xs">×{b.high_multiple ?? "—"}</TableCell>
                          <TableCell className="text-xs">{b.ma_intelligence_sources?.source_name ?? "—"}</TableCell>
                          <TableCell className="text-xs max-w-[220px] truncate" title={b.notes ?? ""}>{b.notes ?? "—"}</TableCell>
                          <TableCell><Button size="sm" variant="outline" onClick={() => applyBenchmark(b)}>Apply</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* COMPARABLES */}
          <TabsContent value="comparables">
            <Card className="tech-card">
              <CardHeader><CardTitle>Comparable deals</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">Implied multiples computed from recorded valuations and revenue/ARR/EBITDA at deal. Add deals via M&amp;A Intelligence → Deals. No fake data.</p>
                {!comparables.length ? <p className="text-sm text-muted-foreground">No comparable deals recorded yet.</p> : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Target</TableHead><TableHead>Sector</TableHead><TableHead>Buyer / Investor</TableHead><TableHead>Date</TableHead>
                      <TableHead className="text-right">Valuation</TableHead><TableHead className="text-right">Rev mult</TableHead>
                      <TableHead className="text-right">ARR mult</TableHead><TableHead className="text-right">EBITDA mult</TableHead><TableHead>Confidence</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {comparables.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell className="text-xs">{d.target?.company_name ?? "—"}</TableCell>
                          <TableCell className="text-xs">{d.target?.sector ?? "—"}</TableCell>
                          <TableCell className="text-xs">{d.buyer?.company_name ?? d.investor?.investor_name ?? "—"}</TableCell>
                          <TableCell className="text-xs">{d.deal_date ?? d.announced_date ?? "—"}</TableCell>
                          <TableCell className="text-right text-xs">{fmtMoney(d.valuation ?? d.amount, d.currency ?? "USD")}</TableCell>
                          <TableCell className="text-right text-xs">{d._revM ? `×${d._revM.toFixed(2)}` : "—"}</TableCell>
                          <TableCell className="text-right text-xs">{d._arrM ? `×${d._arrM.toFixed(2)}` : "—"}</TableCell>
                          <TableCell className="text-right text-xs">{d._ebitdaM ? `×${d._ebitdaM.toFixed(2)}` : "—"}</TableCell>
                          <TableCell className="text-xs">{d.confidence_score ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
}

function NumField({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" step={step ?? "1"} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function Out({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-secondary/30 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-base font-semibold mt-0.5">{value}</div>
    </div>
  );
}