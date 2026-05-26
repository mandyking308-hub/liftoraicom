import { useQuery } from "@tanstack/react-query";
import { RhLayout, Stat, StatusBadge, ScoreBar } from "./_shared";
import { Card } from "@/components/ui/card";
import { listScores, RelType } from "@/lib/relationshipHealth";

export function HealthBoard({ type, title, subtitle }: { type: RelType; title: string; subtitle?: string }) {
  const { data: rows = [] } = useQuery({ queryKey: ["rh-board", type], queryFn: () => listScores(type, 300) });
  const excellent = rows.filter(r => r.relationship_status === "excellent").length;
  const healthy = rows.filter(r => r.relationship_status === "healthy").length;
  const watch = rows.filter(r => r.relationship_status === "watch").length;
  const atRisk = rows.filter(r => r.relationship_status === "at_risk").length;
  const critical = rows.filter(r => r.relationship_status === "critical").length;
  return (
    <RhLayout title={title} subtitle={subtitle}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Total" value={rows.length} />
        <Stat label="Excellent" value={excellent} tone="ok" />
        <Stat label="Healthy" value={healthy} tone="ok" />
        <Stat label="Watch" value={watch} tone={watch ? "warn" : undefined} />
        <Stat label="At risk / Critical" value={atRisk + critical} tone={atRisk + critical ? "bad" : undefined} />
      </div>
      <Card className="tech-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 text-muted-foreground">
            <tr>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Health</th>
              <th className="text-left p-2">Risk</th>
              <th className="text-left p-2">Value</th>
              <th className="text-left p-2">Engagement</th>
              <th className="text-left p-2">Recommended action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No scored {type}s yet.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border/30">
                <td className="p-2"><StatusBadge status={r.relationship_status} /></td>
                <td className="p-2 w-32"><div className="flex items-center gap-2"><span className="w-8 text-right">{Math.round(Number(r.health_score))}</span><div className="flex-1"><ScoreBar value={Number(r.health_score)} /></div></div></td>
                <td className="p-2">{Math.round(Number(r.risk_score))}</td>
                <td className="p-2">{Math.round(Number(r.value_score))}</td>
                <td className="p-2">{Math.round(Number(r.engagement_score))}</td>
                <td className="p-2 text-muted-foreground max-w-[280px] truncate">{r.recommended_action ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </RhLayout>
  );
}
