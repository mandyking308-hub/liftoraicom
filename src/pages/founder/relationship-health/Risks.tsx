import { useQuery } from "@tanstack/react-query";
import { RhLayout, Stat, StatusBadge, ScoreBar } from "./_shared";
import { Card } from "@/components/ui/card";
import { listScores } from "@/lib/relationshipHealth";

export default function RhRisks() {
  const { data: rows = [] } = useQuery({ queryKey: ["rh-risks"], queryFn: () => listScores(undefined, 500) });
  const atRisk = rows.filter(r => r.relationship_status === "at_risk" || r.relationship_status === "critical");
  const critical = rows.filter(r => r.relationship_status === "critical").length;
  return (
    <RhLayout title="At-risk relationships" subtitle="Relationships flagged at_risk or critical. No automatic contact — review and route via Approval Queue.">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="At-risk or critical" value={atRisk.length} tone={atRisk.length ? "bad" : undefined} />
        <Stat label="Critical only" value={critical} tone={critical ? "bad" : undefined} />
        <Stat label="Total scored" value={rows.length} />
      </div>
      <Card className="tech-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 text-muted-foreground">
            <tr><th className="text-left p-2">Status</th><th className="text-left p-2">Type</th><th className="text-left p-2">Health</th><th className="text-left p-2">Risk</th><th className="text-left p-2">Recommended action</th></tr>
          </thead>
          <tbody>
            {atRisk.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No at-risk relationships.</td></tr>}
            {atRisk.map(r => (
              <tr key={r.id} className="border-t border-border/30">
                <td className="p-2"><StatusBadge status={r.relationship_status} /></td>
                <td className="p-2 capitalize">{r.relationship_type}</td>
                <td className="p-2 w-32"><div className="flex items-center gap-2"><span className="w-8 text-right">{Math.round(Number(r.health_score))}</span><div className="flex-1"><ScoreBar value={Number(r.health_score)} /></div></div></td>
                <td className="p-2">{Math.round(Number(r.risk_score))}</td>
                <td className="p-2 text-muted-foreground max-w-[320px] truncate">{r.recommended_action ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </RhLayout>
  );
}
