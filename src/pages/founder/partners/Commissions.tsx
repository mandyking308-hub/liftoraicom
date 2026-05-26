import { useEffect, useState } from "react";
import { PALayout, PASection, shortId, fmtMoney } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import {
  fetchCommissionRules,
  type CommissionRule,
} from "@/lib/partnerEngine";

export default function PACommissions() {
  const [rows, setRows] = useState<CommissionRule[]>([]);
  useEffect(() => { fetchCommissionRules().then(setRows).catch(() => {}); }, []);

  return (
    <PALayout title="Commission Rules"
      subtitle="Internal rule library. No commission may be paid or committed externally without founder approval — approval gate must stay enabled.">
      <PASection title={`Rules — ${rows.length}`}
        description={`${rows.filter(r => r.active).length} active. Rules with the approval gate off are blocked at the engine level.`}>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No commission rules defined.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border/50">
                  <th className="text-left p-2">Rule</th>
                  <th className="text-left p-2">Business</th>
                  <th className="text-left p-2">Partner</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-right p-2">Value</th>
                  <th className="text-left p-2">Currency</th>
                  <th className="text-left p-2">Approval</th>
                  <th className="text-left p-2">Active</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-border/30">
                    <td className="p-2 font-mono">{shortId(r.id)}</td>
                    <td className="p-2 font-mono text-muted-foreground">{shortId(r.business_id)}</td>
                    <td className="p-2 font-mono text-muted-foreground">{shortId(r.partner_id)}</td>
                    <td className="p-2">{r.commission_type}</td>
                    <td className="p-2 text-right">
                      {r.commission_type === "percent" || r.commission_type === "tiered"
                        ? `${Number(r.commission_value ?? 0).toFixed(2)}%`
                        : fmtMoney(r.commission_value, r.currency ?? "GBP")}
                    </td>
                    <td className="p-2 text-muted-foreground">{r.currency ?? "—"}</td>
                    <td className="p-2">
                      {r.approval_required
                        ? <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" />Required</Badge>
                        : <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-400 border-red-500/30">DISABLED — re-enable</Badge>}
                    </td>
                    <td className="p-2">{r.active ? "yes" : "no"}</td>
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
