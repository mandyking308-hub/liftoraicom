import { useEffect, useState } from "react";
import { SopLayout, SopStat } from "./_shared";
import { Card } from "@/components/ui/card";
import { fetchSops, fetchVersions, fetchReviews, fetchConflicts, fetchUsage, summarize, type SopSummary } from "@/lib/sopEngine";

export default function SopsOverview() {
  const [sum, setSum] = useState<SopSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchSops(), fetchVersions(), fetchReviews(), fetchConflicts(), fetchUsage()])
      .then(([s,v,r,c,u]) => setSum(summarize(s,v,r,c,u))).catch(() => setSum(null));
  }, []);
  return (
    <SopLayout title="SOP / Playbook Overview" subtitle="Source of truth for every business process. Drafting, versioning and review run live; publishing an approved SOP, retiring one, or changing compliance / sales / legal playbooks requires founder approval.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <SopStat label="Total SOPs" value={sum?.sops ?? "—"} />
        <SopStat label="Approved" value={sum?.approved ?? "—"} tone="ok" />
        <SopStat label="Drafts" value={sum?.draft ?? "—"} />
        <SopStat label="Review required" value={sum?.review_required ?? "—"} tone={sum?.review_required ? "warn" : undefined} />
        <SopStat label="Reviews overdue" value={sum?.reviews_overdue ?? "—"} tone={sum?.reviews_overdue ? "bad" : "ok"} />
        <SopStat label="Open conflicts" value={sum?.conflicts_open ?? "—"} tone={sum?.conflicts_open ? "bad" : "ok"} />
      </div>
      <Card className="tech-card p-4 text-sm space-y-2">
        <p className="font-semibold">Engine guarantees</p>
        <ul className="list-disc pl-5 text-muted-foreground space-y-1">
          <li>Agents reference approved SOP metadata where available.</li>
          <li>Draft SOPs created internally without external publication.</li>
          <li>Approving or retiring an SOP requires founder/admin.</li>
          <li>Stale-review window configurable per SOP type.</li>
          <li>Historical versions retained for audit.</li>
          <li>Conflict detection across overlapping SOPs.</li>
        </ul>
      </Card>
      {sum?.top_alert && (
        <Card className="tech-card p-4 border-yellow-500/40">
          <p className="text-[11px] uppercase text-muted-foreground">Top alert · {sum.top_alert.severity}</p>
          <p className="text-sm font-medium">{sum.top_alert.summary}</p>
        </Card>
      )}
      {sum && sum.test_records > 0 && (
        <p className="text-[11px] text-muted-foreground">Excluding {sum.test_records} LIVE_INTERNAL_TEST record(s) from operational totals.</p>
      )}
    </SopLayout>
  );
}