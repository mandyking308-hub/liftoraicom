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
import NetworkRegistryTab from "@/components/founder/billionaire/NetworkRegistryTab";
import {
  fetchCoverage, fetchCoverageStats, fetchFacets, fetchQueue, rebuildCoverage,
  updateQueueBatch, routeState, isStaleWealth, fetchCompletionMetrics, fetchSnapshotRows,
  matchSnapshots, mapNetworkEvidence, type CoverageFilters, type Coverage,
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
  const metrics = useQuery({ queryKey: ["bi-metrics"], queryFn: fetchCompletionMetrics });
  const [snapStatus, setSnapStatus] = useState("unmatched_new_2026");
  const [snapSearch, setSnapSearch] = useState("");
  const snaps = useQuery({ queryKey: ["bi-snaps", snapStatus, snapSearch], queryFn: () => fetchSnapshotRows(snapStatus, snapSearch) });
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

  const onRematch = async () => {
    try {
      const m = await matchSnapshots();
      const n = await mapNetworkEvidence();
      const r = await rebuildCoverage();
      toast({ title: "Wealth match + evidence mapping rerun", description: JSON.stringify({ ...m, ...n, ...r }).slice(0, 300) });
      qc.invalidateQueries();
    } catch (e: any) { toast({ title: "Rerun failed", description: e.message, variant: "destructive" }); }
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
  const m = metrics.data;
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
        <Button size="sm" variant="outline" onClick={onRematch}><RefreshCw size={12} className="mr-1" /> Re-match 2026 + rebuild</Button>
        <Button size="sm" variant="outline" onClick={onRebuild}><RefreshCw size={12} className="mr-1" /> Rebuild coverage</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <Stat label="Jan-2025 universe" value={`${m?.coverage_records ?? "—"} / ${m?.universe_2025 ?? "—"}`} hint="coverage records" />
        <Stat label="2026 snapshot rows" value={`${m?.snapshot_2026_rows ?? "—"} / 3428`} hint="Forbes 2026 derivative" />
        <Stat label="High-confidence 2025→2026" value={m?.matched_high_confidence ?? "—"} tone="text-emerald-400" />
        <Stat label="Ambiguous matches" value={m?.ambiguous_matches ?? "—"} tone="text-yellow-300" />
        <Stat label="2026-match missing" value={m?.dropoff_candidates ?? "—"} tone="text-yellow-300" hint="dropoff candidates, not confirmed" />
        <Stat label="New 2026 names" value={m?.new_2026_names ?? "—"} hint="not in the 2,754 universe" />
        <Stat label="Current wealth" value={m?.current_wealth ?? "—"} tone="text-emerald-400" hint="as of 1 Mar 2026" />
        <Stat label="Stale wealth" value={m?.stale_wealth ?? "—"} tone="text-yellow-300" hint="Jan-2025 only" />
        <Stat label="Rising" value={m?.rising ?? "—"} tone="text-emerald-400" />
        <Stat label="Stable" value={m?.stable ?? "—"} />
        <Stat label="Falling" value={m?.falling ?? "—"} tone="text-red-300" />
        <Stat label="Giving Pledge matched" value={m?.giving_pledge ?? "—"} hint="philanthropy network evidence" />
        <Stat label="Foundations (unique)" value={m?.foundations_unique ?? "—"} />
        <Stat label="Family offices (unique)" value={m?.family_offices_unique ?? "—"} />
        <Stat label="Verified public institutional" value={m?.verified_public_institutional ?? "—"} tone="text-emerald-400" />
        <Stat label="Verified warm intermediary" value={m?.verified_warm_intermediary ?? "—"} tone="text-emerald-400" />
        <Stat label="Researched / candidate only" value={m?.researched_candidate_only ?? "—"} tone="text-yellow-300" hint="NOT verified" />
        <Stat label="No route" value={m?.no_route ?? "—"} tone="text-red-300" />
        <Stat label="Enrichment queue" value={m?.enrichment_queue ?? "—"} />
        <Stat label="Wealth-match review queue" value={m?.wealth_match_review_queue ?? "—"} />
        <Stat label="Outreach-ready" value={m?.outreach_ready ?? "—"} hint="zero unless genuinely approved" />
        <Stat label="High-priority GHAT" value={s?.high_priority ?? "—"} hint="score ≥ 60" />
      </div>

      <Tabs defaultValue="prospects">
        <TabsList>
          <TabsTrigger value="prospects">Prospects</TabsTrigger>
          <TabsTrigger value="networks">Next-gen networks</TabsTrigger>
          <TabsTrigger value="enrichment">Batch enrichment</TabsTrigger>
          <TabsTrigger value="wealth">2026 wealth match</TabsTrigger>
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
                <TableHead>Current wealth</TableHead><TableHead>Historical (Jan-2025)</TableHead><TableHead>Change</TableHead>
                <TableHead>Trajectory</TableHead><TableHead>Freshness</TableHead><TableHead>Readiness</TableHead>
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
                    <TableCell>{c.current_networth_usd_m ? `$${(Number(c.current_networth_usd_m) / 1000).toLocaleString()}B` : "—"}
                      <span className="text-[10px] text-muted-foreground"> {c.current_networth_as_of ?? ""}</span></TableCell>
                    <TableCell>{c.historical_networth_usd_m ? `$${(Number(c.historical_networth_usd_m) / 1000).toLocaleString()}B` : "—"}</TableCell>
                    <TableCell>{c.current_networth_change_pct != null ? `${Number(c.current_networth_change_pct) > 0 ? "+" : ""}${c.current_networth_change_pct}%` : "—"}</TableCell>
                    <TableCell className={c.wealth_trajectory === "falling" ? "text-red-300" : c.wealth_trajectory === "rising" ? "text-emerald-400" : ""}>{c.wealth_trajectory}</TableCell>
                    <TableCell className={isStaleWealth(c) ? "text-yellow-300" : ""}>{c.wealth_data_freshness}</TableCell>
                    <TableCell>{c.outreach_readiness}</TableCell>
                  </TableRow>
                ))}
                {!rows.data?.length && <TableRow><TableCell colSpan={12} className="text-xs text-muted-foreground p-4">No records match.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="networks" className="space-y-3">
          <NetworkRegistryTab />
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

        <TabsContent value="wealth" className="space-y-3">
          <Card className="tech-card p-3 text-xs text-muted-foreground">
            Source: Forbes World&apos;s Billionaires 2026 (published 10 Mar 2026, valuations as of 1 Mar 2026;
            3,428 billionaires, $20.1T combined). Ingested via a third-party machine-readable derivative CSV — this is
            <strong> not </strong> an official Forbes-hosted file. Jan-2025 Forbes values are preserved untouched as historical data.
          </Card>
          <Card className="tech-card p-3 flex flex-wrap gap-2 items-center">
            <Select value={snapStatus} onValueChange={setSnapStatus}>
              <SelectTrigger className="w-[240px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["matched","ambiguous","unmatched_new_2026","manual_review"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Search 2026 name…" className="text-xs max-w-[240px]" value={snapSearch}
                   onChange={e => setSnapSearch(e.target.value)} />
            <span className="text-[11px] text-muted-foreground">New 2026 names are held in the snapshot only — they are never inserted into the Jan-2025 universe.</span>
          </Card>
          <Card className="tech-card p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="text-[10px]">
                <TableHead>Rank</TableHead><TableHead>Name (2026)</TableHead><TableHead>Net worth</TableHead>
                <TableHead>Country</TableHead><TableHead>Industry</TableHead><TableHead>Match</TableHead><TableHead>Notes</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(snaps.data ?? []).map(r => (
                  <TableRow key={r.id} className="text-xs">
                    <TableCell>{r.source_rank ?? "—"}</TableCell>
                    <TableCell className="font-medium">{r.source_name_raw}</TableCell>
                    <TableCell>{r.networth_usd_m ? `$${(Number(r.networth_usd_m) / 1000).toLocaleString()}B` : "—"}</TableCell>
                    <TableCell>{r.country ?? "—"}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{r.industry ?? "—"}</TableCell>
                    <TableCell>{r.match_method ?? r.match_status} ({r.match_confidence})</TableCell>
                    <TableCell className="max-w-[260px] truncate text-muted-foreground">{r.match_notes ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {!snaps.data?.length && <TableRow><TableCell colSpan={7} className="text-xs text-muted-foreground p-4">No snapshot rows in this state.</TableCell></TableRow>}
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
