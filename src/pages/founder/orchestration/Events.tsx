import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_TONE, type LiftorEvent } from "@/lib/eventBusEngine";
import { OrchLayout } from "./_shared";

export default function OrchestrationEvents() {
  const [rows, setRows] = useState<LiftorEvent[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("liftor_events").select("*").order("created_at",{ ascending: false }).limit(100);
      setRows((data ?? []) as LiftorEvent[]);
    })();
  }, []);
  return (
    <OrchLayout title="Event Stream">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent events ({rows.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {rows.length===0 && <p className="text-xs text-muted-foreground">No events yet.</p>}
          {rows.map(r => (
            <div key={r.id} className="text-xs border border-border rounded-md p-2 flex items-start gap-2">
              <Badge variant="outline" className={`${STATUS_TONE[r.event_status]} text-[10px]`}>{r.event_status}</Badge>
              <div className="flex-1">
                <div className="font-medium">{r.event_type} <span className="text-muted-foreground">· {r.event_category}</span></div>
                <div className="text-[10px] text-muted-foreground">{r.source_module} · {new Date(r.created_at).toLocaleString()}</div>
              </div>
              {r.is_test_data && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">test</Badge>}
            </div>
          ))}
        </CardContent>
      </Card>
    </OrchLayout>
  );
}