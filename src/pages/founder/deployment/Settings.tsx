import { DepLayout } from "./_shared";
import { Card } from "@/components/ui/card";

export default function DepSettings() {
  return (
    <DepLayout title="Settings" subtitle="Operating rules for the Environment & Deployment Control module.">
      <Card className="tech-card p-4 space-y-2 text-xs">
        <h3 className="text-sm font-semibold">Operating rules</h3>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Internal tracking only — this module never deploys, rolls back, restores, or changes secrets.</li>
          <li>Only the configured yes/no flag is stored for environment variables; raw secret values are never read.</li>
          <li>Deployments, migration execution and edge-function deploys happen via Lovable / backend tooling.</li>
          <li>Failed deployments and failed migrations surface in the Command Centre and link to the Incident Engine.</li>
          <li>Records are append-only / update-only; no UI delete path.</li>
        </ul>
      </Card>
      <Card className="tech-card p-4 space-y-2 text-xs">
        <h3 className="text-sm font-semibold">Integrations</h3>
        <p className="text-muted-foreground">Product / QA · Incident Engine · Backup / Recovery · Access &amp; Secrets · Command Centre · Manuals.</p>
      </Card>
    </DepLayout>
  );
}