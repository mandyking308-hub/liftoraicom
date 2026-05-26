import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EcomLayout } from "./_shared";
import { fetchSuppliers, type EcommerceSupplier } from "@/lib/ecommerceEngine";

export default function Suppliers() {
  const [rows, setRows] = useState<EcommerceSupplier[]>([]);
  useEffect(() => { fetchSuppliers().then(setRows).catch(() => setRows([])); }, []);
  return (
    <EcomLayout title="Supplier Board" subtitle="Supplier directory with lead times and risk. Purchase order issuance and supplier comms require founder approval.">
      <Card className="tech-card p-3">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground"><tr><th className="text-left p-1">Supplier</th><th className="text-left p-1">Type</th><th className="text-left p-1">Email</th><th className="text-left p-1">Lead (d)</th><th className="text-left p-1">Risk</th><th className="text-left p-1">Active</th></tr></thead>
          <tbody>
            {rows.map(s => (
              <tr key={s.id} className="border-t border-border/50">
                <td className="p-1">{s.supplier_name}</td>
                <td className="p-1"><Badge variant="outline" className="text-[10px]">{s.supplier_type}</Badge></td>
                <td className="p-1 text-muted-foreground">{s.contact_email ?? "—"}</td>
                <td className="p-1">{s.lead_time_days}</td>
                <td className="p-1">{s.risk_level}</td>
                <td className="p-1">{s.active ? "Yes" : "No"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-3 text-muted-foreground text-center">No suppliers yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </EcomLayout>
  );
}