import { useEffect, useState } from "react";
import { Building2, Network, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getPortfolioCrmSummary } from "@/lib/portfolioCrmQueries";

export default function PortfolioCrmSummaryPanel() {
  const [stats, setStats] = useState({ people: 0, organisations: 0, businessRelationships: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPortfolioCrmSummary()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  const rows = [
    ["Master people", stats.people, Users],
    ["Known organisations", stats.organisations, Building2],
    ["Business relationships", stats.businessRelationships, Network],
  ] as const;

  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {rows.map(([label, value, Icon]) => (
        <Card key={label} className="tech-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs uppercase tracking-wider">{label}</span>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-semibold mt-2 tabular-nums">{loading ? "—" : value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
