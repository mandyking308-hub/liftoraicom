import { useEffect, useState } from "react";
import { CapLayout, CapSection, CapEmpty } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function CapacityBusiness() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("capacity_plans").select("*").order("created_at", { ascending: false });
      setRows(data ?? []); setLoading(false);
    })();
  }, []);

  const tone = (s: string) => s === "over_capacity" ? "bg-red-500/15 text-red-400 border-red-500/30"
    : s === "full" ? "bg-orange-500/15 text-orange-400 border-orange-500/30"
    : s === "watch" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
    : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";

  return (
    <CapLayout title="Business capacity" subtitle="Per-business capacity windows and current commitments.">
      <CapSection title="Capacity plans">
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
         : rows.length === 0 ? <CapEmpty title="No capacity plans yet" hint="Plans appear as ventures define max customers, orders, projects, human hours, AI actions and support tickets." />
         : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left">
                  <th className="py-2 pr-3">Business</th>
                  <th className="py-2 pr-3">Period</th>
                  <th className="py-2 pr-3">Customers</th>
                  <th className="py-2 pr-3">Orders</th>
                  <th className="py-2 pr-3">Projects</th>
                  <th className="py-2 pr-3">Human hrs</th>
                  <th className="py-2 pr-3">AI actions</th>
                  <th className="py-2 pr-3">Support</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-border/40">
                    <td className="py-2 pr-3 font-mono text-[10px]">{r.business_id ?? "—"}</td>
                    <td className="py-2 pr-3">{new Date(r.capacity_period_start).toLocaleDateString()} → {new Date(r.capacity_period_end).toLocaleDateString()}</td>
                    <td className="py-2 pr-3">{r.current_customers}/{r.max_customers}</td>
                    <td className="py-2 pr-3">{r.current_orders}/{r.max_orders}</td>
                    <td className="py-2 pr-3">{r.current_projects}/{r.max_projects}</td>
                    <td className="py-2 pr-3">{Number(r.current_human_hours).toFixed(1)}/{Number(r.max_human_hours).toFixed(1)}</td>
                    <td className="py-2 pr-3">{r.current_ai_actions}/{r.max_ai_actions}</td>
                    <td className="py-2 pr-3">{r.current_support_tickets}/{r.max_support_tickets}</td>
                    <td className="py-2 pr-3"><Badge variant="outline" className={tone(r.capacity_status)}>{r.capacity_status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CapSection>
    </CapLayout>
  );
}