import FounderLayout from "@/components/founder/FounderLayout";
import { CustomerSuccessDashboard } from "@/components/founder/customer-success/CustomerSuccessPanels";

export default function CustomerSuccess() {
  return (
    <FounderLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Customer Success</h1>
          <p className="text-sm text-muted-foreground">Per-business onboarding, welcome packs, check-ins, surveys, quarterly reports, renewals, retention risk, upsell and win-back — internal only.</p>
        </div>
        <CustomerSuccessDashboard />
      </div>
    </FounderLayout>
  );
}