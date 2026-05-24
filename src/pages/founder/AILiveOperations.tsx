import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Activity, ShieldCheck, AlertTriangle, PoundSterling, Bot, TrendingDown, Bell, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  loadLiveSignals,
  deriveLiveStatus,
  persistLiveStatus,
  loadCurrentStatusRow,
  highestCostAgents,
  lowestRoiAgents,
  roiStatusByBusiness,
  buildRecommendedActions,
  LIVE_STATUS_LABEL,
  HIGH_RISK_EXTERNAL_CATEGORIES,
  APPROVAL_FREE_INTERNAL_CATEGORIES,
  type LiveSignals,
  type LiveStatus,
  type AgentSpend,
  type AgentRoi,
  type BusinessRoi,
} from "@/services/aiLiveOperations";

function statusTone(s: LiveStatus): "default" | "secondary" | "destructive" {
  if (s === "live_healthy") return "default";
  if (s === "live_watch" || s === "live_budget_warning" || s === "live_approval_required") return "secondary";
  return "destructive";
}

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | number; tone?: "ok" | "warn" | "bad" }) {
  const colour = tone === "bad" ? "text-rose-400" : tone === "warn" ? "text-amber-400" : "text-emerald-400";
  return (
    <Card className="tech-card p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <Icon className={`w-4 h-4 ${colour}`} />
      </div>
      <div className="text-2xl font-semibold mt-2">{value}</div>
    </Card>
  );
}

function gbp(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(n);
}

export default function AILiveOperations() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signals, setSignals] = useState<LiveSignals | null>(null);
  const [persistedStatus, setPersistedStatus] = useState<LiveStatus>("live_healthy");
  const [highestCost, setHighestCost] = useState<AgentSpend[]>([]);
  const [lowestRoi, setLowestRoi] = useState<AgentRoi[]>([]);
  const [businessRoi, setBusinessRoi] = useState<BusinessRoi[]>([]);

  async function refresh() {
    setRefreshing(true);
    try {
      const [s, row, hc, lr, br] = await Promise.all([
        loadLiveSignals(),
        loadCurrentStatusRow(),
        highestCostAgents(5),
        lowestRoiAgents(5),
        roiStatusByBusiness(),
      ]);
      setSignals(s);
      setHighestCost(hc);
      setLowestRoi(lr);
      setBusinessRoi(br);
      const derived = deriveLiveStatus(s);
      setPersistedStatus(derived.status);
      await persistLiveStatus(derived.status, { signals: s, reason: derived.reason }).catch(() => {});
      if ((row as any)?.current_status && (row as any).current_status !== derived.status) {
        // surface change
      }
    } catch (e: any) {
      toast({ title: "Failed to load live signals", description: e.message, variant: "destructive" });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, []);

  const derived = signals ? deriveLiveStatus(signals) : null;
  const recs = signals ? buildRecommendedActions(signals) : [];

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-2">
            <Activity className="w-7 h-7 text-primary" />
            AI Cost Governor — Live Operations
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Live operational monitor. The AI Cost Governor runs live across Liftor and governs real activity in real time.
            Internal logging, cost calculation, dashboards, ROI snapshots, prompt reuse, cached context, model routing,
            recommendations and draft preparation operate without approval. Only high-risk external actions are gated.
          </p>
        </div>
        <Button onClick={refresh} disabled={refreshing} variant="outline">
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>

      <Card className="tech-card p-5">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Operational status</div>
            <div className="text-2xl font-semibold flex items-center gap-2 mt-1">
              <ShieldCheck className="w-5 h-5 text-primary" />
              {LIVE_STATUS_LABEL[persistedStatus]}
            </div>
            {derived && <div className="text-sm text-muted-foreground mt-1">{derived.reason}</div>}
          </div>
          <Badge variant={statusTone(persistedStatus)} className="text-sm capitalize">
            {LIVE_STATUS_LABEL[persistedStatus]}
          </Badge>
        </div>
      </Card>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Loading live signals…</div>
      ) : signals ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={PoundSterling} label="AI spend today" value={gbp(signals.spend_today_gbp)} tone="ok" />
            <Stat icon={PoundSterling} label="AI spend this month" value={gbp(signals.spend_month_gbp)} tone="ok" />
            <Stat icon={Bell} label="Budget warnings" value={signals.budget_warnings} tone={signals.budget_warnings > 0 ? "warn" : "ok"} />
            <Stat icon={AlertTriangle} label="Open cost alerts" value={signals.cost_alerts_open} tone={signals.cost_alerts_open > 0 ? "warn" : "ok"} />
            <Stat icon={Lock} label="High-risk awaiting approval" value={signals.high_risk_pending_approval} tone={signals.high_risk_pending_approval > 0 ? "warn" : "ok"} />
            <Stat icon={Bot} label="Paused agents" value={signals.paused_agents} tone={signals.paused_agents > 0 ? "warn" : "ok"} />
            <Stat icon={Bot} label="Paused campaigns" value={signals.paused_campaigns} tone={signals.paused_campaigns > 0 ? "warn" : "ok"} />
            <Stat icon={AlertTriangle} label="Failed actions (24h)" value={signals.failed_actions_24h} tone={signals.failed_actions_24h > 5 ? "bad" : signals.failed_actions_24h > 0 ? "warn" : "ok"} />
            <Stat icon={ShieldCheck} label="Prompt injection warnings (24h)" value={signals.prompt_injection_warnings_24h} tone={signals.prompt_injection_warnings_24h > 0 ? "bad" : "ok"} />
            <Stat icon={ShieldCheck} label="Sensitive-data redaction events (24h)" value={signals.redaction_events_24h} tone="ok" />
            <Stat icon={AlertTriangle} label="Open stop-loss alerts" value={signals.stop_loss_alerts_open} tone={signals.stop_loss_alerts_open > 0 ? "bad" : "ok"} />
            <Stat icon={AlertTriangle} label="Risk alerts (high/critical)" value={signals.risk_alerts_open} tone={signals.risk_alerts_open > 0 ? "bad" : "ok"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="tech-card p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><PoundSterling className="w-4 h-4" /> Highest-cost agents (month)</h3>
              {highestCost.length === 0 ? <p className="text-xs text-muted-foreground">No agent spend recorded yet this month.</p> : (
                <ul className="space-y-2 text-sm">
                  {highestCost.map((a) => (
                    <li key={a.agent_id} className="flex justify-between border-b border-border/30 pb-1">
                      <span>{a.agent_name}</span><span className="font-medium">{gbp(a.spend_gbp)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="tech-card p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingDown className="w-4 h-4" /> Lowest-ROI agents</h3>
              {lowestRoi.length === 0 ? <p className="text-xs text-muted-foreground">No ROI snapshots recorded yet.</p> : (
                <ul className="space-y-2 text-sm">
                  {lowestRoi.map((a) => (
                    <li key={a.agent_id} className="flex justify-between border-b border-border/30 pb-1">
                      <span>{a.agent_name}</span>
                      <span className="font-medium">{a.roi_score.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="tech-card p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Activity className="w-4 h-4" /> ROI status by business</h3>
              {businessRoi.length === 0 ? <p className="text-xs text-muted-foreground">No business ROI snapshots yet.</p> : (
                <ul className="space-y-2 text-sm">
                  {businessRoi.map((b) => (
                    <li key={b.business_id} className="flex justify-between border-b border-border/30 pb-1">
                      <span>{b.business_name}</span>
                      <Badge variant={b.status === "scale" || b.status === "keep" ? "default" : b.status === "watch" ? "secondary" : "destructive"} className="text-xs">{b.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card className="tech-card p-5">
            <h3 className="text-sm font-semibold mb-3">Recommended actions</h3>
            <ul className="space-y-2 text-sm list-disc pl-5">
              {recs.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="tech-card p-5">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Lock className="w-4 h-4 text-amber-400" /> Requires founder approval</h3>
              <p className="text-xs text-muted-foreground mb-3">High-risk external or sensitive actions are queued and locked until founder approval.</p>
              <div className="flex flex-wrap gap-2">
                {HIGH_RISK_EXTERNAL_CATEGORIES.map((c) => (
                  <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                ))}
              </div>
            </Card>
            <Card className="tech-card p-5">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Runs live without approval</h3>
              <p className="text-xs text-muted-foreground mb-3">Internal AI work runs live. Drafts can be prepared and logged; only sending leaves the system.</p>
              <div className="flex flex-wrap gap-2">
                {APPROVAL_FREE_INTERNAL_CATEGORIES.map((c) => (
                  <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                ))}
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
