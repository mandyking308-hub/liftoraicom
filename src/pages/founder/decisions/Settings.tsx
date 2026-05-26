import { DecLayout } from "./_shared";
import { Card, CardContent } from "@/components/ui/card";

export default function DecisionsSettings() {
  return (
    <DecLayout title="Decision Register settings" subtitle="Governance rules for how decisions are captured and what stays approval-gated.">
      <Card className="tech-card">
        <CardContent className="p-4 text-xs text-muted-foreground space-y-3">
          <Row title="Live (internal) capture" body="Decision creation, options, recommendations and tracking run live. No external action taken." />
          <Row title="Approval-gated execution" body="Implementing irreversible decisions, external communications, sale / kill / pause actions, legal / tax / entity changes, spend or provider changes." />
          <Row title="Sources" body="Portfolio prioritisation · resource allocation · risk matrix · quote-to-cash · customer close · marketplace seller activation · pricing changes · legal/tax/entity map · vendor spend · product release · privacy/incident escalations · data quality destructive fixes." />
          <Row title="Decision Register Agent" body="Captures decisions needed, summarises options, recommends with reasoning, tracks implementation, reminds founder when stale, prevents important choices from disappearing." />
          <Row title="Irreversible guard" body="kill_review, legal_tax and any decision flagged irreversible in audit_metadata are never auto-executed." />
          <Row title="Integrations" body="Master Work Queue, Notifications, Approval Queue, Command Centre, Founder Reporting Pack, Manuals." />
        </CardContent>
      </Card>
    </DecLayout>
  );
}
function Row({ title, body }: { title: string; body: string }) {
  return (<div><p className="text-foreground font-semibold text-sm">{title}</p><p>{body}</p></div>);
}