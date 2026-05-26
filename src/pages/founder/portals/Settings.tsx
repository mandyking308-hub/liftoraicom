import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { PortalsLayout } from "./_shared";

export default function PortalsSettings() {
  return (
    <PortalsLayout title="Portal Settings" subtitle="Architecture is live; external exposure is locked.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Approval-gated actions</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-2">
          {[
            "Promoting a portal from internal_only/approval_required to live",
            "Sending an invite to an external email",
            "Publishing a portal at a public URL",
            "Disabling the 'requires_founder_approval_for_invites' flag on any portal",
            "Sharing a document outside the founder console",
          ].map(a => (
            <div key={a} className="flex items-center gap-2 border border-yellow-500/30 bg-yellow-500/5 rounded p-2">
              <Lock size={12} className="text-yellow-300" />
              <span>{a}</span>
              <Badge variant="outline" className="ml-auto text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Approval</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Live internal operations</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-1 text-muted-foreground">
          <p>• Recommend portal setup by business type</p>
          <p>• Prepare invite drafts (no send)</p>
          <p>• Flag access risks and suspicious events</p>
          <p>• Flag expired/orphaned invites</p>
          <p>• Surface portal risk warnings to Command Centre</p>
        </CardContent>
      </Card>
    </PortalsLayout>
  );
}