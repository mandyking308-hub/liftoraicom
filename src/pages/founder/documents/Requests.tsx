import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocLayout } from "./_shared";
import { fetchEvidence, type EvidenceRecord } from "@/lib/documentVaultEngine";

export default function Requests() {
  const [rows, setRows] = useState<EvidenceRecord[]>([]);
  useEffect(() => { fetchEvidence().then(setRows).catch(() => setRows([])); }, []);
  const requests = rows.filter(e => e.evidence_status === "missing" || e.evidence_status === "review_required");
  return (
    <DocLayout title="Document Requests" subtitle="Open evidence and document collection tasks. Sending requests externally requires founder approval — this view lists internal draft tasks only.">
      <Card className="tech-card p-3">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground"><tr>
            <th className="text-left p-1">Type</th><th className="text-left p-1">Source</th>
            <th className="text-left p-1">Summary</th><th className="text-left p-1">Status</th>
          </tr></thead>
          <tbody>
            {requests.map(e => (
              <tr key={e.id} className="border-t border-border/50">
                <td className="p-1">{e.evidence_type}</td>
                <td className="p-1 text-muted-foreground">{e.source_module ?? "—"}</td>
                <td className="p-1">{e.evidence_summary ?? "—"}</td>
                <td className="p-1"><Badge variant="outline" className="text-[10px] bg-orange-500/15 text-orange-300 border-orange-500/30">{e.evidence_status}</Badge></td>
              </tr>
            ))}
            {requests.length === 0 && <tr><td colSpan={4} className="p-3 text-muted-foreground text-center">No open document/evidence requests.</td></tr>}
          </tbody>
        </table>
      </Card>
    </DocLayout>
  );
}