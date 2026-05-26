import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PortalsLayout } from "./_shared";
import { fetchPortalEvents, SEVERITY_META, type PortalEvent } from "@/lib/portalsEngine";

export default function PortalsAccess() {
  const [rows, setRows] = useState<PortalEvent[]>([]);
  useEffect(() => { fetchPortalEvents().then(setRows); }, []);
  return (
    <PortalsLayout title="Portal Access Events" subtitle="Every invite, login, upload, download, view, revocation and suspicious signal across all portals. Read-only audit log.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent events</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-2">
          {rows.length === 0 && <p className="text-muted-foreground">No portal access events yet.</p>}
          {rows.map(e => {
            const sm = SEVERITY_META[e.severity];
            return (
              <div key={e.id} className="border border-border/50 rounded p-2 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${sm.cls}`}>{sm.label}</Badge>
                  <Badge variant="outline" className="text-[10px]">{e.event_type.replace(/_/g," ")}</Badge>
                  {e.audit_metadata?.label === "LIVE_INTERNAL_TEST" && <Badge variant="outline" className="text-[10px] bg-purple-500/15 text-purple-300 border-purple-500/30">LIVE_INTERNAL_TEST</Badge>}
                  <span className="text-[10px] text-muted-foreground ml-auto">{new Date(e.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm">{e.event_summary}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </PortalsLayout>
  );
}