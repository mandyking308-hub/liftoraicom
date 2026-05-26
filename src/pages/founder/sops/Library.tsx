import { useEffect, useState } from "react";
import { SopLayout } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchSops, SOP_TYPE_LABEL, STATUS_META, type SopDocument } from "@/lib/sopEngine";

export default function SopsLibrary() {
  const [rows, setRows] = useState<SopDocument[]>([]);
  useEffect(() => { fetchSops().then(setRows).catch(() => setRows([])); }, []);
  return (
    <SopLayout title="SOP Library" subtitle="Every SOP and playbook indexed by type, owner and lifecycle status.">
      <Card className="tech-card p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-secondary/40 text-muted-foreground"><tr>
            <th className="text-left p-2">SOP</th><th className="text-left p-2">Type</th>
            <th className="text-left p-2">Owner</th><th className="text-left p-2">Status</th>
            <th className="text-left p-2">Updated</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No SOPs yet.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="p-2 font-medium">{r.sop_name}
                  {r.audit_metadata?.live_internal_test && <Badge variant="outline" className="ml-2 text-[9px] bg-muted">TEST</Badge>}
                </td>
                <td className="p-2">{SOP_TYPE_LABEL[r.sop_type] ?? r.sop_type}</td>
                <td className="p-2">{r.owner ?? "—"}</td>
                <td className="p-2"><Badge variant="outline" className={`text-[10px] ${STATUS_META[r.sop_status]?.cls ?? ""}`}>{STATUS_META[r.sop_status]?.label ?? r.sop_status}</Badge></td>
                <td className="p-2 text-muted-foreground">{new Date(r.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </SopLayout>
  );
}