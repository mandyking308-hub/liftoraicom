import { Card } from "@/components/ui/card";
import { WHLayout } from "./_shared";
import { Lock, ShieldCheck, AlertTriangle, Workflow } from "lucide-react";

export default function WebhooksSettings() {
  return (
    <WHLayout title="Webhook Inbox Policy" subtitle="Default rules that govern every webhook Liftor accepts.">
      <Card className="tech-card p-4 text-xs space-y-3">
        <Row icon={<Lock size={14}/>} title="Payloads are summarised, not stored raw" body="Secret-looking fields (signature, token, key, password, card, account, etc.) are redacted before persistence. Only top-level scalar fields are kept in raw_payload_summary."/>
        <Row icon={<ShieldCheck size={14}/>} title="Signature verification is required by default" body="Every provider rule defaults to required_signature=true. Missing or failed signatures mark the event failed and stop processing."/>
        <Row icon={<AlertTriangle size={14}/>} title="Duplicates are blocked by payload hash" body="A SHA-256 of the (provider, event_type, provider_event_id, summary) ensures the same payload cannot normalise twice."/>
        <Row icon={<Workflow size={14}/>} title="Normalisation emits a Liftor event only" body="The inbox creates a normalised_external_event and emits to the Event Bus. It never directly triggers external API calls — that decision lives in workflows with founder approval."/>
        <Row icon={<AlertTriangle size={14}/>} title="Unmapped events are parked, not guessed" body="If no active processing rule matches, the event is stored with status=parked. The Webhook Agent surfaces it for the founder to add a mapping rule."/>
      </Card>
    </WHLayout>
  );
}
function Row({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="border border-border/50 rounded p-3">
      <p className="font-semibold flex items-center gap-2">{icon}{title}</p>
      <p className="text-muted-foreground mt-1">{body}</p>
    </div>
  );
}