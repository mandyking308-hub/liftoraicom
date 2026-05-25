import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { DLLayout, DLSection, DLEmpty, STATUS_TONE } from "./_shared";

export default function DeliveryCapacity() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("delivery_capacity").select("*").order("capacity_period_start", { ascending: false }).limit(100)
      .then(r => { setRows(r.data || []); setLoading(false); });
  }, []);

  return (
    <DLLayout title="Capacity board" subtitle="Per-business capacity windows. The Delivery Agent warns when a business is at or over capacity.">
      <DLSection title="Capacity windows">
        {loading ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <DLEmpty title="No capacity windows configured" hint="Add a capacity window per business to track max orders and hours per period." /> :
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left border-b border-border/40">
                  <th className="py-2 pr-3">Period</th>
                  <th className="py-2 pr-3">Orders</th>
                  <th className="py-2 pr-3">Hours</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(c => (
                  <tr key={c.id} className="border-b border-border/30">
                    <td className="py-2 pr-3">{new Date(c.capacity_period_start).toLocaleDateString()} – {new Date(c.capacity_period_end).toLocaleDateString()}</td>
                    <td className="py-2 pr-3">{c.current_orders}/{c.max_orders}</td>
                    <td className="py-2 pr-3">{c.current_hours}/{c.max_hours}</td>
                    <td className="py-2 pr-3"><Badge variant="outline" className={`text-[10px] ${STATUS_TONE[c.capacity_status] || ""}`}>{c.capacity_status}</Badge></td>
                    <td className="py-2 pr-3 text-muted-foreground">{c.recommended_action || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </DLSection>
    </DLLayout>
  );
}