import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Workflow, AlertTriangle, Users, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function priorityVariant(p: string) {
  if (p === "high" || p === "critical") return "destructive";
  if (p === "low") return "outline";
  return "secondary";
}

export default function AgentHandoverProtocolPanel() {
  const [busy, setBusy] = useState(false);
  const [dryResult, setDryResult] = useState<any>(null);

  const { data: rules } = useQuery({
    queryKey: ["agent_handover_rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_handover_rules").select("*").order("rule_key");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: log, refetch } = useQuery({
    queryKey: ["agent_handover_log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_handover_log")
        .select("*").order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const stuck = (log ?? []).filter((h: any) => h.status === "blocked");
  const tasksCreated = (log ?? []).filter((h: any) => h.task_id).length;

  const workload: Record<string, number> = {};
  for (const h of log ?? []) {
    workload[h.to_agent_key] = (workload[h.to_agent_key] ?? 0) + 1;
  }

  async function dryRunFirstRule() {
    if (!rules?.length) return;
    setBusy(true);
    try {
      const r = rules[0];
      const { data, error } = await supabase.functions.invoke("agent-handover-orchestrator", {
        body: { rule_key: r.rule_key, dry_run: true, summary: "Dry-run test" },
      });
      if (error) throw error;
      setDryResult(data);
      await refetch();
    } catch (e: any) {
      setDryResult({ error: String(e?.message ?? e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="tech-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" /> Agent-to-Agent Handover Protocol
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Coordinated AI team. Internal task creation only — no external send.
          </p>
        </CardHeader>
        <CardContent>
          <Button size="sm" variant="outline" onClick={dryRunFirstRule} disabled={busy}>
            <Play className="h-3 w-3 mr-1" /> Dry-run orchestrator
          </Button>
          {dryResult && (
            <div className="mt-2 rounded border bg-muted/30 p-2 text-xs">
              {dryResult.error
                ? <span className="text-destructive">{dryResult.error}</span>
                : <span>Matched {dryResult.matched} rule(s); dry-run · no external action.</span>}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="tech-card">
          <CardHeader>
            <CardTitle className="text-base">Handover rules ({rules?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {(rules ?? []).map((r: any) => (
              <div key={r.id} className="rounded border p-2 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{r.rule_key}</span>
                  <Badge variant={priorityVariant(r.priority_level) as any}>{r.priority_level}</Badge>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span>{r.from_agent_key}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span>{r.to_agent_key}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">{r.trigger_event}</Badge>
                  <Badge variant="outline">{r.handover_type}</Badge>
                  {r.founder_review_required && <Badge variant="secondary">founder review</Badge>}
                  {!r.enabled && <Badge variant="destructive">disabled</Badge>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle className="text-base">Recent handovers ({log?.length ?? 0})</CardTitle>
            <p className="text-xs text-muted-foreground">Tasks created: {tasksCreated}</p>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {(log ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">No handovers yet.</p>
            )}
            {(log ?? []).map((h: any) => (
              <div key={h.id} className="rounded border p-2 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span>
                    {h.from_agent_key} <ArrowRight className="inline h-3 w-3" /> {h.to_agent_key}
                  </span>
                  <Badge variant={h.status === "blocked" ? "destructive" : "default"}>{h.status}</Badge>
                </div>
                <div className="text-muted-foreground">
                  {h.trigger_event} · {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}
                </div>
                {h.task_id && <Badge variant="outline">task queued</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Stuck handovers ({stuck.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {stuck.length === 0 && <p className="text-xs text-muted-foreground">None.</p>}
            {stuck.map((h: any) => (
              <div key={h.id} className="rounded border p-2 text-xs">
                {h.rule_key ?? `${h.from_agent_key} → ${h.to_agent_key}`}
                <div className="text-muted-foreground">
                  Missing: {((h.context_payload?.missing_context ?? []) as string[]).join(", ") || "—"}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Agent workload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            {Object.keys(workload).length === 0 && (
              <p className="text-muted-foreground">No active workload.</p>
            )}
            {Object.entries(workload)
              .sort((a, b) => b[1] - a[1])
              .map(([agent, n]) => (
                <div key={agent} className="flex justify-between border-b py-1">
                  <span>{agent}</span>
                  <Badge variant="outline">{n}</Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}