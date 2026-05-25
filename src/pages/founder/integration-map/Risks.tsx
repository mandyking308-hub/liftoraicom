import { useEffect, useState } from "react";
import { IMLayout, IMSection, RiskBadge, StatusBadge } from "./_shared";
import { fetchCatalog, fetchConnections, type CatalogRow, type ConnectionStatusRow } from "@/lib/integrationMapEngine";

export default function IMRisks() {
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [conns, setConns] = useState<ConnectionStatusRow[]>([]);
  useEffect(() => {
    fetchCatalog().then(setCatalog).catch(() => {});
    fetchConnections().then(setConns).catch(() => {});
  }, []);
  const cMap = new Map(catalog.map(c => [c.id, c]));
  const paid = catalog.filter(c => c.paid_api_risk);
  const live = conns.filter(c => c.provider_status === "live" || c.provider_status === "configured");
  const errors = conns.filter(c => c.provider_status === "error");

  return (
    <IMLayout title="Risky / paid integrations" subtitle="Track paid APIs, high-risk providers and connections in error.">
      <IMSection title="Paid APIs in catalogue">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {paid.map(c => (
            <div key={c.id} className="border border-border/50 rounded p-3 flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{c.provider_name}</span>
              <RiskBadge level={c.external_action_risk_level} />
              <span className="text-[11px] text-muted-foreground ml-auto">{c.provider_type}</span>
            </div>
          ))}
        </div>
      </IMSection>
      <IMSection title="Live / configured paid connections">
        {live.length === 0 ? <p className="text-xs text-muted-foreground">No live connections.</p> : (
          <ul className="text-xs space-y-1">
            {live.map(c => {
              const cat = cMap.get(c.integration_id);
              if (!cat?.paid_api_risk) return null;
              return (
                <li key={c.id} className="flex items-center gap-2 border border-border/50 rounded p-2">
                  <span className="font-medium">{cat.provider_name}</span>
                  <StatusBadge status={c.provider_status} />
                  <span className="text-muted-foreground">business {c.business_id.slice(0, 8)}…</span>
                  <span className="ml-auto text-muted-foreground">{c.secret_configured ? "secret ✓" : "secret missing"} · {c.webhook_configured ? "webhook ✓" : "no webhook"}</span>
                </li>
              );
            })}
          </ul>
        )}
      </IMSection>
      <IMSection title="Connection errors">
        {errors.length === 0 ? <p className="text-xs text-muted-foreground">No connection errors.</p> : (
          <ul className="text-xs space-y-1">
            {errors.map(c => {
              const cat = cMap.get(c.integration_id);
              return (
                <li key={c.id} className="border border-border/50 rounded p-2">
                  <div className="flex items-center gap-2"><span className="font-medium">{cat?.provider_name}</span><StatusBadge status="error" /></div>
                  <p className="text-[11px] text-destructive">{c.last_error ?? "unknown"}</p>
                </li>
              );
            })}
          </ul>
        )}
      </IMSection>
    </IMLayout>
  );
}