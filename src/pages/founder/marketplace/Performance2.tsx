import { useEffect, useState } from "react";
import { MPLayout, MPSection, MPEmpty } from "./_shared";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const tone: Record<string, string> = {
  excellent: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  healthy: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  watch: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  poor: "bg-red-500/15 text-red-400 border-red-500/30",
  suspend_review: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function SellerPerformanceBoard() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("seller_performance_metrics").select("*").order("created_at", { ascending: false }).limit(200)
      .then((r: any) => setRows(r.data ?? []));
  }, []);
  return (
    <MPLayout title="Seller Performance Board" subtitle="Per-period orders, ratings, disputes and revenue.">
      <MPSection title="Latest performance metrics">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <MPEmpty title="No performance metrics yet" hint="Metrics appear once sellers complete orders." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border/40">
                  <th className="text-left p-2">Period</th>
                  <th className="text-right p-2">Completed</th>
                  <th className="text-right p-2">Cancelled</th>
                  <th className="text-right p-2">Rating</th>
                  <th className="text-right p-2">Response (min)</th>
                  <th className="text-right p-2">Disputes</th>
                  <th className="text-right p-2">Refunds</th>
                  <th className="text-right p-2">Revenue</th>
                  <th className="text-right p-2">Commission</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Recommended</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(m => (
                  <tr key={m.id} className="border-b border-border/20">
                    <td className="p-2">{m.period_start ? new Date(m.period_start).toLocaleDateString() : "—"} → {m.period_end ? new Date(m.period_end).toLocaleDateString() : "—"}</td>
                    <td className="p-2 text-right font-mono">{m.orders_completed}</td>
                    <td className="p-2 text-right font-mono">{m.orders_cancelled}</td>
                    <td className="p-2 text-right font-mono">{Number(m.customer_rating ?? 0).toFixed(2)}</td>
                    <td className="p-2 text-right font-mono">{Number(m.average_response_time_minutes ?? 0).toFixed(0)}</td>
                    <td className="p-2 text-right font-mono">{m.dispute_count}</td>
                    <td className="p-2 text-right font-mono">{m.refund_count}</td>
                    <td className="p-2 text-right font-mono">{Number(m.revenue_generated ?? 0).toFixed(2)}</td>
                    <td className="p-2 text-right font-mono">{Number(m.commission_generated ?? 0).toFixed(2)}</td>
                    <td className="p-2"><Badge variant="outline" className={`text-[10px] ${tone[m.performance_status] ?? ""}`}>{m.performance_status}</Badge></td>
                    <td className="p-2 text-primary/90">{m.recommended_action ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </MPSection>
    </MPLayout>
  );
}