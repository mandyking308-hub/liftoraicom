import { useEffect, useState } from "react";
import { AFLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  fetchPitchPacks, fetchOpportunities, pitchPackReadiness, fmtMoney,
  type AFPitchPack, type AFOpportunity,
} from "@/lib/acquisitionFundingEngine";

export default function AFPitches() {
  const [packs, setPacks] = useState<AFPitchPack[]>([]);
  const [opps, setOpps] = useState<AFOpportunity[]>([]);
  useEffect(() => {
    fetchPitchPacks().then(setPacks).catch(() => {});
    fetchOpportunities().then(setOpps).catch(() => {});
  }, []);
  const byId = new Map(opps.map(o => [o.id, o]));
  return (
    <AFLayout title="Pitch Packs" subtitle="Acquisition memos and capital-stack proposals. Generated internally. Never sent to a funder without founder approval.">
      {packs.length === 0 && <p className="text-xs text-muted-foreground">No pitch packs yet.</p>}
      {packs.map(p => {
        const o = byId.get(p.opportunity_id);
        const r = pitchPackReadiness(p);
        return (
          <Card key={p.id} className="tech-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                {o ? <Link to={`/founder/acquisition-funding/opportunities/${o.id}`} className="hover:text-primary">{o.opportunity_name}</Link> : "Unknown opportunity"}
                <Badge variant="outline" className="text-[10px]">{p.pitch_status}</Badge>
                <Badge variant="outline" className="text-[10px]">{p.founder_approval_status}</Badge>
                <Badge variant="outline" className={`text-[10px] ${r.ready ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-amber-500/15 text-amber-300 border-amber-500/30"}`}>
                  {r.ready ? "Complete" : `${r.missing.length} missing`}
                </Badge>
                <span className="ml-auto text-muted-foreground text-[10px]">Funding required {fmtMoney(p.funding_required)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1">
              {p.investment_thesis && <p><span className="text-muted-foreground">Thesis: </span>{p.investment_thesis}</p>}
              {p.why_now && <p><span className="text-muted-foreground">Why now: </span>{p.why_now}</p>}
              {p.liftor_advantage && <p><span className="text-muted-foreground">Liftor advantage: </span>{p.liftor_advantage}</p>}
              {p.funder_shortlist?.length > 0 && (
                <p><span className="text-muted-foreground">Funder shortlist: </span>{p.funder_shortlist.join(", ")}</p>
              )}
              {!r.ready && <p className="text-amber-300">Missing: {r.missing.join(", ")}</p>}
            </CardContent>
          </Card>
        );
      })}
    </AFLayout>
  );
}