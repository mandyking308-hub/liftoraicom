import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, Brain, ShieldCheck, AlertTriangle, TrendingUp, Activity, Bot, MessageSquare, Languages, Gavel, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";

function Stat({ icon: Icon, label, value, tone = "default" }: any) {
  const toneCls = tone === "danger" ? "text-destructive" : tone === "good" ? "text-primary" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon size={12} /> {label}
      </div>
      <div className={`mt-1 text-xl font-semibold ${toneCls}`}>{value ?? "—"}</div>
    </div>
  );
}

export default function GlobalAIBrainCommandCentre() {
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<any>(null);

  const { data: latest, refetch } = useQuery({
    queryKey: ["global_brain_status_latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_brain_status_snapshots")
        .select("*").order("snapshot_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function run(persist: boolean) {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("global-brain-status", { body: { persist } });
      if (error) throw error;
      setLive(data);
      if (persist) await refetch();
      toast.success(persist ? "Global brain snapshot saved." : "Global brain status refreshed.");
    } catch (e: any) {
      toast.error(String(e?.message || e));
    } finally { setBusy(false); }
  }

  const snap = live?.snapshot || latest || {};
  const blockers = (live?.snapshot?.top_blockers || latest?.top_blockers || []) as any[];
  const opps = (live?.snapshot?.top_opportunities || latest?.top_opportunities || []) as any[];
  const meta = (live?.snapshot?.metadata || latest?.metadata || {}) as any;
  const next = live?.next_best_action;

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain size={16} className="text-primary" />
          Global AI Brain Command Centre
          <Badge variant="outline" className="text-[10px]">24/7</Badge>
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(false)}>
            <RefreshCw size={12} className="mr-1" /> Refresh
          </Button>
          <Button size="sm" disabled={busy} onClick={() => run(true)}>
            <Save size={12} className="mr-1" /> Save snapshot
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {next && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-primary">
              <TrendingUp size={12} /> Next best action
            </div>
            <div className="mt-1">{next}</div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat icon={Globe} label="Businesses (active/total)" value={`${snap.businesses_active || 0}/${snap.businesses_total || 0}`} />
          <Stat icon={Globe} label="Markets active" value={snap.markets_active || 0} />
          <Stat icon={Languages} label="Languages detected" value={snap.languages_detected || 0} />
          <Stat icon={Bot} label="Agents active" value={snap.agents_active || 0} />
          <Stat icon={Activity} label="Agent tasks pending" value={snap.agent_tasks_pending || 0} />
          <Stat icon={ShieldCheck} label="Approvals pending" value={snap.founder_approvals_pending || 0} tone={snap.founder_approvals_pending > 0 ? "danger" : "good"} />
          <Stat icon={ShieldCheck} label="Autopilot gates active" value={snap.autopilot_gates_enabled || 0} tone="good" />
          <Stat icon={ShieldCheck} label="High-risk gates locked" value={snap.high_risk_gates_locked || 0} />
          <Stat icon={AlertTriangle} label="Open self-healing" value={snap.open_self_healing_findings || 0} tone={snap.open_self_healing_findings > 0 ? "danger" : "good"} />
          <Stat icon={MessageSquare} label="Channel events (recent)" value={meta.channel_events_recent || 0} />
          <Stat icon={Bot} label="Handovers (recent)" value={meta.handovers_recent || 0} />
          <Stat icon={Gavel} label="Jurisdiction review" value={meta.jurisdiction_review || 0} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center gap-2 text-xs font-medium mb-2">
              <AlertTriangle size={12} className="text-destructive" /> Top blockers
            </div>
            {blockers.length === 0 ? (
              <div className="text-xs text-muted-foreground">No critical blockers.</div>
            ) : (
              <ul className="space-y-1 text-xs">
                {blockers.slice(0, 8).map((b, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px]">{b.kind}</Badge>
                    <span className="text-muted-foreground truncate">{b.summary || b.severity || b.priority}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center gap-2 text-xs font-medium mb-2">
              <TrendingUp size={12} className="text-primary" /> Top opportunities
            </div>
            {opps.length === 0 ? (
              <div className="text-xs text-muted-foreground">No opportunities ranked yet — run portfolio intelligence.</div>
            ) : (
              <ul className="space-y-1 text-xs">
                {opps.slice(0, 8).map((o, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px]">{o.kind}</Badge>
                    <span className="text-muted-foreground truncate">
                      {o.recommended_action || o.summary || `score ${o.score}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Read-only aggregation. No external sends, provider calls or credit spend are performed by this view.
        </p>
      </CardContent>
    </Card>
  );
}