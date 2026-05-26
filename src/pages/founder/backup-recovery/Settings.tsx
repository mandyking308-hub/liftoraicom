import { BRLayout } from "./_shared";
import { Card } from "@/components/ui/card";

export default function BRSettings() {
  return (
    <BRLayout title="Backup Recovery Settings" subtitle="Approval gates and integration map.">
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="tech-card p-4 text-sm space-y-2">
          <p className="font-semibold">Approval gates</p>
          <ul className="list-disc pl-5 text-muted-foreground text-xs space-y-1">
            <li>Generating sensitive exports (CRM, finance, documents, full business, adviser pack, data room, AI logs).</li>
            <li>Sharing emergency operating pack outside founder/admin.</li>
            <li>Any restore or destructive recovery action.</li>
            <li>Creating public links to backup or export artifacts.</li>
          </ul>
        </Card>
        <Card className="tech-card p-4 text-sm space-y-2">
          <p className="font-semibold">Hard rules</p>
          <ul className="list-disc pl-5 text-muted-foreground text-xs space-y-1">
            <li>No automatic restore — ever.</li>
            <li>Raw secrets are never written into exports — references only.</li>
            <li>Unknown / failed status on high or critical systems raises a watch item.</li>
          </ul>
        </Card>
        <Card className="tech-card p-4 text-sm space-y-2 md:col-span-2">
          <p className="font-semibold">Integrations</p>
          <p className="text-muted-foreground text-xs">Document Vault · Manuals · Access / Secrets · Incident Engine · Adviser Pack · Data Room · Command Centre. The Backup Recovery Agent tracks status and prepares checklists but never performs destructive operations.</p>
        </Card>
      </div>
    </BRLayout>
  );
}