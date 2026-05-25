import { useEffect, useState } from "react";
import { IMLayout, IMSection, RiskBadge } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { fetchCatalog, type CatalogRow } from "@/lib/integrationMapEngine";

export default function IMProviders() {
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  useEffect(() => { fetchCatalog().then(setCatalog).catch(() => {}); }, []);
  return (
    <IMLayout title="Provider catalogue" subtitle="All known integration providers, grouped by type, with risk and paid-API flags.">
      <IMSection title={`${catalog.length} providers`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
              <tr>
                <th className="text-left p-2">Provider</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Risk</th>
                <th className="text-left p-2">Paid API</th>
                <th className="text-left p-2">Supported archetypes</th>
                <th className="text-left p-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {catalog.map(c => (
                <tr key={c.id} className="border-b border-border/20">
                  <td className="p-2 font-medium">{c.provider_name}</td>
                  <td className="p-2 text-muted-foreground">{c.provider_type}</td>
                  <td className="p-2"><RiskBadge level={c.external_action_risk_level} /></td>
                  <td className="p-2">{c.paid_api_risk ? <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">paid</Badge> : "—"}</td>
                  <td className="p-2 text-muted-foreground">{c.supported_archetypes.join(", ") || "—"}</td>
                  <td className="p-2 text-muted-foreground">{c.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </IMSection>
    </IMLayout>
  );
}