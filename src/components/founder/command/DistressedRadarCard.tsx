import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radar } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchOpportunities, fetchDisposals, summariseRadar,
  type AcquisitionOpportunity, type DisposalAsset,
} from "@/lib/distressedRadarEngine";

export default function DistressedRadarCard() {
  const [opps, setOpps] = useState<AcquisitionOpportunity[]>([]);
  const [disposals, setDisposals] = useState<DisposalAsset[]>([]);
  useEffect(() => {
    fetchOpportunities().then(setOpps).catch(() => {});
    fetchDisposals().then(setDisposals).catch(() => {});
  }, []);
  const sum = summariseRadar(opps, disposals);
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Radar size={14} className="text-primary" />
          Distressed Asset & Brand Radar
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Internal</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Tracked" value={sum.total_opps} />
          <Stat label="New /wk" value={sum.weekly_new} />
          <Stat label="Rejected /wk" value={sum.weekly_rejected.length} />
          <Stat label="Approval" value={sum.awaiting_founder_approval.length} />
          <Stat label="Finance" value={sum.needing_financing.length} />
          <Stat label="Legal" value={sum.needing_legal_review.length} />
          <Stat label="Disposal ready" value={sum.disposal_ready.length} />
          <Stat label="Disposal blocked" value={sum.disposal_blocked.length} />
          <Stat label="Top priority" value={sum.top_acquisitions[0]?.overall_priority_score ?? "—"} />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link to="/founder/distressed-radar" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/distressed-radar/acquisition" className="text-primary hover:underline">Acquisition Radar</Link>
          <Link to="/founder/distressed-radar/disposal" className="text-primary hover:underline">Disposal Shelf</Link>
          <Link to="/founder/distressed-radar/financing" className="text-primary hover:underline">Financing</Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-border/50 rounded p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}