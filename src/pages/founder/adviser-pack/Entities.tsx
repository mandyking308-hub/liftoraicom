import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { APLayout, APSection, APEmpty } from "./_shared";
import { Badge } from "@/components/ui/badge";

type Entity = { id: string; entity_name: string; entity_type: string | null; jurisdiction: string | null; registration_number_summary: string | null; ownership_summary: string | null; financial_year_end: string | null; accountant_contact: string | null; legal_contact: string | null; tax_notes: string | null; active: boolean };

export default function AdviserPackEntities() {
  const [entities, setEntities] = useState<Entity[]>([]);
  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const { data } = await sb.from("entity_structure_records").select("*").order("active", { ascending: false });
      setEntities(data ?? []);
    })();
  }, []);

  return (
    <APLayout title="Entities" subtitle="Legal entity structure across UK / US / UAE. Mandy keeps this current; advisers see entity context alongside every monthly pack. Entity changes require adviser approval.">
      <APSection title={`Entities (${entities.length})`}>
        {entities.length === 0 ? <APEmpty title="No entity records yet" hint="Add each legal entity with jurisdiction, year-end, accountant and legal contacts." /> : (
          <div className="space-y-2">
            {entities.map(e => (
              <div key={e.id} className="rounded border border-border/50 p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm">{e.entity_name}</span>
                  {e.entity_type && <Badge variant="outline" className="text-[10px]">{e.entity_type}</Badge>}
                  {e.jurisdiction && <Badge variant="outline" className="text-[10px] bg-primary/10 border-primary/30 text-primary">{e.jurisdiction}</Badge>}
                  {e.active
                    ? <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">active</Badge>
                    : <Badge variant="outline" className="text-[10px]">inactive</Badge>}
                  {e.financial_year_end && <span className="text-[11px] text-muted-foreground">YE {e.financial_year_end}</span>}
                </div>
                <div className="text-[11px] text-muted-foreground space-y-0.5">
                  {e.registration_number_summary && <p>Reg: {e.registration_number_summary}</p>}
                  {e.ownership_summary && <p>Ownership: {e.ownership_summary}</p>}
                  {e.accountant_contact && <p>Accountant: {e.accountant_contact}</p>}
                  {e.legal_contact && <p>Legal: {e.legal_contact}</p>}
                  {e.tax_notes && <p>Tax notes: {e.tax_notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </APSection>
    </APLayout>
  );
}