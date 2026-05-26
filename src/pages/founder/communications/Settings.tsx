import { CommsLayout } from "./_shared";
import { Card } from "@/components/ui/card";

export default function CommsSettings() {
  return (
    <CommsLayout title="Settings" subtitle="Operating rules for the Unified Communications Ledger.">
      <Card className="tech-card p-4 space-y-2 text-xs">
        <h3 className="text-sm font-semibold">Operating rules</h3>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>All outbound drafts are logged before any send attempt.</li>
          <li>External send (email / SMS / WhatsApp / voice / social DM) requires founder or admin approval, or a pre-approved external action rule.</li>
          <li>Do-not-contact flags from Identity Resolution block outbound sends to that profile.</li>
          <li>Raw sensitive content is not stored — only summaries and content references.</li>
          <li>Ledger is append-only: no delete from UI. Service role only for retention.</li>
          <li>Inbound webhook events route through the Webhook Inbox + Event Bus before reaching support / sales / seller modules.</li>
        </ul>
      </Card>
      <Card className="tech-card p-4 space-y-2 text-xs">
        <h3 className="text-sm font-semibold">Integrations</h3>
        <p className="text-muted-foreground">Identity Resolution · CRM · Customer Sales · Support · Seller Recruitment · Partner Engine · Adviser Pack · Voice Calls · Approval Queue · Command Centre · Manuals.</p>
      </Card>
    </CommsLayout>
  );
}
