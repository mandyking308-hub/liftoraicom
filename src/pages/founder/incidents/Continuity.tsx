import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { INCLayout, INCSection, INCEmpty } from "./_shared";
import { Badge } from "@/components/ui/badge";

type Plan = { id: string; plan_name: string; scenario: string | null; fallback_steps: any; critical_contacts: any; critical_systems: string[]; last_tested_at: string | null; active: boolean };

export default function IncidentsContinuity() {
  const [plans, setPlans] = useState<Plan[]>([]);
  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const { data } = await sb.from("continuity_plans").select("*").order("created_at", { ascending: false });
      setPlans(data ?? []);
    })();
  }, []);

  return (
    <INCLayout title="Continuity plans" subtitle="Pre-approved fallback scenarios: provider outage, AI failure, data loss, payment failure. Plans live here; execution still requires founder action.">
      <INCSection title={`Plans (${plans.length})`}>
        {plans.length === 0 ? <INCEmpty title="No continuity plans yet" hint="Add a plan per critical scenario (provider outage, AI provider down, payment failure, data restore, key staff unavailable)." /> : (
          <div className="space-y-2">
            {plans.map(p => {
              const steps = Array.isArray(p.fallback_steps) ? p.fallback_steps : [];
              const contacts = Array.isArray(p.critical_contacts) ? p.critical_contacts : [];
              const stale = p.last_tested_at ? (Date.now() - new Date(p.last_tested_at).getTime()) > 90 * 86400000 : true;
              return (
                <div key={p.id} className="rounded border border-border/50 p-3 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{p.plan_name}</span>
                    {p.active
                      ? <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">active</Badge>
                      : <Badge variant="outline" className="text-[10px]">inactive</Badge>}
                    {stale && p.active && <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">test overdue</Badge>}
                  </div>
                  {p.scenario && <p className="text-xs text-muted-foreground">Scenario: {p.scenario}</p>}
                  <p className="text-[11px] text-muted-foreground">
                    {steps.length} fallback step(s) · {contacts.length} critical contact(s) · {p.critical_systems?.length ?? 0} system(s)
                    {p.last_tested_at ? ` · last tested ${new Date(p.last_tested_at).toLocaleDateString()}` : " · never tested"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </INCSection>
    </INCLayout>
  );
}