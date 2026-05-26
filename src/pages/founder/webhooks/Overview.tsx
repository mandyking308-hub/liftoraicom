import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WHLayout, WHStat } from "./_shared";
import { fetchInbox, summarize, type InboxSummary, ingestWebhookInternal } from "@/lib/webhookInbox";
import { toast } from "sonner";

export default function WebhooksOverview() {
  const [sum, setSum] = useState<InboxSummary | null>(null);
  const load = () => fetchInbox(500).then(e => setSum(summarize(e))).catch(() => setSum(null));
  useEffect(() => { load(); }, []);

  async function fireTest(provider: string, type: string, payload: any, opts: Partial<Parameters<typeof ingestWebhookInternal>[0]> = {}) {
    const r = await ingestWebhookInternal({ provider_name: provider, webhook_event_type: type, payload, test: true, signature_valid: true, signature_present: true, ...opts });
    toast.success(`Test ${provider} ${type}: ${r.status}`);
    load();
  }

  return (
    <WHLayout title="Webhook Inbox & Event Normaliser" subtitle="One secure inbox for everything providers send us. Receiving and logging run live. External actions stay gated through the Event Bus and founder approval.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <WHStat label="Received 24h" value={sum?.received_today ?? "—"} />
        <WHStat label="Normalised 24h" value={sum?.normalised_today ?? "—"} tone="ok" />
        <WHStat label="Duplicates 24h" value={sum?.duplicates_today ?? "—"} />
        <WHStat label="Failed 24h" value={sum?.failed_today ?? "—"} tone={(sum?.failed_today ?? 0) > 0 ? "bad" : "ok"} />
        <WHStat label="Unverified 24h" value={sum?.unverified_today ?? "—"} tone={(sum?.unverified_today ?? 0) > 0 ? "bad" : "ok"} />
        <WHStat label="Parked" value={sum?.parked_total ?? "—"} tone={(sum?.parked_total ?? 0) > 0 ? "warn" : "ok"} />
      </div>
      {sum?.top_alert && (
        <Card className="tech-card p-3 border-primary/30">
          <p className="text-[10px] uppercase text-muted-foreground">Top alert · <Badge variant="outline" className="text-[10px]">{sum.top_alert.severity}</Badge></p>
          <p className="text-sm font-medium mt-1">{sum.top_alert.summary}</p>
        </Card>
      )}
      <Card className="tech-card p-4 space-y-3">
        <p className="font-semibold text-sm">LIVE_INTERNAL_TEST · simulate webhook payloads</p>
        <p className="text-xs text-muted-foreground">All test events are tagged <code>LIVE_INTERNAL_TEST</code>. No provider is contacted. No external action is taken.</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <Button size="sm" variant="outline" onClick={() => fireTest("stripe","payment_intent.succeeded",{ id:`evt_test_${Date.now()}`, amount:9900, currency:"gbp", customer_email:"test@liftor.local" })}>payment_succeeded</Button>
          <Button size="sm" variant="outline" onClick={() => fireTest("retell","call.ended",{ call_id:`call_${Date.now()}`, duration_s:124, caller_phone:"+440000000" })}>call_ended</Button>
          <Button size="sm" variant="outline" onClick={() => fireTest("docusign","envelope.completed",{ envelopeId:`env_${Date.now()}`, signer_email:"test@liftor.local" })}>contract_signed</Button>
          <Button size="sm" variant="outline" onClick={() => fireTest("calendly","invitee.created",{ event_uuid:`bk_${Date.now()}`, invitee_email:"test@liftor.local" })}>booking_created</Button>
          <Button size="sm" variant="outline" onClick={async () => {
            const id = `dup_${Date.now()}`;
            await fireTest("stripe","payment_intent.succeeded",{ id, amount:1000, currency:"gbp" });
            await fireTest("stripe","payment_intent.succeeded",{ id, amount:1000, currency:"gbp" });
          }}>duplicate event</Button>
          <Button size="sm" variant="outline" onClick={() => fireTest("stripe","payment_intent.succeeded",{ id:`bad_${Date.now()}`, amount:1 }, { signature_valid: false, signature_present: true })}>bad signature</Button>
        </div>
      </Card>
      <Card className="tech-card p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">Safety policy</p>
        <p>• Raw payloads are summarised; secret-looking fields are redacted before storage.</p>
        <p>• Signature verification is required by default — failure marks the event failed.</p>
        <p>• Duplicates are blocked via payload-hash uniqueness.</p>
        <p>• Normalisation emits a Liftor event to the Event Bus. External steps remain founder-approval-gated inside workflows.</p>
      </Card>
    </WHLayout>
  );
}