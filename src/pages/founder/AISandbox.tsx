import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import AICostBreadcrumb from "@/components/founder/ai/AICostBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FlaskConical, Beaker, CheckCircle2, XCircle, Trash2, Play, RefreshCw } from "lucide-react";
import {
  getSimulationMode, setSimulationMode,
  seedSyntheticData, purgeSimulationData,
  runBacktest, replayHistorical, runQAChecklist, SCENARIOS,
  type BacktestInput, type QACheck,
} from "@/services/aiSandbox";
import { formatGBP } from "@/services/aiUsageLogger";

export default function AISandbox() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const sim = useQuery({ queryKey: ["sim_mode"], queryFn: getSimulationMode, refetchInterval: 20000 });
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeConfirm, setPurgeConfirm] = useState("");
  const [backtestResult, setBacktestResult] = useState<any>(null);
  const [qaResults, setQaResults] = useState<QACheck[] | null>(null);
  const [replayResults, setReplayResults] = useState<any[] | null>(null);
  const [form, setForm] = useState<BacktestInput>({
    task_category: "email_classification", action_type: "classify_email",
    risk_level: "low", prompt_tokens: 200, completion_tokens: 40,
    model_provider: "openai", model_name: "gpt-5-nano",
  });

  const toggleSim = useMutation({
    mutationFn: async (enabled: boolean) => setSimulationMode(enabled),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sim_mode"] }); toast({ title: "Simulation mode updated" }); },
  });
  const seed = useMutation({
    mutationFn: seedSyntheticData,
    onSuccess: (r) => toast({ title: "Test data seeded", description: JSON.stringify(r.counts) }),
    onError: (e: any) => toast({ title: "Seed failed", description: e.message, variant: "destructive" }),
  });
  const purge = useMutation({
    mutationFn: purgeSimulationData,
    onSuccess: (r) => { setPurgeOpen(false); setPurgeConfirm(""); toast({ title: "Simulation data purged", description: JSON.stringify(r.deleted) }); },
    onError: (e: any) => toast({ title: "Purge failed", description: e.message, variant: "destructive" }),
  });
  const backtest = useMutation({
    mutationFn: (input: BacktestInput) => runBacktest(input),
    onSuccess: (r) => setBacktestResult(r),
    onError: (e: any) => toast({ title: "Backtest failed", description: e.message, variant: "destructive" }),
  });
  const replay = useMutation({
    mutationFn: () => replayHistorical(25),
    onSuccess: (r) => setReplayResults(r),
    onError: (e: any) => toast({ title: "Replay failed", description: e.message, variant: "destructive" }),
  });
  const qa = useMutation({
    mutationFn: runQAChecklist,
    onSuccess: (r) => setQaResults(r),
    onError: (e: any) => toast({ title: "QA failed", description: e.message, variant: "destructive" }),
  });

  const isSim = !!(sim.data as any)?.simulation_mode;

  return (
    <FounderLayout>
      <AICostBreadcrumb page="Sandbox (optional testing)" description="Optional sandbox for safe internal AI testing. Live system is unaffected." /><div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-primary" /> AI Sandbox & Backtesting
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Safely test routing, budgets, approvals, ROI and security with synthetic or historical data. No external actions ever run from this page.
            </p>
          </div>
          {isSim && <Badge variant="destructive" className="text-base px-3 py-1">SIMULATION MODE</Badge>}
        </div>

        {/* Sim mode toggle */}
        <Card>
          <CardHeader>
            <CardTitle>Simulation mode</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground max-w-xl">
              When enabled, every UI surface shows a clear simulation banner. Simulated rows are flagged
              <code className="mx-1">is_simulation=true</code>
              and excluded from real reporting until promoted by the founder.
            </div>
            <Switch checked={isSim} onCheckedChange={(v) => toggleSim.mutate(v)} />
          </CardContent>
        </Card>

        <Tabs defaultValue="scenarios">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
            <TabsTrigger value="backtest">Backtest</TabsTrigger>
            <TabsTrigger value="replay">Historical replay</TabsTrigger>
            <TabsTrigger value="seed">Seed test data</TabsTrigger>
            <TabsTrigger value="qa">QA checklist</TabsTrigger>
            <TabsTrigger value="purge">Purge</TabsTrigger>
          </TabsList>

          {/* Scenarios */}
          <TabsContent value="scenarios">
            <Card>
              <CardHeader><CardTitle>Pre-built scenarios</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {SCENARIOS.map(s => (
                  <div key={s.id} className="rounded border p-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.input.task_category} · {s.input.action_type}</p>
                    </div>
                    <Button size="sm" onClick={() => backtest.mutate(s.input)}>
                      <Play className="h-3 w-3 mr-1" /> Run
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
            {backtestResult && <BacktestResultCard result={backtestResult} />}
          </TabsContent>

          {/* Backtest */}
          <TabsContent value="backtest">
            <Card>
              <CardHeader><CardTitle>Custom backtest</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <FormField label="Task category" value={form.task_category} onChange={v => setForm({ ...form, task_category: v })} />
                <FormField label="Action type" value={form.action_type} onChange={v => setForm({ ...form, action_type: v })} />
                <FormField label="Risk level" value={form.risk_level ?? "low"} onChange={v => setForm({ ...form, risk_level: v as any })} />
                <FormField label="Model provider" value={form.model_provider ?? ""} onChange={v => setForm({ ...form, model_provider: v })} />
                <FormField label="Model name" value={form.model_name ?? ""} onChange={v => setForm({ ...form, model_name: v })} />
                <FormField label="Prompt tokens" value={String(form.prompt_tokens ?? 0)} onChange={v => setForm({ ...form, prompt_tokens: Number(v) })} />
                <FormField label="Completion tokens" value={String(form.completion_tokens ?? 0)} onChange={v => setForm({ ...form, completion_tokens: Number(v) })} />
                <div className="md:col-span-2">
                  <Label>External content (optional, simulates inbound text)</Label>
                  <Input value={form.external_content ?? ""} onChange={e => setForm({ ...form, external_content: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Button onClick={() => backtest.mutate(form)} disabled={backtest.isPending}>
                    <Play className="h-4 w-4 mr-1" /> Run backtest
                  </Button>
                </div>
              </CardContent>
            </Card>
            {backtestResult && <BacktestResultCard result={backtestResult} />}
          </TabsContent>

          {/* Replay */}
          <TabsContent value="replay">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Historical replay (last 25 real ledger rows)</CardTitle>
                <Button size="sm" onClick={() => replay.mutate()} disabled={replay.isPending}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Replay
                </Button>
              </CardHeader>
              <CardContent>
                {!replayResults && <p className="text-sm text-muted-foreground">Replays the last real AI usage rows against the current routing, budget and approval rules. No real actions are taken.</p>}
                {replayResults && (
                  <div className="space-y-1 text-xs max-h-96 overflow-y-auto">
                    {replayResults.map((r, i) => (
                      <div key={i} className="rounded border p-2 flex justify-between">
                        <span>{r.routing_tier} · approval={String(r.approval)}</span>
                        <span>orig {formatGBP(Number(r.original_cost ?? 0))} → sim {formatGBP(Number(r.simulated_cost ?? 0))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Seed */}
          <TabsContent value="seed">
            <Card>
              <CardHeader><CardTitle>Synthetic test data</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Inserts a sample business, three agents, one campaign, plus labelled ledger rows, alerts,
                  queue items and a quality score. All rows are tagged <code>is_simulation=true</code> and
                  prefixed with <code>[SIM]</code> in summaries.
                </p>
                <Button onClick={() => seed.mutate()} disabled={seed.isPending}>
                  <Beaker className="h-4 w-4 mr-1" /> Seed test data
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* QA */}
          <TabsContent value="qa">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>QA checklist</CardTitle>
                <Button size="sm" onClick={() => qa.mutate()} disabled={qa.isPending}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Run checks
                </Button>
              </CardHeader>
              <CardContent>
                {!qaResults && <p className="text-sm text-muted-foreground">Verifies routing, budgets, stop-loss, approval gates, queue control, idempotency, redaction, injection detection, ROI snapshots and dashboard queries.</p>}
                {qaResults && (
                  <ul className="space-y-2">
                    {qaResults.map(c => (
                      <li key={c.id} className="flex items-start gap-3 rounded border p-3">
                        {c.passed ? <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" /> : <XCircle className="h-5 w-5 text-destructive mt-0.5" />}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{c.label}</p>
                          <p className="text-xs text-muted-foreground break-all">{c.detail}</p>
                        </div>
                        <Badge variant={c.passed ? "secondary" : "destructive"}>{c.passed ? "PASS" : "FAIL"}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purge */}
          <TabsContent value="purge">
            <Card>
              <CardHeader><CardTitle>Purge simulation data</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Deletes only rows tagged <code>is_simulation=true</code> from the ledger, alerts, queue and quality scores.
                  Real records are never touched. The action is logged.
                </p>
                <Button variant="destructive" onClick={() => setPurgeOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Purge simulation data
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={purgeOpen} onOpenChange={setPurgeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm purge</DialogTitle>
            <DialogDescription>
              Type <code>PURGE</code> to delete all rows where <code>is_simulation=true</code>. Real data is never touched.
            </DialogDescription>
          </DialogHeader>
          <Input value={purgeConfirm} onChange={(e) => setPurgeConfirm(e.target.value)} placeholder="PURGE" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={purgeConfirm !== "PURGE" || purge.isPending} onClick={() => purge.mutate()}>
              Confirm purge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FounderLayout>
  );
}

function FormField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function BacktestResultCard({ result }: { result: any }) {
  return (
    <Card className="mt-4">
      <CardHeader><CardTitle>Backtest result</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
        <Block label="Routing">
          <p>Selected tier: <b>{result.routing?.selected_model_tier}</b></p>
          <p>Requires approval: <b>{String(result.routing?.requires_human_approval)}</b></p>
          <p className="text-xs text-muted-foreground">{result.routing?.routing_reason}</p>
          {result.routing?.blocked && <Badge variant="destructive" className="mt-1">BLOCKED</Badge>}
        </Block>
        <Block label="Cost">
          {result.cost?.pricing_missing && <Badge variant="destructive">Pricing missing</Badge>}
          {!result.cost?.pricing_missing && <p>Estimated: <b>{formatGBP(Number(result.cost?.display_total_cost ?? 0))}</b></p>}
        </Block>
        <Block label="Budget">
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(result.budget, null, 2).slice(0, 400)}</pre>
        </Block>
        <Block label="Stop-loss">
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(result.stopLoss, null, 2).slice(0, 400)}</pre>
        </Block>
        <Block label="Approval">
          <p>Required: <b>{String(result.approval?.required)}</b></p>
          {result.approval?.reason && <p className="text-xs">{result.approval.reason}</p>}
        </Block>
        <Block label="Queue enforcement">
          <p>Allowed: <b>{String(result.enforcement?.allowed)}</b></p>
          {result.enforcement?.reason && <p className="text-xs text-muted-foreground">{result.enforcement.reason}</p>}
        </Block>
        {result.injection && (
          <Block label="Security inspection">
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(result.injection, null, 2).slice(0, 500)}</pre>
          </Block>
        )}
        <Block label="ROI estimate">
          <p>AI cost: {formatGBP(result.roi?.estimated_ai_cost)}</p>
          <p>Human cost saved (est.): {formatGBP(result.roi?.estimated_human_cost_saved)}</p>
          <p>Net saving: <b>{formatGBP(result.roi?.net_saving)}</b></p>
        </Block>
      </CardContent>
    </Card>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded border p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}