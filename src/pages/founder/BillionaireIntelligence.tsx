import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Crown, Lock, RefreshCw, ShieldCheck } from "lucide-react";
import {
  fetchCoverage, fetchCoverageStats, fetchFacets, fetchQueue, rebuildCoverage,
  updateQueueBatch, routeState, isStaleWealth, type CoverageFilters, type Coverage,
} from "@/lib/billionaireCoverage";

const ANY = "__any__";

function Stat({ label, value, tone, hint }: { label: string; value: number | string; tone?: string; hint?: string }) {
  return (
    <Card className="tech-card p-3">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${tone ?? ""}`}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function RouteBadge({ c }: { c: Coverage }) {
  const s = routeState(c);
  if (s === "verified")
    return <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-300 border-emerald-500/30"><ShieldCheck size={9} className="mr-1" />Verified</Badge>;
  if (s === "candidate_only")
    return <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30"><AlertTriangle size={9} className="mr-1" />Candidate — NOT verified</Badge>;
  return <Badge variant="outline" className="text-[10px] bg-secondary/40 text-muted-foreground">No route</Badge>;
}

export default function BillionaireIntelligence() {
  const qc = useQueryClient();
  const [f, setF] = useState<CoverageFilters>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [queueStatus, setQueueStatus] = useState("pending");

  const stats = useQuery({ queryKey: ["bi-stats"], queryFn: fetchCoverageStats });
  const facets = useQuery({ queryKey: ["bi-facets"], queryFn: fetchFacets });
  const rows = useQuery({ queryKey: ["bi-rows", f], queryFn: () => fetchCoverage(f, 150) });
  const queue = useQuery({ queryKey: ["bi-queue", queueStatus], queryFn: () => fetchQueue(queueStatus, 200) });
  const ready = useQuery({
    queryKey: ["bi-ready"],
    queryFn: () => fetchCoverage({ readiness: "ready" }, 100),
  });

  const set = (k: keyof CoverageFilters) => (v: string) =>
    setF(prev => ({ ...prev, [k]: v === ANY ? undefined : v }));

  const onRebuild = async () => {
    try {
      const r = await rebuildCoverage();
      toast({ title: "Coverage rebuilt", description: JSON.stringify(r) });
      qc.invalidateQueries();
    } catch (e: any) { toast({ title: "Rebuild failed", description: e.message, variant: "destructive" }); }
  };

  const onBatch = async (status: string) => {
    if (!selected.length) return;
    try {
      await updateQueueBatch(selected, { status } as any);
      toast({ title: `${selected.length} records marked ${status}` });
      setSelected([]);
      qc.invalidateQueries({ queryKey: ["bi-queue"] });
    } catch (e: any) { toast({ title: "Update failed", description: e.message, variant: "destructive" }); }
  };

  const s = stats.data;
  const coveragePct = useMemo(() => s && s.universe ? Math.round((s.verified / s.universe) * 100) : 0, [s]);

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-[280px]">
          <h1 className="text-xl font-bold flex items-center gap-2"><Crown size={18} className="text-primary" /> Billionaire Intelligence — Coverage & GHAT Readiness</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Every billionaire in the universe has an explicit coverage state. Candidate routes are derived, unverified
            and can never be used for outreach. Historical Forbes net worth is preserved as historical data — stale
            wealth reduces confidence and readiness.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onRebuild}><RefreshCw size={12} className="mr-1" /> Rebuild coverage</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Stat label="Total universe" value={s?.universe ?? "—"} />
        <Stat label="Verified route" value={s?.verified ?? "—"} tone="text-emerald-400" hint={`${coveragePct}% coverage`} />
        <Stat label="Candidate only" value={s?.candidate_only ?? "—"} tone="text-yellow-300" hint="Not verified — do not send" />
        <Stat label="No route / needs enrichment" value={s?.no_route ?? "—"} tone="text-red-300" />
        <Stat label="Outreach-ready" value={s?.outreach_ready ?? "—"} tone="text-emerald-400" hint="Verified + approved public channel" />
        <Stat label="Stale wealth" value={s?.stale_wealth ?? "—"} tone="text-yellow-300" hint="Jan-2025 historical figure" />
        <Stat label="Foundations" value={s?.foundations ?? "—"} />
        <Stat label="Family offices" value={s?.family_offices ?? "—"} />
        <Stat label="High-priority GHAT" value={s?.high_priority ?? "—"} hint="Score ≥ 60" />
        <Stat label="Queued for enrichment" value={s?.queued ?? "—"} />
      </div>

      <Tabs defaultValue="prospects">
        <TabsList>
          <TabsTrigger value="prospects">Prospects</TabsTrigger>
          <TabsTrigger value="enrichment">Batch enrichment</TabsTrigger>
          <TabsTrigger value="outreach">Batch outreach readiness</TabsTrigger>
        </TabsList>

        <TabsContent value="prospects" className="space-y-3">
          <Card className="tech-card p-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Input placeholder="Search name…" value={f.search ?? ""} onChange={e => setF(p => ({ ...p, search: e.target.value || undefined }))} className="text-xs" />
              <Select value={f.country ?? ANY} onValueChange={set("country")}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Country" /></SelectTrigger>
                <SelectContent><SelectItem value={ANY}>All countries</SelectItem>
                  {(facets.data?.countries ?? []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={f.industry ?? ANY} onValueChange={set("industry")}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Industry" /></SelectTrigger>
                <SelectContent><SelectItem value={ANY}>All industries</SelectItem>
                  {(facets.data?.industries ?? []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={f.routeState ?? ANY} onValueChange={set("routeState")}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Route state" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any route state</SelectItem>
                  <SelectItem value="verified">Verified route</SelectItem>
                  <SelectItem value="candidate_only">Candidate only (unverified)</SelectItem>
                  <SelectItem value="none">No route</SelectItem>
                </SelectContent>
              </Select>
              <Select value={f.routeType ?? ANY} onValueChange={set("routeType")}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Route type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any route type</SelectItem>
                  <SelectItem value="foundation">Has foundation</SelectItem>
                  <SelectItem value="family_office">Has family office</SelectItem>
                  <SelectItem value="company">Company route</SelectItem>
                </SelectContent>
              </Select>
              <Select value={f.freshness ?? ANY} onValueChange={set("freshness")}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Wealth freshness" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any freshness</SelectItem>
                  {["current","recent","historical","stale","unknown"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={f.trajectory ?? ANY} onValueChange={set("trajectory")}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Trajectory" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any trajectory</SelectItem>
                  {["rising","stable","falling","unknown"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={f.readiness ?? ANY} onValueChange={set("readiness")}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Readiness" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any readiness</SelectItem>
                  {["ready","ready_low_confidence","candidate_only","no_route","blocked"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Min GHAT score" className="text-xs"
                     value={f.minGhat ?? ""} onChange={e => setF(p => ({ ...p, minGhat: e.target.value ? Number(e.target.value) : undefined }))} />
              <Input type="number" placeholder="Min capacity" className="text-xs"
                     value={f.minCapacity ?? ""} onChange={e => setF(p => ({ ...p, minCapacity: e.target.value ? Number(e.target.value) : undefined }))} />
            </div>
          </Card>

          <Card className="tech-card p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="text-[10px]">
                <TableHead>Name</TableHead><TableHead>Country</TableHead><TableHead>Industry</TableHead>
                <TableHead>Route</TableHead><TableHead>GHAT</TableHead><TableHead>Capacity</TableHead>
                <TableHead>Wealth (historical)</TableHead><TableHead>Freshness</TableHead><TableHead>Readiness</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(rows.data ?? []).map(c => (
                  <TableRow key={c.id} className="text-xs">
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell>{c.citizenship ?? "—"}</TableCell>
                    <TableCell className="max-w-[160px] truncate">{c.primary_industry ?? "—"}</TableCell>
                    <TableCell><RouteBadge c={c} /></TableCell>
                    <TableCell>{c.ghat_priority_score}</TableCell>
                    <TableCell>{c.liquidity_capacity_score}</TableCell>
                    <TableCell>{c.historical_networth_usd_m ? `$${Math.round(Number(c.historical_networth_usd_m)).toLocaleString()}M` : "—"}
                      <span className="text-[10px] text-muted-foreground"> {c.historical_networth_as_of ?? ""}</span></TableCell>
                    <TableCell className={isStaleWealth(c) ? "text-yellow-300" : ""}>{c.wealth_data_freshness}</TableCell>
                    <TableCell>{c.outreach_readiness}</TableCell>
                  </TableRow>
                ))}
                {!rows.data?.length && <TableRow><TableCell colSpan={9} className="text-xs text-muted-foreground p-4">No records match.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="enrichment" className="space-y-3">
          <Card className="tech-card p-3 flex flex-wrap items-center gap-2">
            <Select value={queueStatus} onValueChange={setQueueStatus}>
              <SelectTrigger className="w-[220px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["pending","in_progress","verified","no_public_route","needs_manual_review"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">{selected.length} selected</span>
            <Button size="sm" variant="outline" onClick={() => onBatch("in_progress")}>Mark in progress</Button>
            <Button size="sm" variant="outline" onClick={() => onBatch("no_public_route")}>No public route</Button>
            <Button size="sm" variant="outline" onClick={() => onBatch("needs_manual_review")}>Needs manual review</Button>
            <Button size="sm" variant="outline" onClick={() => setSelected((queue.data ?? []).map(q => q.id))}>Select page</Button>
          </Card>
          <Card className="tech-card p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="text-[10px]">
                <TableHead className="w-8"></TableHead><TableHead>Billionaire</TableHead><TableHead>Priority</TableHead>
                <TableHead>Attempts</TableHead><TableHead>Batch</TableHead><TableHead>Next check</TableHead><TableHead>Notes</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(queue.data ?? []).map(q => (
                  <TableRow key={q.id} className="text-xs">
                    <TableCell><input type="checkbox" checked={selected.includes(q.id)}
                      onChange={e => setSelected(p => e.target.checked ? [...p, q.id] : p.filter(x => x !== q.id))} /></TableCell>
                    <TableCell className="font-mono text-[10px]">{q.billionaire_id.slice(0, 8)}</TableCell>
                    <TableCell>{q.priority}</TableCell>
                    <TableCell>{q.attempts}</TableCell>
                    <TableCell>{q.batch_key ?? "—"}</TableCell>
                    <TableCell>{q.next_check_at?.slice(0, 10)}</TableCell>
                    <TableCell className="max-w-[280px] truncate">{q.notes ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {!queue.data?.length && <TableRow><TableCell colSpan={7} className="text-xs text-muted-foreground p-4">Queue empty for this state.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="outreach" className="space-y-3">
          <Card className="tech-card p-3 border-yellow-500/30 bg-yellow-500/5">
            <p className="text-xs flex items-center gap-2"><Lock size={12} className="text-yellow-300" />
              Read-only readiness view. Nothing is sent from here. A record is only eligible when it has a verified
              public/institutional route with outreach explicitly allowed. Candidate routes and private contact details
              are never eligible.</p>
          </Card>
          <Card className="tech-card p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="text-[10px]">
                <TableHead>Name</TableHead><TableHead>Country</TableHead><TableHead>Verified routes</TableHead>
                <TableHead>GHAT</TableHead><TableHead>Confidence</TableHead><TableHead>Blocker</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(ready.data ?? []).map(c => (
                  <TableRow key={c.id} className="text-xs">
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell>{c.citizenship ?? "—"}</TableCell>
                    <TableCell>{c.verified_institutional_routes + c.verified_intermediary_routes}</TableCell>
                    <TableCell>{c.ghat_priority_score}</TableCell>
                    <TableCell>{c.research_confidence}</TableCell>
                    <TableCell className="text-muted-foreground">{c.outreach_blocker_reason ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {!ready.data?.length && <TableRow><TableCell colSpan={6} className="text-xs text-muted-foreground p-4">
                  No records are outreach-eligible yet — no verified route currently has outreach approved.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
