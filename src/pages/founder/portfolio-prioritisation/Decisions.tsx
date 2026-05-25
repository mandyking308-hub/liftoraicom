import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PPLayout, PPSection, DecisionBadge } from "./_shared";
import { fetchDecisions, type PriorityDecisionRow } from "@/lib/portfolioPrioritisationEngine";

const STATUS_CLS: Record<string, string> = {
  recommended: "bg-primary/15 text-primary border-primary/30",
  founder_review: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  implemented: "bg-sky-500/15 text-sky-400 border-sky-500/30",
};

export default function PPDecisions() {
  const [decisions, setDecisions] = useState<PriorityDecisionRow[]>([]);
  useEffect(() => { fetchDecisions().then(setDecisions).catch(() => {}); }, []);
  return (
    <PPLayout title="Decision queue"
      subtitle="All portfolio decisions await founder approval before any pause, kill, sale, buyer contact or entity/legal change.">
      <PPSection title={`Decisions (${decisions.length})`}>
        {decisions.length === 0 ? <p className="text-xs text-muted-foreground">No decisions yet.</p> : (
          <div className="space-y-2">
            {decisions.map(d => (
              <div key={d.id} className="border border-border/50 rounded p-3 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px]">{d.business_id.slice(0,8)}</span>
                  <DecisionBadge decision={d.decision_type} />
                  <Badge variant="outline" className={`text-[10px] ${STATUS_CLS[d.decision_status] ?? "border-border/50"}`}>{d.decision_status}</Badge>
                  <span className="ml-auto text-[10px] text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</span>
                </div>
                {d.reason && <p className="text-[11px] text-muted-foreground"><span className="text-foreground">Reason:</span> {d.reason}</p>}
                {d.expected_impact && <p className="text-[11px] text-muted-foreground"><span className="text-foreground">Impact:</span> {d.expected_impact}</p>}
              </div>
            ))}
          </div>
        )}
      </PPSection>
    </PPLayout>
  );
}