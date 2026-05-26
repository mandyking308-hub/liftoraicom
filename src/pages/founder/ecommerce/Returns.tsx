import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EcomLayout } from "./_shared";
import { fetchReturns, RETURN_STATUS_META, type ReturnRequest } from "@/lib/ecommerceEngine";

export default function Returns() {
  const [rows, setRows] = useState<ReturnRequest[]>([]);
  useEffect(() => { fetchReturns().then(setRows).catch(() => setRows([])); }, []);
  return (
    <EcomLayout title="Returns Board" subtitle="Return requests reviewed internally. Refund execution and customer messaging require founder approval.">
      <Card className="tech-card p-3">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground"><tr><th className="text-left p-1">Order</th><th className="text-left p-1">Reason</th><th className="text-left p-1">Status</th><th className="text-left p-1">Refund?</th><th className="text-left p-1">Created</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border/50">
                <td className="p-1 font-mono text-[10px]">{r.order_id.slice(0,8)}</td>
                <td className="p-1">{r.return_reason ?? "—"}</td>
                <td className="p-1"><Badge variant="outline" className={`text-[10px] ${RETURN_STATUS_META[r.return_status].cls}`}>{RETURN_STATUS_META[r.return_status].label}</Badge></td>
                <td className="p-1">{r.refund_required ? <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">approval needed</Badge> : "No"}</td>
                <td className="p-1 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-3 text-muted-foreground text-center">No returns yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </EcomLayout>
  );
}