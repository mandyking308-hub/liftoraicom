import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { WdLayout, TagBadge } from "./_shared";
import { listPlans, listDataRetention } from "@/lib/windDownEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WindDownArchive() {
  const { data: plans = [] } = useQuery({ queryKey: ["wd-plans"], queryFn: listPlans });
  const { data: data = [] } = useQuery({ queryKey: ["wd-data"], queryFn: listDataRetention });
  const archived = plans.filter(p => p.status === "complete" || p.mode === "archive");
  const archives = data.filter(d => d.action === "archive");
  return (
    <FounderLayout>
      <WdLayout title="Archive" subtitle="Completed wind-downs and archived datasets. Audit trail preserved.">
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Archived businesses</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {archived.length === 0 && <p className="text-muted-foreground">No archived businesses yet.</p>}
            {archived.map(p => (
              <div key={p.id} className="border border-border/40 rounded p-2 flex flex-wrap items-center gap-2">
                <span className="font-medium">{p.business_name}</span>
                <TagBadge label={p.mode} tone="info" />
                <TagBadge label={p.status} tone="ok" />
                {p.target_date && <span className="text-muted-foreground">{p.target_date}</span>}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Archived datasets</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {archives.length === 0 && <p className="text-muted-foreground">No archived datasets yet.</p>}
            {archives.map(d => (
              <div key={d.id} className="border border-border/40 rounded p-2 flex flex-wrap items-center gap-2">
                <span className="font-medium">{d.dataset}</span>
                <TagBadge label={d.policy} tone="muted" />
                <TagBadge label={d.status} tone={d.status === "complete" ? "ok" : "warn"} />
                {d.archive_location && <span className="text-muted-foreground">@ {d.archive_location}</span>}
                {d.retain_until && <span className="text-muted-foreground">until {d.retain_until}</span>}
              </div>
            ))}
          </CardContent>
        </Card>
      </WdLayout>
    </FounderLayout>
  );
}