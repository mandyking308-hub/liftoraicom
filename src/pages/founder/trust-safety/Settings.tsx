import { TsLayout } from "./_shared";
import { Card } from "@/components/ui/card";

export default function TsSettings() {
  return (
    <TsLayout title="Settings" subtitle="Operating rules for the Trust, Fraud & Abuse Engine.">
      <Card className="tech-card p-4 space-y-2 text-xs">
        <h3 className="text-sm font-semibold">Operating rules</h3>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>No automatic account suspensions, payout holds, refunds or cancellations.</li>
          <li>Every action recommendation defaults to founder approval required.</li>
          <li>High/critical severity events surface in the Command Centre and create work items.</li>
          <li>Duplicate accounts come from Identity Resolution; chargeback/refund signals come from Reconciliation and Complaints.</li>
          <li>Abuse message flags link back to Communications Ledger records — never store the raw message content here.</li>
          <li>Records are append-only / update-only; no UI delete path.</li>
          <li>Emergency pre-approved rules (e.g. block obvious malware link) must be explicitly enabled per business and audited.</li>
        </ul>
      </Card>
      <Card className="tech-card p-4 space-y-2 text-xs">
        <h3 className="text-sm font-semibold">Integrations</h3>
        <p className="text-muted-foreground">Identity Resolution · Communications Ledger · Marketplace · Reconciliation · Complaints · Support · Privacy · Approval Queue · Command Centre · Manuals.</p>
      </Card>
    </TsLayout>
  );
}
