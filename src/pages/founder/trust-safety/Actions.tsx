import { useQuery } from "@tanstack/react-query";
import { TsLayout, StatusBadge, Stat } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listActions } from "@/lib/trustSafety";

export default function TsActions() {
  const { data: rows = [] } = useQuery({ queryKey: ["ts-actions"], queryFn: () => listActions({ limit: 500 }) });
  const draft = rows.filter(r => r.action_status === "draft").length;
  const approval = rows.filter(r => r.action_status === "approval_required").length;
  const completed = rows.filter(r => r.action_status === "completed").length;
  return (
    <TsLayout title="Action recommendations" subtitle="Suggested actions per risk event. All default to founder approval — nothing executes from this page.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="All actions" value={rows.length} />
        <Stat label="Drafts" value={draft} tone={draft ? "warn" : undefined} />
        <Stat label="Approval required" value={approval} tone={approval ? "warn" : undefined} />
        <Stat label="Completed" value={completed} tone="ok" />
      </div>
      <Card className="tech-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 text-muted-foreground">
            <tr><th className="text-left p-2">When</th><th className="text-left p-2">Action type</th><th className="text-left p-2">Status</th><th className="text-left p-2">Approval</th><th className="text-left p-2">Risk event</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No actions.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border/30">
                <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2 capitalize">{r.action_type.replace(/_/g," ")}</td>
                <td className="p-2"><StatusBadge status={r.action_status} /></td>
                <td className="p-2">{r.founder_approval_required ? <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Required</Badge> : <Badge variant="outline" className="text-[10px]">Pre-approved</Badge>}</td>
                <td className="p-2 font-mono text-[10px] text-muted-foreground">{r.trust_risk_event_id.slice(0,8)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </TsLayout>
  );
}
