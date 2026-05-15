import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity, AlertTriangle, Bot, Brain, Building2, CheckCircle2, Lock,
  RefreshCw, Send, ShieldAlert, ShieldCheck, Target, TrendingUp, Users,
} from "lucide-react";
import { toast } from "sonner";

function Stat({ icon: Icon, label, value, tone = "default" }: any) {
  const toneCls =
    tone === "danger" ? "text-destructive" :
    tone === "warn" ? "text-yellow-400" :
    tone === "good" ? "text-primary" : "text-foreground";
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon size={11} /> {label}
      </div>
      <div className={`mt-0.5 text-lg font-semibold ${toneCls}`}>{value ?? "—"}</div>
    </div>
  );
}

function safeAction(label: string, key: string, fn: () => void, busy: boolean) {
  return (
    <Button key={key} size="sm" variant="outline" onClick={fn} disabled={busy} className="h-7 text-xs">
      {label}
    </Button>
  );
}

export default function CommandCentreMasterControlPlane() {
  const [busy, setBusy] = useState<string | null>(null);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["command_centre_master_status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("command-centre-master-status", { body: {} });
      if (error) throw error;
      return data as any;
    },
  });

  async function runFn(name: string, body: any = {}) {
    setBusy(name);
    try {
      const { data: r, error } = await supabase.functions.invoke(name, { body });
      if (error) throw error;
      toast.success(`${name} ok`);
      if (name === "command-centre-master-status") return;
      refetch();
    } catch (e: any) { toast.error(`${name}: ${e?.message ?? "error"}`); }
    finally { setBusy(null); }
  }

  const overall = data?.overall_status ?? "unknown";
  const overallReadiness = data?.overall_readiness ?? null;
  const sl = data?.outbound?.smartlead;
  const ionos = data?.outbound?.native_ionos;

  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain size={16} className="text-primary" />
          Liftor Master Control Plane
          <Badge variant="outline" className="ml-2 capitalize">{overall}</Badge>
          {overallReadiness != null && (
            <Badge variant="secondary" className="ml-1">{overallReadiness}/100</Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching} className="h-7 text-xs">
            <RefreshCw size={12} className="mr-1" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Control strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          <Stat icon={Building2} label="Active businesses" value={data?.global?.activeBusinesses} />
          <Stat icon={Users} label="CRM contacts (linked)" value={data?.crm?.contactsLinked} />
          <Stat icon={Activity} label="Interactions" value={data?.crm?.interactionLedgerCount} tone={data?.crm?.interactionLedgerCount ? "good" : "warn"} />
          <Stat icon={Bot} label="Active agents" value={data?.agents?.activeAgents} />
          <Stat icon={CheckCircle2} label="Approvals pending" value={data?.approvals?.approvalsPending} tone={data?.approvals?.approvalsPending ? "warn" : "good"} />
          <Stat icon={ShieldAlert} label="Self-heal findings" value={data?.risks?.selfHealingFindings} tone={data?.risks?.selfHealingFindings ? "warn" : "good"} />
          <Stat icon={Send} label="AI drafts" value={data?.agents?.aiDraftsPending} />
          <Stat icon={TrendingUp} label="Open deals" value={data?.revenue?.openDeals} />
          <Stat icon={Target} label="Proposals" value={data?.revenue?.proposalDrafts} />
          <Stat icon={Lock} label="Locked external gates" value={data?.approvals?.lockedExternalGates} tone="warn" />
          <Stat icon={ShieldCheck} label="Native IONOS" value={ionos?.status ?? "—"} tone="warn" />
          <Stat icon={AlertTriangle} label="Compliance blockers" value={data?.risks?.complianceBlockers} tone={data?.risks?.complianceBlockers ? "danger" : "good"} />
        </div>

        {/* Smartlead readiness strip */}
        <div className="rounded-md border border-border/60 bg-background/40 p-2.5 text-[11px]">
          <div className="flex items-center gap-2 mb-1">
            <Send size={12} className="text-primary" />
            <span className="font-semibold">Smartlead scale lane (Neon Candy)</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
            <span>API <span className={sl?.api_connected ? "text-primary" : "text-yellow-400"}>{sl?.api_connected ? "connected" : "missing"}</span></span>
            <span>Mailbox <span className={sl?.mailbox_connected ? "text-primary" : "text-yellow-400"}>{sl?.mailbox_connected ? "connected" : "missing"}</span></span>
            <span>Campaign <span className={sl?.campaign_present ? "text-primary" : "text-yellow-400"}>{sl?.campaign_present ? "exists" : "missing"}</span></span>
            <span>Mapping <span className={sl?.mapping_present ? "text-primary" : "text-yellow-400"}>{sl?.mapping_present ? "configured" : "missing"}</span></span>
            <span>Webhook <span className={sl?.webhook_configured ? "text-primary" : "text-yellow-400"}>{sl?.webhook_configured ? "configured" : "missing"}</span></span>
            <span>Warmup <span className={sl?.warmup_enabled ? "text-primary" : "text-yellow-400"}>{sl?.warmup_enabled ? "on" : "off"}</span></span>
            <span>auto_send_enabled <span className="text-yellow-400">false</span></span>
            <span>cron <span className="text-yellow-400">disabled</span></span>
          </div>
        </div>

        {/* Top next action */}
        {data?.top_next_action && (
          <div className="rounded-md border border-primary/40 bg-primary/5 p-2.5 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <Target size={12} className="text-primary" />
              <span className="font-semibold text-primary">Top next action</span>
            </div>
            <div className="text-foreground">{data.top_next_action}</div>
          </div>
        )}

        {/* Blockers */}
        {(data?.blockers?.length ?? 0) > 0 && (
          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2.5">
            <div className="text-xs font-semibold text-yellow-300 mb-1 flex items-center gap-1.5">
              <AlertTriangle size={12} /> Blockers
            </div>
            <ul className="text-[11px] text-yellow-100 list-disc pl-4 space-y-0.5">
              {data.blockers.slice(0, 8).map((b: string) => <li key={b}>{b}</li>)}
            </ul>
          </div>
        )}

        {/* Safe internal actions */}
        <div className="rounded-md border border-border/60 bg-background/40 p-2.5">
          <div className="text-[11px] font-semibold mb-2 flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-primary" /> Safe internal actions (no sends, no provider mutation)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {safeAction("Run global brain status", "g1", () => runFn("global-brain-status", { persist: false }), busy === "global-brain-status")}
            {safeAction("Refresh customer stewardship", "g2", () => runFn("customer-stewardship-status", { persist: true }), busy === "customer-stewardship-status")}
            {safeAction("Run agent handover check", "g3", () => runFn("agent-collaboration-health", { create_finding: false }), busy === "agent-collaboration-health")}
            {safeAction("Run self-healing scan", "g4", () => runFn("self-healing-scan", {}), busy === "self-healing-scan")}
            {safeAction("Run portfolio intelligence", "g5", () => runFn("portfolio-intelligence-run", {}), busy === "portfolio-intelligence-run")}
            {safeAction("Refresh master status", "g6", () => runFn("command-centre-master-status", {}), busy === "command-centre-master-status")}
            {safeAction("Run handover orchestrator (dry-run)", "g7", () => runFn("agent-handover-orchestrator", { dry_run: true, max_items: 25 }), busy === "agent-handover-orchestrator")}
            {safeAction("Run collaboration health check", "g8", () => runFn("agent-collaboration-health", { create_finding: false }), busy === "agent-collaboration-health")}
          </div>
        </div>

        {/* External gated actions */}
        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2.5">
          <div className="text-[11px] font-semibold mb-1.5 flex items-center gap-1.5 text-yellow-200">
            <Lock size={12} /> External actions — locked unless gate enabled & founder confirms
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["Smartlead lead push", "Smartlead campaign start", "Apollo reveal", "Native email send", "Proposal send", "Invoice send"].map((l) => (
              <Badge key={l} variant="outline" className="text-[10px] border-yellow-500/40 text-yellow-200">
                <Lock size={9} className="mr-1" /> {l} — locked
              </Badge>
            ))}
          </div>
          <p className="text-[10px] text-yellow-100/80 mt-1.5">
            Confirmation phrase + activation gate + batch limit required. No accidental execution path exists.
          </p>
        </div>

        <div className="text-[10px] text-muted-foreground">
          No-send audit: {data?.no_send_audit?.emails_sent ?? 0} emails sent · {data?.no_send_audit?.providers_called ?? 0} provider calls · {data?.no_send_audit?.smartlead_posts ?? 0} Smartlead posts.
        </div>
      </CardContent>
    </Card>
  );
}