import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Database, ArrowRight } from "lucide-react";
import { computeDataQualitySnapshot, type DataQualitySnapshot } from "@/lib/dataQualityEngine";

export default function DataQualityCard() {
  const [snap, setSnap] = useState<DataQualitySnapshot | null>(null);
  useEffect(() => { computeDataQualitySnapshot().then(setSnap); }, []);

  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database size={16} className="text-primary" />
          Data Quality / Governance
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-auto">Live scans</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
            <Lock size={9} className="mr-1" /> Deletes gated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!snap ? <p className="text-xs text-muted-foreground">Loading…</p> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Stat label="Score" value={snap.quality_score} tone={snap.quality_score >= 90 ? "good" : snap.quality_score >= 70 ? "warn" : "bad"} />
              <Stat label="Open" value={snap.open + snap.approval_required} tone={(snap.open + snap.approval_required) > 0 ? "warn" : "good"} />
              <Stat label="Critical" value={snap.critical_open} tone={snap.critical_open > 0 ? "bad" : "good"} />
              <Stat label="Repair queue" value={snap.repair_actions_pending} tone={snap.repair_actions_pending > 0 ? "warn" : "good"} />
            </div>
            <p className="text-xs text-muted-foreground">{snap.recommended_action}</p>
            <Link to="/founder/data-quality" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
              Open Data Quality Console <ArrowRight size={12} />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "good" | "warn" | "bad" }) {
  const cls = tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-yellow-400" : tone === "bad" ? "text-red-400" : "text-foreground";
  return (
    <div className="rounded border border-border/40 p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${cls}`}>{value}</p>
    </div>
  );
}