import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, RefreshCw, Lock, ShieldCheck, AlertTriangle, ListChecks, Rocket, TrendingUp, Bot, Save } from "lucide-react";

type BizCard = {
  business_id: string;
  business_name: string;
  status: string;
  readiness: string;
  agents_active: number;
  agents_total: number;
  modules_enabled: number;
  modules_total: number;
  approvals_pending: number;
  agent_tasks_pending: number;
  drafts_pending: number;
  leads_open: number;
  deals_open: number;
  deals_total: number;
  invoices_outstanding_count: number;
  invoices_outstanding_amount: number;
  revenue_total: number;
  blockers: string[];
  next_action: string;
};

const FILTERS = ["all", "ready", "configurable", "blocked"] as const;
type Filter = typeof FILTERS[number];

export function PortfolioCommandCentrePanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [readiness, setReadiness] = useState<Record<string, any>>({});

  const loadReadiness = async () => {
    try {
      const { data: res } = await supabase.functions.invoke("business-capability-matrix", { body: {} });
      setReadiness((res as any)?.readiness ?? {});
    } catch (_) { /* silent */ }
  };

  const load = async (persist = false) => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("portfolio-command-summary", { body: { persist } });
      if (error) throw error;
      setData(res);
      if (persist) toast({ title: "Snapshot saved", description: `Snapshot id ${res.snapshot_id}` });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? String(e), variant: "destructive" });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(false); }, []);
  useEffect(() => { loadReadiness(); }, []);

  const cards: BizCard[] = data?.cards ?? [];
  const filtered = useMemo(() => filter === "all" ? cards : cards.filter((c) => c.readiness === filter), [cards, filter]);
  const totals = data?.totals ?? {};

  return (
    <Card className="tech-card">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Portfolio Command Centre</CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> No external sends</Badge>
            <Button size="sm" variant="outline" onClick={() => load(false)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => load(true)} disabled={loading}>
              <Save className="h-4 w-4 mr-1" /> Save snapshot
            </Button>
          </div>
        </div>
        <CardDescription>Cross-business control board: status, agents, approvals, deals, revenue, blockers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <Stat label="Businesses" value={totals.total_businesses ?? 0} />
          <Stat label="Active" value={totals.active_businesses ?? 0} />
          <Stat label="Setup" value={totals.setup_businesses ?? 0} />
          <Stat label="Blocked" value={totals.blocked_businesses ?? 0} accent />
          <Stat label="Approvals" value={totals.approvals_pending ?? 0} icon={<ListChecks className="h-3 w-3" />} />
          <Stat label="Agent tasks" value={totals.agent_tasks_pending ?? 0} icon={<Bot className="h-3 w-3" />} />
          <Stat label="Proposals" value={totals.proposals_pending ?? 0} />
          <Stat label="Open deals" value={totals.open_deals ?? 0} />
          <Stat label="Outstanding $" value={Math.round(totals.invoices_outstanding ?? 0).toLocaleString()} />
          <Stat label="Revenue 30d" value={Math.round(totals.revenue_last_30_days ?? 0).toLocaleString()} icon={<TrendingUp className="h-3 w-3" />} />
          <Stat label="Conversations" value={totals.conversations_total ?? 0} />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{f}</Button>
          ))}
          <span className="text-xs text-muted-foreground ml-2">{filtered.length} business{filtered.length === 1 ? "" : "es"}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <div key={c.business_id} className="border border-border rounded-lg p-3 bg-secondary/20 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-sm">{c.business_name}</div>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                    <Badge variant={c.readiness === "ready" ? "default" : c.readiness === "blocked" ? "destructive" : "secondary"} className="text-[10px]">{c.readiness}</Badge>
                  </div>
                </div>
                <div className="text-right text-[10px] text-muted-foreground">
                  <div>Agents {c.agents_active}/{c.agents_total}</div>
                  <div>Modules {c.modules_enabled}/{c.modules_total}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 mt-3 text-[10px]">
                <Mini label="Approvals" value={c.approvals_pending} />
                <Mini label="Tasks" value={c.agent_tasks_pending} />
                <Mini label="Drafts" value={c.drafts_pending} />
                <Mini label="Deals" value={`${c.deals_open}/${c.deals_total}`} />
                <Mini label="Inv $" value={Math.round(c.invoices_outstanding_amount).toLocaleString()} />
                <Mini label="Rev $" value={Math.round(c.revenue_total).toLocaleString()} />
              </div>
              {c.blockers.length > 0 && (
                <div className="mt-2 text-[10px] text-amber-400 flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 mt-0.5" />
                  <span>{c.blockers.join(" · ")}</span>
                </div>
              )}
              <div className="mt-2 text-[10px] text-primary/90">→ {c.next_action}</div>
              {readiness[c.business_id] && (
                <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                  {(["internal_use", "social", "outbound", "agents", "revenue"] as const).map((k) => {
                    const ok = !!readiness[c.business_id][`ready_for_${k}`];
                    return (
                      <Badge key={k} variant="outline" className={ok ? "border-green-500/40 text-green-400" : "border-yellow-500/40 text-yellow-400"}>
                        {k.replace("_", " ")} {ok ? "✓" : "—"}
                      </Badge>
                    );
                  })}
                  {readiness[c.business_id].missing_count > 0 && (
                    <Badge variant="outline" className="border-border/60 text-muted-foreground">
                      {readiness[c.business_id].missing_count} missing modules
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && <div className="text-sm text-muted-foreground">No businesses match this filter.</div>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Section title="Top approvals" icon={<ListChecks className="h-4 w-4 text-primary" />} empty="No pending approvals">
            {(data?.top_approvals ?? []).map((a: any) => (
              <div key={a.id} className="text-xs border-b border-border/40 py-1.5">
                <div className="font-medium line-clamp-1">{a.title}</div>
                <div className="text-muted-foreground text-[10px]">{a.type} · {a.priority ?? "normal"}</div>
              </div>
            ))}
          </Section>
          <Section title="Urgent blockers" icon={<AlertTriangle className="h-4 w-4 text-amber-400" />} empty="No blockers">
            {(data?.critical_blockers ?? []).map((b: any) => (
              <div key={b.business_id} className="text-xs border-b border-border/40 py-1.5">
                <div className="font-medium">{b.business_name}</div>
                <div className="text-muted-foreground text-[10px]">{b.blockers.join(" · ")}</div>
              </div>
            ))}
          </Section>
          <Section title="Launch queue" icon={<Rocket className="h-4 w-4 text-primary" />} empty="No businesses awaiting launch">
            {(data?.launch_queue ?? []).map((b: any) => (
              <div key={b.business_id} className="text-xs border-b border-border/40 py-1.5">
                <div className="font-medium">{b.business_name}</div>
                <div className="text-muted-foreground text-[10px]">→ {b.next_action}</div>
              </div>
            ))}
          </Section>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> No emails, no Apollo, no Smartlead POST. Read-only across businesses.
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, accent, icon }: { label: string; value: number | string; accent?: boolean; icon?: React.ReactNode }) {
  return (
    <div className={`rounded-md border p-2 ${accent ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-secondary/20"}`}>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">{icon}{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded border border-border/60 px-1.5 py-1">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
function Section({ title, icon, children, empty }: { title: string; icon: React.ReactNode; children: React.ReactNode; empty: string }) {
  const arr = Array.isArray(children) ? children : [children];
  return (
    <div className="border border-border rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-sm font-semibold">{title}</span></div>
      <div className="max-h-64 overflow-auto">
        {arr.length > 0 ? children : <div className="text-xs text-muted-foreground">{empty}</div>}
      </div>
    </div>
  );
}

export default PortfolioCommandCentrePanel;