import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EcomLayout, EcomStat } from "./_shared";
import { fetchProducts, fetchInventory, fetchOrders, fetchShipments, fetchReturns, fetchSuppliers, summarize, type EcommerceSummary } from "@/lib/ecommerceEngine";

export default function EcommerceOverview() {
  const [sum, setSum] = useState<EcommerceSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchProducts(), fetchInventory(), fetchOrders(), fetchShipments(), fetchReturns(), fetchSuppliers()])
      .then(([p,i,o,s,r,sup]) => setSum(summarize(p,i,o,s,r,sup)))
      .catch(() => setSum(null));
  }, []);
  return (
    <EcomLayout title="E-commerce Overview" subtitle="Inventory, fulfilment and returns tracked live. Supplier orders, shipping labels, refunds and customer messages remain gated for founder approval.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <EcomStat label="Active SKUs" value={sum?.active_skus ?? "—"} hint={`${sum?.product_count ?? 0} total`} />
        <EcomStat label="Low stock" value={sum?.low_stock ?? "—"} tone={(sum?.low_stock ?? 0) > 0 ? "warn" : "ok"} />
        <EcomStat label="Out of stock" value={sum?.out_of_stock ?? "—"} tone={(sum?.out_of_stock ?? 0) > 0 ? "bad" : "ok"} />
        <EcomStat label="Reorder recs" value={sum?.reorder_recommendations ?? "—"} tone={(sum?.reorder_recommendations ?? 0) > 0 ? "warn" : "ok"} />
        <EcomStat label="Orders" value={sum?.orders_total ?? "—"} hint={`${sum?.orders_pending ?? 0} pending`} />
        <EcomStat label="Shipments — approval" value={sum?.shipments_awaiting_approval ?? "—"} tone={(sum?.shipments_awaiting_approval ?? 0) > 0 ? "warn" : "ok"} />
        <EcomStat label="Returns open" value={sum?.returns_open ?? "—"} hint={`${sum?.returns_awaiting_approval ?? 0} need approval`} />
        <EcomStat label="Suppliers" value={sum?.suppliers ?? "—"} />
      </div>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Top alert</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {sum?.top_alert ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-orange-500/15 text-orange-300 border-orange-500/30 text-[10px]">{sum.top_alert.severity}</Badge>
              <span className="text-foreground">{sum.top_alert.summary}</span>
            </div>
          ) : <p>No open alerts.</p>}
          <p className="mt-2 text-[11px]">Test records: {sum?.test_records ?? 0} (excluded from real revenue).</p>
        </CardContent>
      </Card>
    </EcomLayout>
  );
}