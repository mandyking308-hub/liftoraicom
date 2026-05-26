import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EcomLayout } from "./_shared";
import { fetchOrders, fetchOrderItems, ORDER_STATUS_META, formatMoney, type EcommerceOrder, type EcommerceOrderItem } from "@/lib/ecommerceEngine";

export default function Orders() {
  const [orders, setOrders] = useState<EcommerceOrder[]>([]);
  const [items, setItems] = useState<EcommerceOrderItem[]>([]);
  useEffect(() => {
    fetchOrders().then(setOrders).catch(() => setOrders([]));
    fetchOrderItems().then(setItems).catch(() => setItems([]));
  }, []);
  return (
    <EcomLayout title="Order Board" subtitle="Order lifecycle from draft → paid → fulfilment → delivered. Stock reserved only on paid orders; customer messaging gated.">
      <Card className="tech-card p-3">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground"><tr><th className="text-left p-1">Order #</th><th className="text-left p-1">Status</th><th className="text-left p-1">Total</th><th className="text-left p-1">Ship?</th><th className="text-left p-1">Items</th><th className="text-left p-1">Created</th></tr></thead>
          <tbody>
            {orders.map(o => {
              const its = items.filter(i => i.order_id === o.id);
              return (
                <tr key={o.id} className="border-t border-border/50">
                  <td className="p-1 font-mono">{o.order_number}</td>
                  <td className="p-1"><Badge variant="outline" className={`text-[10px] ${ORDER_STATUS_META[o.order_status].cls}`}>{ORDER_STATUS_META[o.order_status].label}</Badge></td>
                  <td className="p-1">{formatMoney(Number(o.total_amount), o.currency)}</td>
                  <td className="p-1">{o.shipping_required ? "Yes" : "No"}</td>
                  <td className="p-1">{its.length}</td>
                  <td className="p-1 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
            {orders.length === 0 && <tr><td colSpan={6} className="p-3 text-muted-foreground text-center">No orders yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </EcomLayout>
  );
}