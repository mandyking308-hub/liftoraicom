import { useEffect, useState } from "react";
import { PPLLayout, PPLSection, PPLEmpty, PPL_ROLE_TONE, PPL_STATUS_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function PeopleTraining() {
  const [ops, setOps] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("human_operators")
      .select("id,name,role_type,status,nda_status,contract_status,primary_responsibilities")
      .order("name").limit(200)
      .then(({ data }: any) => setOps(data ?? []));
  }, []);

  const checkItem = (ok: boolean, label: string) => (
    <Badge variant="outline" className={ok ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"}>
      {ok ? "✓" : "○"} {label}
    </Badge>
  );

  return (
    <PPLLayout title="Training & SOP checklist" subtitle="Track NDA, contract, training and SOP review status for each operator. Operators should not start live work until the required checks are complete.">
      <PPLSection title="Per-operator checklist" description="Required for active operators: NDA on file, contract on file, primary responsibilities defined, SOP/manuals reviewed.">
        {!ops ? <p className="text-xs text-muted-foreground">Loading…</p>
          : ops.length === 0 ? <PPLEmpty title="No operators to train yet" />
          : (
            <div className="space-y-2">
              {ops.map((o) => {
                const ndaOk = ["signed", "in_place", "not_required"].includes(o.nda_status);
                const contractOk = ["signed", "in_place", "not_required"].includes(o.contract_status);
                const responsibilitiesOk = !!o.primary_responsibilities;
                return (
                  <div key={o.id} className="rounded border border-border/40 p-3 text-xs space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{o.name}</span>
                      <Badge variant="outline" className={PPL_ROLE_TONE[o.role_type] || ""}>{o.role_type}</Badge>
                      <Badge variant="outline" className={PPL_STATUS_TONE[o.status] || ""}>{o.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {checkItem(ndaOk, `NDA: ${o.nda_status}`)}
                      {checkItem(contractOk, `Contract: ${o.contract_status}`)}
                      {checkItem(responsibilitiesOk, "Responsibilities defined")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </PPLSection>
    </PPLLayout>
  );
}