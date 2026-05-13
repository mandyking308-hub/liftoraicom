import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Activity, AlertTriangle, Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

type Counters = Record<string, number>;

const Stat = ({ label, value, tone = "default" }: { label: string; value: string | number; tone?: string }) => {
  const cls = tone === "danger" ? "text-destructive" : tone === "warn" ? "text-yellow-400"
    : tone === "good" ? "text-green-400" : "text-foreground";
  return (
    <div className="p-3 rounded bg-secondary/40">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold ${cls}`}>{value}</p>
    </div>
  );
};

const Chip = ({ on, label }: { on: boolean; label: string }) => (
  <Badge variant={on ? "default" : "outline"} className={on ? "" : "text-muted-foreground"}>
    {label}: {on ? "ON" : "OFF"}
  </Badge>
);

export default function AutonomousPipelineStatus({ businessName = "Neon Candy" }: { businessName?: string }) {
  const [running, setRunning] = useState(false);

  const { data: bizRow } = useQuery({
    queryKey: ["autopilot-bizrow", businessName],
    queryFn: async () => (await supabase.from("businesses").select("id,name").eq("name", businessName).maybeSingle()).data,
  });
  const businessId = bizRow?.id ?? null;

  const { data: policy } = useQuery({
    queryKey: ["autopilot-policy", businessName],
    enabled: !!businessId,
    queryFn: async () => {
      const { data } = await supabase.from("business_autopilot_settings" as never)
        .select("*").eq("business_id", businessId).maybeSingle();
      return data as any;
    },
  });

  const { data: lastRun, refetch: refetchRuns } = useQuery({
    queryKey: ["autopilot-last-run", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data } = await supabase.from("autopilot_runs" as never)
        .select("*").eq("business_id", businessId).eq("status", "completed")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data as any;
    },
    refetchInterval: 30000,
  });

  const { data: ledgerToday } = useQuery({
    queryKey: ["autopilot-credits-today", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const today = new Date(); today.setUTCHours(0, 0, 0, 0);
      const { data } = await supabase.from("apollo_credit_ledger" as never)
        .select("credits_used,created_at").eq("business_id", businessId)
        .gte("created_at", today.toISOString());
      return ((data ?? []) as any[]).reduce((s, r) => s + (r.credits_used ?? 0), 0);
    },
  });

  const { data: pendingDecisions } = useQuery({
    queryKey: ["autopilot-decisions", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { count } = await supabase.from("founder_decisions" as never)
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId).eq("status", "pending");
      return count ?? 0;
    },
  });

  const counters: Counters = lastRun?.details?.counters ?? {};

  const runDryPlan = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("autopilot-orchestrator", {
        body: { business_id: businessId, business_name: businessName, dry_run: true },
      });
      if (error) throw error;
      toast.success(`Plan ready — ${data?.counters?.reveal_planned ?? 0} reveal · ${data?.counters?.promote_planned ?? 0} promote · ${data?.counters?.queue_planned ?? 0} queue`);
      refetchRuns();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to run autopilot plan");
    } finally {
      setRunning(false);
    }
  };

  const runLive = async () => {
    if (!confirm("Execute autopilot live? This will spend Apollo credits within policy budget and create real CRM/queue rows. Sending remains gated by auto_send_after_queue.")) return;
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("autopilot-orchestrator", {
        body: { business_id: businessId, business_name: businessName, dry_run: false },
      });
      if (error) throw error;
      toast.success(`Executed — ${data?.counters?.reveal_planned ?? 0} reveal · ${data?.counters?.promote_planned ?? 0} promote · ${data?.counters?.queue_planned ?? 0} queue`);
      refetchRuns();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to execute");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot size={16} className="text-primary" /> Autonomous pipeline status — {businessName}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={runDryPlan} disabled={running}>
            {running ? <Loader2 size={12} className="animate-spin mr-1" /> : <Activity size={12} className="mr-1" />}
            Plan (dry-run)
          </Button>
          <Button size="sm" onClick={runLive} disabled={running || !policy}>
            <PlayCircle size={12} className="mr-1" /> Run now
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Policy chips */}
        <div className="flex flex-wrap gap-2 text-xs">
          <Chip on={!!policy?.apollo_email_reveal_autonomous} label="Reveal automation" />
          <Chip on={!!policy?.auto_promote_after_valid_reveal} label="Auto-promote" />
          <Chip on={!!policy?.auto_queue_after_promotion} label="Auto-queue" />
          <Chip on={!!policy?.auto_send_after_queue} label="Auto-send" />
          <Badge variant="outline">Provider: {policy?.sending_provider_mode ?? "—"}</Badge>
          <Badge variant="outline">
            Credits today: {ledgerToday ?? 0} / {policy?.apollo_reveal_daily_credit_budget ?? 0}
          </Badge>
          <Badge variant="outline">
            Min score: {policy?.apollo_reveal_min_quality_score ?? 0}
          </Badge>
        </div>

        {/* Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Candidates pulled" value={counters.candidates_pulled ?? 0} />
          <Stat label="Passed quality" value={counters.passed_quality_policy ?? 0} tone="good" />
          <Stat label="Reveal eligible" value={counters.reveal_eligible ?? 0} />
          <Stat label="Eligible — pending policy" value={counters.eligible_pending_founder_policy ?? 0} tone="warn" />
          <Stat label="Planned if policy ON" value={counters.planned_if_policy_enabled ?? 0} />
          <Stat label="Reveal planned (live)" value={counters.reveal_planned ?? 0} tone="good" />
          <Stat label="Skipped — reveal OFF" value={counters.skipped_reveal_disabled ?? 0} tone="warn" />
          <Stat label="Skipped — below min score" value={counters.skipped_below_min_score ?? 0} tone="warn" />
          <Stat label="Skipped — missing score" value={counters.skipped_missing_score ?? 0} tone="warn" />
          <Stat label="Skipped — existing CRM" value={counters.skipped_existing_crm ?? 0} tone="warn" />
          <Stat label="Skipped — duplicate" value={counters.skipped_duplicate ?? 0} tone="warn" />
          <Stat label="Skipped — suppressed" value={counters.skipped_suppressed_or_bounced ?? 0} tone="warn" />
          <Stat label="Skipped — prev no-email" value={counters.skipped_previous_no_email ?? 0} tone="warn" />
          <Stat label="Skipped — legacy hold" value={counters.skipped_legacy_hold ?? 0} tone="warn" />
          <Stat label="Skipped — budget" value={counters.reveal_skipped_budget ?? 0} tone="warn" />
          <Stat label="Skipped — domain cap" value={counters.reveal_skipped_domain_cap ?? 0} tone="warn" />
          <Stat label="Promote planned" value={counters.promote_planned ?? 0} tone="good" />
          <Stat label="Queue planned" value={counters.queue_planned ?? 0} tone="good" />
          <Stat label="Queue skipped" value={counters.queue_skipped ?? 0} tone="warn" />
          <Stat label="Founder decisions" value={pendingDecisions ?? 0} tone={(pendingDecisions ?? 0) > 0 ? "warn" : "default"} />
          <Stat label="Credits used (month)" value={counters.credits_used_month ?? 0} />
        </div>

        <p className="text-xs text-muted-foreground">
          {lastRun
            ? <>Last autopilot run {formatDistanceToNow(new Date(lastRun.created_at), { addSuffix: true })} — next: <span className="text-foreground">{lastRun?.next_recommended_action ?? lastRun?.outcome ?? "—"}</span></>
            : "No autopilot run yet — click Plan to compute the next batch."}
        </p>

        {!policy?.auto_send_after_queue && (
          <div className="flex items-start gap-2 p-3 rounded border border-yellow-500/30 bg-yellow-500/5 text-xs text-yellow-200">
            <AlertTriangle size={14} className="mt-0.5" />
            <div>
              Auto-send is OFF. Liftor will reveal, promote and queue automatically (within policy) but will not send through {policy?.sending_provider_mode ?? "the configured provider"} until you enable scaled sending.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}