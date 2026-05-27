import FounderLayout from "@/components/founder/FounderLayout";
import { ColLayout, TagBadge } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CollectionsSettings() {
  return (
    <FounderLayout>
      <ColLayout title="Collections Settings" subtitle="Pre-approved rules and approval gates for the Collections Agent.">
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Default rules</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Rule label="Polite reminder draft after 3 days overdue" tone="ok" detail="Drafted only — never sent without founder approval." />
            <Rule label="Firm reminder draft after 14 days overdue" tone="warn" detail="Tone escalates automatically in draft form; send remains gated." />
            <Rule label="Final reminder draft after 30 days overdue" tone="bad" detail="Recommendation includes payment plan + write-off review." />
            <Rule label="Failed payment auto-retry" tone="bad" detail="Disabled. Every retry requires founder approval and approved_to_retry flag." />
            <Rule label="Auto service hold" tone="bad" detail="Disabled. Service holds are recommendations only." />
            <Rule label="Auto write-off" tone="bad" detail="Disabled. Write-offs require founder_decision = approve." />
            <Rule label="External provider mutations" tone="bad" detail="Always require approval and provider credentials confirmed." />
          </CardContent>
        </Card>
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Connected modules</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1 text-muted-foreground">
            <p>• Quote-to-Cash — invoice + payment source of truth.</p>
            <p>• Reconciliation — confirms which payments cleared.</p>
            <p>• Finance — outstanding & overdue amounts roll into target-vs-actual.</p>
            <p>• CRM — failed payments push relationship-health risk.</p>
            <p>• Support — write-off / payment plan creates support context.</p>
            <p>• Relationship Health — high-risk debt downgrades client health.</p>
            <p>• Approval Queue — every external action lands here first.</p>
            <p>• Command Centre — surfaces watch items on the spine.</p>
            <p>• Manuals — Collections SOP is included in the founder manual.</p>
          </CardContent>
        </Card>
      </ColLayout>
    </FounderLayout>
  );
}

function Rule({ label, tone, detail }: { label: string; tone: "ok"|"warn"|"bad"; detail: string }) {
  return (
    <div className="flex items-start gap-2">
      <TagBadge label={tone === "ok" ? "active" : tone === "warn" ? "gated" : "blocked"} tone={tone} />
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}