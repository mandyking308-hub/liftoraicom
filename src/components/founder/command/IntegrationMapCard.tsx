import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plug } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchCatalog, fetchRequirements, fetchConnections, diagnoseIntegrations, summarize,
  type CatalogRow, type RequirementRow, type ConnectionStatusRow,
} from "@/lib/integrationMapEngine";

export default function IntegrationMapCard() {
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [reqs, setReqs] = useState<RequirementRow[]>([]);
  const [conns, setConns] = useState<ConnectionStatusRow[]>([]);
  useEffect(() => {
    fetchCatalog().then(setCatalog).catch(() => {});
    fetchRequirements().then(setReqs).catch(() => {});
    fetchConnections().then(setConns).catch(() => {});
  }, []);
  const sum = summarize(catalog, reqs, conns);
  const warns = diagnoseIntegrations(catalog, reqs, conns);
  const missing = warns.filter(w => w.severity === "missing").length;
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Plug size={14} className="text-primary" />
          Integration Needs Map
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Providers" value={sum.providers} />
          <Stat label="Needed" value={sum.needed} />
          <Stat label="Connected" value={sum.connected} />
          <Stat label="Missing" value={missing} />
        </div>
        {sum.errors > 0 && <p className="text-destructive">{sum.errors} connection error{sum.errors === 1 ? "" : "s"}.</p>}
        <div className="flex gap-2 pt-1 flex-wrap">
          <Link to="/founder/integration-map" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/integration-map/businesses" className="text-primary hover:underline">By business</Link>
          <Link to="/founder/integration-map/missing" className="text-primary hover:underline">Missing</Link>
          <Link to="/founder/integration-map/risks" className="text-primary hover:underline">Risks</Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="border border-border/50 rounded p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}