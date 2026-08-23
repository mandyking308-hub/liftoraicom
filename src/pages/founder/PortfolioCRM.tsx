import FounderLayout from "@/components/founder/FounderLayout";
import PortfolioCrmSummaryPanel from "@/components/founder/crm/PortfolioCrmSummaryPanel";
import PortfolioCrmArchitecturePanel from "@/components/founder/crm/PortfolioCrmArchitecturePanel";
import PortfolioCrmEducationWavePanel from "@/components/founder/crm/PortfolioCrmEducationWavePanel";

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
        <PortfolioCrmEducationWavePanel />
      </div>
    </FounderLayout>
  );
}
