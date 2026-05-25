import { useEffect, useState } from "react";
import { PPLLayout, PPLSection, PPLEmpty, PPL_ROLE_TONE, PPL_STATUS_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function PeopleOperators() {
  const [ops, setOps] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("human_operators")
      .select("*").order("name").limit(200)
      .then(({ data }: any) => setOps(data ?? []));
  }, []);
  return (
    <PPLLayout title="Operators" subtitle="Roster of every human helper. Status, role, NDA and contract are tracked here. Inviting or onboarding a new operator requires founder approval before any external email is sent.">
      <PPLSection title="Roster" description="All operators across founder, VA, agency, contractor, adviser, employee and backup roles.">
        {!ops ? <p className="text-xs text-muted-foreground">Loading…</p>
          : ops.length === 0 ? <PPLEmpty title="No operators yet" hint="Operators added here are not invited until you approve the invite from the Approval Queue." />
          : (
            <div className="space-y-2">
              {ops.map((o) => (
                <div key={o.id} className="rounded border border-border/40 p-3 text-xs space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{o.name}</span>
                    <Badge variant="outline" className={PPL_ROLE_TONE[o.role_type] || ""}>{o.role_type}</Badge>
                    <Badge variant="outline" className={PPL_STATUS_TONE[o.status] || ""}>{o.status}</Badge>
                    {o.organisation && <Badge variant="outline">{o.organisation}</Badge>}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-muted-foreground">
                    <span>Email: {o.email || "—"}</span>
                    <span>Timezone: {o.timezone || "—"}</span>
                    <span>Hours: {o.working_hours || "—"}</span>
                    <span>NDA: {o.nda_status} · Contract: {o.contract_status}</span>
                  </div>
                  {o.primary_responsibilities && <p className="text-muted-foreground"><span className="text-foreground">Responsibilities: </span>{o.primary_responsibilities}</p>}
                  {o.escalation_rules && <p className="text-muted-foreground"><span className="text-foreground">Escalation: </span>{o.escalation_rules}</p>}
                </div>
              ))}
            </div>
          )}
      </PPLSection>
    </PPLLayout>
  );
}