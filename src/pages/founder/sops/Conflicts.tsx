import { useEffect, useState } from "react";
import { SopLayout } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchSops, fetchConflicts, SEVERITY_META, type SopDocument, type SopConflict } from "@/lib/sopEngine";

export default function SopsConflicts() {
  const [sops, setSops] = useState<SopDocument[]>([]);
  const [rows, setRows] = useState<SopConflict[]>([]);
  useEffect(() => { Promise.all([fetchSops(), fetchConflicts()]).then(([s,c]) => { setSops(s); setRows(c); }).catch(() => {}); }, []);
  const nameOf = (id: string) => sops.find(s => s.id === id)?.sop_name ?? id.slice(0,8);
  return (
    <SopLayout title="Conflict Board" subtitle="Overlapping or contradictory SOPs flagged by the SOP Governance Agent. Resolution requires founder approval.">
      <Card className="tech-card p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-secondary/40 text-muted-foreground"><tr>
            <th className="text-left p-2">SOP A</th><th className="text-left p-2">SOP B</th>
            <th className="text-left p-2">Summary</th><th className="text-left p-2">Severity</th>
            <th className="text-left p-2">Resolution</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No conflicts detected.</td></tr>}
            {rows.map(c => (
              <tr key={c.id} className="border-t border-border/40">
                <td className="p-2 font-medium">{nameOf(c.sop_a_id)}</td>
                <td className="p-2 font-medium">{nameOf(c.sop_b_id)}</td>
                <td className="p-2 text-muted-foreground max-w-md">{c.conflict_summary ?? "—"}</td>
                <td className="p-2"><Badge variant="outline" className={`text-[10px] ${SEVERITY_META[c.severity]?.cls ?? ""}`}>{SEVERITY_META[c.severity]?.label ?? c.severity}</Badge></td>
                <td className="p-2">{c.resolution_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </SopLayout>
  );
}