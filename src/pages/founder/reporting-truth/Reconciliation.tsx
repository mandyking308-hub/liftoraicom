import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RTLayout, RTStat } from "./_shared";
import { fetchSnapshots, fetchConflicts, type ReportingSnapshot, type ReportingConflict, SEVERITY_META } from "@/lib/reportingTruthEngine";

export default function Reconciliation() {
  const [snaps, setSnaps] = useState<ReportingSnapshot[]>([]);
  const [conflicts, setConflicts] = useState<ReportingConflict[]>([]);
  useEffect(() => {
    fetchSnapshots().then(setSnaps);
    fetchConflicts().then(setConflicts);
  }, []);
  const open = conflicts.filter(c => c.conflict_status === "open" || c.conflict_status === "review_required");
  return (
    <RTLayout title="Reconciliation Dashboard" subtitle="Cross-source agreement on confirmed revenue, pipeline, AI cost, marketplace and portfolio metrics.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <RTStat label="Snapshots" value={snaps.length} />
        <RTStat label="Open mismatches" value={open.length} tone={open.length > 0 ? "warn" : "ok"} />
        <RTStat label="Revenue mismatches" value={open.filter(c => c.conflict_type === "revenue_mismatch").length} />
        <RTStat label="Pipeline mismatches" value={open.filter(c => c.conflict_type === "pipeline_mismatch").length} />
      </div>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent snapshots</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-2">
          {snaps.length === 0 && <p className="text-muted-foreground">No snapshots yet. The Reporting Truth Agent will generate the next daily snapshot on its schedule.</p>}
          {snaps.map(s => (
            <div key={s.id} className="border border-border/50 rounded p-2 flex items-start gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">{s.snapshot_type}</Badge>
              <span className="text-[11px] text-muted-foreground">{new Date(s.period_start).toLocaleDateString()} – {new Date(s.period_end).toLocaleDateString()}</span>
              <span className="text-[11px] ml-auto">{Object.keys(s.metrics ?? {}).length} metrics</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Open reconciliation items</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-2">
          {open.length === 0 && <p className="text-muted-foreground">All sources agree.</p>}
          {open.map(c => (
            <div key={c.id} className="border border-border/50 rounded p-2 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-[10px] ${SEVERITY_META[c.severity].cls}`}>{SEVERITY_META[c.severity].label}</Badge>
                <Badge variant="outline" className="text-[10px]">{c.source_a} vs {c.source_b}</Badge>
              </div>
              <p>{c.conflict_summary}</p>
              {c.recommended_fix && <p className="text-primary/90 text-[11px]">Fix: {c.recommended_fix}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </RTLayout>
  );
}