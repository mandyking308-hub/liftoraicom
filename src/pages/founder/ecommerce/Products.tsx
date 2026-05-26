import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EcomLayout } from "./_shared";
import { fetchProducts, type EcommerceProduct } from "@/lib/ecommerceEngine";

export default function Products() {
  const [rows, setRows] = useState<EcommerceProduct[]>([]);
  useEffect(() => { fetchProducts().then(setRows).catch(() => setRows([])); }, []);
  return (
    <EcomLayout title="Products & SKUs" subtitle="Dashboard of SKUs across all business lines. Physical, digital, bundle, preorder and custom.">
      <Card className="tech-card p-3">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground"><tr><th className="text-left p-1">SKU</th><th className="text-left p-1">Name</th><th className="text-left p-1">Type</th><th className="text-left p-1">Tracking</th><th className="text-left p-1">Active</th><th className="text-left p-1">Test</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border/50">
                <td className="p-1 font-mono">{r.sku}</td>
                <td className="p-1">{r.product_name}</td>
                <td className="p-1"><Badge variant="outline" className="text-[10px]">{r.product_type}</Badge></td>
                <td className="p-1">{r.stock_tracking_enabled ? "Yes" : "No"}</td>
                <td className="p-1">{r.active ? "Yes" : "No"}</td>
                <td className="p-1">{r.audit_metadata?.live_internal_test ? <Badge variant="outline" className="text-[10px] bg-blue-500/15 text-blue-300 border-blue-500/30">TEST</Badge> : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-3 text-muted-foreground text-center">No products yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </EcomLayout>
  );
}