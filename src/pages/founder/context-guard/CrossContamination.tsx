import { useEffect, useState } from "react";
import { CGLayout, CGSection, SevBadge, ActionBadge } from "./_shared";
import { fetchEvents, type ContextEvent } from "@/lib/contextGuardEngine";

export default function CGCross() {
  const [events, setEvents] = useState<ContextEvent[]>([]);
  useEffect(() => { fetchEvents(500).then(setEvents).catch(() => {}); }, []);
  const list = events.filter(e => [
    "cross_contamination_prevented","conflicting_business_context",
    "wrong_customer","wrong_product","wrong_policy","wrong_brand_voice","wrong_legal_entity",
  ].includes(e.event_type));
  return (
    <CGLayout title="Cross-contamination" subtitle="Every time the guard caught one business referencing another business's customer, product, brand voice, legal entity or policy.">
      <CGSection title={`${list.length} contamination events`}>
        {list.length === 0 ? (
          <p className="text-xs text-muted-foreground">No cross-contamination detected.</p>
        ) : (
          <ul className="text-xs space-y-2">
            {list.map(e => (
              <li key={e.id} className="border border-border/50 rounded p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <SevBadge level={e.severity} />
                  <ActionBadge action={e.action_taken} />
                  <span className="text-muted-foreground">{e.event_type.replace(/_/g," ")}</span>
                  <span className="text-muted-foreground">{e.source_module}</span>
                  <span className="font-mono text-[10px]">{e.business_id?.slice(0,8) ?? "—"}</span>
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