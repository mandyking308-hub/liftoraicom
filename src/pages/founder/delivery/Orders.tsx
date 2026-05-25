import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { DLLayout, DLSection, DLEmpty, STATUS_TONE } from "./_shared";

export default function DeliveryOrders() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("delivery_orders").select("*").order("created_at", { ascending: false }).limit(200)
      .then(r => { setRows(r.data || []); setLoading(false); });
  }, []);

  return (
    <DLLayout title="Delivery pipeline" subtitle="All delivery orders by business. Created automatically when revenue is confirmed.">
      <DLSection title="Orders" description="Stages: pending → active → delivered → completed. Blocked/refunded surfaced separately.">
        {loading ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <DLEmpty title="No delivery orders yet" hint="Orders are created automatically when revenue confirms in Quote-to-Cash." /> :
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left border-b border-border/40">
                  <th className="py-2 pr-3">Order</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Start</th>
                  <th className="py-2 pr-3">Due</th>
                  <th className="py-2 pr-3">Summary</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(o => (
                  <tr key={o.id} className="border-b border-border/30">
                    <td className="py-2 pr-3 font-mono">{o.id.slice(0, 8)}</td>
                    <td className="py-2 pr-3">{o.delivery_type}</td>
                    <td className="py-2 pr-3"><Badge variant="outline" className={`text-[10px] ${STATUS_TONE[o.order_status] || ""}`}>{o.order_status}</Badge></td>
                    <td className="py-2 pr-3">{o.start_date ? new Date(o.start_date).toLocaleDateString() : "—"}</td>
                    <td className="py-2 pr-3">{o.due_date ? new Date(o.due_date).toLocaleDateString() : "—"}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{o.delivery_summary || "—"}</td>
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