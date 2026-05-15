import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Workflow, ShieldCheck, RefreshCw } from "lucide-react";

type Sample = {
  task_type: string;
  task_title: string;
  agent_key: string;
  priority_level: string;
  source_table?: string;
  recommended_action: string;
  blockers: string[];
};

type PreviewResp = {
  ok: boolean;
  queue_enabled: boolean;
  queue_status: string;
  total_proposed: number;
  by_agent: Record<string, number>;
  by_priority: Record<string, number>;
  by_type: Record<string, number>;
  sample: Sample[];
};

const priorityClass: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  normal: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  low: "bg-muted text-muted-foreground",
};

export default function AIAgentOrchestratorPanel() {
  const { data: types } = useQuery({
    queryKey: ["ai-agent-task-types"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_agent_task_types").select("*").order("task_type");
      return data ?? [];
    },
  });

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["ai-agent-orchestrator-preview"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-agent-orchestrator-preview", { body: {} });
      if (error) throw error;
      return data as PreviewResp;
    },
  });

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Workflow size={18} className="text-primary" /> AI Agent Orchestrator (preview)
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase bg-green-500/10 text-green-400 border-green-500/30">
            <ShieldCheck size={10} className="mr-1" /> No-Send · No-Apollo · No-Smartlead-POST
          </Badge>
          <Badge variant="outline" className={`text-[10px] uppercase ${data?.queue_enabled ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"}`}>
            queue {data?.queue_status ?? "disabled"}
          </Badge>
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading orchestrator preview…</p>}

        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Total proposed</p>
                <p className="text-2xl font-semibold">{data.total_proposed}</p>
              </div>
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Task types</p>
                <p className="text-2xl font-semibold">{(types ?? []).length}</p>
              </div>
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Agents involved</p>
                <p className="text-2xl font-semibold">{Object.keys(data.by_agent).length}</p>
              </div>
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Queue writes</p>
                <p className="text-2xl font-semibold">0</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium mb-1">Tasks by agent</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(data.by_agent).map(([k, v]) => (
                    <Badge key={k} variant="outline" className="text-[10px]">{k}: {v}</Badge>
                  ))}
                  {Object.keys(data.by_agent).length === 0 && <span className="text-[11px] text-muted-foreground">—</span>}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium mb-1">Tasks by priority</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(data.by_priority).map(([k, v]) => (
                    <Badge key={k} variant="outline" className={`text-[10px] ${priorityClass[k] ?? ""}`}>{k}: {v}</Badge>
                  ))}
                  {Object.keys(data.by_priority).length === 0 && <span className="text-[11px] text-muted-foreground">—</span>}
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium mb-1">Sample tasks (preview only)</p>
              <div className="max-h-72 overflow-y-auto space-y-1">
                {data.sample.slice(0, 30).map((t, i) => (
                  <div key={i} className="rounded border border-border/40 p-2 text-[11px] bg-card/40">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{t.task_title}</span>
                      <Badge variant="outline" className={`text-[10px] ${priorityClass[t.priority_level] ?? ""}`}>{t.priority_level}</Badge>
                    </div>
                    <div className="text-muted-foreground mt-0.5">
                      {t.task_type} · agent: {t.agent_key} · src: {t.source_table ?? "—"}
                    </div>
                    <div className="text-foreground/80 mt-0.5">→ {t.recommended_action}</div>
                    {t.blockers.length > 0 && (
                      <div className="text-red-400 mt-0.5">Blockers: {t.blockers.join(", ")}</div>
                    )}
                  </div>
                ))}
                {data.sample.length === 0 && <p className="text-[11px] text-muted-foreground">No tasks proposed.</p>}
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground border-t border-border/30 pt-2">
              Future execution path: enable <code>AI_AGENT_TASK_QUEUE_ENABLED=true</code> + send phrase
              <code className="mx-1">"QUEUE AI AGENT TASKS"</code> with <code>dry_run=false</code> to write into
              <code className="mx-1">ai_agent_task_queue</code>. Even when enabled, the writer touches no
              operational tables, sends no email, and makes no provider POSTs.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}