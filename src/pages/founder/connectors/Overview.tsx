import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CRLayout, CRStat } from "./_shared";
import { fetchConnectors, fetchAssignments, fetchHealthChecks, fetchWebhooks, summarize, type RegistrySummary } from "@/lib/connectorRegistry";

export default function ConnectorsOverview() {
  const [sum, setSum] = useState<RegistrySummary | null>(null);
  useEffect(() => {
    Promise.all([fetchConnectors(), fetchAssignments(), fetchWebhooks(), fetchHealthChecks(50)])
      .then(([c,a,w]) => setSum(summarize(c,a,w))).catch(() => setSum(null));
  }, []);
  return (
    <CRLayout title="Connector Registry & Provider Health" subtitle="One place to see every provider Liftor talks to — what's connected, missing, failing or dangerous. Provider mutations and external sends remain founder-approval-gated.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CRStat label="Connectors" value={sum?.connectors_active ?? "—"} hint={`${sum?.connectors_total ?? 0} total`} />
        <CRStat label="Live assignments" value={sum?.assignments_live ?? "—"} tone="ok" />
        <CRStat label="Failed" value={sum?.assignments_failed ?? "—"} tone={(sum?.assignments_failed ?? 0) > 0 ? "bad" : "ok"} />
        <CRStat label="Missing secret" value={sum?.assignments_missing_secret ?? "—"} tone={(sum?.assignments_missing_secret ?? 0) > 0 ? "warn" : "ok"} />
        <CRStat label="Webhooks" value={sum?.webhooks_total ?? "—"} hint={`${sum?.webhooks_not_configured ?? 0} not configured`} />
        <CRStat label="Webhooks unverified" value={sum?.webhooks_unverified ?? "—"} tone={(sum?.webhooks_unverified ?? 0) > 0 ? "bad" : "ok"} />
        <CRStat label="External actions on" value={sum?.external_action_enabled_count ?? "—"} tone={(sum?.external_action_enabled_count ?? 0) > 0 ? "warn" : "ok"} />
        <CRStat label="Critical risk live" value={sum?.critical_risk_count ?? "—"} tone={(sum?.critical_risk_count ?? 0) > 0 ? "bad" : "ok"} />
      </div>
      {sum?.top_alert && (
        <Card className="tech-card p-3 border-primary/30">
          <p className="text-[10px] uppercase text-muted-foreground">Top alert · <Badge variant="outline" className="text-[10px]">{sum.top_alert.severity}</Badge></p>
          <p className="text-sm font-medium mt-1">{sum.top_alert.summary}</p>
        </Card>
      )}
      <Card className="tech-card p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-2">Safety policy</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Secrets are stored in Lovable Cloud — this UI only shows configured yes/no, never raw values.</li>
          <li>Health checks default to internal config inspection. Provider pings and dry-runs require founder approval.</li>
          <li>Webhook endpoints must require signature verification before being marked live.</li>
          <li>External action enabled is false by default for every assignment.</li>
          <li>Connector failures create notifications and work items, not retries against external providers.</li>
        </ul>
      </Card>
    </CRLayout>
  );
}