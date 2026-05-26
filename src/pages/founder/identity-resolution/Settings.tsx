import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IdentityLayout } from "./_shared";
import { ShieldAlert } from "lucide-react";

export default function IdentitySettings() {
  return (
    <IdentityLayout title="Settings" subtitle="Identity Resolution defaults and safety policy.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert size={14} className="text-yellow-300" /> Safety policy</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-2">
          <p>• <b>No auto-merge.</b> Every merge requires founder approval and is logged irreversible.</p>
          <p>• <b>No contact.</b> Identity engine never sends outreach; it only suggests links.</p>
          <p>• <b>Global do-not-contact</b> is the source of truth across CRM, outreach, sellers, partners and vendors.</p>
          <p>• <b>Role conflicts</b> (customer ↔ seller, customer ↔ vendor, seller ↔ vendor, etc.) raise warnings.</p>
          <p>• <b>Matching signals:</b> exact email, normalised phone, name+company, website/domain. Other signals advisory only.</p>
          <p>• <b>Per-business context preserved</b>; merging never collapses business-specific facts silently.</p>
          <div className="pt-2 flex gap-2 flex-wrap">
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Live suggestions</Badge>
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Merge requires approval</Badge>
            <Badge variant="outline" className="bg-red-500/15 text-red-300 border-red-500/30">DNC respected globally</Badge>
          </div>
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Integrations</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          CRM · Seller Recruitment · Partner Engine · Vendor Management · Communications Ledger · Import Centre · Data Quality · Privacy · Command Centre · Manuals
        </CardContent>
      </Card>
    </IdentityLayout>
  );
}