import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { OrchLayout } from "./_shared";
import { STATUS_TONE, type WorkflowFailureEvent } from "@/lib/eventBusEngine";

export default function OrchestrationFailures() {
  const [rows, setRows] = useState<WorkflowFailureEvent[]>([]);
  const reload = async () => {
    const { data } = await (supabase as any).from("workflow_failure_events").select("*").order("created_at",{ ascending: false }).limit(100);
    setRows((data ?? []) as WorkflowFailureEvent[]);
  };
  useEffect(() => { reload(); }, []);
  const setStatus = async (id: string, status: WorkflowFailureEvent["status"]) => {
    await (supabase as any).from("workflow_failure_events").update({ status }).eq("id", id);
    reload();
  };
  return (
    <OrchLayout title="Failed Workflow Board">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Open failures ({rows.filter(r=>r.status==="open").length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {rows.length===0 && <p className="text-xs text-muted-foreground">No failures recorded.</p>}
          {rows.map(r => (
            <div key={r.id} className="text-xs border border-border rounded-md p-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[10px] ${STATUS_TONE[r.status]}`}>{r.status}</Badge>
                <Badge variant="outline" className="text-[10px] border-border">{r.failure_type}</Badge>
                <Badge variant="outline" className={`text-[10px] ${r.severity==="critical"?"bg-rose-500/15 text-rose-400 border-rose-500/30":r.severity==="high"?"bg-amber-500/15 text-amber-400 border-amber-500/30":""}`}>{r.severity}</Badge>
                <span className="text-muted-foreground text-[10px] ml-auto">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <div className="font-medium mt-1">{r.failure_summary}</div>
              {r.recommended_action && <div className="text-muted-foreground text-[11px]">Recommend: {r.recommended_action}</div>}
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" disabled={r.status!=="open"} onClick={()=>setStatus(r.id, "acknowledged")}>Acknowledge</Button>
                <Button size="sm" variant="outline" disabled={r.status==="resolved"} onClick={()=>setStatus(r.id, "resolved")}>Resolve</Button>
                <Button size="sm" variant="outline" disabled={r.status==="ignored"} onClick={()=>setStatus(r.id, "ignored")}>Ignore</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </OrchLayout>
  );
}