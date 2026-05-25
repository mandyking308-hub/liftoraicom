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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Swords, Search, ShieldAlert } from "lucide-react";

const sb: any = supabase;
const RISKS = ["low", "medium", "high"];

export default function PortfolioCompetitorIntelligence() {
  const [search, setSearch] = useState("");
  const [assetF, setAssetF] = useState("all");
  const [riskF, setRiskF] = useState("all");
  const [sectorF, setSectorF] = useState("all");
  const [fundingF, setFundingF] = useState("all");
  const [advF, setAdvF] = useState("all");
  const [minConf, setMinConf] = useState(0);
  const [selected, setSelected] = useState<any | null>(null);

  const { data: assets = [] } = useQuery<any[]>({
    queryKey: ["ma_portfolio_assets_min"],
    queryFn: async () => {
      const { data } = await sb.from("ma_portfolio_assets").select("id, asset_name").order("asset_name");
      return data ?? [];
    },
  });

  const { data: rows = [], isLoading } = useQuery<any[]>({
    queryKey: ["ma_competitor_profiles_full"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("ma_competitor_profiles")
        .select("*, company:company_id(company_name, country, sector, website, company_type), asset:portfolio_asset_match_id(asset_name)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: evidence = [] } = useQuery<any[]>({
    queryKey: ["ma_evidence_competitor"],
    queryFn: async () => {
      const { data } = await sb.from("ma_evidence_links").select("*").eq("related_record_type", "ma_competitor_profiles");
      return data ?? [];
    },
  });

  const sectors = useMemo(() => Array.from(new Set(rows.map((r) => r.company?.sector).filter(Boolean))).sort(), [rows]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (assetF !== "all" && r.portfolio_asset_match_id !== assetF) return false;
    if (riskF !== "all" && r.legal_copy_risk !== riskF) return false;
    if (sectorF !== "all" && r.company?.sector !== sectorF) return false;
    if (fundingF === "yes" && !(r.funding_notes ?? "").trim()) return false;
    if (fundingF === "no" && (r.funding_notes ?? "").trim()) return false;
    if (advF === "yes" && !(r.liftor_advantage_notes ?? "").trim()) return false;
    if (advF === "no" && (r.liftor_advantage_notes ?? "").trim()) return false;
    // confidence is implicit (no numeric on table) - skip if filter > 0 and no notes
    if (minConf > 0 && !(r.what_we_can_learn ?? "").trim()) return false;
    if (search) {
      const hay = `${r.company?.company_name ?? ""} ${r.problem_solved ?? ""} ${r.target_customer ?? ""}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  }), [rows, assetF, riskF, sectorF, fundingF, advF, minConf, search]);

  return (
    <FounderLayout>
      <div className="space-y-5 max-w-[1500px]">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Swords className="h-7 w-7 text-primary" /> Competitor & Comparable Intelligence</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">Map the market. Understand demand and weaknesses. Never copy protected assets.</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/founder/portfolio-exit"><ArrowLeft className="h-4 w-4 mr-1" /> Command Centre</Link></Button>
        </div>

        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Adopt the market signal, do not copy protected assets</AlertTitle>
          <AlertDescription className="text-xs">
            Anything marked legal_copy_risk=high must go through founder + adviser_review before reuse. Brand wording, copy, trade dress, customer lists and confidential material are never to be reproduced.
          </AlertDescription>
        </Alert>

        <Card className="tech-card">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search competitor / problem / customer…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={assetF} onValueChange={setAssetF}>
              <SelectTrigger><SelectValue placeholder="Portfolio asset" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assets</SelectItem>
                {assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.asset_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={riskF} onValueChange={setRiskF}>
              <SelectTrigger><SelectValue placeholder="Legal copy risk" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any risk</SelectItem>
                {RISKS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sectorF} onValueChange={setSectorF}>
              <SelectTrigger><SelectValue placeholder="Sector" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sectors</SelectItem>
                {sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fundingF} onValueChange={setFundingF}>
              <SelectTrigger><SelectValue placeholder="Funding signal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any funding</SelectItem>
                <SelectItem value="yes">Has funding notes</SelectItem>
                <SelectItem value="no">No funding notes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={advF} onValueChange={setAdvF}>
              <SelectTrigger><SelectValue placeholder="Liftor advantage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any advantage</SelectItem>
                <SelectItem value="yes">Has advantage notes</SelectItem>
                <SelectItem value="no">No advantage notes</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader><CardTitle>{filtered.length} of {rows.length} competitors / comparables</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
              : <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Sector</TableHead>
                      <TableHead>Portfolio asset</TableHead>
                      <TableHead>Legal copy risk</TableHead>
                      <TableHead>Problem solved</TableHead>
                      <TableHead>Funding</TableHead>
                      <TableHead>Liftor advantage</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.id} className="hover:bg-secondary/40 cursor-pointer" onClick={() => setSelected(r)}>
                        <TableCell className="font-medium">{r.company?.company_name ?? "—"}</TableCell>
                        <TableCell className="text-xs">{r.company?.sector ?? "—"}</TableCell>
                        <TableCell className="text-xs">{r.asset?.asset_name ?? "—"}</TableCell>
                        <TableCell><Badge variant={r.legal_copy_risk === "high" ? "destructive" : "outline"} className="text-[10px]">{r.legal_copy_risk}</Badge></TableCell>
                        <TableCell className="text-xs max-w-[220px] truncate">{r.problem_solved ?? "—"}</TableCell>
                        <TableCell className="text-xs max-w-[140px] truncate">{r.funding_notes ?? "—"}</TableCell>
                        <TableCell className="text-xs max-w-[180px] truncate">{r.liftor_advantage_notes ?? "—"}</TableCell>
                        <TableCell><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelected(r); }}>Open</Button></TableCell>
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
                <SheetTitle>{selected.company?.company_name ?? "Competitor"}</SheetTitle>
                <SheetDescription>
                  {selected.company?.sector ?? "—"} · {selected.company?.country ?? "—"} · {selected.company?.company_type}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-3 text-sm">
                <Field label="Problem solved" v={selected.problem_solved} />
                <Field label="Target customer" v={selected.target_customer} />
                <Field label="Pricing notes" v={selected.pricing_notes} />
                <Field label="Growth signals" v={selected.growth_signals} />
                <Field label="Weaknesses" v={selected.weaknesses} />
                <Field label="What we can learn" v={selected.what_we_can_learn} />
                <Field label="What we MUST NOT copy" v={selected.what_we_must_not_copy} accent="destructive" />
                <Field label="Legally distinct differentiation notes" v={selected.liftor_advantage_notes} />
                <Field label="Funding notes" v={selected.funding_notes} />
                <Field label="Positioning notes" v={selected.positioning_notes} />
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Linked evidence / source</div>
                  {(() => {
                    const ev = evidence.filter((e) => e.related_record_id === selected.id);
                    if (!ev.length) return <div className="text-xs text-muted-foreground italic">No evidence link attached. Founder review required before reuse.</div>;
                    return <ul className="text-xs mt-1 space-y-1">{ev.map((e: any) => (
                      <li key={e.id}>· {e.note ?? e.url ?? e.source_name ?? "evidence link"}</li>
                    ))}</ul>;
                  })()}
                </div>
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
                  <strong>Principle:</strong> Adopt the market signal, do not copy protected assets.
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </FounderLayout>
  );
}

function Field({ label, v, accent }: { label: string; v?: string | null; accent?: "destructive" }) {
  return (
    <div>
      <div className={`text-[10px] uppercase tracking-wide ${accent === "destructive" ? "text-destructive" : "text-muted-foreground"}`}>{label}</div>
      <div className="text-sm whitespace-pre-wrap">{v && String(v).trim() ? v : <span className="text-muted-foreground italic">—</span>}</div>
    </div>
  );
}