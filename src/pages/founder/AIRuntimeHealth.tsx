import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import AICostBreadcrumb from "@/components/founder/ai/AICostBreadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Activity, AlertTriangle, ShieldCheck, ShieldAlert, Cpu, MessagesSquare, Workflow, PoundSterling, RotateCw, Check } from "lucide-react";
import { KNOWN_DIRECT_AI_CALLERS } from "@/services/aiGateway";

const sb: any = supabase;

const SAFE_RETRY_RISK = new Set(["low", "medium"]);

export default function AIRuntimeHealth() {
  const qc = useQueryClient();
  const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();
  const since30d = new Date(Date.now() - 30 * 86400_000).toISOString();

  const { data: agents = [] } = useQuery<any[]>({
    queryKey: ["health_agents"],
    queryFn: async () => (await sb.from("ai_agent_registry").select("*").order("agent_name")).data ?? [],
  });

  const { data: requests = [] } = useQuery<any[]>({
    queryKey: ["health_requests"],
    refetchInterval: 8000,
    queryFn: async () =>
      (
        await sb
          .from("ai_gateway_requests")
          .select("id,request_id,status,agent_id,business_id,conversation_id,workflow_id,model,provider,risk_level,approval_required,priority,created_at,started_at,completed_at,error_message,estimated_cost_gbp,actual_cost_gbp,request_type,trace_id")
          .gte("created_at", since30d)
          .order("created_at", { ascending: false })
          .limit(1000)
      ).data ?? [],
  });

  const { data: conversations = [] } = useQuery<any[]>({
    queryKey: ["health_convs"],
    refetchInterval: 12000,
    queryFn: async () => (await sb.from("ai_conversations").select("*").order("updated_at", { ascending: false }).limit(200)).data ?? [],
  });

  const { data: workflows = [] } = useQuery<any[]>({
    queryKey: ["health_workflows"],
    refetchInterval: 12000,
    queryFn: async () => (await sb.from("ai_workflow_runs").select("*").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["health_events"],
    refetchInterval: 15000,
    queryFn: async () =>
      (
        await sb
          .from("ai_runtime_events")
          .select("event_type,severity,message,created_at,request_id,agent_id")
          .gte("created_at", since24h)
          .order("created_at", { ascending: false })
          .limit(300)
      ).data ?? [],
  });

  const { data: leases = [] } = useQuery<any[]>({
    queryKey: ["health_leases"],
    refetchInterval: 8000,
    queryFn: async () =>
      (
        await sb
          .from("ai_concurrency_leases")
          .select("id,lease_key,request_id,agent_id,business_id,provider,model,status,acquired_at,expires_at,released_at")
          .gte("acquired_at", since24h)
          .order("acquired_at", { ascending: false })
          .limit(500)
      ).data ?? [],
  });

  const { data: pricingRows = [] } = useQuery<any[]>({
    queryKey: ["health_pricing"],
    queryFn: async () =>
      (await sb.from("ai_provider_pricing").select("model_name,confidence,input_cost_per_1m_tokens,output_cost_per_1m_tokens,currency,active,pricing_source").eq("active", true)).data ?? [],
  });

  async function cleanupStaleLeases() {
    const { data, error } = await sb.rpc("cleanup_stale_ai_leases");
    if (error) { toast({ title: "Cleanup failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Stale leases cleaned", description: `${data ?? 0} expired` });
    qc.invalidateQueries({ queryKey: ["health_leases"] });
    qc.invalidateQueries({ queryKey: ["health_events"] });
  }

  const { data: budgets = [] } = useQuery<any[]>({
    queryKey: ["health_business_budgets"],
    queryFn: async () => (await sb.from("ai_business_budgets").select("*")).data ?? [],
  });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const todayRows = requests.filter((r) => r.created_at >= todayIso);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const monthRows = requests.filter((r) => r.created_at >= monthStart);

  const running = requests.filter((r) => r.status === "running");
  const queued = requests.filter((r) => r.status === "queued");
  const waitingApproval = requests.filter((r) => r.status === "waiting_approval");
  const failed24h = requests.filter((r) => r.status === "failed" && r.created_at >= since24h);
  const completed24h = requests.filter((r) => r.status === "completed" && r.created_at >= since24h && r.started_at && r.completed_at);
  const avgLatencyMs =
    completed24h.length === 0
      ? 0
      : Math.round(
          completed24h.reduce((s, r) => s + (new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()), 0) /
            completed24h.length,
        );

  const cost = (rows: any[]) => rows.reduce((s, r) => s + Number(r.actual_cost_gbp ?? r.estimated_cost_gbp ?? 0), 0);
  const costToday = cost(todayRows);
  const costMonth = cost(monthRows);
  const bypassCount = KNOWN_DIRECT_AI_CALLERS.filter((c) => c.status === "pending_migration" || c.status === "blocked").length;

  const activeConversations = conversations.filter((c) => c.status === "active");
  const activeWorkflows = workflows.filter((w) => ["queued", "running", "paused", "waiting_approval"].includes(w.status));
  const staleWorkflows = activeWorkflows.filter((w) => w.started_at && Date.now() - new Date(w.started_at).getTime() > 6 * 3600_000);

  const providerErrorEvents = events.filter((e) => ["network_error", "http_error", "rate_limited", "payment_required", "sdk_error"].includes(e.event_type));
  const activeLeases = leases.filter((l) => l.status === "active");
  const expiredLeases = leases.filter((l) => l.status === "expired");
  const leaseDeniedEvents = events.filter((e) => e.event_type === "lease_denied").length;
  const idempotencyDuplicates = events.filter((e) => e.event_type === "idempotency_duplicate_blocked" || e.event_type === "idempotency_replay").length;
  const staleCleanupEvents = events.filter((e) => e.event_type === "stale_lease_cleanup").length;

  // Cost accuracy
  const pricedModels = new Set(pricingRows.map((p) => p.model_name));
  const estimatedModels = new Set(pricingRows.filter((p) => p.confidence === "estimated").map((p) => p.model_name));
  const requestModels = new Set(requests.map((r) => r.model).filter(Boolean));
  const modelsMissingPricing = [...requestModels].filter((m) => !pricedModels.has(m));
  const requestsByBasis = (() => {
    const map: Record<string, number> = {};
    for (const r of monthRows) {
      const b = (r as any).cost_basis ?? "unknown";
      map[b] = (map[b] ?? 0) + 1;
    }
    return map;
  })();
  const actualCostMonth = monthRows.reduce((s, r) => s + Number((r as any).actual_cost_gbp ?? 0), 0);
  const estimatedOnlyMonth = monthRows.filter((r) => (r as any).actual_cost_gbp == null).reduce((s, r) => s + Number(r.estimated_cost_gbp ?? 0), 0);
  const errorsByModel = (() => {
    const map = new Map<string, number>();
    for (const r of failed24h) map.set(r.model ?? "unknown", (map.get(r.model ?? "unknown") ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  })();

  // Bottleneck rules
  const bottlenecks: { label: string; severity: "warning" | "critical" }[] = [];
  if (queued.length > 50) bottlenecks.push({ label: `Queue depth high: ${queued.length} queued`, severity: "warning" });
  if (queued.length > 200) bottlenecks.push({ label: `Queue depth critical: ${queued.length} queued`, severity: "critical" });
  if (failed24h.length > 20) bottlenecks.push({ label: `${failed24h.length} failed in last 24h`, severity: "warning" });
  if (waitingApproval.length > 25) bottlenecks.push({ label: `${waitingApproval.length} requests awaiting approval`, severity: "warning" });
  if (providerErrorEvents.filter((e) => e.event_type === "rate_limited").length > 10) bottlenecks.push({ label: "Provider rate-limit errors elevated", severity: "warning" });
  if (providerErrorEvents.filter((e) => e.event_type === "payment_required").length > 0) bottlenecks.push({ label: "Provider returned payment_required — credits exhausted", severity: "critical" });
  for (const a of agents) {
    const inflight = requests.filter((r) => r.agent_id === a.id && ["queued", "running"].includes(r.status)).length;
    if (a.max_concurrency > 0 && inflight >= a.max_concurrency) {
      bottlenecks.push({ label: `Agent ${a.agent_name} at concurrency limit (${inflight}/${a.max_concurrency})`, severity: "warning" });
    }
    const spendMonth = cost(monthRows.filter((r) => r.agent_id === a.id));
    if (a.monthly_budget_gbp > 0 && spendMonth >= Number(a.monthly_budget_gbp) * 0.9) {
      bottlenecks.push({ label: `Agent ${a.agent_name} at ≥90% of monthly budget (£${spendMonth.toFixed(2)} / £${a.monthly_budget_gbp})`, severity: "warning" });
    }
  }
  for (const b of budgets) {
    const spend = cost(monthRows.filter((r) => r.business_id === b.business_id));
    const cap = Number(b.monthly_ai_budget ?? 0);
    if (cap > 0 && spend >= cap) bottlenecks.push({ label: `Business ${b.business_id} exceeded monthly budget (£${spend.toFixed(2)} / £${cap})`, severity: "critical" });
  }
  if (staleWorkflows.length > 0) bottlenecks.push({ label: `${staleWorkflows.length} workflows stale (>6h)`, severity: "warning" });
  if (bypassCount > 0) bottlenecks.push({ label: `${bypassCount} edge functions still bypass the gateway`, severity: "warning" });

  async function retryFailed(row: any) {
    if (!SAFE_RETRY_RISK.has(row.risk_level)) {
      toast({ title: "Retry blocked", description: "High/critical risk requests must be re-initiated by the originating workflow.", variant: "destructive" });
      return;
    }
    const { error } = await sb
      .from("ai_gateway_requests")
      .update({ status: "queued", error_message: null, started_at: null, completed_at: null })
      .eq("id", row.id);
    if (error) { toast({ title: "Retry failed", description: error.message, variant: "destructive" }); return; }
    await sb.from("ai_runtime_events").insert({
      request_id: row.request_id, agent_id: row.agent_id, event_type: "retry_requested",
      severity: "info", message: "Retry requested from Runtime Health cockpit",
    });
    toast({ title: "Retry queued", description: row.request_id });
    qc.invalidateQueries({ queryKey: ["health_requests"] });
  }

  async function dismissFailed(row: any) {
    const { error } = await sb
      .from("ai_gateway_requests")
      .update({ status: "cancelled" })
      .eq("id", row.id);
    if (error) { toast({ title: "Dismiss failed", description: error.message, variant: "destructive" }); return; }
    await sb.from("ai_runtime_events").insert({
      request_id: row.request_id, agent_id: row.agent_id, event_type: "manually_resolved",
      severity: "info", message: "Marked resolved from Runtime Health cockpit",
    });
    toast({ title: "Marked resolved", description: row.request_id });
    qc.invalidateQueries({ queryKey: ["health_requests"] });
  }

  const agentName = (id?: string | null) => agents.find((a) => a.id === id)?.agent_name ?? "—";

  return (
    <FounderLayout>
      <div className="space-y-4 max-w-[1400px]">
        <AICostBreadcrumb page="AI Runtime Health" description="Live health, bottlenecks, costs, failures and approvals for every AI call." />
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Activity className="h-7 w-7 text-primary" /> AI Runtime Health Cockpit</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              Live health, bottlenecks, costs, failures and approvals for every AI call. Internal AI runs live;
              only high-risk external actions wait for founder approval.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/founder/ai-cost/orchestration-live">Orchestration Live</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/founder/ai-cost/runtime">Runtime detail</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/founder/ai-cost/approvals">Approvals</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/founder/portfolio-exit/ai-bypass-register">Bypass Register</Link></Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <StatCard icon={Activity} label="Today total" v={todayRows.length} />
          <StatCard icon={Activity} label="Running" v={running.length} />
          <StatCard icon={Activity} label="Queued" v={queued.length} accent={queued.length > 50 ? "amber" : undefined} />
          <StatCard icon={AlertTriangle} label="Failed 24h" v={failed24h.length} accent={failed24h.length ? "destructive" : undefined} />
          <StatCard icon={Activity} label="Avg latency" v={avgLatencyMs ? `${avgLatencyMs} ms` : "—"} />
          <StatCard icon={PoundSterling} label="Cost today" v={`£${costToday.toFixed(2)}`} />
          <StatCard icon={PoundSterling} label="Cost month" v={`£${costMonth.toFixed(2)}`} />
          <StatCard icon={MessagesSquare} label="Active conv." v={activeConversations.length} />
          <StatCard icon={Workflow} label="Active workflows" v={activeWorkflows.length} />
          <StatCard icon={ShieldCheck} label="Approvals pending" v={waitingApproval.length} accent={waitingApproval.length ? "amber" : undefined} />
          <StatCard icon={ShieldAlert} label="Bypass functions" v={bypassCount} accent={bypassCount ? "amber" : undefined} />
          <StatCard icon={AlertTriangle} label="Provider errors 24h" v={providerErrorEvents.length} accent={providerErrorEvents.length ? "destructive" : undefined} />
          <StatCard icon={Activity} label="Queue depth" v={queued.length + running.length} />
          <StatCard icon={AlertTriangle} label="Bottlenecks" v={bottlenecks.length} accent={bottlenecks.length ? "amber" : undefined} />
          <StatCard icon={ShieldCheck} label="Leases active" v={activeLeases.length} />
          <StatCard icon={AlertTriangle} label="Lease denials 24h" v={leaseDeniedEvents} accent={leaseDeniedEvents ? "amber" : undefined} />
          <StatCard icon={ShieldAlert} label="Idempotency dupes 24h" v={idempotencyDuplicates} accent={idempotencyDuplicates ? "amber" : undefined} />
          <StatCard icon={RotateCw} label="Stale lease sweeps" v={staleCleanupEvents} />
          <StatCard icon={PoundSterling} label="Actual cost month" v={`£${actualCostMonth.toFixed(2)}`} />
          <StatCard icon={PoundSterling} label="Estimated-only month" v={`£${estimatedOnlyMonth.toFixed(2)}`} accent={estimatedOnlyMonth ? "amber" : undefined} />
          <StatCard icon={AlertTriangle} label="Models missing pricing" v={modelsMissingPricing.length} accent={modelsMissingPricing.length ? "amber" : undefined} />
        </div>

        {bottlenecks.length > 0 && (
          <Alert variant={bottlenecks.some((b) => b.severity === "critical") ? "destructive" : "default"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Bottleneck warnings</AlertTitle>
            <AlertDescription className="text-xs">
              <ul className="list-disc pl-4 space-y-0.5">
                {bottlenecks.map((b, i) => (
                  <li key={i}>
                    <Badge variant={b.severity === "critical" ? "destructive" : "outline"} className="text-[10px] mr-1">{b.severity}</Badge>
                    {b.label}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="agent">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="agent">By Agent</TabsTrigger>
            <TabsTrigger value="business">By Business / Asset</TabsTrigger>
            <TabsTrigger value="conversation">By Conversation</TabsTrigger>
            <TabsTrigger value="workflow">By Workflow</TabsTrigger>
            <TabsTrigger value="provider">By Provider / Model</TabsTrigger>
            <TabsTrigger value="failed">Failed Jobs</TabsTrigger>
            <TabsTrigger value="approval">Approval Holds</TabsTrigger>
            <TabsTrigger value="cost">Cost & Budget</TabsTrigger>
            <TabsTrigger value="leases">Concurrency Leases</TabsTrigger>
            <TabsTrigger value="cost-accuracy">Cost Accuracy</TabsTrigger>
            <TabsTrigger value="bypass">Bypass Register</TabsTrigger>
          </TabsList>

          <TabsContent value="agent">
            <Card className="tech-card"><CardContent className="p-3">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Agent</TableHead><TableHead>Status</TableHead>
                  <TableHead>In-flight / cap</TableHead><TableHead className="w-[160px]">Utilisation</TableHead>
                  <TableHead>24h calls</TableHead><TableHead>Spend month</TableHead>
                  <TableHead>Model</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {agents.map((a) => {
                    const inflight = requests.filter((r) => r.agent_id === a.id && ["queued", "running"].includes(r.status)).length;
                    const util = a.max_concurrency > 0 ? Math.min(100, Math.round((inflight / a.max_concurrency) * 100)) : 0;
                    const total24h = requests.filter((r) => r.agent_id === a.id && r.created_at >= since24h).length;
                    const spendMonth = cost(monthRows.filter((r) => r.agent_id === a.id));
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs">{a.agent_name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{a.status}</Badge></TableCell>
                        <TableCell className="text-xs">{inflight} / {a.max_concurrency}</TableCell>
                        <TableCell><Progress value={util} className="h-2" /></TableCell>
                        <TableCell className="text-xs">{total24h}</TableCell>
                        <TableCell className="text-xs">£{spendMonth.toFixed(2)} / £{Number(a.monthly_budget_gbp).toFixed(2)}</TableCell>
                        <TableCell className="text-[10px] font-mono text-muted-foreground">{a.primary_model}{a.fallback_model ? ` → ${a.fallback_model}` : ""}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="business">
            <Card className="tech-card"><CardContent className="p-3">
              <Table>
                <TableHeader><TableRow><TableHead>Business / Asset ID</TableHead><TableHead>24h calls</TableHead><TableHead>Spend month</TableHead></TableRow></TableHeader>
                <TableBody>
                  {[...new Set(requests.map((r) => r.business_id).filter(Boolean))].map((bid) => {
                    const n24 = requests.filter((r) => r.business_id === bid && r.created_at >= since24h).length;
                    const spend = cost(monthRows.filter((r) => r.business_id === bid));
                    return (<TableRow key={bid}><TableCell className="font-mono text-[11px]">{bid}</TableCell><TableCell className="text-xs">{n24}</TableCell><TableCell className="text-xs">£{spend.toFixed(2)}</TableCell></TableRow>);
                  })}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="conversation">
            <Card className="tech-card"><CardContent className="p-3">
              <Table>
                <TableHeader><TableRow><TableHead>Channel</TableHead><TableHead>Title</TableHead><TableHead>Business</TableHead><TableHead>Classification</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
                <TableBody>
                  {conversations.slice(0, 50).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell><Badge variant="outline" className="text-[10px]">{c.channel}</Badge></TableCell>
                      <TableCell className="text-xs">{c.title ?? c.conversation_id}</TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground">{c.business_id ?? c.portfolio_asset_id ?? "—"}</TableCell>
                      <TableCell><Badge className="text-[10px]">{c.data_classification}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{c.status}</Badge></TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{new Date(c.updated_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="workflow">
            <Card className="tech-card"><CardContent className="p-3">
              <Table>
                <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Step</TableHead><TableHead>Started</TableHead><TableHead>Error</TableHead></TableRow></TableHeader>
                <TableBody>
                  {workflows.slice(0, 50).map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="text-xs">{w.workflow_type}</TableCell>
                      <TableCell><Badge variant={w.status === "failed" ? "destructive" : "outline"} className="text-[10px]">{w.status}</Badge></TableCell>
                      <TableCell className="text-xs">{w.current_step}/{w.total_steps}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{w.started_at ? new Date(w.started_at).toLocaleString() : "—"}</TableCell>
                      <TableCell className="text-[10px] text-destructive max-w-[280px] truncate">{w.error_message ?? ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="provider">
            <Card className="tech-card"><CardContent className="p-3 space-y-3">
              <div>
                <CardTitle className="text-sm mb-2">Errors by model (24h)</CardTitle>
                <Table>
                  <TableHeader><TableRow><TableHead>Model</TableHead><TableHead>Failures</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {errorsByModel.length === 0 ? (<TableRow><TableCell colSpan={2} className="text-xs text-muted-foreground">No failures.</TableCell></TableRow>)
                      : errorsByModel.map(([m, n]) => (<TableRow key={m}><TableCell className="text-[11px] font-mono">{m}</TableCell><TableCell className="text-xs">{n}</TableCell></TableRow>))}
                  </TableBody>
                </Table>
              </div>
              <div>
                <CardTitle className="text-sm mb-2">Provider events (24h)</CardTitle>
                <Table>
                  <TableHeader><TableRow><TableHead>Event</TableHead><TableHead>Severity</TableHead><TableHead>Message</TableHead><TableHead>When</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {providerErrorEvents.slice(0, 30).map((e, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{e.event_type}</TableCell>
                        <TableCell><Badge variant={e.severity === "error" || e.severity === "critical" ? "destructive" : "outline"} className="text-[10px]">{e.severity}</Badge></TableCell>
                        <TableCell className="text-[11px] text-muted-foreground max-w-[420px] truncate">{e.message ?? "—"}</TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-[11px] text-muted-foreground">Provider keys are never shown. Only event type and message are surfaced.</p>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="failed">
            <Card className="tech-card"><CardContent className="p-3">
              <div className="text-[11px] text-muted-foreground mb-2">
                Internal AI failures can be retried. External actions are never auto-retried — re-issue them via the originating workflow.
              </div>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Request</TableHead><TableHead>Agent</TableHead><TableHead>Risk</TableHead>
                  <TableHead>Model</TableHead><TableHead>Error</TableHead><TableHead>When</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {failed24h.slice(0, 50).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-[10px]">{r.request_id}</TableCell>
                      <TableCell className="text-xs">{agentName(r.agent_id)}</TableCell>
                      <TableCell><Badge variant={r.risk_level === "high" || r.risk_level === "critical" ? "destructive" : "outline"} className="text-[10px]">{r.risk_level}</Badge></TableCell>
                      <TableCell className="text-[10px] font-mono">{r.model}</TableCell>
                      <TableCell className="text-[11px] text-destructive max-w-[300px] truncate">{r.error_message ?? "—"}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => retryFailed(r)} disabled={!SAFE_RETRY_RISK.has(r.risk_level)}>
                            <RotateCw className="h-3 w-3 mr-1" /> Retry
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => dismissFailed(r)}>
                            <Check className="h-3 w-3 mr-1" /> Resolve
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="approval">
            <Card className="tech-card"><CardContent className="p-3">
              <Table>
                <TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Type</TableHead><TableHead>Agent</TableHead><TableHead>Risk</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
                <TableBody>
                  {waitingApproval.slice(0, 50).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-[10px]">{r.request_id}</TableCell>
                      <TableCell className="text-xs">{r.request_type}</TableCell>
                      <TableCell className="text-xs">{agentName(r.agent_id)}</TableCell>
                      <TableCell><Badge variant="destructive" className="text-[10px]">{r.risk_level}</Badge></TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-2 text-[11px] text-muted-foreground">Approve or reject in the Approvals page.</div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="cost">
            <Card className="tech-card"><CardContent className="p-3 space-y-3">
              <div>
                <CardTitle className="text-sm mb-2">Per-agent budgets</CardTitle>
                <Table>
                  <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Spend month</TableHead><TableHead>Monthly cap</TableHead><TableHead className="w-[160px]">Used</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {agents.map((a) => {
                      const spend = cost(monthRows.filter((r) => r.agent_id === a.id));
                      const cap = Number(a.monthly_budget_gbp ?? 0);
                      const pct = cap > 0 ? Math.min(100, Math.round((spend / cap) * 100)) : 0;
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-mono text-xs">{a.agent_name}</TableCell>
                          <TableCell className="text-xs">£{spend.toFixed(2)}</TableCell>
                          <TableCell className="text-xs">£{cap.toFixed(2)}</TableCell>
                          <TableCell><Progress value={pct} className="h-2" /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div>
                <CardTitle className="text-sm mb-2">Per-business budgets</CardTitle>
                {budgets.length === 0 ? (<p className="text-[11px] text-muted-foreground">No business budgets configured.</p>) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Business</TableHead><TableHead>Spend month</TableHead><TableHead>Cap</TableHead><TableHead className="w-[160px]">Used</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {budgets.map((b) => {
                        const spend = cost(monthRows.filter((r) => r.business_id === b.business_id));
                        const cap = Number(b.monthly_ai_budget ?? 0);
                        const pct = cap > 0 ? Math.min(100, Math.round((spend / cap) * 100)) : 0;
                        return (
                          <TableRow key={b.id ?? b.business_id}>
                            <TableCell className="font-mono text-[11px]">{b.business_id}</TableCell>
                            <TableCell className="text-xs">£{spend.toFixed(2)}</TableCell>
                            <TableCell className="text-xs">£{cap.toFixed(2)}</TableCell>
                            <TableCell><Progress value={pct} className="h-2" /></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">When a cap is exceeded, non-critical AI is paused; high-priority safety/compliance jobs continue and are flagged in bottlenecks.</p>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="bypass">
            <Card className="tech-card"><CardContent className="p-3">
              <p className="text-[11px] text-muted-foreground mb-2">{bypassCount} edge functions still call the gateway directly (Batch B + C of the AI Gateway Bypass Audit).</p>
              <Button asChild size="sm" variant="outline"><Link to="/founder/portfolio-exit/ai-bypass-register">Open full Bypass Register</Link></Button>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="leases">
            <Card className="tech-card"><CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-[11px] text-muted-foreground max-w-3xl">
                  Strict concurrency is enforced atomically in Postgres. Each AI call acquires a lease per agent and per business (TTL 180s) and releases it on completion, failure or timeout. Stale leases are swept automatically.
                </div>
                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={cleanupStaleLeases}>
                  <RotateCw className="h-3 w-3 mr-1" /> Sweep stale leases
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <StatCard icon={ShieldCheck} label="Active" v={activeLeases.length} />
                <StatCard icon={AlertTriangle} label="Expired 24h" v={expiredLeases.length} accent={expiredLeases.length ? "amber" : undefined} />
                <StatCard icon={Cpu} label="Distinct agents" v={new Set(activeLeases.map((l) => l.agent_id).filter(Boolean)).size} />
                <StatCard icon={Cpu} label="Distinct businesses" v={new Set(activeLeases.map((l) => l.business_id).filter(Boolean)).size} />
              </div>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Scope</TableHead><TableHead>Request</TableHead><TableHead>Agent</TableHead><TableHead>Business</TableHead>
                  <TableHead>Model</TableHead><TableHead>Status</TableHead><TableHead>Acquired</TableHead><TableHead>Expires</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {leases.slice(0, 80).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-[10px] font-mono">{l.lease_key}</TableCell>
                      <TableCell className="text-[10px] font-mono">{l.request_id}</TableCell>
                      <TableCell className="text-xs">{agentName(l.agent_id)}</TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground">{l.business_id ?? "—"}</TableCell>
                      <TableCell className="text-[10px] font-mono">{l.model ?? "—"}</TableCell>
                      <TableCell><Badge variant={l.status === "expired" ? "destructive" : l.status === "active" ? "outline" : "secondary"} className="text-[10px]">{l.status}</Badge></TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{new Date(l.acquired_at).toLocaleTimeString()}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{new Date(l.expires_at).toLocaleTimeString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="cost-accuracy">
            <Card className="tech-card"><CardContent className="p-3 space-y-3">
              <div className="text-[11px] text-muted-foreground max-w-3xl">
                Every gateway call is tagged with a <code>cost_basis</code>: <code>actual_tokens</code> (exact provider usage), <code>provider_reported</code>, <code>streaming_estimate</code> (token count not returned by stream), <code>estimated_tokens</code>, <code>pricing_missing</code>, or <code>manual_estimate</code>. Estimated rows are flagged so dashboards never silently overstate accuracy.
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(requestsByBasis).map(([k, v]) => (<StatCard key={k} icon={Activity} label={`Basis: ${k}`} v={v} />))}
              </div>
              <div>
                <CardTitle className="text-sm mb-2">Models missing pricing</CardTitle>
                {modelsMissingPricing.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">All observed models have an active pricing row.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {modelsMissingPricing.map((m) => (
                      <code key={m} className="text-[10px] px-2 py-0.5 rounded border border-amber-500/30 text-amber-300 bg-amber-500/5">{m}</code>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <CardTitle className="text-sm mb-2">Active pricing registry ({pricingRows.length} rows)</CardTitle>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Model</TableHead><TableHead>In / 1M</TableHead><TableHead>Out / 1M</TableHead>
                    <TableHead>Currency</TableHead><TableHead>Confidence</TableHead><TableHead>Source</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {pricingRows.slice(0, 50).map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-[11px]">{p.model_name}</TableCell>
                        <TableCell className="text-xs">{Number(p.input_cost_per_1m_tokens).toFixed(3)}</TableCell>
                        <TableCell className="text-xs">{Number(p.output_cost_per_1m_tokens).toFixed(3)}</TableCell>
                        <TableCell className="text-[10px]">{p.currency}</TableCell>
                        <TableCell>
                          <Badge variant={p.confidence === "verified" ? "outline" : "secondary"} className={`text-[10px] ${p.confidence === "estimated" ? "border-amber-500/30 text-amber-300" : ""}`}>
                            {p.confidence}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">{p.pricing_source ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {estimatedModels.size} model(s) currently use <span className="text-amber-300">estimated</span> rates. Verified rates can be entered in the Provider Pricing page.
                </p>
              </div>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
}

function StatCard({ icon: Icon, label, v, accent }: { icon: any; label: string; v: number | string; accent?: string }) {
  const cls = accent === "destructive" ? "text-destructive" : accent === "amber" ? "text-amber-400" : "text-foreground";
  return (
    <Card className="tech-card"><CardContent className="p-3">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"><Icon className="h-3 w-3" /> {label}</div>
      <div className={`text-2xl font-semibold mt-1 ${cls}`}>{v}</div>
    </CardContent></Card>
  );
}