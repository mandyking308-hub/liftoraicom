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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Flame, Lock, Search } from "lucide-react";

const sb: any = supabase;
const WARMTH = ["cold", "aware", "engaged", "warm", "strategic_conversation", "exit_ready"];

function dueBucket(due: string | null): "overdue" | "today" | "this_week" | "later" | "none" {
  if (!due) return "none";
  const d = new Date(due).getTime();
  const now = Date.now();
  const day = 86400000;
  if (d < now) return "overdue";
  if (d < now + day) return "today";
  if (d < now + 7 * day) return "this_week";
  return "later";
}

export default function PortfolioBuyerWarmUp() {
  const [search, setSearch] = useState("");
  const [assetFilter, setAssetFilter] = useState("all");
  const [warmthFilter, setWarmthFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [minFit, setMinFit] = useState(0);
  const [riskFilter, setRiskFilter] = useState("all");

  const { data: assets = [] } = useQuery<any[]>({
    queryKey: ["ma_portfolio_assets_min"],
    queryFn: async () => {
      const { data } = await sb.from("ma_portfolio_assets").select("id, asset_name").order("asset_name");
      return data ?? [];
    },
  });

  const { data: matches = [], isLoading } = useQuery<any[]>({
    queryKey: ["ma_buyer_matches_warmup"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("ma_buyer_matches")
        .select(
          "*, asset:portfolio_asset_id(asset_name, status), buyer:buyer_company_id(company_name, country, sector, company_type)"
        )
        .order("next_contact_due_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: approvals = [] } = useQuery<any[]>({
    queryKey: ["ma_buyer_approvals"],
    queryFn: async () => {
      const { data } = await sb.from("ma_approval_queue").select("id, related_record_id, status, action_type").eq("module", "buyer_warmup");
      return data ?? [];
    },
  });
  const approvalByMatch = useMemo(() => {
    const m: Record<string, string> = {};
    for (const a of approvals) if (a.related_record_id) m[a.related_record_id] = a.status;
    return m;
  }, [approvals]);

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (assetFilter !== "all" && m.portfolio_asset_id !== assetFilter) return false;
      if (warmthFilter !== "all" && m.buyer_warmth_status !== warmthFilter) return false;
      if (dueFilter !== "all" && dueBucket(m.next_contact_due_at) !== dueFilter) return false;
      const approvalStatus = approvalByMatch[m.id];
      if (approvalFilter === "required" && !approvalStatus) return false;
      if (approvalFilter === "approved" && approvalStatus !== "approved") return false;
      if (approvalFilter === "none" && approvalStatus) return false;
      if ((m.fit_score ?? 0) < minFit) return false;
      const risk = (m.risk_notes ?? "").toLowerCase();
      if (riskFilter === "high" && !/high|severe|critical/.test(risk)) return false;
      if (riskFilter === "any" && !risk) return false;
      if (riskFilter === "none" && risk) return false;
      if (search) {
        const hay = `${m.buyer?.company_name ?? ""} ${m.asset?.asset_name ?? ""} ${m.strategic_reason ?? ""}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [matches, assetFilter, warmthFilter, dueFilter, approvalFilter, approvalByMatch, minFit, riskFilter, search]);

  const stats = useMemo(() => {
    const byWarmth: Record<string, number> = {};
    let overdue = 0, dueToday = 0, hasApproval = 0;
    for (const m of matches) {
      byWarmth[m.buyer_warmth_status] = (byWarmth[m.buyer_warmth_status] ?? 0) + 1;
      const b = dueBucket(m.next_contact_due_at);
      if (b === "overdue") overdue++;
      if (b === "today") dueToday++;
      if (approvalByMatch[m.id]) hasApproval++;
    }
    return { total: matches.length, byWarmth, overdue, dueToday, hasApproval };
  }, [matches, approvalByMatch]);

  return (
    <FounderLayout>
      <div className="space-y-5 max-w-[1500px]">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Flame className="h-7 w-7 text-primary" /> Buyer Warm-Up
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              Drafts and next actions only. No external sending. Every buyer contact requires founder approval through the Approval Queue.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/founder/portfolio-exit"><ArrowLeft className="h-4 w-4 mr-1" /> Command Centre</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/founder/ai-cost/approvals">Approval Queue</Link></Button>
          </div>
        </div>

        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>External outreach LOCKED_BY_DESIGN</AlertTitle>
          <AlertDescription className="text-xs">
            This page tracks buyer warmth, drafts and recommended next actions. No messages are ever sent from here. Adopt the market signal, do not copy protected assets.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          <StatBox label="Total matches" v={stats.total} />
          <StatBox label="Overdue" v={stats.overdue} accent="destructive" />
          <StatBox label="Due today" v={stats.dueToday} accent="amber" />
          <StatBox label="Pending approval" v={stats.hasApproval} accent="violet" />
          {WARMTH.map((w) => (
            <StatBox key={w} label={w.replace(/_/g, " ")} v={stats.byWarmth[w] ?? 0} />
          ))}
        </div>

        <Card className="tech-card">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search buyer / asset / reason…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={assetFilter} onValueChange={setAssetFilter}>
              <SelectTrigger><SelectValue placeholder="Asset" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assets</SelectItem>
                {assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.asset_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={warmthFilter} onValueChange={setWarmthFilter}>
              <SelectTrigger><SelectValue placeholder="Warmth" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All warmth</SelectItem>
                {WARMTH.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={dueFilter} onValueChange={setDueFilter}>
              <SelectTrigger><SelectValue placeholder="Next due" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any due</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_week">This week</SelectItem>
                <SelectItem value="later">Later</SelectItem>
                <SelectItem value="none">None set</SelectItem>
              </SelectContent>
            </Select>
            <Select value={approvalFilter} onValueChange={setApprovalFilter}>
              <SelectTrigger><SelectValue placeholder="Approval" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any approval state</SelectItem>
                <SelectItem value="required">Has approval ticket</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="none">No approval yet</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Fit ≥</span>
              <Input type="number" min={0} max={100} value={minFit} onChange={(e) => setMinFit(Number(e.target.value) || 0)} />
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger><SelectValue placeholder="Risk" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All risk</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="any">Any noted</SelectItem>
                  <SelectItem value="none">No risk noted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader><CardTitle>Buyer match register</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
              : filtered.length === 0 ? <p className="text-sm text-muted-foreground italic py-6 text-center">No buyer matches match these filters.</p>
              : <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead className="text-right">Fit</TableHead>
                      <TableHead>Warmth</TableHead>
                      <TableHead>Strategic reason</TableHead>
                      <TableHead>Warm route</TableHead>
                      <TableHead>Decision-maker notes</TableHead>
                      <TableHead>Next warm-up action</TableHead>
                      <TableHead>Last contacted</TableHead>
                      <TableHead>Next due</TableHead>
                      <TableHead>Approval</TableHead>
                      <TableHead>Risk notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((m) => {
                      const approvalStatus = approvalByMatch[m.id];
                      const bucket = dueBucket(m.next_contact_due_at);
                      return (
                        <TableRow key={m.id} className="align-top">
                          <TableCell>
                            <div className="font-medium">{m.buyer?.company_name ?? "—"}</div>
                            <div className="text-[11px] text-muted-foreground">{m.buyer?.country ?? ""} · {m.buyer_type}</div>
                          </TableCell>
                          <TableCell>
                            <Link to={`/founder/portfolio-exit/${m.portfolio_asset_id}`} className="hover:text-primary">
                              {m.asset?.asset_name ?? "—"}
                            </Link>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{m.fit_score ?? "—"}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{m.buyer_warmth_status}</Badge></TableCell>
                          <TableCell className="max-w-[220px] text-xs">{m.strategic_reason ?? "—"}</TableCell>
                          <TableCell className="max-w-[160px] text-xs">{m.warm_route ?? "—"}</TableCell>
                          <TableCell className="max-w-[200px] text-xs">{m.decision_makers_notes ?? "—"}</TableCell>
                          <TableCell className="max-w-[220px] text-xs">{m.next_warmup_action ?? "—"}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{m.last_contacted_at ? new Date(m.last_contacted_at).toLocaleDateString() : "—"}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {m.next_contact_due_at ? new Date(m.next_contact_due_at).toLocaleDateString() : "—"}
                            {bucket === "overdue" && <Badge variant="destructive" className="ml-1 text-[9px]">overdue</Badge>}
                            {bucket === "today" && <Badge className="ml-1 text-[9px]">today</Badge>}
                          </TableCell>
                          <TableCell>
                            {approvalStatus
                              ? <Badge variant="outline" className="text-[10px]">{approvalStatus}</Badge>
                              : <Badge variant="outline" className="text-[10px] text-muted-foreground">none</Badge>}
                          </TableCell>
                          <TableCell className="max-w-[180px] text-xs text-amber-400">{m.risk_notes ?? "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>}
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
}

function StatBox({ label, v, accent }: { label: string; v: number | string; accent?: string }) {
  const cls =
    accent === "destructive" ? "text-destructive"
    : accent === "amber" ? "text-amber-400"
    : accent === "violet" ? "text-violet-400"
    : "text-foreground";
  return (
    <Card className="tech-card"><CardContent className="p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold ${cls}`}>{v}</div>
    </CardContent></Card>
  );
}