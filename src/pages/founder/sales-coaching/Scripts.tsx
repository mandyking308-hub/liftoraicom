import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SCLayout, SCSection, SCEmpty } from "./_shared";
import { Badge } from "@/components/ui/badge";

type SP = { id: string; script_section: string; usage_count: number; conversion_rate: number; objection_rate: number; close_rate: number; average_sentiment: number; recommended_status: string };

const statusTone: Record<string, string> = {
  keep: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  improve: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  retire: "bg-red-500/15 text-red-400 border-red-500/30",
  test_new: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

export default function SalesCoachingScripts() {
  const [rows, setRows] = useState<SP[]>([]);
  useEffect(() => {
    supabase.from("sales_script_performance").select("*").order("close_rate", { ascending: false }).limit(500)
      .then(r => setRows((r.data as SP[]) || []));
  }, []);

  return (
    <SCLayout title="Scripts" subtitle="Per-section metrics with recommended status: keep, improve, retire or test new.">
      <SCSection title="Script performance">
        {rows.length === 0 ? <SCEmpty title="No script metrics yet" hint="Metrics populate as scripts are used and reviewed by the Coaching Agent." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr><th className="text-left p-2">Section</th><th className="p-2">Used</th><th className="p-2">Conv</th><th className="p-2">Obj</th><th className="p-2">Close</th><th className="p-2">Sentiment</th><th className="p-2">Status</th></tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-border/40">
                    <td className="p-2">{r.script_section}</td>
                    <td className="p-2 text-center tabular-nums">{r.usage_count}</td>
                    <td className="p-2 text-center tabular-nums">{Math.round((r.conversion_rate || 0) * 100)}%</td>
                    <td className="p-2 text-center tabular-nums">{Math.round((r.objection_rate || 0) * 100)}%</td>
                    <td className="p-2 text-center tabular-nums">{Math.round((r.close_rate || 0) * 100)}%</td>
                    <td className="p-2 text-center tabular-nums">{(r.average_sentiment || 0).toFixed(2)}</td>
                    <td className="p-2 text-center"><Badge variant="outline" className={`text-[10px] ${statusTone[r.recommended_status] || ""}`}>{r.recommended_status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SCSection>
    </SCLayout>
  );
}