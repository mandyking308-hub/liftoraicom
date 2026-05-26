import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { OrchLayout } from "./_shared";
import type { WorkflowDefinition } from "@/lib/eventBusEngine";

export default function OrchestrationWorkflows() {
  const [rows, setRows] = useState<WorkflowDefinition[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("workflow_definitions").select("*").order("workflow_name");
      setRows((data ?? []) as WorkflowDefinition[]);
    })();
  }, []);
  return (
    <OrchLayout title="Workflow Definitions">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Library ({rows.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {rows.map(r => (
            <div key={r.id} className="text-xs border border-border rounded-md p-3 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{r.workflow_name}</span>
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10">{r.workflow_category}</Badge>
                {r.external_action_possible && (
                  <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/30">external steps gated</Badge>
                )}
                {!r.active && <Badge variant="outline" className="text-[10px]">inactive</Badge>}
              </div>
              <div className="text-muted-foreground text-[11px]">
                <code className="text-[10px]">{r.workflow_code}</code> · trigger <code className="text-[10px]">{r.trigger_event_type}</code>
              </div>
              {r.description && <div className="text-muted-foreground">{r.description}</div>}
              <div className="flex flex-wrap gap-1 pt-1">
                {(r.steps as any[]).map((s,i)=>(
                  <Badge key={i} variant="outline" className={`text-[10px] ${s.external?"bg-amber-500/15 text-amber-400 border-amber-500/30":"border-border"}`}>
                    {i+1}. {s.name}{s.external?" · ext":""}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </OrchLayout>
  );
}