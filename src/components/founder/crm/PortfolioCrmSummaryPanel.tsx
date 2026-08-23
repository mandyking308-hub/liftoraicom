import { useEffect, useState } from "react";
import { Building2, Network, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getPortfolioCrmSummary } from "@/lib/portfolioCrmQueries";

export default function PortfolioCrmSummaryPanel() {
  const [stats, setStats] = useState({ people: 0, crmOrganisationNames: 0, clientTenantOrganisations: 0, businessRelationships: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPortfolioCrmSummary()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  const rows = [
    ["Master people", stats.people, Users, "One CRM person record"],
    ["CRM company names", stats.crmOrganisationNames, Building2, "Temporary organisation identity carried on contacts until CRM accounts are persisted"],
    ["Client / tenant orgs", stats.clientTenantOrganisations, Building2, "Existing delivery organisations — deliberately kept separate from prospect accounts"],
    ["Business relationships", stats.businessRelationships, Network, "Many-to-many contact ↔ business links"],
  ] as const;

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {rows.map(([label, value, Icon, help]) => (
        <Card key={label} className="tech-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs uppercase tracking-wider">{label}</span>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-semibold mt-2 tabular-nums">{loading ? "—" : value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{help}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
