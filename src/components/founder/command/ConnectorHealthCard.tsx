import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plug, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchConnectors, fetchAssignments, fetchWebhooks, summarize, type RegistrySummary } from "@/lib/connectorRegistry";

export default function ConnectorHealthCard() {
  const [sum, setSum] = useState<RegistrySummary | null>(null);
  useEffect(() => {
    Promise.all([fetchConnectors(), fetchAssignments(), fetchWebhooks()])
      .then(([c,a,w]) => setSum(summarize(c,a,w))).catch(() => setSum(null));
  }, []);
  const warn = (n: number) => n > 0 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  const bad  = (n: number) => n > 0 ? "bg-red-500/10 text-red-300 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Plug size={14} className="text-primary" />
          Connector Health
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live tracking</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30">
            <Lock size={9} className="mr-1" /> Provider actions gated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">AI, voice, payments, calendars, email, social, marketplaces — everything Liftor connects to. Secrets never shown. Provider mutations require founder approval.</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Tile to="/founder/connectors/registry"     label="Connectors"        value={sum?.connectors_active} />
          <Tile to="/founder/connectors/business-map" label="Live"              value={sum?.assignments_live} />
          <Tile to="/founder/connectors/health"       label="Failed"            value={sum?.assignments_failed} cls={bad(sum?.assignments_failed ?? 0)} />
          <Tile to="/founder/connectors/secrets"      label="Missing secret"    value={sum?.assignments_missing_secret} cls={warn(sum?.assignments_missing_secret ?? 0)} />
          <Tile to="/founder/connectors/webhooks"     label="Webhooks off"      value={sum?.webhooks_not_configured} cls={warn(sum?.webhooks_not_configured ?? 0)} />
          <Tile to="/founder/connectors/business-map" label="Critical on"       value={sum?.critical_risk_count} cls={bad(sum?.critical_risk_count ?? 0)} />
        </div>
        {sum?.top_alert && (
          <div className="border border-primary/30 rounded p-2 bg-primary/5">
            <p className="text-[10px] uppercase text-muted-foreground">Top alert · {sum.top_alert.severity}</p>
            <p className="text-sm font-medium">{sum.top_alert.summary}</p>
          </div>
        )}
        <div className="flex gap-2 flex-wrap text-[11px]">
          <Link to="/founder/connectors" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/connectors/registry" className="text-primary hover:underline">Registry</Link>
          <Link to="/founder/connectors/health" className="text-primary hover:underline">Health</Link>
          <Link to="/founder/connectors/webhooks" className="text-primary hover:underline">Webhooks</Link>
          <Link to="/founder/connectors/secrets" className="text-primary hover:underline">Secrets</Link>
          <Link to="/founder/connectors/business-map" className="text-primary hover:underline">Business map</Link>
        </div>
      </CardContent>
    </Card>
  );
}
function Tile({ to, label, value, cls }: { to: string; label: string; value: any; cls?: string }) {
  return (
    <Link to={to} className={`border ${cls ?? "border-border/50"} rounded p-2 hover:border-primary/40 transition`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value ?? "—"}</p>
    </Link>
  );
}