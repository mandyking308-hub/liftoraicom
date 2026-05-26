import { useEffect, useState } from "react";
import { BRLayout, BRStat } from "./_shared";
import { Card } from "@/components/ui/card";
import { fetchBackups, fetchExports, fetchChecklists, fetchPacks, summarize, type BRSummary } from "@/lib/backupRecoveryEngine";

export default function BROverview() {
  const [sum, setSum] = useState<BRSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchBackups(), fetchExports(), fetchChecklists(), fetchPacks()])
      .then(([b,e,c,p]) => setSum(summarize(b,e,c,p))).catch(() => setSum(null));
  }, []);
  return (
    <BRLayout title="Backup / Export / Recovery" subtitle="Backup visibility, export preparation, recovery checklists and emergency operating pack. Actual exports, restores and public sharing are founder-gated. Restore operations are never automatic.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <BRStat label="Systems tracked" value={sum?.systems ?? "—"} />
        <BRStat label="Healthy" value={sum?.healthy ?? "—"} tone="ok" />
        <BRStat label="Unknown" value={sum?.unknown ?? "—"} tone={sum?.unknown ? "warn" : undefined} />
        <BRStat label="Failed" value={sum?.failed ?? "—"} tone={sum?.failed ? "bad" : "ok"} />
        <BRStat label="Critical at risk" value={sum?.critical_unknown_or_failed ?? "—"} tone={sum?.critical_unknown_or_failed ? "bad" : "ok"} />
        <BRStat label="Export approvals" value={sum?.exports_awaiting_approval ?? "—"} tone={sum?.exports_awaiting_approval ? "warn" : undefined} />
      </div>
      <Card className="tech-card p-4 text-sm space-y-2">
        <p className="font-semibold">Engine guarantees</p>
        <ul className="list-disc pl-5 text-muted-foreground space-y-1">
          <li>Backup status surfaced for known and unknown systems.</li>
          <li>Exports are prepared internally; generation requires founder approval.</li>
          <li>Recovery checklists per scenario; no automatic restore.</li>
          <li>Emergency operating pack drafted internally; sharing is approval-gated.</li>
          <li>Raw secrets are never included in exports — references only.</li>
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
    </BRLayout>
  );
}