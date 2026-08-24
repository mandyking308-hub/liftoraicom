import FounderLayout from "@/components/founder/FounderLayout";
import PortfolioCrmSummaryPanel from "@/components/founder/crm/PortfolioCrmSummaryPanel";
import PortfolioCrmArchitecturePanel from "@/components/founder/crm/PortfolioCrmArchitecturePanel";
import PortfolioCrmEducationWavePanel from "@/components/founder/crm/PortfolioCrmEducationWavePanel";
import PortfolioContactRelationshipsTable from "@/components/founder/crm/PortfolioContactRelationshipsTable";
import MontvelleSupplierNetworkPanel from "@/components/founder/crm/MontvelleSupplierNetworkPanel";

export default function PortfolioCRM() {
  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio CRM</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Shared people, organisations and data assets across the whole Liftor portfolio. Business relationships remain separate; the underlying data is owned once.
          </p>
        </div>
        <PortfolioCrmSummaryPanel />
        <PortfolioCrmArchitecturePanel />
        <MontvelleSupplierNetworkPanel />
        <PortfolioCrmEducationWavePanel />
        <div>
          <h2 className="text-lg font-semibold mb-2">People → all relevant Liftor businesses</h2>
          <p className="text-xs text-muted-foreground mb-3">
            This view uses business_contact_relationships rather than the legacy single assigned_business field.
          </p>
          <PortfolioContactRelationshipsTable />
        </div>
      </div>
    </FounderLayout>
  );
}
