import { useEffect, useState } from "react";
import { SopLayout } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchSops, fetchReviews, type SopDocument, type SopReviewTask } from "@/lib/sopEngine";

export default function SopsReviews() {
  const [sops, setSops] = useState<SopDocument[]>([]);
  const [rows, setRows] = useState<SopReviewTask[]>([]);
  useEffect(() => { Promise.all([fetchSops(), fetchReviews()]).then(([s,r]) => { setSops(s); setRows(r); }).catch(() => {}); }, []);
  const nameOf = (id: string) => sops.find(s => s.id === id)?.sop_name ?? "—";
  const isOverdue = (r: SopReviewTask) => r.due_at && new Date(r.due_at).getTime() < Date.now() && (r.review_status === "pending" || r.review_status === "in_progress");
  return (
    <SopLayout title="Review / Approval Queue" subtitle="Stale, scheduled and incident-triggered SOP reviews. Approval of compliance / sales / legal SOPs is founder-only.">
      <Card className="tech-card p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-secondary/40 text-muted-foreground"><tr>
            <th className="text-left p-2">SOP</th><th className="text-left p-2">Reason</th>
            <th className="text-left p-2">Status</th><th className="text-left p-2">Due</th>
            <th className="text-left p-2">Assigned</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No review tasks.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className={`border-t border-border/40 ${isOverdue(r) ? "bg-red-500/5" : ""}`}>
                <td className="p-2 font-medium">{nameOf(r.sop_id)}</td>
                <td className="p-2">{r.review_reason}</td>
                <td className="p-2"><Badge variant="outline" className="text-[10px]">{r.review_status}</Badge></td>
                <td className="p-2 text-muted-foreground">{r.due_at ? new Date(r.due_at).toLocaleDateString() : "—"} {isOverdue(r) && <Badge variant="outline" className="ml-1 text-[9px] bg-red-500/15 text-red-300 border-red-500/30">OVERDUE</Badge>}</td>
                <td className="p-2">{r.assigned_to ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </SopLayout>
  );
}