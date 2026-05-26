import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EcomLayout } from "./_shared";

export default function Settings() {
  return (
    <EcomLayout title="E-commerce Settings" subtitle="Approval policy and integration locks.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Approval policy</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>• Supplier purchase orders — founder approval required</p>
          <p>• Shipping label purchase — founder approval required</p>
          <p>• Customer notifications — founder approval required</p>
          <p>• Refund execution — founder approval required</p>
          <p>• Public stock changes — founder approval required</p>
          <p>• Reorder recommendations — generated live, action gated</p>
          <p>• Digital products — fulfilment without shipping allowed</p>
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Integrations</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Carrier APIs (FedEx, UPS, USPS, DHL) and supplier portals are not connected. Drafts only.
        </CardContent>
      </Card>
    </EcomLayout>
  );
}