import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImportLayout } from "./_shared";
import { ShieldAlert } from "lucide-react";

export default function ImportSettings() {
  return (
    <ImportLayout title="Settings" subtitle="Import Centre defaults and safety policies.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert size={14} className="text-yellow-300" /> Safety policy</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-2">
          <p>• <b>Default mode:</b> TEST. New batches never write to live records.</p>
          <p>• <b>Apply gate:</b> founder approval required for every live apply.</p>
          <p>• <b>Bulk update/delete/merge:</b> founder approval, irreversible warning surfaced.</p>
          <p>• <b>Customer, revenue and access data:</b> always treated as high-sensitivity.</p>
          <p>• <b>Test rows:</b> excluded from confirmed KPIs and revenue truth.</p>
          <p>• <b>Rollback:</b> available for created records; updates only where pre-state captured.</p>
          <p>• <b>External providers:</b> imports never push to external systems.</p>
          <p>• <b>Audit:</b> all batches, mappings, previews, applies and rollbacks logged to the Global Audit Ledger.</p>
          <div className="pt-2 flex gap-2 flex-wrap">
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Live preview safe</Badge>
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Apply requires approval</Badge>
            <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30">No external mutations</Badge>
          </div>
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Integrations</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>Data Quality · Identity Resolution · CRM · Product Catalogue · Seller Recruitment · Document Vault · Reporting Truth · Command Centre · Manuals</p>
        </CardContent>
      </Card>
    </ImportLayout>
  );
}