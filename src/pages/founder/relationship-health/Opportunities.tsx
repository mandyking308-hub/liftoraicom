import { useQuery } from "@tanstack/react-query";
import { RhLayout, Stat } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listOpportunities } from "@/lib/relationshipHealth";

export default function RhOpportunities() {
  const { data: rows = [] } = useQuery({ queryKey: ["rh-opps"], queryFn: () => listOpportunities({ limit: 500 }) });
  const upgrade = rows.filter(r => r.opportunity_type === "upgrade").length;
  const retention = rows.filter(r => r.opportunity_type === "retention").length;
  const partner = rows.filter(r => r.opportunity_type === "partner_growth").length;
  const approval = rows.filter(r => r.status === "approval_required").length;
  return (
    <RhLayout title="Opportunities" subtitle="Upgrade, renewal, retention, referral, seller and partner opportunities. All external action gated by approval.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="All opps" value={rows.length} />
        <Stat label="Upgrade" value={upgrade} tone={upgrade ? "ok" : undefined} />
        <Stat label="Retention" value={retention} tone={retention ? "warn" : undefined} />
        <Stat label="Partner growth" value={partner} />
      </div>
      <Card className="tech-card p-3">
        <div className="text-xs font-semibold mb-2 flex items-center gap-2">Awaiting approval <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">{approval}</Badge></div>
      </Card>
      <Card className="tech-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 text-muted-foreground">
            <tr><th className="text-left p-2">Type</th><th className="text-left p-2">Summary</th><th className="text-left p-2">Est. value</th><th className="text-left p-2">Probability</th><th className="text-left p-2">Status</th><th className="text-left p-2">Approval</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No opportunities yet.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border/30">
                <td className="p-2 capitalize">{r.opportunity_type.replace(/_/g," ")}</td>
                <td className="p-2 max-w-[300px] truncate text-muted-foreground">{r.opportunity_summary ?? "—"}</td>
                <td className="p-2">{r.estimated_value != null ? `${r.currency ?? ""} ${Number(r.estimated_value).toLocaleString()}` : "—"}</td>
                <td className="p-2">{r.probability_score != null ? `${Math.round(Number(r.probability_score))}%` : "—"}</td>
                <td className="p-2 capitalize">{r.status.replace(/_/g," ")}</td>
                <td className="p-2">{r.approval_required ? <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Required</Badge> : <Badge variant="outline" className="text-[10px]">Not required</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </RhLayout>
  );
}
