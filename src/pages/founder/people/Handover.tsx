import { useEffect, useState } from "react";
import { PPLLayout, PPLSection, PPLEmpty, PPL_ROLE_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function PeopleHandover() {
  const [ops, setOps] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("human_operators")
      .select("id,name,role_type,status,primary_responsibilities,escalation_rules,working_hours,timezone")
      .in("status", ["active", "paused"]).order("name").limit(200)
      .then(({ data }: any) => setOps(data ?? []));
  }, []);
  return (
    <PPLLayout title="Handover notes" subtitle="Continuity notes per operator so any backup or replacement can pick up the work. Drafted by the Human Oversight Agent and refined by the founder.">
      <PPLSection title="Per-operator handover">
        {!ops ? <p className="text-xs text-muted-foreground">Loading…</p>
          : ops.length === 0 ? <PPLEmpty title="No active operators" hint="Add operators on the Operators page first." />
          : (
            <div className="space-y-2">
              {ops.map((o) => (
                <div key={o.id} className="rounded border border-border/40 p-3 text-xs space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{o.name}</span>
                    <Badge variant="outline" className={PPL_ROLE_TONE[o.role_type] || ""}>{o.role_type}</Badge>
                    <Badge variant="outline">{o.status}</Badge>
                  </div>
                  <p className="text-muted-foreground"><span className="text-foreground">Coverage: </span>{o.timezone || "—"} · {o.working_hours || "hours not set"}</p>
                  <p className="text-muted-foreground"><span className="text-foreground">Responsibilities: </span>{o.primary_responsibilities || "—"}</p>
                  <p className="text-muted-foreground"><span className="text-foreground">Escalation: </span>{o.escalation_rules || "—"}</p>
                </div>
              ))}
            </div>
          )}
      </PPLSection>
    </PPLLayout>
  );
}