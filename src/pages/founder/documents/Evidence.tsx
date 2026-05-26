import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocLayout } from "./_shared";
import { fetchEvidence, type EvidenceRecord } from "@/lib/documentVaultEngine";

const STATUS_CLS: Record<string,string> = {
  collected: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  missing: "bg-red-500/15 text-red-300 border-red-500/30",
  review_required: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  verified: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected: "bg-muted text-muted-foreground border-border/50",
};

export default function Evidence() {
  const [rows, setRows] = useState<EvidenceRecord[]>([]);
  useEffect(() => { fetchEvidence().then(setRows).catch(() => setRows([])); }, []);
  return (
    <DocLayout title="Evidence Store" subtitle="Evidence records link source modules (payments, complaints, seller checks, identity, insurance) to a vault document for audit and adviser support.">
      <Card className="tech-card p-3">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground"><tr>
            <th className="text-left p-1">Type</th><th className="text-left p-1">Status</th>
            <th className="text-left p-1">Source module</th><th className="text-left p-1">Summary</th>
            <th className="text-left p-1">Doc linked</th>
          </tr></thead>
          <tbody>
            {rows.map(e => (
              <tr key={e.id} className="border-t border-border/50">
                <td className="p-1">{e.evidence_type}</td>
                <td className="p-1"><Badge variant="outline" className={`text-[10px] ${STATUS_CLS[e.evidence_status] ?? ""}`}>{e.evidence_status}</Badge></td>
                <td className="p-1 text-muted-foreground">{e.source_module ?? "—"}</td>
                <td className="p-1">{e.evidence_summary ?? "—"}</td>
                <td className="p-1">{e.document_id ? <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">linked</Badge> : <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">no doc</Badge>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-3 text-muted-foreground text-center">No evidence records.</td></tr>}
          </tbody>
        </table>
      </Card>
    </DocLayout>
  );
}