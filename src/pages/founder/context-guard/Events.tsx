import { useEffect, useState } from "react";
import { CGLayout, CGSection, SevBadge, ActionBadge } from "./_shared";
import { fetchEvents, type ContextEvent } from "@/lib/contextGuardEngine";

export default function CGEvents() {
  const [events, setEvents] = useState<ContextEvent[]>([]);
  useEffect(() => { fetchEvents(500).then(setEvents).catch(() => {}); }, []);
  return (
    <CGLayout title="Events" subtitle="Full audit log of every Context Fabric decision.">
      <CGSection title={`${events.length} events`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
              <tr>
                <th className="text-left p-2">When</th>
                <th className="text-left p-2">Severity</th>
                <th className="text-left p-2">Action</th>
                <th className="text-left p-2">Business</th>
                <th className="text-left p-2">Source</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Summary</th>
              </tr>
            </thead>
            <tbody>
              {events.map(e => (
                <tr key={e.id} className="border-b border-border/20">
                  <td className="p-2 text-muted-foreground">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="p-2"><SevBadge level={e.severity} /></td>
                  <td className="p-2"><ActionBadge action={e.action_taken} /></td>
                  <td className="p-2 font-mono text-[10px]">{e.business_id?.slice(0,8) ?? "—"}</td>
                  <td className="p-2 text-muted-foreground">{e.source_module}</td>
                  <td className="p-2 text-muted-foreground">{e.event_type.replace(/_/g," ")}</td>
                  <td className="p-2">{e.event_summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CGSection>
    </CGLayout>
  );
}