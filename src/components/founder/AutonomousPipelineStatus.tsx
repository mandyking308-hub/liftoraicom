import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
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
  const [revealAmount, setRevealAmount] = useState<string>("");
  const [planResult, setPlanResult] = useState<any | null>(null);

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
  const blockedReason: string | null = planResult?.blocked_reason ?? lastRun?.details?.blocked_reason ?? null;
  const selectedCandidates: any[] = planResult?.selected_candidates ?? lastRun?.details?.selected_candidates ?? [];
  const eligibleNotSelected: any[] = planResult?.eligible_not_selected ?? lastRun?.details?.eligible_not_selected ?? [];
  const duplicatesHeldBack: any[] = planResult?.duplicates_held_back ?? lastRun?.details?.duplicates_held_back ?? [];
  const revealOutcomes: any[] = lastRun?.details?.reveal_outcomes ?? [];
  const revealExec: any = lastRun?.details?.reveal_execution ?? null;
  const outcomeByCandidateId = new Map<string, any>(revealOutcomes.map((o: any) => [o.candidate_id, o]));

  const parsedAmount = revealAmount.trim() === "" ? null : Math.max(0, Math.floor(Number(revealAmount)));
  const amountInvalid = revealAmount.trim() !== "" && (Number.isNaN(Number(revealAmount)) || (parsedAmount ?? 0) <= 0);

  const runDryPlan = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("autopilot-orchestrator", {
        body: { business_id: businessId, business_name: businessName, dry_run: true, reveal_amount: parsedAmount },
      });
      if (error) throw error;
      setPlanResult(data);
      const sel = data?.counters?.selected_for_next_reveal ?? 0;
      toast.success(`Plan ready — ${sel} selected · ${data?.counters?.reveal_eligible_total ?? 0} eligible total`);
      refetchRuns();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to run autopilot plan");
    } finally {
      setRunning(false);
    }
  };

  const runLive = async () => {
    if (parsedAmount === null) {
      toast.error("Enter a reveal amount before running live.");
      return;
    }
    if (!confirm(`Approve & reveal selected candidates?\n\nThis will spend approximately ${parsedAmount} Apollo credits.\nIt will not send emails. Auto-send remains OFF.`)) return;
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("autopilot-orchestrator", {
        body: { business_id: businessId, business_name: businessName, dry_run: false, reveal_amount: parsedAmount },
      });
      if (error) throw error;
      setPlanResult(data);
      if (data?.blocked_reason) {
        toast.error(`Blocked: ${data.blocked_reason}`);
      } else {
        toast.success(`Executed — ${data?.counters?.reveal_planned ?? 0} reveal · ${data?.counters?.promote_planned ?? 0} promote · ${data?.counters?.queue_planned ?? 0} queue`);
        setRevealAmount("");
      }
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
          <Button size="sm" onClick={runLive} disabled={running || !policy || parsedAmount === null || amountInvalid || selectedCandidates.length === 0}>
            <PlayCircle size={12} className="mr-1" /> Approve & reveal selected candidates
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* One-shot vs autonomous reveal explainer */}
        <div className="text-xs text-muted-foreground p-2 rounded bg-secondary/20 border border-border/40">
          {policy?.apollo_email_reveal_autonomous
            ? "Autonomous reveal is ON — Liftor reveals automatically within policy."
            : "Autonomous reveal is OFF. One-shot founder-approved reveal is available — enter an amount, run Plan, then click Approve & reveal selected candidates."}
        </div>
        {/* Founder-defined reveal amount */}
        <div className="p-3 rounded border border-border/60 bg-secondary/30 space-y-2">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">Reveal amount for next run</Label>
              <Input
                type="number"
                min={1}
                value={revealAmount}
                onChange={(e) => setRevealAmount(e.target.value)}
                placeholder="Enter number of Apollo emails to reveal"
                className="h-9 w-72"
              />
            </div>
            <p className="text-[11px] text-muted-foreground max-w-md">
              Founder controls reveal quantity. Liftor selects the best eligible candidates within
              founder-approved amount, budget, domain caps, CRM exclusions, and compliance guardrails.
              Empty by default — no credits are spent until you enter a value and run live.
            </p>
          </div>
          {amountInvalid && <p className="text-xs text-destructive">Enter a positive integer.</p>}
          {parsedAmount !== null && !amountInvalid && (
            <p className="text-xs text-yellow-200">
              {selectedCandidates.length === 0
                ? "Run Plan (dry-run) and review selected candidates first."
                : `Approve one-shot reveal of ${selectedCandidates.length} selected candidates. This will spend approximately ${selectedCandidates.length} Apollo credits. It will not send emails. Auto-send remains OFF.`}
            </p>
          )}
          {parsedAmount !== null && counters.reveal_eligible_total !== undefined &&
            parsedAmount > (counters.reveal_eligible_total ?? 0) && (
              <p className="text-xs text-yellow-300">
                Requested {parsedAmount} exceeds eligible pool ({counters.reveal_eligible_total}); only {counters.reveal_eligible_total} would be selected.
              </p>
          )}
        </div>

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
          {blockedReason && (
            <Badge variant="destructive">Blocked: {blockedReason}</Badge>
          )}
        </div>

        {/* Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Candidates pulled" value={counters.candidates_pulled ?? 0} />
          <Stat label="Passed quality" value={counters.passed_quality_policy ?? 0} tone="good" />
          <Stat label="Reveal eligible (total)" value={counters.reveal_eligible_total ?? counters.reveal_eligible ?? 0} />
          <Stat label="Founder amount requested" value={counters.founder_reveal_amount_requested ?? "—"} tone={counters.founder_reveal_amount_requested ? "good" : "warn"} />
          <Stat label="Selected for next reveal" value={counters.selected_for_next_reveal ?? 0} tone="good" />
          <Stat label="Would spend credits" value={counters.would_spend_credits ?? 0} />
          <Stat label="Held back — founder amount" value={counters.held_back_by_founder_amount ?? 0} tone="warn" />
          <Stat label="Held back — budget" value={counters.held_back_by_budget ?? 0} tone="warn" />
          <Stat label="Held back — domain cap" value={counters.held_back_by_domain_cap ?? counters.reveal_skipped_domain_cap ?? 0} tone="warn" />
          <Stat label="Held back — duplicate (pre-reveal)" value={(counters as any).held_back_by_duplicate_pre_reveal ?? 0} tone="warn" />
          <Stat label="Held back — company/domain cap" value={(counters as any).held_back_by_company_or_domain_cap ?? 0} tone="warn" />
          <Stat label="Unique candidates (post-dedupe)" value={(counters as any).selected_unique_candidates ?? 0} tone="good" />
          <Stat label="Duplicates detected" value={(counters as any).duplicate_candidates_detected ?? 0} tone="warn" />
          <Stat label="Company groups in batch" value={(counters as any).company_group_cap_applied ?? 0} />
          <Stat label="Reveal planned (live)" value={counters.reveal_planned ?? 0} tone="good" />
          <Stat label="Awaiting founder approval" value={counters.awaiting_founder_reveal_approval ?? 0} tone="warn" />
          <Stat label="Skipped — below min score" value={counters.skipped_below_min_score ?? 0} tone="warn" />
          <Stat label="Skipped — missing score" value={counters.skipped_missing_score ?? 0} tone="warn" />
          <Stat label="Skipped — existing CRM" value={counters.skipped_existing_crm ?? 0} tone="warn" />
          <Stat label="Skipped — duplicate" value={counters.skipped_duplicate ?? 0} tone="warn" />
          <Stat label="Skipped — suppressed" value={counters.skipped_suppressed_or_bounced ?? 0} tone="warn" />
          <Stat label="Skipped — prev no-email" value={counters.skipped_previous_no_email ?? 0} tone="warn" />
          <Stat label="Skipped — legacy hold" value={counters.skipped_legacy_hold ?? 0} tone="warn" />
          <Stat label="Promote planned" value={counters.promote_planned ?? 0} tone="good" />
          <Stat label="Queue planned" value={counters.queue_planned ?? 0} tone="good" />
          <Stat label="Queue skipped" value={counters.queue_skipped ?? 0} tone="warn" />
          <Stat label="Founder decisions" value={pendingDecisions ?? 0} tone={(pendingDecisions ?? 0) > 0 ? "warn" : "default"} />
          <Stat label="Credits used (month)" value={counters.credits_used_month ?? 0} />
          <Stat label="Would send" value={counters.would_send ?? 0} />
        </div>

        <p className="text-xs text-muted-foreground">
          {lastRun
            ? <>Last autopilot run {formatDistanceToNow(new Date(lastRun.created_at), { addSuffix: true })} — next: <span className="text-foreground">{lastRun?.next_recommended_action ?? lastRun?.outcome ?? "—"}</span></>
            : "No autopilot run yet — click Plan to compute the next batch."}
        </p>

        {/* Last reveal execution result */}
        {revealExec?.attempted && (
          <div className="space-y-2 p-3 rounded border border-border/50 bg-secondary/30">
            <p className="text-xs uppercase text-muted-foreground">Last Apollo reveal execution</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              <Stat label="Apollo API called" value={revealExec.apollo_api_called ? "yes" : "no"} tone={revealExec.apollo_api_called ? "good" : "danger"} />
              <Stat label="Credits actually spent" value={revealExec.credits_actually_spent ?? 0} />
              <Stat label="Emails returned" value={revealExec.emails_returned ?? 0} tone={revealExec.emails_returned > 0 ? "good" : "warn"} />
              <Stat label="Provider errors" value={revealExec.provider_errors ?? 0} tone={revealExec.provider_errors > 0 ? "danger" : "default"} />
              <Stat label="Already recorded" value={revealExec.already_recorded ? "yes" : "no"} tone={revealExec.already_recorded ? "warn" : "default"} />
              <Stat label="Outcomes logged" value={revealOutcomes.length} />
            </div>
            {revealOutcomes.length > 0 && (
              <div className="max-h-72 overflow-auto rounded border border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Apollo status</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revealOutcomes.map((o: any) => (
                      <TableRow key={o.candidate_id}>
                        <TableCell>{o.name ?? "—"}</TableCell>
                        <TableCell className="text-xs">{o.company ?? "—"}</TableCell>
                        <TableCell className="text-xs">{o.outcome}</TableCell>
                        <TableCell className="text-xs">{o.apollo_status ?? "—"}</TableCell>
                        <TableCell className="text-xs">{o.email ?? (o.email_returned ? "yes" : "no")}</TableCell>
                        <TableCell className="text-xs">{o.credit_consumed ? "1" : "0"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* Selected for next reveal */}
        {selectedCandidates.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase text-muted-foreground">Selected for next Apollo reveal ({selectedCandidates.length})</p>
            <div className="max-h-72 overflow-auto rounded border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Domain / Group</TableHead>
                    <TableHead>Dup key</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Fit</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedCandidates.map((c) => (
                    <TableRow key={c.candidate_id}>
                      <TableCell>{c.name ?? "—"}</TableCell>
                      <TableCell className="text-xs">{c.title ?? "—"}</TableCell>
                      <TableCell className="text-xs">{c.company ?? "—"}</TableCell>
                      <TableCell className="text-xs">{c.domain_or_company_group ?? c.domain ?? "—"}</TableCell>
                      <TableCell className="text-xs font-mono">{(c.duplicate_key ?? "—").toString().slice(0, 28)}</TableCell>
                      <TableCell>{c.source_quality_score}</TableCell>
                      <TableCell className="text-xs">{c.campaign_fit ?? "—"}</TableCell>
                      <TableCell className="text-xs">{(() => {
                        const o = outcomeByCandidateId.get(c.candidate_id);
                        if (o) return o.email ?? o.outcome;
                        return c.email_available ? "available" : "reveal needed";
                      })()}</TableCell>
                      <TableCell className="text-xs">{c.estimated_credit_cost} credit</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {duplicatesHeldBack.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase text-yellow-300">Duplicate candidates held back before reveal ({duplicatesHeldBack.length})</p>
            <div className="max-h-56 overflow-auto rounded border border-yellow-500/30">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Dup key</TableHead>
                    <TableHead>Matched selected</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {duplicatesHeldBack.map((c) => (
                    <TableRow key={c.candidate_id}>
                      <TableCell>{c.name ?? "—"}</TableCell>
                      <TableCell className="text-xs">{c.company ?? "—"}</TableCell>
                      <TableCell className="text-xs font-mono">{(c.duplicate_key ?? "—").toString().slice(0, 28)}</TableCell>
                      <TableCell className="text-xs">{c.matched_selected_candidate?.name ?? "—"} ({c.matched_selected_candidate?.company ?? "—"})</TableCell>
                      <TableCell className="text-xs">{c.reason_held}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {eligibleNotSelected.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">Eligible but not selected this run ({eligibleNotSelected.length})</summary>
            <div className="max-h-56 overflow-auto rounded border border-border/50 mt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eligibleNotSelected.map((c) => (
                    <TableRow key={c.candidate_id}>
                      <TableCell>{c.name ?? "—"}</TableCell>
                      <TableCell>{c.company ?? "—"}</TableCell>
                      <TableCell>{c.domain ?? "—"}</TableCell>
                      <TableCell>{c.source_quality_score}</TableCell>
                      <TableCell>{c.reason_not_selected}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </details>
        )}

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