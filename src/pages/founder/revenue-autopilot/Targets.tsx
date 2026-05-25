import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RALayout, RASection, RAEmpty } from "./_shared";

type Target = { id: string; business_id: string; target_revenue_amount: number; target_period: string; target_currency: string; active: boolean; target_start_date?: string; target_end_date?: string };

export default function RevenueAutopilotTargets() {
  const [rows, setRows] = useState<Target[]>([]);
  useEffect(() => {
    supabase.from("sales_revenue_targets").select("*").order("active", { ascending: false }).limit(100)
      .then(r => setRows((r.data as Target[]) || []));
  }, []);

  return (
    <RALayout title="Targets" subtitle="Active monthly revenue targets that feed the loop. Set or adjust in the Sales Target Achievement Engine.">
      <RASection title="Targets" actions={<Link to="/founder/sales-targets/business" className="text-xs text-primary hover:underline">Manage in Sales Targets →</Link>}>
        {rows.length === 0 ? (
          <RAEmpty title="No targets configured" hint="The Revenue Manager Agent cannot reverse-engineer activity without a target." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr><th className="text-left p-2">Business</th><th className="p-2">Period</th><th className="p-2">Target</th><th className="p-2">Currency</th><th className="p-2">Status</th></tr>
              </thead>
              <tbody>
                {rows.map(t => (
                  <tr key={t.id} className="border-t border-border/40">
                    <td className="p-2 font-mono text-[10px]">{t.business_id.slice(0, 8)}</td>
                    <td className="p-2 text-center">{t.target_period}</td>
                    <td className="p-2 text-center tabular-nums">{Math.round(t.target_revenue_amount || 0).toLocaleString()}</td>
                    <td className="p-2 text-center">{t.target_currency}</td>
                    <td className="p-2 text-center">{t.active ? <span className="text-emerald-400">active</span> : <span className="text-muted-foreground">paused</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </RASection>
    </RALayout>
  );
}