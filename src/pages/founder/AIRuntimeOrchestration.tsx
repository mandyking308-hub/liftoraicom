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
import { Activity, Cpu, AlertTriangle } from "lucide-react";

const sb: any = supabase;

type Req = {
  request_id: string; conversation_id: string | null; agent_id: string | null;
  business_id: string | null; request_type: string; provider: string; model: string;
  risk_level: string; approval_required: boolean; status: string; priority: number;
  created_at: string; started_at: string | null; completed_at: string | null;
  error_message: string | null; prompt_tokens: number | null; completion_tokens: number | null;
  actual_cost_gbp: number | null; estimated_cost_gbp: number | null;
};

type Agent = {
  id: string; agent_name: string; agent_type: string; max_concurrency: number;
  status: string; monthly_budget_gbp: number; daily_run_limit: number;
};

type Conv = {
  conversation_id: string; channel: string; status: string; updated_at: string;
  business_id: string | null; agent_id: string | null;
};

export default function AIRuntimeOrchestration() {
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const { data: reqs = [] } = useQuery<Req[]>({
    queryKey: ["ai_gateway_requests_recent"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await sb
        .from("ai_gateway_requests")
        .select("*")
        .gte("created_at", since24h)
        .order("created_at", { ascending: false })
        .limit(500);
      return data ?? [];
    },
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["ai_agent_registry"],
    refetchInterval: 60000,
    queryFn: async () => {
      const { data } = await sb.from("ai_agent_registry").select("*").order("agent_name");
      return data ?? [];
    },
  });

  const { data: convs = [] } = useQuery<Conv[]>({
    queryKey: ["ai_conversations_active"],
    refetchInterval: 60000,
    queryFn: async () => {
      const { data } = await sb
        .from("ai_conversations")
        .select("conversation_id,channel,status,updated_at,business_id,agent_id")
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const counts = {
    active: reqs.filter((r) => r.status === "running").length,
    queued: reqs.filter((r) => r.status === "queued").length,
    waiting: reqs.filter((r) => r.status === "waiting_approval").length,
    failed: reqs.filter((r) => r.status === "failed").length,
    completed: reqs.filter((r) => r.status === "completed").length,
    cancelled: reqs.filter((r) => r.status === "cancelled").length,
  };

  const byAgent = aggregate(reqs, (r) => r.agent_id ?? "—");
  const byBusiness = aggregate(reqs, (r) => r.business_id ?? "—");
  const byModel = aggregate(reqs, (r) => r.model);

  const costToday = reqs
    .filter((r) => r.status === "completed")
    .reduce((s, r) => s + (Number(r.actual_cost_gbp ?? r.estimated_cost_gbp ?? 0)), 0);

  // Concurrency utilisation: per active agent, running / max_concurrency.
  const utilisation = agents.map((a) => {
    const running = reqs.filter((r) => r.agent_id === a.id && (r.status === "running" || r.status === "queued")).length;
    const pct = a.max_concurrency > 0 ? Math.round((running / a.max_concurrency) * 100) : 0;
    return { ...a, running, pct };
  });
  const bottlenecks = utilisation.filter((u) => u.pct >= 80 && u.status === "active");

  return (
    <FounderLayout>
      <div className="space-y-4 max-w-[1400px]">
        <AICostBreadcrumb page="AI Runtime & Orchestration" description="Live runtime, queue depth, agent concurrency and bottlenecks for every AI call." />
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Cpu className="h-7 w-7 text-primary" /> AI Runtime &amp; Orchestration
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              One governance layer — many parallel conversations. Concurrency is controlled per agent, per business and per model, not by a global lock.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/founder/ai-cost">AI Cost Governor</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/founder/ai-cost/approvals">Approval Queue</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/founder/ai-cost/ledger">AI Usage Ledger</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/founder/portfolio-exit/ai-bypass-register">Bypass Register</Link></Button>
          </div>
        </div>

        <Alert>
          <Activity className="h-4 w-4" />
          <AlertTitle>Live — multi-conversation runtime</AlertTitle>
          <AlertDescription className="text-xs">
            Internal AI runs live without approval. Only external/sensitive actions wait for founder approval. Idempotency keys prevent duplicate jobs; retries use fallback models where configured.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Stat label="Running" v={counts.active} />
          <Stat label="Queued" v={counts.queued} />
          <Stat label="Waiting approval" v={counts.waiting} accent="amber" />
          <Stat label="Failed (24h)" v={counts.failed} accent={counts.failed > 0 ? "destructive" : undefined} />
          <Stat label="Completed (24h)" v={counts.completed} />
          <Stat label="Cost (24h)" v={`£${costToday.toFixed(2)}`} />
        </div>

        {bottlenecks.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Concurrency pressure on {bottlenecks.length} agent(s)</AlertTitle>
            <AlertDescription className="text-xs">
              {bottlenecks.map((b) => `${b.agent_name} ${b.pct}%`).join(", ")} — raise max_concurrency or add fallback model.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="tech-card">
            <CardHeader>
              <CardTitle>Agent concurrency utilisation</CardTitle>
              <CardDescription>running + queued vs max_concurrency.</CardDescription>
            </CardHeader>
            <CardContent>
              {utilisation.length === 0 ? (
                <p className="text-xs text-muted-foreground">No agents registered yet. Add agents to ai_agent_registry to enforce per-agent limits.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Agent</TableHead><TableHead>Type</TableHead>
                    <TableHead>Status</TableHead><TableHead>Running</TableHead>
                    <TableHead>Max</TableHead><TableHead>Utilisation</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {utilisation.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-xs">{u.agent_name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{u.agent_type}</Badge></TableCell>
                        <TableCell><Badge variant={u.status === "active" ? "outline" : "destructive"} className="text-[10px]">{u.status}</Badge></TableCell>
                        <TableCell className="text-xs">{u.running}</TableCell>
                        <TableCell className="text-xs">{u.max_concurrency}</TableCell>
                        <TableCell>
                          <Badge variant={u.pct >= 80 ? "destructive" : "outline"} className="text-[10px]">{u.pct}%</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="tech-card">
            <CardHeader>
              <CardTitle>Active conversations</CardTitle>
              <CardDescription>Logical AI threads. Many run in parallel without context leak.</CardDescription>
            </CardHeader>
            <CardContent>
              {convs.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active conversations yet. They appear as edge functions populate ai_conversations.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Conversation</TableHead><TableHead>Channel</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {convs.map((c) => (
                      <TableRow key={c.conversation_id}>
                        <TableCell className="font-mono text-[11px]">{c.conversation_id.slice(0, 18)}…</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{c.channel}</Badge></TableCell>
                        <TableCell className="text-xs">{new Date(c.updated_at).toLocaleString()}</TableCell>
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
            <CardTitle>Recent requests (24h)</CardTitle>
            <CardDescription>Most recent 50 — full ledger in the AI Usage Ledger.</CardDescription>
          </CardHeader>
          <CardContent>
            {reqs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No requests recorded in the last 24h. Once migrated edge functions use callAIGateway they appear here in real time.</p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Time</TableHead><TableHead>Type</TableHead><TableHead>Model</TableHead>
                  <TableHead>Risk</TableHead><TableHead>Status</TableHead>
                  <TableHead>Tokens</TableHead><TableHead>Error</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {reqs.slice(0, 50).map((r) => (
                    <TableRow key={r.request_id}>
                      <TableCell className="text-[11px]">{new Date(r.created_at).toLocaleTimeString()}</TableCell>
                      <TableCell className="text-xs">{r.request_type}</TableCell>
                      <TableCell className="text-[11px] font-mono">{r.model}</TableCell>
                      <TableCell><Badge variant={r.risk_level === "high" || r.risk_level === "critical" ? "destructive" : "outline"} className="text-[10px]">{r.risk_level}</Badge></TableCell>
                      <TableCell><Badge variant={r.status === "failed" ? "destructive" : "outline"} className="text-[10px]">{r.status}</Badge></TableCell>
                      <TableCell className="text-[11px]">{(r.prompt_tokens ?? 0) + (r.completion_tokens ?? 0) || "—"}</TableCell>
                      <TableCell className="text-[11px] text-muted-foreground max-w-[220px] truncate">{r.error_message ?? ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <BreakdownCard title="By agent" rows={byAgent} />
          <BreakdownCard title="By business" rows={byBusiness} />
          <BreakdownCard title="By model" rows={byModel} />
        </div>
      </div>
    </FounderLayout>
  );
}

function aggregate(reqs: Req[], key: (r: Req) => string) {
  const m = new Map<string, number>();
  for (const r of reqs) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  return Array.from(m.entries()).map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v).slice(0, 10);
}

function Stat({ label, v, accent }: { label: string; v: number | string; accent?: string }) {
  const cls = accent === "destructive" ? "text-destructive" : accent === "amber" ? "text-amber-400" : "text-foreground";
  return (
    <Card className="tech-card"><CardContent className="p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${cls}`}>{v}</div>
    </CardContent></Card>
  );
}

function BreakdownCard({ title, rows }: { title: string; rows: { k: string; v: number }[] }) {
  return (
    <Card className="tech-card">
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data yet.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {rows.map((r) => (
              <li key={r.k} className="flex justify-between gap-2">
                <span className="font-mono truncate max-w-[200px]">{r.k}</span>
                <span className="text-muted-foreground">{r.v}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}