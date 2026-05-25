import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { INCLayout, INCSection, INCEmpty } from "./_shared";
import { Badge } from "@/components/ui/badge";

type PM = { id: string; incident_id: string; root_cause_summary: string | null; impact_summary: string | null; what_worked: string | null; what_failed: string | null; corrective_actions: any; owner: string | null; completed_at: string | null; created_at: string };

export default function IncidentsPostmortems() {
  const [pms, setPms] = useState<PM[]>([]);
  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const { data } = await sb.from("incident_postmortems").select("*").order("created_at", { ascending: false });
      setPms(data ?? []);
    })();
  }, []);

  const open = pms.filter(p => !p.completed_at);
  const done = pms.filter(p => p.completed_at);

  return (
    <INCLayout title="Postmortems" subtitle="Root cause, impact, what worked, what failed and corrective actions. The Incident Agent drafts; founder reviews and approves before publishing internally.">
      <INCSection title={`Open postmortems (${open.length})`}>
        {open.length === 0 ? <INCEmpty title="No postmortems in progress" /> : <PMList pms={open} />}
      </INCSection>
      <INCSection title={`Completed (${done.length})`}>
        {done.length === 0 ? <INCEmpty title="No completed postmortems yet" /> : <PMList pms={done} />}
      </INCSection>
    </INCLayout>
  );
}

function PMList({ pms }: { pms: PM[] }) {
  return (
    <div className="space-y-2">
      {pms.map(p => {
        const actions = Array.isArray(p.corrective_actions) ? p.corrective_actions : [];
        return (
          <div key={p.id} className="rounded border border-border/50 p-3 space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-muted-foreground">incident {p.incident_id.slice(0, 8)}</span>
              {p.completed_at
                ? <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">completed</Badge>
                : <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">draft</Badge>}
              {p.owner && <span className="text-muted-foreground">· {p.owner}</span>}
            </div>
            {p.root_cause_summary && <p className="text-xs"><span className="text-muted-foreground">Root cause: </span>{p.root_cause_summary}</p>}
            {p.impact_summary && <p className="text-xs"><span className="text-muted-foreground">Impact: </span>{p.impact_summary}</p>}
            {actions.length > 0 && <p className="text-[11px] text-muted-foreground">{actions.length} corrective action(s) tracked</p>}
          </div>
        );
      })}
    </div>
  );
}