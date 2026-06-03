import { useEffect, useState } from "react";
import { AFLayout, AFStat } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  fetchOpportunities, fetchPitchPacks, summariseAcquisitionFunding,
  ACTION_LABEL, fmtMoney,
  type AFOpportunity, type AFPitchPack,
} from "@/lib/acquisitionFundingEngine";

export default function AFOverview() {
  const [opps, setOpps] = useState<AFOpportunity[]>([]);
  const [packs, setPacks] = useState<AFPitchPack[]>([]);
  useEffect(() => {
    fetchOpportunities().then(setOpps).catch(() => {});
    fetchPitchPacks().then(setPacks).catch(() => {});
  }, []);
  const sum = summariseAcquisitionFunding(opps, packs);

  const sections: { title: string; items: AFOpportunity[]; emptyHint: string }[] = [
    { title: "Top acquisition opportunities", items: sum.top_opportunities, emptyHint: "No live opportunities yet." },
    { title: "Assets needing funding", items: sum.assets_needing_funding, emptyHint: "No deals currently flagged as needing external funding." },
    { title: "Best seller-finance candidates", items: sum.best_seller_finance, emptyHint: "No seller-finance candidates." },
    { title: "Best earn-out candidates", items: sum.best_earn_out, emptyHint: "No earn-out candidates." },
    { title: "Best strategic co-buyer candidates", items: sum.best_strategic_co_buyer, emptyHint: "No strategic co-buy candidates." },
    { title: "Best family office / HNW candidates", items: sum.best_family_office_hnw, emptyHint: "No family office / HNW candidates." },
    { title: "Best internal-cash candidates", items: sum.best_internal_cash, emptyHint: "No deals small enough for internal cash." },
    { title: "Opportunities requiring legal review", items: sum.needing_legal_review, emptyHint: "No deals currently flagged for legal review." },
    { title: "Opportunities requiring founder approval", items: sum.awaiting_founder_approval, emptyHint: "No deals awaiting founder approval." },
  ];

  return (
    <AFLayout
      title="Acquisition Funding Command Centre"
      subtitle="Track acquisition opportunities, score them, match to funder types, and prepare pitch packs. Liftor never contacts a funder, advisor or seller automatically — every external action requires founder approval.">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <AFStat label="Opportunities" value={sum.total_opportunities} />
        <AFStat label="Need funding" value={sum.assets_needing_funding.length} accent="amber" />
        <AFStat label="Need legal review" value={sum.needing_legal_review.length} accent="rose" />
        <AFStat label="Awaiting founder" value={sum.awaiting_founder_approval.length} accent="amber" />
        <AFStat label="Pitch packs ready" value={sum.pitch_packs_ready.length} accent="emerald" />
      </div>

      {sections.map(s => (
        <Card key={s.title} className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">{s.title}</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            {s.items.length === 0 && <p className="text-muted-foreground">{s.emptyHint}</p>}
            {s.items.map(o => (
              <div key={o.id} className="flex items-center gap-2 border-b border-border/30 py-1">
                <Link to={`/founder/acquisition-funding/opportunities/${o.id}`} className="hover:text-primary truncate flex-1">
                  {o.opportunity_name}
                </Link>
                <Badge variant="outline" className="text-[10px]">{o.category}</Badge>
                <Badge variant="outline" className="text-[10px]">{ACTION_LABEL[o.recommended_action]}</Badge>
                <span className="text-muted-foreground">{fmtMoney(o.asking_price)}</span>
                <span className="text-muted-foreground">priority {o.overall_priority_score ?? "—"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Pitch packs ready to review</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-1">
          {sum.pitch_packs_ready.length === 0 && <p className="text-muted-foreground">No pitch packs ready for review.</p>}
          {sum.pitch_packs_ready.map(p => (
            <div key={p.id} className="flex items-center gap-2 border-b border-border/30 py-1">
              <Link to={`/founder/acquisition-funding/pitches`} className="hover:text-primary truncate flex-1">
                {p.id.slice(0, 8)} · {p.pitch_status}
              </Link>
              <Badge variant="outline" className="text-[10px]">{p.founder_approval_status}</Badge>
              <span className="text-muted-foreground">{fmtMoney(p.funding_required)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </AFLayout>
  );
}