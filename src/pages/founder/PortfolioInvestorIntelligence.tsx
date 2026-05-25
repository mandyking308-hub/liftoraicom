import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ArrowLeft, Banknote, Search } from "lucide-react";

const sb: any = supabase;
const INVESTOR_TYPES = ["angel","vc","pe","family_office","corporate_venture","accelerator","strategic_investor","other"];

export default function PortfolioInvestorIntelligence() {
  const [search, setSearch] = useState("");
  const [typeF, setTypeF] = useState("all");
  const [countryF, setCountryF] = useState("all");
  const [sectorF, setSectorF] = useState("all");
  const [stageF, setStageF] = useState("all");
  const [minRel, setMinRel] = useState(0);
  const [minConf, setMinConf] = useState(0);
  const [selected, setSelected] = useState<any | null>(null);

  const { data: investors = [], isLoading } = useQuery<any[]>({
    queryKey: ["ma_investors_full"],
    queryFn: async () => {
      const { data, error } = await sb.from("ma_investors").select("*, source:source_id(source_name, licence_status, confidence_score)").order("investor_name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: deals = [] } = useQuery<any[]>({
    queryKey: ["ma_deals_for_investors"],
    queryFn: async () => {
      const { data } = await sb.from("ma_deals").select("id, deal_date, deal_type, deal_value, investor_id, target:target_company_id(company_name)");
      return data ?? [];
    },
  });
  const { data: buyers = [] } = useQuery<any[]>({
    queryKey: ["ma_buyers_for_investors"],
    queryFn: async () => {
      const { data } = await sb.from("ma_buyer_matches").select("portfolio_asset_id, asset:portfolio_asset_id(asset_name), buyer:buyer_company_id(company_name)");
      return data ?? [];
    },
  });

  const countries = useMemo(() => Array.from(new Set(investors.map((i) => i.country).filter(Boolean))).sort(), [investors]);
  const sectors = useMemo(() => Array.from(new Set(investors.flatMap((i) => i.sectors ?? []))).sort(), [investors]);
  const stages = useMemo(() => Array.from(new Set(investors.map((i) => i.stage_focus).filter(Boolean))).sort(), [investors]);

  const filtered = useMemo(() => investors.filter((i) => {
    if (typeF !== "all" && i.investor_type !== typeF) return false;
    if (countryF !== "all" && i.country !== countryF) return false;
    if (sectorF !== "all" && !(i.sectors ?? []).includes(sectorF)) return false;
    if (stageF !== "all" && i.stage_focus !== stageF) return false;
    if ((i.relevance_score ?? 0) < minRel) return false;
    if ((Number(i.confidence_score) || 0) * 100 < minConf) return false;
    if (search && !`${i.investor_name} ${i.portfolio_notes ?? ""} ${i.exit_history_notes ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [investors, typeF, countryF, sectorF, stageF, minRel, minConf, search]);

  return (
    <FounderLayout>
      <div className="space-y-5 max-w-[1500px]">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Banknote className="h-7 w-7 text-primary" /> Investor Intelligence</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">VC, PE, angels, family offices and strategics. Filter, drill into a detail panel, follow linked deals, portfolio assets, likely end-buyers and evidence.</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/founder/portfolio-exit"><ArrowLeft className="h-4 w-4 mr-1" /> Command Centre</Link></Button>
        </div>

        <Card className="tech-card">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name / notes…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={typeF} onValueChange={setTypeF}>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {INVESTOR_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={countryF} onValueChange={setCountryF}>
              <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All countries</SelectItem>
                {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sectorF} onValueChange={setSectorF}>
              <SelectTrigger><SelectValue placeholder="Sector" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sectors</SelectItem>
                {sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={stageF} onValueChange={setStageF}>
              <SelectTrigger><SelectValue placeholder="Stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {stages.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Rel ≥</span>
              <Input type="number" min={0} max={100} value={minRel} onChange={(e) => setMinRel(Number(e.target.value) || 0)} />
              <span className="text-xs text-muted-foreground whitespace-nowrap">Conf ≥</span>
              <Input type="number" min={0} max={100} value={minConf} onChange={(e) => setMinConf(Number(e.target.value) || 0)} />
            </div>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader><CardTitle>{filtered.length} of {investors.length} investors</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
              : <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Investor</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Sectors</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead className="text-right">Relevance</TableHead>
                      <TableHead className="text-right">Confidence</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((i) => (
                      <TableRow key={i.id} className="hover:bg-secondary/40 cursor-pointer" onClick={() => setSelected(i)}>
                        <TableCell className="font-medium">{i.investor_name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{i.investor_type}</Badge></TableCell>
                        <TableCell className="text-xs">{i.country ?? "—"}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{(i.sectors ?? []).join(", ") || "—"}</TableCell>
                        <TableCell className="text-xs">{i.stage_focus ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{i.relevance_score ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{i.confidence_score != null ? Math.round(Number(i.confidence_score) * 100) : "—"}</TableCell>
                        <TableCell><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelected(i); }}>Open</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>}
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.investor_name}</SheetTitle>
                <SheetDescription>{selected.investor_type} · {selected.country ?? "—"} · {selected.stage_focus ?? "—"}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                <Field label="Cheque size notes" v={selected.cheque_size_notes} />
                <Field label="Sectors" v={(selected.sectors ?? []).join(", ")} />
                <Field label="Portfolio notes" v={selected.portfolio_notes} />
                <Field label="Exit history notes" v={selected.exit_history_notes} />
                <Field label="Likely end-buyer notes" v={selected.likely_end_buyer_notes} />
                <Field label="Recommended action" v={recommendation(selected)} />
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Linked deals</div>
                  {(() => {
                    const ds = deals.filter((d) => d.investor_id === selected.id);
                    if (!ds.length) return <div className="text-xs text-muted-foreground italic">None recorded.</div>;
                    return <ul className="text-xs mt-1 space-y-1">{ds.map((d) => (
                      <li key={d.id}>· {d.deal_type} · {d.target?.company_name ?? "—"} · {d.deal_value ? `$${Number(d.deal_value).toLocaleString()}` : "—"} · {d.deal_date ?? ""}</li>
                    ))}</ul>;
                  })()}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Linked portfolio assets</div>
                  {(() => {
                    const linked = buyers.filter((b: any) => (selected.portfolio_notes ?? "").toLowerCase().includes((b.asset?.asset_name ?? "").toLowerCase().slice(0, 6) ?? ""));
                    if (!linked.length) return <div className="text-xs text-muted-foreground italic">No direct portfolio linkage on record.</div>;
                    return <ul className="text-xs mt-1 space-y-1">{linked.slice(0, 8).map((b: any, idx: number) => (
                      <li key={idx}>· {b.asset?.asset_name ?? "—"}</li>
                    ))}</ul>;
                  })()}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Source / evidence</div>
                  {selected.source ? (
                    <div className="text-xs mt-1">
                      <Badge variant="outline" className="text-[10px] mr-1">{selected.source.licence_status ?? "unknown"}</Badge>
                      {selected.source.source_name} · confidence {selected.source.confidence_score ?? "—"}
                    </div>
                  ) : <div className="text-xs text-muted-foreground italic">No source attached. Founder approval required before action.</div>}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </FounderLayout>
  );
}

function Field({ label, v }: { label: string; v?: string | null }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm whitespace-pre-wrap">{v && String(v).trim() ? v : <span className="text-muted-foreground italic">—</span>}</div>
    </div>
  );
}

function recommendation(i: any): string {
  const rel = i.relevance_score ?? 0;
  const conf = (Number(i.confidence_score) || 0) * 100;
  if (rel >= 70 && conf >= 60) return "Founder review for warm intro path — request approval before any outreach.";
  if (rel >= 50) return "Watchlist — track new signals, do not contact yet.";
  return "Low priority — keep for context only.";
}