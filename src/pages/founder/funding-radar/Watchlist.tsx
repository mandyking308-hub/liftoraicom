import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FundingRadarLayout, FRSection, FRStat, DemoBadge, applyDemoFilter, useHideDemo, HideDemoToggle } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Plus, ShieldAlert } from "lucide-react";
import { fetchWatchlist, fetchAllSignals, computeWatchlistScores, WATCH_PRIORITIES, WATCHLIST_FORBIDDEN_ACTIONS } from "@/lib/fundingRadarEngine";
import { useToast } from "@/hooks/use-toast";

type Row = any;

export default function FRWatchlistPage() {
  const [hideDemo] = useHideDemo();
  const [rows, setRows] = useState<Row[]>([]);
  const [signals, setSignals] = useState<Row[]>([]);
  const [companies, setCompanies] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ company_id: "", priority: "medium", watch_reason: "", founder_notes: "" });
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    try {
      const [wl, sg, cs] = await Promise.all([
        fetchWatchlist(),
        fetchAllSignals(),
        (supabase as any).from("funding_radar_companies").select("id, company_name, sector, last_funding_round").order("company_name"),
      ]);
      setRows(wl);
      setSignals(sg);
      setCompanies(cs.data ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  const filtered = applyDemoFilter(rows, hideDemo);

  const enriched = useMemo(() => filtered.map((r: any) => {
    const sigs = signals.filter((s) => s.company_id === r.company_id);
    const scores = computeWatchlistScores(sigs);
    const last = sigs[0];
    return { ...r, _signals: sigs, _scores: scores, _last: last };
  }), [filtered, signals]);

  const totals = useMemo(() => ({
    active: enriched.filter((r) => r.watch_status === "active").length,
    paused: enriched.filter((r) => r.watch_status === "paused").length,
    needsReview: enriched.filter((r) => r.next_review_due_at && new Date(r.next_review_due_at) < new Date()).length,
    newSignals30d: signals.filter((s) => {
      const d = s.created_at ? new Date(s.created_at) : null;
      return d && (Date.now() - d.getTime()) < 30 * 24 * 3600 * 1000;
    }).length,
  }), [enriched, signals]);

  async function addToWatchlist() {
    if (!form.company_id) { toast({ title: "Select a company", variant: "destructive" }); return; }
    const { error } = await (supabase as any).from("funding_watchlist").insert({
      company_id: form.company_id, priority: form.priority,
      watch_reason: form.watch_reason || null, founder_notes: form.founder_notes || null,
      watch_status: "active",
      next_review_due_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    });
    if (error) { toast({ title: "Could not add", description: error.message, variant: "destructive" }); return; }
    await (supabase as any).from("ma_audit_logs").insert({ action_type: "funding_radar.watchlist.added", table_name: "funding_watchlist", new_value: form });
    setAdding(false); setForm({ company_id: "", priority: "medium", watch_reason: "", founder_notes: "" });
    toast({ title: "Added to watchlist" });
    load();
  }

  async function setStatus(id: string, status: string) {
    await (supabase as any).from("funding_watchlist").update({ watch_status: status }).eq("id", id);
    await (supabase as any).from("ma_audit_logs").insert({ action_type: `funding_radar.watchlist.${status}`, table_name: "funding_watchlist", record_id: id });
    load();
  }

  return (
    <FundingRadarLayout
      title="Funding Watchlist"
      subtitle="Monitor funded companies over time. A funded company proves the market — its public weakness signals reveal the opening. Internal intelligence only. No outbound, no contact, no scraping of restricted sources."
    >
      <div className="flex justify-end"><HideDemoToggle /></div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <FRStat label="Active" value={totals.active} />
        <FRStat label="Paused" value={totals.paused} />
        <FRStat label="Needs review" value={totals.needsReview} />
        <FRStat label="New signals · 30d" value={totals.newSignals30d} />
        <FRStat label="Watched companies" value={enriched.length} />
      </div>

      <FRSection
        title="Add to watchlist"
        actions={
          <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
            <Plus className="h-3 w-3 mr-1" /> {adding ? "Cancel" : "Add company"}
          </Button>
        }
      >
        {adding ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select funded company..." /></SelectTrigger>
              <SelectContent>
                {companies.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name} {c.last_funding_round ? `· ${c.last_funding_round}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WATCH_PRIORITIES.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
              </SelectContent>
            </Select>
            <Input placeholder="Why are we watching?" value={form.watch_reason} onChange={(e) => setForm({ ...form, watch_reason: e.target.value })} className="md:col-span-2" maxLength={500} />
            <Textarea placeholder="Founder notes" value={form.founder_notes} onChange={(e) => setForm({ ...form, founder_notes: e.target.value })} className="md:col-span-2" maxLength={2000} />
            <Button size="sm" onClick={addToWatchlist} className="md:col-span-2">Add to watchlist</Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Add a funded company to monitor over time. You can add or import weakness/positive signals from the Weakness Signals tab.</p>
        )}
      </FRSection>

      <FRSection title="Watched companies">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : enriched.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No watched companies yet — add a funded company above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left border-b border-border/50">
                  <th className="py-2 pr-2">Company</th>
                  <th className="py-2 pr-2">Priority</th>
                  <th className="py-2 pr-2">Round</th>
                  <th className="py-2 pr-2">Cluster</th>
                  <th className="py-2 pr-2">Latest signal</th>
                  <th className="py-2 pr-2">Weakness</th>
                  <th className="py-2 pr-2">Capital drag</th>
                  <th className="py-2 pr-2">Liftor adv.</th>
                  <th className="py-2 pr-2">Next review</th>
                  <th className="py-2 pr-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {enriched.map((r: any) => {
                  const c = r.funding_radar_companies ?? {};
                  return (
                    <tr key={r.id} className="border-b border-border/30">
                      <td className="py-2 pr-2">
                        <Link to={`/founder/funding-radar/watchlist/${r.id}`} className="text-primary hover:underline">{c.company_name}</Link>
                        <DemoBadge record={r} className="ml-1" />
                      </td>
                      <td className="py-2 pr-2"><Badge variant="outline" className="text-[10px]">{r.priority}</Badge></td>
                      <td className="py-2 pr-2 text-muted-foreground">{c.last_funding_round ?? "—"}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{r.funding_problem_clusters?.cluster_name ?? "—"}</td>
                      <td className="py-2 pr-2 text-muted-foreground truncate max-w-[16ch]">{r._last?.signal_title ?? "—"}</td>
                      <td className="py-2 pr-2">{r._scores.weakness}</td>
                      <td className="py-2 pr-2">{r._scores.capitalDrag}</td>
                      <td className="py-2 pr-2">{r._scores.liftorAdvantage}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{r.next_review_due_at ? new Date(r.next_review_due_at).toLocaleDateString() : "—"}</td>
                      <td className="py-2 pr-2">
                        <div className="flex gap-1">
                          <Button asChild size="sm" variant="outline" className="h-6 text-[10px] px-2"><Link to={`/founder/funding-radar/watchlist/${r.id}`}><Eye className="h-3 w-3" /></Link></Button>
                          {r.watch_status === "active"
                            ? <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => setStatus(r.id, "paused")}>Pause</Button>
                            : <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => setStatus(r.id, "active")}>Resume</Button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </FRSection>

      <FRSection
        title="No-external-action rule"
        description="The Watchlist + Weakness Signal Engine is internal intelligence only. The following are forbidden and never produced by this module:"
      >
        <div className="flex flex-wrap gap-1">
          {WATCHLIST_FORBIDDEN_ACTIONS.map((a) => (
            <Badge key={a} variant="outline" className="text-[10px] border-amber-500/30 text-amber-300 gap-1">
              <ShieldAlert className="h-3 w-3" />{a}
            </Badge>
          ))}
        </div>
      </FRSection>
    </FundingRadarLayout>
  );
}