import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Gauge, ArrowRight } from "lucide-react";
import { computeCapacitySnapshot, type CapacitySnapshot } from "@/lib/capacityEngine";

export default function CapacityPlanningCard() {
  const [snap, setSnap] = useState<CapacitySnapshot | null>(null);
  useEffect(() => { computeCapacitySnapshot().then(setSnap); }, []);

  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Gauge size={16} className="text-primary" />
          Capacity / Workload Planning
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-auto">Live</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
            <Lock size={9} className="mr-1" /> Sales pause gated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!snap ? <p className="text-xs text-muted-foreground">Loading…</p> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Stat label="Utilisation" value={`${Math.round(snap.capacity_utilisation * 100)}%`} tone={snap.capacity_utilisation >= 1 ? "bad" : snap.capacity_utilisation >= 0.85 ? "warn" : "good"} />
              <Stat label="Over capacity" value={snap.over} tone={snap.over > 0 ? "bad" : "good"} />
              <Stat label="Blocked" value={snap.workload_blocked} tone={snap.workload_blocked > 0 ? "warn" : "good"} />
              <Stat label="Bottlenecks" value={snap.bottlenecks_open} tone={snap.bottlenecks_critical > 0 ? "bad" : snap.bottlenecks_open > 0 ? "warn" : "good"} />
            </div>
            <p className="text-xs text-muted-foreground">{snap.recommended_action}</p>
            <Link to="/founder/capacity" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
              Open Capacity Console <ArrowRight size={12} />
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