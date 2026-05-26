import { useEffect, useState } from "react";
import { PMLayout } from "./_shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchHistory, type HistoryEvent } from "@/lib/portfolioMemory";

export default function PMHistory() {
  const [items, setItems] = useState<HistoryEvent[]>([]);
  useEffect(() => { fetchHistory().then(setItems); }, []);
  return (
    <PMLayout title="Portfolio history" subtitle="Timeline of major events per business: created · launched · revenue started · product added · risk flagged · decision made · stage changed · exit ready · sold.">
      <Card className="tech-card">
        <CardContent className="p-3 space-y-2 text-xs">
          {items.length === 0 && <p className="text-muted-foreground">No history events yet.</p>}
          {items.map(e => (
            <div key={e.id} className="border border-border/40 rounded p-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[10px] capitalize">{e.event_type.replace(/_/g," ")}</Badge>
              {e.source_module && <Badge variant="outline" className="text-[10px]">{e.source_module}</Badge>}
              {e.audit_metadata?.live_internal_test && (
                <Badge variant="outline" className="text-[10px] bg-blue-500/15 text-blue-300 border-blue-500/30">Live internal test</Badge>
              )}
              <span className="font-medium">{e.event_summary}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{new Date(e.event_date).toLocaleString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </PMLayout>
  );
}