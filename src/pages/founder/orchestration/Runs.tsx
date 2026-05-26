import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { OrchLayout } from "./_shared";
import { STATUS_TONE, type WorkflowRun, type WorkflowStepRun } from "@/lib/eventBusEngine";

export default function OrchestrationRuns() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [steps, setSteps] = useState<Record<string, WorkflowStepRun[]>>({});

  const reload = async () => {
    const { data: rs } = await (supabase as any).from("workflow_runs").select("*").order("created_at",{ ascending: false }).limit(50);
    const list = (rs ?? []) as WorkflowRun[];
    setRuns(list);
    const ids = list.map(r=>r.id);
    if (ids.length) {
      const { data: ss } = await (supabase as any).from("workflow_step_runs").select("*").in("workflow_run_id", ids).order("step_order");
      const byRun: Record<string, WorkflowStepRun[]> = {};
      for (const s of (ss ?? []) as WorkflowStepRun[]) (byRun[s.workflow_run_id] ||= []).push(s);
      setSteps(byRun);
    }
  };
  useEffect(() => { reload(); }, []);

  const setStatus = async (id: string, run_status: WorkflowRun["run_status"]) => {
    await (supabase as any).from("workflow_runs").update({ run_status }).eq("id", id);
    reload();
  };

  return (
    <OrchLayout title="Workflow Run History">
      {runs.length===0 && <p className="text-xs text-muted-foreground">No runs yet.</p>}
      {runs.map(r => (
        <Card key={r.id} className="tech-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Badge variant="outline" className={`text-[10px] ${STATUS_TONE[r.run_status]}`}>{r.run_status}</Badge>
              <code className="text-[11px]">{r.workflow_definition_id.slice(0,8)}</code>
              <span className="text-muted-foreground text-[10px] ml-auto">{new Date(r.created_at).toLocaleString()}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {r.failure_reason && <div className="text-[11px] text-rose-300">{r.failure_reason}</div>}
            <div className="space-y-1">
              {(steps[r.id] ?? []).map(s => (
                <div key={s.id} className="text-[11px] flex items-start gap-2 border-l-2 border-border pl-2">
                  <Badge variant="outline" className={`text-[10px] ${STATUS_TONE[s.step_status]}`}>{s.step_status}</Badge>
                  <div className="flex-1">
                    <span className="font-medium">{s.step_order+1}. {s.step_name}</span>
                    <span className="text-muted-foreground"> → {s.target_module ?? "—"}</span>
                    {s.output_summary && <div className="text-muted-foreground">{s.output_summary}</div>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" disabled={r.run_status==="cancelled"} onClick={()=>setStatus(r.id, "cancelled")}>Cancel</Button>
              <Button size="sm" variant="outline" disabled={r.run_status==="cancelled"} onClick={()=>setStatus(r.id, "queued")}>Park / requeue</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </OrchLayout>
  );
}