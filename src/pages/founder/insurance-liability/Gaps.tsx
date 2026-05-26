import { useEffect, useState } from "react";
import { toast } from "sonner";
import { InsLayout, InsSection, SeverityBadge, shortId } from "./_shared";
import { Badge } from "@/components/ui/badge";
import {
  fetchGaps, updateGapStatus, type InsuranceGap, type GapStatus,
} from "@/lib/insuranceLiabilityEngine";

const STATUS_LABEL: Record<GapStatus, string> = {
  open: "Open", review_required: "Review required", resolved: "Resolved", accepted: "Accepted",
};
const STATUS_CLS: Record<GapStatus, string> = {
  open:            "bg-red-500/15 text-red-400 border-red-500/30",
  review_required: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  resolved:        "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  accepted:        "bg-muted text-muted-foreground border-border/50",
};

export default function InsuranceGaps() {
  const [rows, setRows] = useState<InsuranceGap[]>([]);
  const load = () => fetchGaps().then(setRows).catch(() => {});
  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: GapStatus) {
    try {
      await updateGapStatus(id, status);
      toast.success(`Gap marked ${STATUS_LABEL[status]}. Adviser communication still requires approval.`);
      load();
    } catch (e: any) { toast.error(e?.message ?? "Update failed"); }
  }

  return (
    <InsLayout title="Gap dashboard"
      subtitle="Insurance gaps detected per business. Critical and high gaps require adviser review before any cover decision.">
      <InsSection title={`Gaps (${rows.length})`} description="Adviser review is recorded internally only — agent cannot contact advisers.">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No gap assessments logged.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="text-left p-2">Business</th>
                  <th className="text-left p-2">Risk</th>
                  <th className="text-left p-2">Severity</th>
                  <th className="text-left p-2">Recommended cover</th>
                  <th className="text-left p-2">Adviser</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Internal action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(g => (
                  <tr key={g.id} className="border-b border-border/20 hover:bg-secondary/30">
                    <td className="p-2 text-muted-foreground">{shortId(g.business_id)}</td>
                    <td className="p-2">{g.risk_type}<div className="text-[10px] text-muted-foreground">{g.gap_summary?.slice(0, 80)}</div></td>
                    <td className="p-2"><SeverityBadge s={g.severity} /></td>
                    <td className="p-2">{g.recommended_cover ?? "—"}</td>
                    <td className="p-2">{g.adviser_review_required ? <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Review required</Badge> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="p-2"><Badge variant="outline" className={`text-[10px] ${STATUS_CLS[g.status]}`}>{STATUS_LABEL[g.status]}</Badge></td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {(["open", "review_required", "resolved", "accepted"] as GapStatus[]).filter(s => s !== g.status).map(s => (
                          <button key={s} onClick={() => setStatus(g.id, s)}
                            className="text-[10px] px-1.5 py-0.5 rounded border border-border/50 hover:bg-secondary">
                            {STATUS_LABEL[s]}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </InsSection>
    </InsLayout>
  );
}