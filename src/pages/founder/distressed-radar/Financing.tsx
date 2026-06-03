import { useEffect, useState } from "react";
import { DRLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  fetchOpportunities, fetchAllFinancing,
  STRUCTURE_LABEL, fmtMoney,
  type AcquisitionOpportunity, type FinancingOption,
} from "@/lib/distressedRadarEngine";

export default function DRFinancing() {
  const [opps, setOpps] = useState<AcquisitionOpportunity[]>([]);
  const [fin, setFin] = useState<FinancingOption[]>([]);
  useEffect(() => {
    fetchOpportunities().then(setOpps).catch(() => {});
    fetchAllFinancing().then(setFin).catch(() => {});
  }, []);
  const oppById = new Map(opps.map(o => [o.id, o]));
  const grouped = new Map<string, FinancingOption[]>();
  for (const f of fin) {
    if (!grouped.has(f.opportunity_id)) grouped.set(f.opportunity_id, []);
    grouped.get(f.opportunity_id)!.push(f);
  }

  return (
    <DRLayout title="Financing & Deal Structure"
      subtitle="Possible funding routes per opportunity. No financing request, investor approach or adviser contact happens automatically.">
      {grouped.size === 0 && <p className="text-sm text-muted-foreground">No financing options recorded yet. Open an opportunity and add structures.</p>}
      {Array.from(grouped.entries()).map(([oid, options]) => {
        const o = oppById.get(oid);
        if (!o) return null;
        return (
          <Card key={oid} className="tech-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Link to={`/founder/distressed-radar/acquisition/${o.id}`} className="hover:text-primary">{o.opportunity_name}</Link>
                <Badge variant="outline" className="text-[10px]">Priority {o.overall_priority_score ?? "—"}</Badge>
                <span className="text-[10px] text-muted-foreground">Financing required {fmtMoney(o.financing_required ?? o.asking_price)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1">
              {options.map(f => (
                <div key={f.id} className="flex items-center gap-2 border-b border-border/30 py-1">
                  <Badge variant="outline" className="text-[10px]">{STRUCTURE_LABEL[f.structure]}</Badge>
                  <span className="text-muted-foreground">capital {fmtMoney(f.estimated_capital)}</span>
                  <span className="text-muted-foreground">term {f.estimated_term_months ?? "—"}m</span>
                  {f.recommended && <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Recommended</Badge>}
                  {f.founder_approved && <Badge variant="outline" className="text-[10px] bg-primary/15 text-primary border-primary/30">Founder approved</Badge>}
                  <span className="flex-1 truncate">{f.notes}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </DRLayout>
  );
}