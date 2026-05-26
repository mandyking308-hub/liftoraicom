import { Card } from "@/components/ui/card";
import { CRLayout } from "./_shared";
import { Lock, ShieldCheck, AlertTriangle } from "lucide-react";

export default function ConnectorsSettings() {
  return (
    <CRLayout title="Connector Settings & Policy" subtitle="Default rules that govern every connector in Liftor.">
      <Card className="tech-card p-4 text-xs space-y-3">
        <Row icon={<Lock size={14}/>} title="Secrets never displayed" body="The Connector Registry shows configured yes/no only. Raw secret values live in Lovable Cloud encrypted storage and never appear in any Liftor UI."/>
        <Row icon={<ShieldCheck size={14}/>} title="Webhook signature verification required" body="Every webhook endpoint must require signature verification before it can be marked live. Unverified endpoints surface as red alerts."/>
        <Row icon={<AlertTriangle size={14}/>} title="External actions default off" body="external_action_enabled defaults to false for every business assignment. Turning it on requires founder/admin approval and is logged in audit_metadata."/>
        <Row icon={<AlertTriangle size={14}/>} title="Health checks are read-only by default" body="Internal config checks run automatically. Provider pings, dry-runs and test messages require founder approval — never auto-triggered."/>
        <Row icon={<AlertTriangle size={14}/>} title="Failures create work, not retries" body="When a connector fails, the Connector Agent creates a notification and a master work-queue item. It never automatically retries against external providers."/>
      </Card>
    </CRLayout>
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