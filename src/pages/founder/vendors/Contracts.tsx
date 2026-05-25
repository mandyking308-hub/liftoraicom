import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { VNDLayout, VNDSection, VNDEmpty } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function VendorsContracts() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("vendors")
      .select("id,vendor_name,vendor_type,contract_required,dpa_required,active")
      .eq("active", true)
      .order("vendor_name")
      .limit(200)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);

  return (
    <VNDLayout title="Vendor contracts" subtitle="Vendors requiring a contract or DPA. Contracts themselves live in the Contract Lifecycle Engine — vendor side links here.">
      <VNDSection title="Active vendors" actions={<Link to="/founder/contracts" className="text-xs text-primary hover:underline">Contract Lifecycle →</Link>}>
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <VNDEmpty title="No active vendors" />
          : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="rounded border border-border/40 p-3 text-xs flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.vendor_name}</span>
                  <Badge variant="outline">{r.vendor_type}</Badge>
                  {r.contract_required && <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">contract required</Badge>}
                  {r.dpa_required && <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">DPA required</Badge>}
                </div>
              ))}
            </div>
          )}
      </VNDSection>
    </VNDLayout>
  );
}