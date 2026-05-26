import { useEffect, useState } from "react";
import { BRLayout } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchExports, EXPORT_STATUS_META, type ExportRequest } from "@/lib/backupRecoveryEngine";

export default function BRExports() {
  const [rows, setRows] = useState<ExportRequest[]>([]);
  useEffect(() => { fetchExports().then(setRows).catch(() => setRows([])); }, []);
  return (
    <BRLayout title="Export Request Board" subtitle="Internal export drafts. Generating sensitive exports (CRM, finance, documents, full business, adviser pack, data room, AI logs) requires founder approval. Raw secrets are never included.">
      <Card className="tech-card p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-secondary/40 text-muted-foreground"><tr>
            <th className="text-left p-2">Type</th><th className="text-left p-2">Requested by</th>
            <th className="text-left p-2">Status</th><th className="text-left p-2">Approval</th>
            <th className="text-left p-2">File</th><th className="text-left p-2">Updated</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No export requests yet.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="p-2 font-medium">{r.export_type}
                  {r.audit_metadata?.live_internal_test && <Badge variant="outline" className="ml-2 text-[9px] bg-muted">TEST</Badge>}
                </td>
                <td className="p-2">{r.requested_by ?? "—"}</td>
                <td className="p-2"><Badge variant="outline" className={`text-[10px] ${EXPORT_STATUS_META[r.export_status]?.cls ?? ""}`}>{EXPORT_STATUS_META[r.export_status]?.label ?? r.export_status}</Badge></td>
                <td className="p-2">{r.founder_approval_required ? <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Required</Badge> : <Badge variant="outline" className="text-[10px]">Not required</Badge>}</td>
                <td className="p-2 text-muted-foreground max-w-xs truncate">{r.generated_file_reference ?? "—"}</td>
                <td className="p-2 text-muted-foreground">{new Date(r.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </BRLayout>
  );
}