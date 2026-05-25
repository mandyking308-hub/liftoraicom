import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IMLayout, IMSection, StatusBadge } from "./_shared";
import {
  fetchCatalog, fetchRequirements, fetchConnections, diagnoseIntegrations,
  type CatalogRow, type RequirementRow, type ConnectionStatusRow,
} from "@/lib/integrationMapEngine";

export default function IMMissing() {
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [reqs, setReqs] = useState<RequirementRow[]>([]);
  const [conns, setConns] = useState<ConnectionStatusRow[]>([]);
  useEffect(() => {
    fetchCatalog().then(setCatalog).catch(() => {});
    fetchRequirements().then(setReqs).catch(() => {});
    fetchConnections().then(setConns).catch(() => {});
  }, []);
  const warnings = diagnoseIntegrations(catalog, reqs, conns).filter(w => w.severity === "missing" || w.severity === "approval");
  const cMap = new Map(catalog.map(c => [c.id, c]));
  return (
    <IMLayout title="Missing integrations" subtitle="Required integrations not yet connected. Activation remains founder-gated.">
      <IMSection title={`${warnings.length} missing or pending approval`}>
        {warnings.length === 0 ? <p className="text-xs text-muted-foreground">Nothing missing.</p> : (
          <ul className="text-xs space-y-1">
            {warnings.map((w, i) => {
              const c = cMap.get(w.integration_id);
              return (
                <li key={i} className="flex items-center gap-2 border border-border/50 rounded p-2">
                  <StatusBadge status={w.severity === "approval" ? "approval_required" : "missing"} />
                  <span className="font-medium">{c?.provider_name ?? w.integration_id}</span>
                  <span className="text-muted-foreground">· {w.message}</span>
                  <Link to="/founder/access-governance" className="ml-auto text-primary hover:underline">Set credentials →</Link>
                </li>
              );
            })}
          </ul>
        )}
      </IMSection>
    </IMLayout>
  );
}