import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Building2, Banknote, Swords, Handshake, FileSignature, Database, Search, ArrowLeft, AlertTriangle, Lock, Eye } from "lucide-react";
import MARecordDialog, { FieldDef } from "@/components/founder/ma/MARecordDialog";

const company_types = ["strategic_acquirer","pe_backed_platform","corporate_venture","competitor","comparable","supplier","customer","unknown"];
const investor_types = ["venture_capital","private_equity","angel","family_office","corporate_vc","accelerator","strategic","other"];
const deal_types = ["acquisition","merger","investment","ipo","secondary","spinoff","other"];
const adviser_types = ["m_and_a_advisory","investment_bank","broker","corporate_finance","accelerator","strategic_partner","legal","other"];
const adviser_statuses = ["watch","engaging","evaluating","mandated","disqualified"];
const buyer_warmths = ["cold","aware","engaged","warm","strategic_conversation","exit_ready"];
const buyer_types = ["strategic","financial","competitor","platform","international","other"];
const source_types = ["internal","manual_research","public_press","sec_filing","crunchbase","pitchbook","specialist_db","api","other"];
const licence_statuses = ["unknown","permitted","restricted","do_not_store","expired"];
const legal_risks = ["low","medium","high"];

const opt = (arr: string[]) => arr.map((v) => ({ value: v, label: v.replace(/_/g, " ") }));
const fmtMoney = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n/1_000).toFixed(1)}k`;
  return `$${Number(n).toFixed(0)}`;
};

const Score = ({ v }: { v: number | null | undefined }) => {
  const n = Math.max(0, Math.min(100, Math.round(Number(v ?? 0))));
  const color = n >= 70 ? "bg-emerald-500" : n >= 40 ? "bg-blue-500" : n > 0 ? "bg-amber-500" : "bg-muted";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 bg-secondary rounded overflow-hidden"><div className={`h-full ${color}`} style={{ width: `${n}%` }} /></div>
      <span className="text-xs text-muted-foreground w-8">{v == null ? "—" : `${n}`}</span>
    </div>
  );
};

function DetailDialog({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; children: React.ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function KV({ k, v }: { k: string; v: any }) {
  if (v == null || v === "") return null;
  return (
    <div className="text-sm">
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="whitespace-pre-wrap">{String(v)}</div>
    </div>
  );
}

export default function MAIntelligenceWorkspace() {
  const [tab, setTab] = useState("buyers");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ kind: string; row: any } | null>(null);

  const buyersQ = useQuery({
    queryKey: ["ma_companies"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ma_companies").select("*").order("company_name");
      if (error) throw error; return data ?? [];
    },
  });
  const investorsQ = useQuery({
    queryKey: ["ma_investors"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ma_investors").select("*").order("investor_name");
      if (error) throw error; return data ?? [];
    },
  });
  const competitorsQ = useQuery({
    queryKey: ["ma_competitor_profiles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ma_competitor_profiles").select("*, ma_companies(company_name,country,sector), ma_portfolio_assets:portfolio_asset_match_id(asset_name)");
      if (error) throw error; return data ?? [];
    },
  });
  const dealsQ = useQuery({
    queryKey: ["ma_deals"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ma_deals").select("*, target:target_company_id(company_name), buyer:buyer_company_id(company_name), investor:investor_id(investor_name)").order("deal_date", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });
  const advisersQ = useQuery({
    queryKey: ["ma_adviser_channels"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ma_adviser_channels").select("*").order("adviser_name");
      if (error) throw error; return data ?? [];
    },
  });
  const sourcesQ = useQuery({
    queryKey: ["ma_intelligence_sources"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ma_intelligence_sources").select("*").order("source_name");
      if (error) throw error; return data ?? [];
    },
  });
  const assetsQ = useQuery({
    queryKey: ["ma_portfolio_assets_min"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ma_portfolio_assets").select("id,asset_name").order("asset_name");
      if (error) throw error; return data ?? [];
    },
  });

  const sourceOptions = useMemo(() => (sourcesQ.data ?? []).map((s: any) => ({ value: s.id, label: `${s.source_name} (${s.licence_status})` })), [sourcesQ.data]);
  const companyOptions = useMemo(() => (buyersQ.data ?? []).map((c: any) => ({ value: c.id, label: c.company_name })), [buyersQ.data]);
  const investorOptions = useMemo(() => (investorsQ.data ?? []).map((i: any) => ({ value: i.id, label: i.investor_name })), [investorsQ.data]);
  const assetOptions = useMemo(() => (assetsQ.data ?? []).map((a: any) => ({ value: a.id, label: a.asset_name })), [assetsQ.data]);

  const flt = (rows: any[], keys: string[]) => {
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) => keys.some((k) => String(r[k] ?? "").toLowerCase().includes(s)));
  };

  // Field definitions for manual creation
  const companyFields: FieldDef[] = [
    { name: "company_name", label: "Company", required: true },
    { name: "company_type", label: "Type", type: "select", options: opt(company_types), required: true },
    { name: "country", label: "Country" },
    { name: "sector", label: "Sector" },
    { name: "subsector", label: "Sub-sector" },
    { name: "public_private_status", label: "Public / private", type: "select", options: opt(["public","private","subsidiary","unknown"]) },
    { name: "website", label: "Website" },
    { name: "ticker", label: "Ticker" },
    { name: "market_cap", label: "Market cap (USD)", type: "number" },
    { name: "estimated_revenue", label: "Estimated revenue (USD)", type: "number" },
    { name: "buyer_appetite_score", label: "Buyer appetite (0-100)", type: "number" },
    { name: "relevance_score", label: "Relevance (0-100)", type: "number" },
    { name: "confidence_score", label: "Source confidence (0-1)", type: "number" },
    { name: "source_id", label: "Source", type: "select", options: sourceOptions },
    { name: "acquisition_history_notes", label: "Acquisition history", type: "textarea" },
    { name: "expansion_signals", label: "Expansion signals", type: "textarea" },
    { name: "strategic_gaps", label: "Strategic gaps", type: "textarea" },
    { name: "cash_capacity_notes", label: "Cash capacity notes", type: "textarea" },
  ];
  const investorFields: FieldDef[] = [
    { name: "investor_name", label: "Investor", required: true },
    { name: "investor_type", label: "Type", type: "select", options: opt(investor_types), required: true },
    { name: "country", label: "Country" },
    { name: "website", label: "Website" },
    { name: "stage_focus", label: "Stage focus" },
    { name: "cheque_size_notes", label: "Cheque size notes" },
    { name: "relevance_score", label: "Relevance (0-100)", type: "number" },
    { name: "confidence_score", label: "Confidence (0-1)", type: "number" },
    { name: "source_id", label: "Source", type: "select", options: sourceOptions },
    { name: "portfolio_notes", label: "Portfolio notes", type: "textarea" },
    { name: "exit_history_notes", label: "Exit history", type: "textarea" },
    { name: "likely_end_buyer_notes", label: "Likely end-buyer notes", type: "textarea" },
  ];
  const dealFields: FieldDef[] = [
    { name: "deal_type", label: "Deal type", type: "select", options: opt(deal_types), required: true },
    { name: "target_company_id", label: "Target company", type: "select", options: companyOptions },
    { name: "buyer_company_id", label: "Buyer company", type: "select", options: companyOptions },
    { name: "investor_id", label: "Investor", type: "select", options: investorOptions },
    { name: "deal_date", label: "Deal date", type: "date" },
    { name: "announced_date", label: "Announced date", type: "date" },
    { name: "amount", label: "Amount", type: "number" },
    { name: "currency", label: "Currency" },
    { name: "valuation", label: "Valuation", type: "number" },
    { name: "revenue_at_deal", label: "Revenue at deal", type: "number" },
    { name: "arr_at_deal", label: "ARR at deal", type: "number" },
    { name: "ebitda_at_deal", label: "EBITDA at deal", type: "number" },
    { name: "implied_revenue_multiple", label: "Implied revenue multiple", type: "number" },
    { name: "implied_arr_multiple", label: "Implied ARR multiple", type: "number" },
    { name: "implied_ebitda_multiple", label: "Implied EBITDA multiple", type: "number" },
    { name: "confidence_score", label: "Source confidence (0-1)", type: "number" },
    { name: "source_id", label: "Source", type: "select", options: sourceOptions },
    { name: "deal_notes", label: "Notes", type: "textarea" },
  ];
  const competitorFields: FieldDef[] = [
    { name: "company_id", label: "Company", type: "select", options: companyOptions, required: true, help: "Add the company first under Buyer Universe if missing." },
    { name: "portfolio_asset_match_id", label: "Matched portfolio asset", type: "select", options: assetOptions },
    { name: "legal_copy_risk", label: "Legal copy risk", type: "select", options: opt(legal_risks), required: true },
    { name: "problem_solved", label: "Problem solved", type: "textarea" },
    { name: "target_customer", label: "Customer type", type: "textarea" },
    { name: "pricing_notes", label: "Pricing notes", type: "textarea" },
    { name: "positioning_notes", label: "Positioning", type: "textarea" },
    { name: "funding_notes", label: "Funding / growth signals", type: "textarea" },
    { name: "growth_signals", label: "Growth signals", type: "textarea" },
    { name: "weaknesses", label: "Weaknesses", type: "textarea" },
    { name: "what_we_can_learn", label: "What we can learn", type: "textarea" },
    { name: "what_we_must_not_copy", label: "What we must NOT copy", type: "textarea" },
    { name: "liftor_advantage_notes", label: "Liftor advantage / legally distinct differentiation", type: "textarea" },
  ];
  const buyerMatchFields: FieldDef[] = [
    { name: "portfolio_asset_id", label: "Portfolio asset", type: "select", options: assetOptions, required: true },
    { name: "buyer_company_id", label: "Buyer company", type: "select", options: companyOptions, required: true },
    { name: "buyer_type", label: "Buyer type", type: "select", options: opt(buyer_types), required: true },
    { name: "buyer_warmth_status", label: "Warmth", type: "select", options: opt(buyer_warmths) },
    { name: "fit_score", label: "Fit score (0-100)", type: "number" },
    { name: "likely_deal_size_low", label: "Deal size low", type: "number" },
    { name: "likely_deal_size_base", label: "Deal size base", type: "number" },
    { name: "likely_deal_size_high", label: "Deal size high", type: "number" },
    { name: "warm_route", label: "Warm route" },
    { name: "strategic_reason", label: "Strategic reason", type: "textarea" },
    { name: "decision_makers_notes", label: "Decision makers", type: "textarea" },
    { name: "next_warmup_action", label: "Next action", type: "textarea" },
    { name: "risk_notes", label: "Risk notes", type: "textarea" },
  ];
  const adviserFields: FieldDef[] = [
    { name: "adviser_name", label: "Adviser", required: true },
    { name: "firm_name", label: "Firm" },
    { name: "adviser_type", label: "Type", type: "select", options: opt(adviser_types), required: true },
    { name: "country", label: "Country" },
    { name: "website", label: "Website" },
    { name: "status", label: "Status", type: "select", options: opt(adviser_statuses) },
    { name: "trust_score", label: "Trust (0-100)", type: "number" },
    { name: "chemistry_score", label: "Chemistry (0-100)", type: "number" },
    { name: "nda_readiness", label: "NDA readiness" },
    { name: "minimum_deal_size_notes", label: "Min deal size notes" },
    { name: "fee_model_notes", label: "Fee model" },
    { name: "sector_strengths", label: "Sector strengths", type: "textarea" },
    { name: "best_for", label: "Best for", type: "textarea" },
    { name: "not_suitable_for", label: "Not suitable for", type: "textarea" },
    { name: "buyer_network_notes", label: "Buyer network", type: "textarea" },
    { name: "next_step", label: "Next step", type: "textarea" },
  ];
  const sourceFields: FieldDef[] = [
    { name: "source_name", label: "Source name", required: true },
    { name: "source_type", label: "Type", type: "select", options: opt(source_types), required: true },
    { name: "provider_name", label: "Provider" },
    { name: "source_url", label: "URL" },
    { name: "licence_status", label: "Licence status", type: "select", options: opt(licence_statuses), required: true },
    { name: "storage_allowed", label: "Storage allowed", type: "select", options: [{value:"true",label:"yes"},{value:"false",label:"no"}], required: true },
    { name: "reuse_allowed", label: "Reuse allowed", type: "select", options: [{value:"true",label:"yes"},{value:"false",label:"no"}], required: true },
    { name: "confidence_default", label: "Default confidence (0-1)", type: "number" },
    { name: "refresh_frequency", label: "Refresh frequency", placeholder: "monthly / on demand…" },
    { name: "access_method", label: "Access method" },
    { name: "api_secret_name", label: "API secret reference name", help: "Reference only. Never paste the actual key." },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Button asChild variant="ghost" size="sm" className="h-7"><Link to="/founder/portfolio-exit"><ArrowLeft className="h-4 w-4 mr-1" />Portfolio & Exit</Link></Button>
            </div>
            <h1 className="text-3xl font-bold flex items-center gap-2 mt-1"><Database className="h-7 w-7 text-primary" />M&A Intelligence Workspace</h1>
            <p className="text-muted-foreground mt-1 max-w-3xl">Buyers, investors, competitors, comparables, deals, advisers and source governance. All records require a source or manual-note explanation. No scraping, no outreach.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> External outreach LOCKED_BY_DESIGN</Badge>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-8 w-64" />
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="buyers"><Building2 className="h-4 w-4 mr-1" />Buyer Universe</TabsTrigger>
            <TabsTrigger value="investors"><Banknote className="h-4 w-4 mr-1" />Investors</TabsTrigger>
            <TabsTrigger value="competitors"><Swords className="h-4 w-4 mr-1" />Competitors</TabsTrigger>
            <TabsTrigger value="deals"><FileSignature className="h-4 w-4 mr-1" />Deals & Exits</TabsTrigger>
            <TabsTrigger value="advisers"><Handshake className="h-4 w-4 mr-1" />Advisers</TabsTrigger>
            <TabsTrigger value="sources"><Database className="h-4 w-4 mr-1" />Source Governance</TabsTrigger>
          </TabsList>

          {/* BUYERS */}
          <TabsContent value="buyers">
            <Card className="tech-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Buyer Universe</CardTitle>
                <div className="flex gap-2">
                  <MARecordDialog trigger={<Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />Buyer match</Button>} title="Add buyer match" table="ma_buyer_matches" fields={buyerMatchFields} invalidateKey="ma_buyer_matches" />
                  <MARecordDialog trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Add company</Button>} title="Add company" table="ma_companies" fields={companyFields} invalidateKey="ma_companies" />
                </div>
              </CardHeader>
              <CardContent>
                {buyersQ.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
                : (buyersQ.data ?? []).length === 0 ? <EmptyState label="No companies yet" />
                : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Company</TableHead><TableHead>Country</TableHead><TableHead>Sector</TableHead>
                        <TableHead>Type</TableHead><TableHead>Public/private</TableHead><TableHead className="text-right">Mkt cap / Rev</TableHead>
                        <TableHead>Acq. history</TableHead><TableHead>Expansion signals</TableHead><TableHead>Strategic gaps</TableHead>
                        <TableHead>Appetite</TableHead><TableHead>Relevance</TableHead>
                        <TableHead>Last researched</TableHead><TableHead>Confidence</TableHead><TableHead></TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {flt(buyersQ.data ?? [], ["company_name","country","sector","company_type"]).map((c: any) => (
                          <TableRow key={c.id} className="hover:bg-secondary/30">
                            <TableCell className="font-medium">{c.company_name}</TableCell>
                            <TableCell className="text-xs">{c.country ?? "—"}</TableCell>
                            <TableCell className="text-xs">{c.sector ?? "—"}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px]">{c.company_type}</Badge></TableCell>
                            <TableCell className="text-xs">{c.public_private_status ?? "—"}</TableCell>
                            <TableCell className="text-right text-xs">{fmtMoney(c.market_cap ?? c.estimated_revenue)}</TableCell>
                            <TableCell className="text-xs max-w-[160px] truncate" title={c.acquisition_history_notes ?? ""}>{c.acquisition_history_notes ?? "—"}</TableCell>
                            <TableCell className="text-xs max-w-[160px] truncate" title={c.expansion_signals ?? ""}>{c.expansion_signals ?? "—"}</TableCell>
                            <TableCell className="text-xs max-w-[160px] truncate" title={c.strategic_gaps ?? ""}>{c.strategic_gaps ?? "—"}</TableCell>
                            <TableCell><Score v={c.buyer_appetite_score} /></TableCell>
                            <TableCell><Score v={c.relevance_score} /></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{c.last_researched_at ? new Date(c.last_researched_at).toLocaleDateString() : "—"}</TableCell>
                            <TableCell className="text-xs">{c.confidence_score ?? "—"}</TableCell>
                            <TableCell><Button size="sm" variant="ghost" onClick={() => setSelected({ kind: "buyer", row: c })}><Eye className="h-4 w-4" /></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* INVESTORS */}
          <TabsContent value="investors">
            <Card className="tech-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Investor / VC / Angel Intelligence</CardTitle>
                <MARecordDialog trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Add investor</Button>} title="Add investor" table="ma_investors" fields={investorFields} invalidateKey="ma_investors" />
              </CardHeader>
              <CardContent>
                {investorsQ.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
                : (investorsQ.data ?? []).length === 0 ? <EmptyState label="No investors yet" />
                : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Investor</TableHead><TableHead>Type</TableHead><TableHead>Country</TableHead>
                        <TableHead>Stage focus</TableHead><TableHead>Sectors</TableHead>
                        <TableHead>Portfolio notes</TableHead><TableHead>Exit history</TableHead><TableHead>Likely end-buyer</TableHead>
                        <TableHead>Relevance</TableHead><TableHead>Confidence</TableHead><TableHead></TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {flt(investorsQ.data ?? [], ["investor_name","country","investor_type"]).map((i: any) => (
                          <TableRow key={i.id} className="hover:bg-secondary/30">
                            <TableCell className="font-medium">{i.investor_name}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px]">{i.investor_type}</Badge></TableCell>
                            <TableCell className="text-xs">{i.country ?? "—"}</TableCell>
                            <TableCell className="text-xs">{i.stage_focus ?? "—"}</TableCell>
                            <TableCell className="text-xs max-w-[140px] truncate">{(i.sectors ?? []).join(", ") || "—"}</TableCell>
                            <TableCell className="text-xs max-w-[160px] truncate" title={i.portfolio_notes ?? ""}>{i.portfolio_notes ?? "—"}</TableCell>
                            <TableCell className="text-xs max-w-[160px] truncate" title={i.exit_history_notes ?? ""}>{i.exit_history_notes ?? "—"}</TableCell>
                            <TableCell className="text-xs max-w-[160px] truncate" title={i.likely_end_buyer_notes ?? ""}>{i.likely_end_buyer_notes ?? "—"}</TableCell>
                            <TableCell><Score v={i.relevance_score} /></TableCell>
                            <TableCell className="text-xs">{i.confidence_score ?? "—"}</TableCell>
                            <TableCell><Button size="sm" variant="ghost" onClick={() => setSelected({ kind: "investor", row: i })}><Eye className="h-4 w-4" /></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* COMPETITORS */}
          <TabsContent value="competitors">
            <Card className="tech-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Competitor / Comparable Workspace</CardTitle>
                <MARecordDialog trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Add competitor profile</Button>} title="Add competitor profile" table="ma_competitor_profiles" fields={competitorFields} invalidateKey="ma_competitor_profiles" />
              </CardHeader>
              <CardContent>
                {competitorsQ.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
                : (competitorsQ.data ?? []).length === 0 ? <EmptyState label="No competitor profiles yet" />
                : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Company</TableHead><TableHead>Problem solved</TableHead><TableHead>Customer</TableHead>
                        <TableHead>Funding / growth</TableHead><TableHead>Weakness</TableHead>
                        <TableHead>Legal copy risk</TableHead><TableHead>Liftor advantage</TableHead><TableHead>Matched asset</TableHead><TableHead></TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {flt(competitorsQ.data ?? [], []).filter((r:any) => !search || (r.ma_companies?.company_name ?? "").toLowerCase().includes(search.toLowerCase())).map((cp: any) => (
                          <TableRow key={cp.id} className="hover:bg-secondary/30">
                            <TableCell className="font-medium">{cp.ma_companies?.company_name ?? "—"}</TableCell>
                            <TableCell className="text-xs max-w-[180px] truncate" title={cp.problem_solved ?? ""}>{cp.problem_solved ?? "—"}</TableCell>
                            <TableCell className="text-xs max-w-[160px] truncate" title={cp.target_customer ?? ""}>{cp.target_customer ?? "—"}</TableCell>
                            <TableCell className="text-xs max-w-[160px] truncate" title={cp.funding_notes ?? ""}>{cp.funding_notes ?? cp.growth_signals ?? "—"}</TableCell>
                            <TableCell className="text-xs max-w-[160px] truncate" title={cp.weaknesses ?? ""}>{cp.weaknesses ?? "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] ${cp.legal_copy_risk === "high" ? "border-destructive/40 text-destructive" : cp.legal_copy_risk === "medium" ? "border-amber-500/40 text-amber-400" : "border-emerald-500/40 text-emerald-400"}`}>{cp.legal_copy_risk}</Badge>
                              {cp.legal_copy_risk === "high" && <div className="text-[10px] text-destructive mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Use market signal only. Do not copy protected assets.</div>}
                            </TableCell>
                            <TableCell className="text-xs max-w-[160px] truncate" title={cp.liftor_advantage_notes ?? ""}>{cp.liftor_advantage_notes ?? "—"}</TableCell>
                            <TableCell className="text-xs">{cp.ma_portfolio_assets?.asset_name ?? "—"}</TableCell>
                            <TableCell><Button size="sm" variant="ghost" onClick={() => setSelected({ kind: "competitor", row: cp })}><Eye className="h-4 w-4" /></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* DEALS */}
          <TabsContent value="deals">
            <Card className="tech-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Deals & Exits Tracker</CardTitle>
                <MARecordDialog trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Add deal</Button>} title="Add deal" table="ma_deals" fields={dealFields} invalidateKey="ma_deals" />
              </CardHeader>
              <CardContent>
                {dealsQ.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
                : (dealsQ.data ?? []).length === 0 ? <EmptyState label="No deals yet" />
                : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Type</TableHead><TableHead>Target</TableHead><TableHead>Buyer / Investor</TableHead>
                        <TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Valuation</TableHead>
                        <TableHead className="text-right">Revenue/ARR/EBITDA</TableHead><TableHead className="text-right">Implied multiple</TableHead>
                        <TableHead>Confidence</TableHead><TableHead></TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {(dealsQ.data ?? []).filter((d:any) => !search || (d.target?.company_name ?? "").toLowerCase().includes(search.toLowerCase()) || (d.buyer?.company_name ?? "").toLowerCase().includes(search.toLowerCase())).map((d: any) => (
                          <TableRow key={d.id} className="hover:bg-secondary/30">
                            <TableCell><Badge variant="outline" className="text-[10px]">{d.deal_type}</Badge></TableCell>
                            <TableCell className="text-xs">{d.target?.company_name ?? "—"}</TableCell>
                            <TableCell className="text-xs">{d.buyer?.company_name ?? d.investor?.investor_name ?? "—"}</TableCell>
                            <TableCell className="text-xs">{d.deal_date ?? d.announced_date ?? "—"}</TableCell>
                            <TableCell className="text-right text-xs">{fmtMoney(d.amount)}</TableCell>
                            <TableCell className="text-right text-xs">{fmtMoney(d.valuation)}</TableCell>
                            <TableCell className="text-right text-xs">{[fmtMoney(d.revenue_at_deal), fmtMoney(d.arr_at_deal), fmtMoney(d.ebitda_at_deal)].join(" / ")}</TableCell>
                            <TableCell className="text-right text-xs">{d.implied_revenue_multiple ?? d.implied_arr_multiple ?? d.implied_ebitda_multiple ?? "—"}</TableCell>
                            <TableCell className="text-xs">{d.confidence_score ?? "—"}</TableCell>
                            <TableCell><Button size="sm" variant="ghost" onClick={() => setSelected({ kind: "deal", row: d })}><Eye className="h-4 w-4" /></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ADVISERS */}
          <TabsContent value="advisers">
            <Card className="tech-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>M&A Adviser / Channel Database</CardTitle>
                <MARecordDialog trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Add adviser</Button>} title="Add adviser" table="ma_adviser_channels" fields={adviserFields} invalidateKey="ma_adviser_channels" />
              </CardHeader>
              <CardContent>
                {advisersQ.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
                : (advisersQ.data ?? []).length === 0 ? <EmptyState label="No advisers yet" />
                : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Adviser / firm</TableHead><TableHead>Type</TableHead><TableHead>Best for</TableHead><TableHead>Not suitable for</TableHead>
                        <TableHead>Sector strengths</TableHead><TableHead>Buyer network</TableHead><TableHead>Min deal</TableHead>
                        <TableHead>Fee model</TableHead><TableHead>Trust</TableHead><TableHead>Chemistry</TableHead>
                        <TableHead>NDA</TableHead><TableHead>Status</TableHead><TableHead>Next step</TableHead><TableHead></TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {flt(advisersQ.data ?? [], ["adviser_name","firm_name","adviser_type"]).map((a: any) => (
                          <TableRow key={a.id} className="hover:bg-secondary/30">
                            <TableCell className="font-medium">{a.adviser_name}<div className="text-xs text-muted-foreground">{a.firm_name ?? ""}</div></TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px]">{a.adviser_type}</Badge></TableCell>
                            <TableCell className="text-xs max-w-[140px] truncate" title={a.best_for ?? ""}>{a.best_for ?? "—"}</TableCell>
                            <TableCell className="text-xs max-w-[140px] truncate" title={a.not_suitable_for ?? ""}>{a.not_suitable_for ?? "—"}</TableCell>
                            <TableCell className="text-xs max-w-[140px] truncate" title={a.sector_strengths ?? ""}>{a.sector_strengths ?? "—"}</TableCell>
                            <TableCell className="text-xs max-w-[140px] truncate" title={a.buyer_network_notes ?? ""}>{a.buyer_network_notes ?? "—"}</TableCell>
                            <TableCell className="text-xs">{a.minimum_deal_size_notes ?? "—"}</TableCell>
                            <TableCell className="text-xs max-w-[120px] truncate" title={a.fee_model_notes ?? ""}>{a.fee_model_notes ?? "—"}</TableCell>
                            <TableCell><Score v={a.trust_score} /></TableCell>
                            <TableCell><Score v={a.chemistry_score} /></TableCell>
                            <TableCell className="text-xs">{a.nda_readiness ?? "—"}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px]">{a.status}</Badge></TableCell>
                            <TableCell className="text-xs max-w-[140px] truncate" title={a.next_step ?? ""}>{a.next_step ?? "—"}</TableCell>
                            <TableCell><Button size="sm" variant="ghost" onClick={() => setSelected({ kind: "adviser", row: a })}><Eye className="h-4 w-4" /></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SOURCES */}
          <TabsContent value="sources">
            <Card className="tech-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Source Governance</CardTitle>
                <MARecordDialog trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Add source</Button>} title="Add intelligence source" table="ma_intelligence_sources" fields={sourceFields} invalidateKey="ma_intelligence_sources" requireSourceNote={false} />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1"><Lock className="h-3 w-3" />Only API secret reference names are stored. Never paste real keys.</p>
                {sourcesQ.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
                : (sourcesQ.data ?? []).length === 0 ? <EmptyState label="No sources registered" />
                : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Source</TableHead><TableHead>Type</TableHead><TableHead>Licence</TableHead>
                        <TableHead>Storage</TableHead><TableHead>Reuse</TableHead><TableHead>Refresh</TableHead>
                        <TableHead>Default confidence</TableHead><TableHead>Secret ref</TableHead><TableHead>Notes</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {flt(sourcesQ.data ?? [], ["source_name","provider_name","source_type"]).map((s: any) => (
                          <TableRow key={s.id} className={s.licence_status === "do_not_store" ? "bg-destructive/5" : ""}>
                            <TableCell className="font-medium">{s.source_name}<div className="text-xs text-muted-foreground">{s.provider_name ?? ""}</div></TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px]">{s.source_type}</Badge></TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] ${s.licence_status === "do_not_store" || s.licence_status === "expired" ? "border-destructive/40 text-destructive" : s.licence_status === "permitted" ? "border-emerald-500/40 text-emerald-400" : "border-amber-500/40 text-amber-400"}`}>{s.licence_status}</Badge>
                              {s.licence_status === "do_not_store" && <div className="text-[10px] text-destructive mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Do not store data from this source.</div>}
                            </TableCell>
                            <TableCell className="text-xs">{s.storage_allowed ? "yes" : "no"}</TableCell>
                            <TableCell className="text-xs">{s.reuse_allowed ? "yes" : "no"}</TableCell>
                            <TableCell className="text-xs">{s.refresh_frequency ?? "—"}</TableCell>
                            <TableCell className="text-xs">{s.confidence_default ?? "—"}</TableCell>
                            <TableCell className="text-xs font-mono">{s.api_secret_name ?? "—"}</TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate" title={s.notes ?? ""}>{s.notes ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DetailDialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)} title={selected ? detailTitle(selected) : ""}>
          {selected && <DetailBody selected={selected} dealsAll={dealsQ.data ?? []} buyerMatchesByCompany={[]} />}
        </DetailDialog>
      </div>
    </FounderLayout>
  );
}

function detailTitle(sel: { kind: string; row: any }) {
  switch (sel.kind) {
    case "buyer": return sel.row.company_name;
    case "investor": return sel.row.investor_name;
    case "competitor": return sel.row.ma_companies?.company_name ?? "Competitor profile";
    case "deal": return `${sel.row.deal_type} — ${sel.row.target?.company_name ?? "Unknown target"}`;
    case "adviser": return `${sel.row.adviser_name}${sel.row.firm_name ? ` — ${sel.row.firm_name}` : ""}`;
  }
  return "Detail";
}

function DetailBody({ selected, dealsAll }: { selected: { kind: string; row: any }; dealsAll: any[]; buyerMatchesByCompany: any[] }) {
  const r = selected.row;
  const relatedDeals = (cid?: string, iid?: string) => dealsAll.filter((d) => (cid && (d.target_company_id === cid || d.buyer_company_id === cid)) || (iid && d.investor_id === iid));

  if (selected.kind === "buyer") {
    const deals = relatedDeals(r.id);
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KV k="Type" v={r.company_type} />
        <KV k="Country / sector" v={[r.country, r.sector, r.subsector].filter(Boolean).join(" · ")} />
        <KV k="Public / private" v={r.public_private_status} />
        <KV k="Ticker" v={r.ticker} />
        <KV k="Market cap" v={r.market_cap} />
        <KV k="Revenue" v={r.estimated_revenue} />
        <KV k="Aliases" v={(r.aliases ?? []).join(", ")} />
        <KV k="Buyer appetite" v={r.buyer_appetite_score} />
        <KV k="Relevance" v={r.relevance_score} />
        <KV k="Confidence" v={r.confidence_score} />
        <div className="md:col-span-2 grid gap-3">
          <KV k="Acquisition history" v={r.acquisition_history_notes} />
          <KV k="Expansion signals" v={r.expansion_signals} />
          <KV k="Strategic gaps" v={r.strategic_gaps} />
          <KV k="Cash capacity" v={r.cash_capacity_notes} />
        </div>
        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground mb-1">Related deals</div>
          {deals.length === 0 ? <p className="text-sm text-muted-foreground">None linked.</p> : (
            <ul className="text-sm list-disc pl-5">{deals.map((d) => <li key={d.id}>{d.deal_type} — {d.target?.company_name ?? "?"} ← {d.buyer?.company_name ?? d.investor?.investor_name ?? "?"} ({d.deal_date ?? "—"})</li>)}</ul>
          )}
        </div>
      </div>
    );
  }
  if (selected.kind === "investor") {
    const deals = relatedDeals(undefined, r.id);
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KV k="Type" v={r.investor_type} />
        <KV k="Country" v={r.country} />
        <KV k="Stage focus" v={r.stage_focus} />
        <KV k="Cheque size" v={r.cheque_size_notes} />
        <KV k="Sectors" v={(r.sectors ?? []).join(", ")} />
        <KV k="Relevance" v={r.relevance_score} />
        <KV k="Confidence" v={r.confidence_score} />
        <div className="md:col-span-2 grid gap-3">
          <KV k="Portfolio notes" v={r.portfolio_notes} />
          <KV k="Exit history" v={r.exit_history_notes} />
          <KV k="Likely end-buyer" v={r.likely_end_buyer_notes} />
        </div>
        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground mb-1">Deals linked</div>
          {deals.length === 0 ? <p className="text-sm text-muted-foreground">None linked.</p> : (
            <ul className="text-sm list-disc pl-5">{deals.map((d) => <li key={d.id}>{d.deal_type} — {d.target?.company_name ?? "?"} ({d.deal_date ?? "—"})</li>)}</ul>
          )}
        </div>
      </div>
    );
  }
  if (selected.kind === "competitor") {
    return (
      <div className="grid grid-cols-1 gap-3">
        {r.legal_copy_risk === "high" && (
          <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5" /> Use market signal only. Do not copy protected assets.
          </div>
        )}
        <KV k="Matched portfolio asset" v={r.ma_portfolio_assets?.asset_name} />
        <KV k="What the competitor proves" v={r.positioning_notes} />
        <KV k="What customers want" v={r.target_customer} />
        <KV k="Problem solved" v={r.problem_solved} />
        <KV k="Pricing" v={r.pricing_notes} />
        <KV k="Funding / growth" v={[r.funding_notes, r.growth_signals].filter(Boolean).join("\n")} />
        <KV k="Weaknesses" v={r.weaknesses} />
        <KV k="What we can learn" v={r.what_we_can_learn} />
        <KV k="What we must NOT copy" v={r.what_we_must_not_copy} />
        <KV k="Liftor advantage / legally distinct differentiation" v={r.liftor_advantage_notes} />
      </div>
    );
  }
  if (selected.kind === "deal") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <KV k="Type" v={r.deal_type} />
        <KV k="Date" v={r.deal_date ?? r.announced_date} />
        <KV k="Target" v={r.target?.company_name} />
        <KV k="Buyer" v={r.buyer?.company_name} />
        <KV k="Investor" v={r.investor?.investor_name} />
        <KV k="Amount" v={r.amount} />
        <KV k="Valuation" v={r.valuation} />
        <KV k="Revenue at deal" v={r.revenue_at_deal} />
        <KV k="ARR at deal" v={r.arr_at_deal} />
        <KV k="EBITDA at deal" v={r.ebitda_at_deal} />
        <KV k="Implied revenue multiple" v={r.implied_revenue_multiple} />
        <KV k="Implied ARR multiple" v={r.implied_arr_multiple} />
        <KV k="Implied EBITDA multiple" v={r.implied_ebitda_multiple} />
        <KV k="Confidence" v={r.confidence_score} />
        <div className="md:col-span-2"><KV k="Notes" v={r.deal_notes} /></div>
      </div>
    );
  }
  if (selected.kind === "adviser") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <KV k="Type" v={r.adviser_type} />
        <KV k="Country" v={r.country} />
        <KV k="Status" v={r.status} />
        <KV k="Trust" v={r.trust_score} />
        <KV k="Chemistry" v={r.chemistry_score} />
        <KV k="NDA readiness" v={r.nda_readiness} />
        <KV k="Min deal size" v={r.minimum_deal_size_notes} />
        <KV k="Fee model" v={r.fee_model_notes} />
        <div className="md:col-span-2 grid gap-3">
          <KV k="Sector strengths" v={r.sector_strengths} />
          <KV k="Best for" v={r.best_for} />
          <KV k="Not suitable for" v={r.not_suitable_for} />
          <KV k="Buyer network" v={r.buyer_network_notes} />
          <KV k="Next step" v={r.next_step} />
        </div>
      </div>
    );
  }
  return null;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-center py-10 text-muted-foreground">
      <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p className="text-sm">{label}</p>
      <p className="text-xs mt-1">Use “Add record” above or mark items as “needs research”.</p>
    </div>
  );
}