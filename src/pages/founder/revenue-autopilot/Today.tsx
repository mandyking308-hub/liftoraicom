import { useEffect, useState } from "react";
import { RALayout, RASection, RAStat, RAEmpty } from "./_shared";
import { computeRevenueLoop, type RevenueLoopSnapshot } from "@/lib/revenueAutopilot";
import { Badge } from "@/components/ui/badge";

export default function RevenueAutopilotToday() {
  const [snap, setSnap] = useState<RevenueLoopSnapshot | null>(null);
  useEffect(() => { computeRevenueLoop().then(setSnap); }, []);
  if (!snap) return <RALayout title="Today"><p className="text-xs text-muted-foreground">Loading…</p></RALayout>;

  return (
    <RALayout title="Today" subtitle="The exact revenue work for today, computed live from sales, CRM, upgrades and finance.">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <RAStat label="Required actions" value={snap.top_actions.length} />
        <RAStat label="Hot leads" value={snap.hot_leads} />
        <RAStat label="Approvals waiting" value={snap.approvals_blocking} tone={snap.approvals_blocking > 0 ? "bad" : "good"} />
      </div>
      <RASection title="Recommended sequence">
        {snap.top_actions.length === 0 ? <RAEmpty title="Nothing required" hint="Loop is clean today." /> : (
          <ul className="space-y-2 text-xs">
            {snap.top_actions.map((a, i) => (
              <li key={i} className="flex justify-between border-b border-border/40 pb-2">
                <span>{i + 1}. {a.title} <span className="text-muted-foreground">— {a.agent}</span></span>
                <Badge variant="outline" className="text-[10px]">{a.priority}</Badge>
              </li>
            ))}
          </ul>
        )}
      </RASection>
      <RASection title="Revenue Manager Agent says"><p className="text-sm">{snap.recommended_action}</p></RASection>
    </RALayout>
  );
}