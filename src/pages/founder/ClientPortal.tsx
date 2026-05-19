import FounderLayout from "@/components/founder/FounderLayout";
import { ClientPortalDashboard } from "@/components/founder/customer-success/CustomerSuccessPanels";

export default function ClientPortal() {
  return (
    <FounderLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Client Portals</h1>
          <p className="text-sm text-muted-foreground">Internal blueprints and content packs for per-business client portals. No accounts, invites or deploys.</p>
        </div>
        <ClientPortalDashboard />
      </div>
    </FounderLayout>
  );
}