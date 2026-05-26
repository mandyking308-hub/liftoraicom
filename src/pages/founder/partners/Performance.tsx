import { useEffect, useState } from "react";
import { PALayout, PASection, shortId, fmtMoney } from "./_shared";
import {
  fetchPerformance,
  type PerformanceSnapshot,
} from "@/lib/partnerEngine";

export default function PAPerformance() {
  const [rows, setRows] = useState<PerformanceSnapshot[]>([]);
  useEffect(() => { fetchPerformance().then(setRows).catch(() => {}); }, []);

  return (
    <PALayout title="Partner Performance"
      subtitle="Period-over-period performance snapshots. Quality below 40 triggers a pause/review recommendation.">
      <PASection title={`Snapshots — ${rows.length}`}>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No performance snapshots yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border/50">
                  <th className="text-left p-2">Partner</th>
                  <th className="text-left p-2">Business</th>
                  <th className="text-left p-2">Period</th>
                  <th className="text-right p-2">Leads</th>
                  <th className="text-right p-2">Revenue</th>
                  <th className="text-right p-2">Commission</th>
                  <th className="text-right p-2">Quality</th>
                  <th className="text-left p-2">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(s => (
                  <tr key={s.id} className="border-b border-border/30">
                    <td className="p-2 font-mono">{shortId(s.partner_id)}</td>
                    <td className="p-2 font-mono text-muted-foreground">{shortId(s.business_id)}</td>
                    <td className="p-2 text-muted-foreground">{s.period_start ?? "—"} → {s.period_end ?? "—"}</td>
                    <td className="p-2 text-right">{s.leads_generated ?? 0}</td>
                    <td className="p-2 text-right">{fmtMoney(s.revenue_generated)}</td>
                    <td className="p-2 text-right">{fmtMoney(s.commission_due)}</td>
                    <td className={`p-2 text-right ${Number(s.quality_score ?? 0) < 40 ? "text-yellow-300" : ""}`}>
                      {s.quality_score != null ? Number(s.quality_score).toFixed(0) : "—"}
                    </td>
                    <td className="p-2 text-muted-foreground">{s.recommended_action ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PASection>
    </PALayout>
  );
}
