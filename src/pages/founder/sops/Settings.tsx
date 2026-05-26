import { SopLayout } from "./_shared";
import { Card } from "@/components/ui/card";

export default function SopsSettings() {
  return (
    <SopLayout title="SOP Engine Settings" subtitle="Governance and review cadence configuration.">
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="tech-card p-4 text-sm space-y-2">
          <p className="font-semibold">Review cadence (defaults)</p>
          <ul className="list-disc pl-5 text-muted-foreground text-xs space-y-1">
            <li>Sales / Support / Onboarding · 90 days</li>
            <li>Finance / Refund · 60 days</li>
            <li>Privacy / Incident / Legal · 30 days</li>
            <li>Marketplace / Seller onboarding · 60 days</li>
            <li>Weekly review · 7 days</li>
          </ul>
        </Card>
        <Card className="tech-card p-4 text-sm space-y-2">
          <p className="font-semibold">Approval gates</p>
          <ul className="list-disc pl-5 text-muted-foreground text-xs space-y-1">
            <li>Publishing an approved SOP externally — founder approval.</li>
            <li>Retiring an SOP referenced by active agents — founder approval.</li>
            <li>Changes to compliance / sales / legal playbooks — founder approval.</li>
            <li>Resolving a critical SOP conflict — founder approval.</li>
          </ul>
        </Card>
        <Card className="tech-card p-4 text-sm space-y-2 md:col-span-2">
          <p className="font-semibold">Integrations</p>
          <p className="text-muted-foreground text-xs">Manuals · AI Gateway · Customer Sales · Support · Delivery · Privacy · Incident · Marketplace · Master Work Queue · Command Centre. Agents consume only approved SOPs by default; non-approved references appear under Agents Using SOPs as warnings.</p>
        </Card>
      </div>
    </SopLayout>
  );
}