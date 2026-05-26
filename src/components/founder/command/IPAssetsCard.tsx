import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copyright } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchAssets, fetchRights, fetchOpportunities, summarize, diagnose,
  type DigitalAsset, type RightsRecord, type LicensingOpportunity,
} from "@/lib/ipAssetsEngine";

export default function IPAssetsCard() {
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [rights, setRights] = useState<RightsRecord[]>([]);
  const [opps, setOpps] = useState<LicensingOpportunity[]>([]);
  useEffect(() => {
    fetchAssets().then(setAssets).catch(() => {});
    fetchRights().then(setRights).catch(() => {});
    fetchOpportunities().then(setOpps).catch(() => {});
  }, []);
  const sum = summarize(assets, rights, opps);
  const diags = diagnose(assets, rights, opps);
  const blocks = diags.filter(d => d.severity === "block").length;
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Copyright size={14} className="text-primary" />
          Digital Asset / IP / Licensing
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Assets" value={sum.assets_active} />
          <Stat label="Unknown" value={sum.unknown_rights} />
          <Stat label="Expired" value={sum.expired_status} />
          <Stat label="Expiring 30d" value={sum.rights_expiring_soon} />
          <Stat label="Opps" value={sum.opps_total} />
          <Stat label="Approval" value={sum.opps_approval} />
        </div>
        {blocks > 0 && <p className="text-destructive">{blocks} blocking issue{blocks === 1 ? "" : "s"}.</p>}
        <div className="flex gap-2 pt-1 flex-wrap">
          <Link to="/founder/ip-assets" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/ip-assets/catalogue" className="text-primary hover:underline">Catalogue</Link>
          <Link to="/founder/ip-assets/rights" className="text-primary hover:underline">Rights</Link>
          <Link to="/founder/ip-assets/licensing" className="text-primary hover:underline">Licensing</Link>
          <Link to="/founder/ip-assets/distribution" className="text-primary hover:underline">Distribution</Link>
          <Link to="/founder/ip-assets/risks" className="text-primary hover:underline">Risks</Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-border/50 rounded p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}
