import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RTLayout } from "./_shared";
import { fetchConflicts, SEVERITY_META, STATUS_META, type ReportingConflict } from "@/lib/reportingTruthEngine";

export default function Conflicts() {
  const [rows, setRows] = useState<ReportingConflict[]>([]);
  useEffect(() => { fetchConflicts().then(setRows); }, []);
  return (
    <RTLayout title="Reporting Conflict Board" subtitle="Every disagreement between dashboards, sources or definitions surfaces here for founder review. Nothing is auto-corrected.">
      <Card className="tech-card">
        <CardContent className="pt-4 space-y-2 text-xs">
          {rows.length === 0 && <p className="text-muted-foreground">No conflicts logged.</p>}
          {rows.map(c => (
            <div key={c.id} className="border border-border/50 rounded p-3 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-[10px] ${SEVERITY_META[c.severity].cls}`}>{SEVERITY_META[c.severity].label}</Badge>
                <Badge variant="outline" className={`text-[10px] ${STATUS_META[c.conflict_status].cls}`}>{STATUS_META[c.conflict_status].label}</Badge>
                <Badge variant="outline" className="text-[10px]">{c.conflict_type.replace(/_/g," ")}</Badge>
                {c.audit_metadata?.label === "LIVE_INTERNAL_TEST" && (
                  <Badge variant="outline" className="text-[10px] bg-purple-500/15 text-purple-300 border-purple-500/30">LIVE_INTERNAL_TEST</Badge>
                )}
                <span className="text-[10px] text-muted-foreground ml-auto">{new Date(c.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm font-medium">{c.conflict_summary}</p>
              <p className="text-[11px] text-muted-foreground">Sources: <span className="text-foreground">{c.source_a ?? "—"}</span> vs <span className="text-foreground">{c.source_b ?? "—"}</span></p>
              {c.recommended_fix && <p className="text-[11px] text-primary/90">Recommended: {c.recommended_fix}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </RTLayout>
  );
}