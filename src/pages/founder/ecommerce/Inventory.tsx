import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EcomLayout } from "./_shared";
import { fetchInventory, INV_STATUS_META, type InventoryRecord } from "@/lib/ecommerceEngine";

export default function Inventory() {
  const [rows, setRows] = useState<InventoryRecord[]>([]);
  useEffect(() => { fetchInventory().then(setRows).catch(() => setRows([])); }, []);
  const lowOrOut = rows.filter(r => r.inventory_status === "low_stock" || r.inventory_status === "out_of_stock");
  return (
    <EcomLayout title="Inventory Board" subtitle="Stock on hand, reserved and available across locations. Reorder thresholds enforced internally; supplier orders require approval.">
      {lowOrOut.length > 0 && (
        <Card className="tech-card p-3 border-yellow-500/40">
          <p className="text-xs font-semibold">Low / out-of-stock alerts ({lowOrOut.length})</p>
          <p className="text-[11px] text-muted-foreground">Reorder recommendations prepared. Founder approval required to send supplier purchase orders.</p>
        </Card>
      )}
      <Card className="tech-card p-3">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground"><tr><th className="text-left p-1">Product ID</th><th className="text-left p-1">Location</th><th className="text-left p-1">On hand</th><th className="text-left p-1">Reserved</th><th className="text-left p-1">Available</th><th className="text-left p-1">Reorder pt</th><th className="text-left p-1">Status</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border/50">
                <td className="p-1 font-mono text-[10px]">{r.ecommerce_product_id.slice(0,8)}</td>
                <td className="p-1">{r.location_name}</td>
                <td className="p-1">{r.stock_on_hand}</td>
                <td className="p-1">{r.stock_reserved}</td>
                <td className="p-1 font-semibold">{r.stock_available}</td>
                <td className="p-1">{r.reorder_point}</td>
                <td className="p-1"><Badge variant="outline" className={`text-[10px] ${INV_STATUS_META[r.inventory_status].cls}`}>{INV_STATUS_META[r.inventory_status].label}</Badge></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="p-3 text-muted-foreground text-center">No inventory rows.</td></tr>}
          </tbody>
        </table>
      </Card>
    </EcomLayout>
  );
}