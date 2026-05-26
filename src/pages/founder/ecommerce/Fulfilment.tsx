import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EcomLayout } from "./_shared";
import { fetchShipments, SHIPMENT_STATUS_META, type FulfilmentShipment } from "@/lib/ecommerceEngine";

export default function Fulfilment() {
  const [rows, setRows] = useState<FulfilmentShipment[]>([]);
  useEffect(() => { fetchShipments().then(setRows).catch(() => setRows([])); }, []);
  return (
    <EcomLayout title="Fulfilment & Shipping" subtitle="Shipment drafts prepared internally. Carrier label purchase, tracking activation and customer notifications require founder approval.">
      <Card className="tech-card p-3 border-yellow-500/40">
        <p className="text-xs">Shipping label purchase and carrier API calls are <span className="text-yellow-300 font-semibold">gated</span>. Digital products skip shipping and complete via internal fulfilment task.</p>
      </Card>
      <Card className="tech-card p-3">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground"><tr><th className="text-left p-1">Order</th><th className="text-left p-1">Carrier</th><th className="text-left p-1">Tracking</th><th className="text-left p-1">Status</th><th className="text-left p-1">Shipped</th></tr></thead>
          <tbody>
            {rows.map(s => (
              <tr key={s.id} className="border-t border-border/50">
                <td className="p-1 font-mono text-[10px]">{s.order_id.slice(0,8)}</td>
                <td className="p-1">{s.carrier ?? "—"}</td>
                <td className="p-1 font-mono text-[10px]">{s.tracking_number ?? "—"}</td>
                <td className="p-1"><Badge variant="outline" className={`text-[10px] ${SHIPMENT_STATUS_META[s.shipment_status].cls}`}>{SHIPMENT_STATUS_META[s.shipment_status].label}</Badge></td>
                <td className="p-1 text-muted-foreground">{s.shipped_at ? new Date(s.shipped_at).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-3 text-muted-foreground text-center">No shipments yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </EcomLayout>
  );
}