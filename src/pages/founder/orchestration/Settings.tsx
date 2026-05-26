import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrchLayout } from "./_shared";

export default function OrchestrationSettings() {
  return (
    <OrchLayout title="Event Bus Settings">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Execution policy</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p><strong className="text-foreground">Live-first</strong> — internal steps execute and log immediately. No readiness gates.</p>
          <p><strong className="text-foreground">External actions never auto-execute.</strong> Any step marked <code>external</code> is parked as <em>waiting_approval</em>; a corresponding founder approval row is created in the Master Work Queue.</p>
          <p><strong className="text-foreground">Idempotency</strong> — duplicate <code>idempotency_key</code> events are deduplicated; the workflow is not re-run.</p>
          <p><strong className="text-foreground">Retries</strong> — bounded (max 2). Persistent failures create a <code>workflow_failure_event</code> + a Master Work Queue item; no endless loops.</p>
          <p><strong className="text-foreground">Audit</strong> — every event, run and step is persisted with <code>audit_metadata</code>.</p>
        </CardContent>
      </Card>
    </OrchLayout>
  );
}