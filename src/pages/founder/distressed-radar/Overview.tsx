import { useEffect, useState } from "react";
import { DRLayout, Stat } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  fetchOpportunities, fetchDisposals, summariseRadar,
  ACTION_LABEL, fmtMoney,
  type AcquisitionOpportunity, type DisposalAsset,
} from "@/lib/distressedRadarEngine";

export default function DROverview() {
  const [opps, setOpps] = useState<AcquisitionOpportunity[]>([]);
  const [disposals, setDisposals] = useState<DisposalAsset[]>([]);
  useEffect(() => {
    fetchOpportunities().then(setOpps).catch(() => {});
    fetchDisposals().then(setDisposals).catch(() => {});
  }, []);
  const sum = summariseRadar(opps, disposals);
  return (
    <DRLayout title="Distressed Asset & Brand Radar"
      subtitle="Liftor buys only where it has an unfair operating advantage, and sells only assets that are non-core, clean, documented and not strategically valuable.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Tracked opportunities" value={sum.total_opps} />
        <Stat label="New this week" value={sum.weekly_new} accent="emerald" />
        <Stat label="Rejected this week" value={sum.weekly_rejected.length} accent="rose" />
        <Stat label="Awaiting founder approval" value={sum.awaiting_founder_approval.length} accent="amber" />
        <Stat label="Finance needed" value={sum.needing_financing.length} accent="amber" />
        <Stat label="Legal/IP review" value={sum.needing_legal_review.length} accent="amber" />
        <Stat label="Disposal ready" value={sum.disposal_ready.length} accent="emerald" />
        <Stat label="Disposal blocked" value={sum.disposal_blocked.length} accent="rose" />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <List title="Top 10 acquisition opportunities" rows={sum.top_acquisitions} />
        <List title="Top distressed brands to watch" rows={sum.distressed_brands_to_watch} />
        <List title="Top marketplace assets to investigate" rows={sum.marketplace_assets} />
        <List title="Assets needing financing" rows={sum.needing_financing} />
        <List title="Opportunities requiring legal/IP review" rows={sum.needing_legal_review} />
        <List title="Opportunities requiring founder approval" rows={sum.awaiting_founder_approval} />
      </div>

      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Weekly rejected & reasons</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-1">
          {sum.weekly_rejected.length === 0 && <p className="text-muted-foreground">No rejections this week.</p>}
          {sum.weekly_rejected.map(r => (
            <div key={r.opp.id} className="flex justify-between border-b border-border/30 py-1">
              <Link to={`/founder/distressed-radar/acquisition/${r.opp.id}`} className="hover:text-primary">{r.opp.opportunity_name}</Link>
              <span className="text-rose-400">{r.reason}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </DRLayout>
  );
}

function List({ title, rows }: { title: string; rows: AcquisitionOpportunity[] }) {
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="text-xs space-y-1">
        {rows.length === 0 && <p className="text-muted-foreground">No items.</p>}
        {rows.slice(0, 10).map(o => (
          <div key={o.id} className="flex items-center justify-between border-b border-border/30 py-1 gap-2">
            <div className="min-w-0">
              <Link to={`/founder/distressed-radar/acquisition/${o.id}`} className="hover:text-primary font-medium truncate block">{o.opportunity_name}</Link>
              <div className="text-[10px] text-muted-foreground capitalize">{o.category.replace(/_/g, " ")} · {o.distress_type.replace(/_/g, " ")} · {o.source ?? "no source"}</div>
            </div>
            <div className="text-right shrink-0">
              <Badge variant="outline" className="text-[10px]">{o.overall_priority_score ?? "?"}</Badge>
              <div className="text-[10px] text-muted-foreground">{ACTION_LABEL[o.recommended_action]}</div>
              <div className="text-[10px] text-muted-foreground">{fmtMoney(o.asking_price)}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}