import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Banknote } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchOpportunities, fetchPitchPacks, summariseAcquisitionFunding,
  type AFOpportunity, type AFPitchPack,
} from "@/lib/acquisitionFundingEngine";

export default function AcquisitionFundingCard() {
  const [opps, setOpps] = useState<AFOpportunity[]>([]);
  const [packs, setPacks] = useState<AFPitchPack[]>([]);
  useEffect(() => {
    fetchOpportunities().then(setOpps).catch(() => {});
    fetchPitchPacks().then(setPacks).catch(() => {});
  }, []);
  const sum = summariseAcquisitionFunding(opps, packs);
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Banknote size={14} className="text-primary" />
          Acquisition Funding
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Internal</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Tracked" value={sum.total_opportunities} />
          <Stat label="Need funding" value={sum.assets_needing_funding.length} />
          <Stat label="Approval" value={sum.awaiting_founder_approval.length} />
          <Stat label="Seller-fin fit" value={sum.best_seller_finance.length} />
          <Stat label="Earn-out fit" value={sum.best_earn_out.length} />
          <Stat label="Co-buyer fit" value={sum.best_strategic_co_buyer.length} />
          <Stat label="HNW / FO" value={sum.best_family_office_hnw.length} />
          <Stat label="Internal cash" value={sum.best_internal_cash.length} />
          <Stat label="Pitches ready" value={sum.pitch_packs_ready.length} />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link to="/founder/acquisition-funding" className="text-primary hover:underline">Command Centre</Link>
          <Link to="/founder/acquisition-funding/opportunities" className="text-primary hover:underline">Opportunities</Link>
          <Link to="/founder/acquisition-funding/funders" className="text-primary hover:underline">Funders</Link>
          <Link to="/founder/acquisition-funding/deals" className="text-primary hover:underline">Deals</Link>
          <Link to="/founder/acquisition-funding/pitches" className="text-primary hover:underline">Pitches</Link>
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