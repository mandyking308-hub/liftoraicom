import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { RTLayout } from "./_shared";

export default function Settings() {
  return (
    <RTLayout title="Reporting Truth Settings" subtitle="Internal definitions and rules run live. External report sharing and bulk historic corrections are approval-gated.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Approval-gated actions</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-2">
          {[
            "Sharing reports externally (board, investors, advisers, regulators)",
            "Bulk revenue reclassification across historic periods",
            "Deleting or overwriting historic snapshots",
            "Changing the canonical definition of confirmed revenue",
            "Reclassifying confirmed → estimated or vice versa at scale",
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
          <p>• Detect KPI conflicts across modules</p>
          <p>• Maintain canonical KPI dictionary</p>
          <p>• Generate internal reconciliation snapshots</p>
          <p>• Flag test data leaks into live KPIs</p>
          <p>• Recommend metric corrections (founder reviews before applying)</p>
        </CardContent>
      </Card>
    </RTLayout>
  );
}