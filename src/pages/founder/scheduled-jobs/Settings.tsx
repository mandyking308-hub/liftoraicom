import { SJLayout } from "./_shared";
import { Card } from "@/components/ui/card";

export default function SJSettings() {
  return (
    <SJLayout title="Settings">
      <Card className="tech-card p-4 text-xs space-y-2">
        <p className="font-semibold text-sm">Default safety policy</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Scheduled jobs may analyse, scan, refresh dashboards and create internal work items live.</li>
          <li>Scheduled jobs may NOT send, publish, contact, spend, delete, export, grant access, process refunds, activate providers or mutate external systems without an explicit founder-approved rule.</li>
          <li>Every run is logged. Failures create internal notifications and master work items only.</li>
          <li>Duplicate-run prevention is enforced by the orchestrator. Retries are capped.</li>
          <li>Long-running jobs raise a timeout warning rather than retrying destructively.</li>
          <li>To enable an external action for a specific job, set <code>external_action_allowed=true</code> and record founder approval in audit metadata.</li>
        </ul>
      </Card>
    </SJLayout>
  );
}