import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import AICostBreadcrumb from "@/components/founder/ai/AICostBreadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Activity, Cpu, Workflow, ShieldCheck, AlertTriangle, MessagesSquare, ListChecks } from "lucide-react";
import PortfolioCommanderEnginePanel from "@/components/founder/portfolio/PortfolioCommanderEnginePanel";

const sb: any = supabase;

type AgentRow = {
  id: string;
  agent_name: string;
  agent_type: string;
  status: string;
  max_concurrency: number;
  primary_model: string;
  fallback_model: string | null;
  allowed_actions: string[];
  prohibited_actions: string[];
  approval_required_actions: string[];
  monthly_budget_gbp: number;
};

export default function AIOrchestrationLive() {
  const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();
  const since30d = new Date(Date.now() - 30 * 86400_000).toISOString();

  const { data: agents = [] } = useQuery<AgentRow[]>({
    queryKey: ["orch_agents"],
    queryFn: async () => {
      const { data } = await sb.from("ai_agent_registry").select("*").order("agent_name");
      return data ?? [];
    },
  });

  const { data: requests = [] } = useQuery<any[]>({
    queryKey: ["orch_requests"],
    refetchInterval: 8000,
    queryFn: async () => {
      const { data } = await sb
        .from("ai_gateway_requests")
        .select("id,request_id,status,agent_id,business_id,conversation_id,model,risk_level,approval_required,priority,created_at,estimated_cost_gbp,actual_cost_gbp,request_type")
        .gte("created_at", since30d)
        .order("created_at", { ascending: false })
        .limit(500);
      return data ?? [];
    },
  });

  const { data: conversations = [] } = useQuery<any[]>({
    queryKey: ["orch_conversations"],
    refetchInterval: 10000,
    queryFn: async () => {
      const { data } = await sb.from("ai_conversations").select("*").order("updated_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  const { data: workflows = [] } = useQuery<any[]>({
    queryKey: ["orch_workflows"],
    refetchInterval: 10000,
    queryFn: async () => {
      const { data } = await sb.from("ai_workflow_runs").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const { data: workflowSteps = [] } = useQuery<any[]>({
    queryKey: ["orch_workflow_steps"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data } = await sb.from("ai_workflow_steps").select("*").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  const running = requests.filter((r) => r.status === "running");
  const queued = requests.filter((r) => r.status === "queued");
  const waitingApproval = requests.filter((r) => r.status === "waiting_approval");
  const failed24h = requests.filter((r) => r.status === "failed" && r.created_at >= since24h);
  const activeConversations = conversations.filter((c) => c.status === "active");
  const activeWorkflows = workflows.filter((w) => ["queued", "running", "paused", "waiting_approval"].includes(w.status));

  const cost24h = requests
    .filter((r) => r.created_at >= since24h)
    .reduce((s, r) => s + Number(r.actual_cost_gbp ?? r.estimated_cost_gbp ?? 0), 0);
  const cost30d = requests
    .reduce((s, r) => s + Number(r.actual_cost_gbp ?? r.estimated_cost_gbp ?? 0), 0);

  const perAgent = agents.map((a) => {
    const inflight = requests.filter((r) => r.agent_id === a.id && ["queued", "running"].includes(r.status)).length;
    const util = a.max_concurrency > 0 ? Math.min(100, Math.round((inflight / a.max_concurrency) * 100)) : 0;
    const total24h = requests.filter((r) => r.agent_id === a.id && r.created_at >= since24h).length;
    return { agent: a, inflight, util, total24h };
  });

  const perBusiness = (() => {
    const map = new Map<string, number>();
    for (const r of requests) {
      if (!r.business_id) continue;
      if (r.created_at < since24h) continue;
      map.set(r.business_id, (map.get(r.business_id) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  })();

  const bottlenecks: string[] = [];
  for (const p of perAgent) {
    if (p.util >= 90) bottlenecks.push(`${p.agent.agent_name} at ${p.util}% concurrency (${p.inflight}/${p.agent.max_concurrency})`);
  }
  if (failed24h.length > 20) bottlenecks.push(`${failed24h.length} failed requests in last 24h`);
  if (waitingApproval.length > 10) bottlenecks.push(`${waitingApproval.length} requests awaiting founder approval`);

  const scaleChecklist = [
    { label: "Conversation isolation present", ok: true, note: "ai_conversations: business_id/portfolio_asset_id/agent_id/data_classification scoped per row, RLS admin-only." },
    { label: "Request IDs present on every call", ok: true, note: "ai_gateway_requests.request_id (unique) + trace_id." },
    { label: "Idempotency keys supported", ok: true, note: "ai_gateway_requests.idempotency_key returns existing row on duplicate." },
    { label: "Retries safe (no auto external sends)", ok: true, note: "All external sends require founder approval; retries replay internal AI only." },
    { label: "Approvals separated from internal AI", ok: true, note: "risk_level=high|critical + approval_required=true → waiting_approval; everything else runs live." },
    { label: "Cost/rate limits per agent + business", ok: true, note: "ai_agent_registry.max_concurrency + monthly_budget_gbp; ai_business_budgets enforces business caps." },
    { label: "Queue depth visible", ok: true, note: "This page: running/queued/waiting_approval cards + per-agent util bars." },
    { label: "Failure logs visible", ok: true, note: "ai_runtime_events + this page's failed-24h card; full ledger at /founder/ai-cost/ledger." },
    { label: "No direct AI bypasses active", ok: false, note: "Batch B + Batch C migrations still pending (13 functions). See AI Bypass Register." },
    { label: "Manual escalation path documented", ok: true, note: "Founder Approval Agent → founder; see Technical Manual v5.9.2." },
  ];

  return (
    <FounderLayout>
      <div className="space-y-4 max-w-[1400px]">
        <AICostBreadcrumb page="AI Orchestration Live" description="Live step engine, workflows, per-agent concurrency, per-business activity and bottleneck warnings." />
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-7 w-7 text-primary" /> AI Orchestration Live
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              Multi-agent, multi-business runtime view. Many conversations and workflows run in parallel —
              isolated by business / portfolio asset, governed by per-agent concurrency, gated only on high-risk external actions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/founder/ai-cost/runtime"><Cpu className="h-4 w-4 mr-1" /> Runtime detail</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/founder/ai-cost/approvals">Approvals</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/founder/ai-cost/ledger">Usage Ledger</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/founder/portfolio-exit/ai-bypass-register">Bypass Register</Link></Button>
          </div>
        </div>

        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Live-first orchestration</AlertTitle>
          <AlertDescription className="text-xs">
            Internal analysis, scoring, valuation and reporting run without approval gates.
            Only external-facing or irreversible actions wait for founder approval — they show in the "Awaiting approval" card.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          <StatCard icon={Activity} label="Running" v={running.length} />
          <StatCard icon={ListChecks} label="Queued" v={queued.length} />
          <StatCard icon={ShieldCheck} label="Awaiting approval" v={waitingApproval.length} accent={waitingApproval.length ? "amber" : undefined} />
          <StatCard icon={AlertTriangle} label="Failed 24h" v={failed24h.length} accent={failed24h.length ? "destructive" : undefined} />
          <StatCard icon={MessagesSquare} label="Active conversations" v={activeConversations.length} />
          <StatCard icon={Workflow} label="Active workflows" v={activeWorkflows.length} />
          <StatCard icon={Cpu} label="Cost 24h" v={`£${cost24h.toFixed(2)}`} />
          <StatCard icon={Cpu} label="Cost 30d" v={`£${cost30d.toFixed(2)}`} />
        </div>

        {bottlenecks.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Bottleneck warnings</AlertTitle>
            <AlertDescription className="text-xs">
              <ul className="list-disc pl-4 space-y-0.5">{bottlenecks.map((b) => <li key={b}>{b}</li>)}</ul>
            </AlertDescription>
          </Alert>
        )}

        <Card className="tech-card">
          <CardHeader>
            <CardTitle>Per-agent concurrency</CardTitle>
            <CardDescription>Each agent runs its own queue with its own concurrency cap. The system has no single serial queue.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>In-flight</TableHead>
                <TableHead className="w-[180px]">Concurrency</TableHead>
                <TableHead>24h calls</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Approval-required actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {perAgent.map(({ agent, inflight, util, total24h }) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-mono text-xs">{agent.agent_name}</TableCell>
                    <TableCell className="text-xs">{agent.agent_type}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{agent.status}</Badge></TableCell>
                    <TableCell className="text-xs">{inflight} / {agent.max_concurrency}</TableCell>
                    <TableCell><Progress value={util} className="h-2" /></TableCell>
                    <TableCell className="text-xs">{total24h}</TableCell>
                    <TableCell className="text-[10px] text-muted-foreground font-mono">
                      {agent.primary_model}{agent.fallback_model ? ` → ${agent.fallback_model}` : ""}
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground max-w-[260px]">
                      {(agent.approval_required_actions ?? []).join(", ") || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card className="tech-card">
            <CardHeader>
              <CardTitle>Active conversations</CardTitle>
              <CardDescription>Isolated by business / portfolio asset / channel. Many run in parallel.</CardDescription>
            </CardHeader>
            <CardContent>
              {activeConversations.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active conversations.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {activeConversations.slice(0, 25).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell><Badge variant="outline" className="text-[10px]">{c.channel}</Badge></TableCell>
                        <TableCell className="text-xs">{c.title ?? c.conversation_id}</TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">{c.context_scope ?? "—"}</TableCell>
                        <TableCell><Badge className="text-[10px]">{c.data_classification}</Badge></TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">{new Date(c.updated_at).toLocaleTimeString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="tech-card">
            <CardHeader>
              <CardTitle>Active workflows</CardTitle>
              <CardDescription>Multi-step runs orchestrated by Portfolio Commander Agent.</CardDescription>
            </CardHeader>
            <CardContent>
              {activeWorkflows.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active workflows.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Step</TableHead>
                    <TableHead>Started</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {activeWorkflows.slice(0, 25).map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="text-xs">{w.workflow_type}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{w.status}</Badge></TableCell>
                        <TableCell className="text-xs">{w.current_step} / {w.total_steps}</TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">{w.started_at ? new Date(w.started_at).toLocaleTimeString() : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle>Per-business AI activity (24h)</CardTitle>
            <CardDescription>Strict tenant isolation: each row is a distinct business / asset scope.</CardDescription>
          </CardHeader>
          <CardContent>
            {perBusiness.length === 0 ? (
              <p className="text-xs text-muted-foreground">No per-business activity in the last 24 hours.</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Business ID</TableHead><TableHead>Requests 24h</TableHead></TableRow></TableHeader>
                <TableBody>
                  {perBusiness.map(([bid, n]) => (
                    <TableRow key={bid}>
                      <TableCell className="font-mono text-[11px]">{bid}</TableCell>
                      <TableCell className="text-xs">{n}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle>Scale Readiness Checklist</CardTitle>
            <CardDescription>What must be true for Liftor to run safely at high concurrent volume.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Check</TableHead><TableHead>Status</TableHead><TableHead>Detail</TableHead></TableRow></TableHeader>
              <TableBody>
                {scaleChecklist.map((c) => (
                  <TableRow key={c.label}>
                    <TableCell className="text-xs">{c.label}</TableCell>
                    <TableCell>
                      <Badge variant={c.ok ? "default" : "destructive"} className="text-[10px]">{c.ok ? "ok" : "pending"}</Badge>
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground max-w-[640px]">{c.note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle>Recent workflow steps</CardTitle>
          </CardHeader>
          <CardContent>
            {workflowSteps.length === 0 ? (
              <p className="text-xs text-muted-foreground">No workflow steps recorded yet.</p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Step</TableHead><TableHead>Status</TableHead><TableHead>Agent</TableHead>
                  <TableHead>Approval</TableHead><TableHead>Created</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {workflowSteps.slice(0, 25).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{s.step_name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{s.status}</Badge></TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground">{s.agent_id ?? "—"}</TableCell>
                      <TableCell><Badge variant={s.approval_required ? "destructive" : "outline"} className="text-[10px]">{s.approval_required ? "required" : "—"}</Badge></TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleTimeString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <PortfolioCommanderEnginePanel />
      </div>
    </FounderLayout>
  );
}

function StatCard({ icon: Icon, label, v, accent }: { icon: any; label: string; v: number | string; accent?: string }) {
  const cls =
    accent === "destructive" ? "text-destructive" :
    accent === "amber" ? "text-amber-400" :
    "text-foreground";
  return (
    <Card className="tech-card">
      <CardContent className="p-3">
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3 w-3" /> {label}
        </div>
        <div className={`text-2xl font-semibold mt-1 ${cls}`}>{v}</div>
      </CardContent>
    </Card>
  );
}