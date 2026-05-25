import { useEffect, useState } from "react";
import { CGLayout, CGSection, SevBadge, ActionBadge } from "./_shared";
import { fetchEvents, type ContextEvent } from "@/lib/contextGuardEngine";

export default function CGMissing() {
  const [events, setEvents] = useState<ContextEvent[]>([]);
  useEffect(() => { fetchEvents(500).then(setEvents).catch(() => {}); }, []);
  const list = events.filter(e => e.event_type === "missing_business_id");
  return (
    <CGLayout title="Missing business" subtitle="Actions or prompts that arrived without a business_id. Only generic internal advice is allowed; external actions are blocked.">
      <CGSection title={`${list.length} missing-business events`}>
        {list.length === 0 ? (
          <p className="text-xs text-muted-foreground">No missing-business events.</p>
        ) : (
          <ul className="text-xs space-y-2">
            {list.map(e => (
              <li key={e.id} className="border border-border/50 rounded p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <SevBadge level={e.severity} />
                  <ActionBadge action={e.action_taken} />
                  <span className="text-muted-foreground">{e.source_module}</span>
                  <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                </div>
                <p>{e.event_summary}</p>
              </li>
            ))}
          </ul>
        )}
      </CGSection>
    </CGLayout>
  );
}