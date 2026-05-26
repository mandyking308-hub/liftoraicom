import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuditLayout } from "./_shared";

export default function AuditSettings() {
  return (
    <AuditLayout title="Audit ledger settings" subtitle="Live-first append-only ledger. The settings below describe the contract — changes require a founder/admin migration and are themselves audited.">
      <Card className="tech-card p-4 space-y-3 text-xs">
        <p className="text-sm font-semibold">Append-only contract</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>No raw secrets — values matching <code>secret|token|key|password|api_key|authorization|bearer|cvv|card|ssn|iban|account_number|routing</code> are replaced with <code>[REDACTED]</code> at write time.</li>
          <li>Large strings (&gt;2KB) and oversized JSON branches are truncated before write.</li>
          <li>UPDATE and DELETE policies are intentionally absent — there is no normal-UI deletion path.</li>
          <li>Founder/admin role required for read access; service role is used by background jobs.</li>
          <li>External export / share of audit data requires founder approval via the Approval Queue.</li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Append-only</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">No secret values</Badge>
          <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-300 border-red-500/30">Export = approval-gated</Badge>
        </div>
      </Card>
      <Card className="tech-card p-4 text-xs space-y-2">
        <p className="text-sm font-semibold">Logged modules</p>
        <p className="text-muted-foreground">AI Gateway · Approval Queue · Event Bus · Workflow Orchestrator · Feature Flags · Connector Registry · Webhook Inbox · Access/Roles · Quote-to-Cash · Payments/Reconciliation · Privacy/DSAR · Documents/Data Room · Contracts · External action gates · Founder Decision Register · Data Quality repair actions · Portal invites · Backup/export requests.</p>
        <p className="text-muted-foreground">Modules call <code>logGlobalAuditEvent()</code> from <code>src/lib/globalAuditLedger.ts</code>. Writes never throw and never block the calling flow.</p>
      </Card>
    </AuditLayout>
  );
}