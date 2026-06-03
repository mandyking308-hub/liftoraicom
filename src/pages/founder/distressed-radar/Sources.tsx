import { DRLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SCAN_SOURCES } from "@/lib/distressedRadarEngine";

export default function DRSources() {
  return (
    <DRLayout title="Weekly Scan Sources"
      subtitle="Sources Liftor scans weekly for distressed assets, brand/IP sales, marketplace listings and insolvency events. Integrations and manual research both feed the radar. No public action is taken without founder approval.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Registered sources</CardTitle></CardHeader>
        <CardContent className="text-xs grid md:grid-cols-2 gap-2">
          {SCAN_SOURCES.map(s => (
            <div key={s.id} className="flex items-center justify-between border border-border/40 rounded p-2">
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-[10px] text-muted-foreground capitalize">{s.type.replace(/_/g, " ")}</div>
              </div>
              <Badge variant="outline" className="text-[10px]">Manual + integration</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </DRLayout>
  );
}