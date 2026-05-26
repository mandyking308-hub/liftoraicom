import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchProducts, fetchInventory, fetchOrders, fetchShipments, fetchReturns, fetchSuppliers, summarize, type EcommerceSummary } from "@/lib/ecommerceEngine";

export default function EcommerceEngineCard() {
  const [sum, setSum] = useState<EcommerceSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchProducts(), fetchInventory(), fetchOrders(), fetchShipments(), fetchReturns(), fetchSuppliers()])
      .then(([p,i,o,s,r,sup]) => setSum(summarize(p,i,o,s,r,sup)))
      .catch(() => setSum(null));
  }, []);
  const warn = (n: number) => n > 0 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  const bad  = (n: number) => n > 0 ? "bg-red-500/10 text-red-300 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Package size={14} className="text-primary" />
          E-commerce / Inventory / Fulfilment / Returns
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" /> Supplier/ship/refund gated</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">Tracks SKUs, stock, orders, shipments, returns and suppliers. Reorder recommendations live; supplier orders, label purchases and refunds remain manual.</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Tile to="/founder/ecommerce/products"   label="SKUs"        value={sum?.active_skus} />
          <Tile to="/founder/ecommerce/inventory"  label="Low stock"   value={sum?.low_stock}                       cls={warn(sum?.low_stock ?? 0)} />
          <Tile to="/founder/ecommerce/inventory"  label="Out stock"   value={sum?.out_of_stock}                    cls={bad(sum?.out_of_stock ?? 0)} />
          <Tile to="/founder/ecommerce/orders"     label="Open orders" value={sum?.orders_pending}                  cls={warn(sum?.orders_pending ?? 0)} />
          <Tile to="/founder/ecommerce/fulfilment" label="Ship approv" value={sum?.shipments_awaiting_approval}     cls={warn(sum?.shipments_awaiting_approval ?? 0)} />
          <Tile to="/founder/ecommerce/returns"    label="Returns"     value={sum?.returns_open}                    cls={warn(sum?.returns_open ?? 0)} />
        </div>
        {sum?.top_alert && (
          <div className="border border-primary/30 rounded p-2 bg-primary/5">
            <p className="text-[10px] uppercase text-muted-foreground">Top alert · {sum.top_alert.severity}</p>
            <p className="text-sm font-medium">{sum.top_alert.summary}</p>
          </div>
        )}
        <div className="flex gap-2 flex-wrap text-[11px]">
          <Link to="/founder/ecommerce" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/ecommerce/inventory" className="text-primary hover:underline">Inventory</Link>
          <Link to="/founder/ecommerce/fulfilment" className="text-primary hover:underline">Fulfilment</Link>
          <Link to="/founder/ecommerce/returns" className="text-primary hover:underline">Returns</Link>
        </div>
      </CardContent>
    </Card>
  );
}
function Tile({ to, label, value, cls }: { to: string; label: string; value: number | undefined; cls?: string }) {
  return (
    <Link to={to} className={`border ${cls ?? "border-border/50"} rounded p-2 hover:border-primary/40 transition`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value ?? "—"}</p>
    </Link>
  );
}