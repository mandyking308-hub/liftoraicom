import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Workflow, Play, RotateCcw, X, ShieldCheck, AlertTriangle } from "lucide-react";

const sb: any = supabase;

const WORKFLOW_TYPES = [
  "portfolio_weekly_review",
  "asset_exit_review",
  "quarterly_build_selection",
  "buyer_warmup_plan",
  "data_room_cleanup",
  "valuation_refresh",
  "execution_target_generation",
  "competitor_investor_scan",
];

async function callEngine(body: Record<string, unknown>) {
  const { data, error } = await sb.functions.invoke("portfolio-commander-step-engine", { body });
  if (error) throw error;
  return data;
}

const statusColor: Record<string, string> = {
  queued: "bg-muted text-muted-foreground",
  running: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
  paused: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  waiting_approval: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  cancelled: "bg-muted text-muted-foreground",
};

export default function PortfolioCommanderEnginePanel({ compact = false }: { compact?: boolean }) {
  const qc = useQueryClient();
  const [type, setType] = useState<string>(WORKFLOW_TYPES[0]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { data: runs = [] } = useQuery<any[]>({
    queryKey: ["pc_engine_runs"],
    refetchInterval: 8000,
    queryFn: async () => {
      const { data } = await sb.from("ai_workflow_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);
      return data ?? [];
    },
  });

  const { data: steps = [] } = useQuery<any[]>({
    queryKey: ["pc_engine_steps"],
    refetchInterval: 10000,
    queryFn: async () => {
      const { data } = await sb.from("ai_workflow_steps")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const active = runs.filter((r) => ["queued", "running", "waiting_approval", "paused"].includes(r.status));
  const waiting = runs.filter((r) => r.status === "waiting_approval");
  const failedSteps = steps.filter((s) => s.status === "failed");
  const waitingSteps = steps.filter((s) => s.status === "waiting_approval");

  async function act(body: Record<string, unknown>, label: string) {
    setBusy(true); setMsg(null);
    try {
      const r = await callEngine(body);
      setMsg(`${label}: ${r?.message ?? "ok"}`);
      qc.invalidateQueries({ queryKey: ["pc_engine_runs"] });
      qc.invalidateQueries({ queryKey: ["pc_engine_steps"] });
      qc.invalidateQueries({ queryKey: ["orch_workflows"] });
      qc.invalidateQueries({ queryKey: ["orch_workflow_steps"] });
    } catch (e: any) {
      setMsg(`${label} failed: ${e?.message ?? String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  const stepsForRun = (runId: string) =>
    steps.filter((s) => s.workflow_run_id === runId).sort((a, b) => a.step_index - b.step_index);

  return (
    <Card className="tech-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Workflow className="h-5 w-5 text-primary" /> Portfolio Commander Engine</CardTitle>
        <CardDescription>
          Internal multi-agent workflows. Live-first: only buyer/investor contact, exports, spend,
          legal/tax/entity, sale-start, kill or paid-API activation steps wait for founder approval.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[280px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {WORKFLOW_TYPES.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={busy} onClick={() => act({ action: "create", workflow_type: type }, "create")}>
            Create workflow
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: "tick_all", max: 5 }, "tick")}>
            <Play className="h-3 w-3 mr-1" /> Run next steps
          </Button>
          <Badge variant="outline" className="text-[10px] ml-auto">Active: {active.length}</Badge>
          <Badge variant="outline" className="text-[10px]">Awaiting approval: {waiting.length}</Badge>
          <Badge variant="outline" className="text-[10px]">Failed steps: {failedSteps.length}</Badge>
        </div>
        {msg && <p className="text-[11px] text-muted-foreground">{msg}</p>}

        {waitingSteps.length > 0 && (
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle className="text-xs">Founder approval required</AlertTitle>
            <AlertDescription className="text-[11px]">
              {waitingSteps.length} step{waitingSteps.length === 1 ? "" : "s"} parked. Approve to advance the workflow.
              No external action, spend or sale-start runs until approved.
            </AlertDescription>
          </Alert>
        )}
        {failedSteps.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-xs">Failed steps</AlertTitle>
            <AlertDescription className="text-[11px]">
              {failedSteps.length} step{failedSteps.length === 1 ? "" : "s"} failed. Retry safely — duplicate
              high-risk actions are blocked by idempotency.
            </AlertDescription>
          </Alert>
        )}

        {active.length === 0 ? (
          <p className="text-xs text-muted-foreground">No active workflows. Create one above.</p>
        ) : (
          <div className="space-y-3">
            {active.slice(0, compact ? 5 : 12).map((r) => {
              const ss = stepsForRun(r.id);
              const current = ss.find((s) => s.step_index === r.current_step);
              const next = ss.find((s) => s.step_index === r.current_step + 1);
              return (
                <div key={r.id} className="border border-border/60 rounded p-2 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium">{r.workflow_type}</span>
                      <Badge className={`text-[10px] ${statusColor[r.status] ?? ""}`} variant="outline">{r.status}</Badge>
                      <span className="text-[10px] text-muted-foreground">step {r.current_step + 1} / {r.total_steps}</span>
                      {r.business_id && <span className="text-[10px] text-muted-foreground font-mono">biz:{String(r.business_id).slice(0, 8)}</span>}
                      {r.portfolio_asset_id && <span className="text-[10px] text-muted-foreground font-mono">asset:{String(r.portfolio_asset_id).slice(0, 8)}</span>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" disabled={busy}
                        onClick={() => act({ action: "tick", run_id: r.id }, "tick run")}>
                        <Play className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy}
                        onClick={() => act({ action: "cancel", run_id: r.id }, "cancel run")}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {!compact && (
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead className="text-[10px] w-8">#</TableHead>
                        <TableHead className="text-[10px]">Step</TableHead>
                        <TableHead className="text-[10px]">Status</TableHead>
                        <TableHead className="text-[10px]">Approval</TableHead>
                        <TableHead className="text-[10px]">Risk</TableHead>
                        <TableHead className="text-[10px]">Actions</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {ss.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="text-[10px]">{s.step_index + 1}</TableCell>
                            <TableCell className="text-[11px]">{s.step_name}</TableCell>
                            <TableCell><Badge variant="outline" className={`text-[10px] ${statusColor[s.status] ?? ""}`}>{s.status}</Badge></TableCell>
                            <TableCell className="text-[10px]">{s.approval_required ? "required" : "—"}</TableCell>
                            <TableCell className="text-[10px]">{(s.metadata?.risk_level ?? "low")}</TableCell>
                            <TableCell className="text-[10px]">
                              <div className="flex gap-1">
                                {s.status === "failed" && (
                                  <Button size="sm" variant="outline" className="h-6 px-2" disabled={busy}
                                    onClick={() => act({ action: "retry", step_id: s.id }, "retry step")}>
                                    <RotateCcw className="h-3 w-3" />
                                  </Button>
                                )}
                                {s.status === "waiting_approval" && (
                                  <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" disabled={busy}
                                    onClick={() => act({ action: "approve_step", step_id: s.id }, "approve step")}>
                                    Approve
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {compact && (
                    <p className="text-[10px] text-muted-foreground">
                      Current: {current?.step_name ?? "—"}{next ? ` → next: ${next.step_name}` : ""}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}