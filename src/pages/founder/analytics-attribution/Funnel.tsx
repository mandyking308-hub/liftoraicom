import { useEffect, useState } from "react";
import { AALayout, AASection } from "./_shared";
import { fetchEvents, funnel, type AttributionEvent } from "@/lib/attributionEngine";

export default function AAFunnel() {
  const [events, setEvents] = useState<AttributionEvent[]>([]);
  useEffect(() => { fetchEvents().then(setEvents).catch(() => {}); }, []);
  const stages = funnel(events);
  const max = Math.max(1, ...stages.map(s => s.count));
  return (
    <AALayout title="Funnel attribution" subtitle="Counts at each touchpoint stage across all tracked businesses.">
      <AASection title="Funnel stages">
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">No events to chart yet.</p>
        ) : (
          <div className="space-y-2">
            {stages.map(s => (
              <div key={s.stage} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="capitalize">{s.stage.replace("_", " ")}</span>
                  <span className="text-muted-foreground">{s.count}</span>
                </div>
                <div className="h-2 rounded bg-secondary overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${(s.count / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </AASection>
    </AALayout>
  );
}