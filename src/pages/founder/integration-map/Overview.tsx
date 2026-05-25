import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IMLayout, IMSection, IMStat, RiskBadge } from "./_shared";
import {
  fetchCatalog, fetchRequirements, fetchConnections, summarize, diagnoseIntegrations,
  type CatalogRow, type RequirementRow, type ConnectionStatusRow,
} from "@/lib/integrationMapEngine";

export default function IMOverview() {
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [reqs, setReqs] = useState<RequirementRow[]>([]);
  const [conns, setConns] = useState<ConnectionStatusRow[]>([]);
  useEffect(() => {
    fetchCatalog().then(setCatalog).catch(() => {});
    fetchRequirements().then(setReqs).catch(() => {});
    fetchConnections().then(setConns).catch(() => {});
  }, []);
  const sum = summarize(catalog, reqs, conns);
  const warnings = diagnoseIntegrations(catalog, reqs, conns);
  return (
    <IMLayout
      title="Integration Needs Map"
      subtitle="Per business, Liftor maps which integrations are needed, optional, connected, missing or blocked. Internal planning runs live; activating paid APIs, changing credentials, enabling webhooks or starting external sends remains founder-gated."
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <IMStat label="Providers" value={sum.providers} hint="Seeded catalogue" />
        <IMStat label="Needed (across portfolio)" value={sum.needed} />
        <IMStat label="Connected" value={sum.connected} />
        <IMStat label="Paid APIs" value={sum.paidProviders} hint="Monitor usage" />
        <IMStat label="Connection errors" value={sum.errors} />
      </div>

      <IMSection title="Provider catalogue (top)" actions={<Link to="/founder/integration-map/providers" className="text-xs text-primary hover:underline">All providers →</Link>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {catalog.slice(0, 10).map(c => (
            <div key={c.id} className="border border-border/50 rounded p-3 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium">{c.provider_name}</p>
                <span className="text-[10px] text-muted-foreground">{c.provider_type}</span>
                <RiskBadge level={c.external_action_risk_level} />
                {c.paid_api_risk && <span className="text-[10px] text-yellow-300">paid API</span>}
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">{c.description}</p>
            </div>
          ))}
        </div>
      </IMSection>

      <IMSection title="Warnings">
        {warnings.length === 0 ? (
          <p className="text-xs text-muted-foreground">No integration warnings.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {warnings.slice(0, 40).map((w, i) => (
              <li key={i} className="flex items-center gap-2">
                <RiskBadge level={w.severity === "risk" ? "high" : w.severity === "missing" ? "critical" : "medium"} />
                <span>{w.message}</span>
              </li>
            ))}
          </ul>
        )}
      </IMSection>
    </IMLayout>
  );
}