import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CGLayout, CGSection, CGStat, SevBadge, ActionBadge } from "./_shared";
import { fetchEvents, fetchProfiles, summarize, type ContextEvent, type ContextProfile } from "@/lib/contextGuardEngine";
import { FabricActivationCard } from "@/components/founder/command/FabricActivationCard";

export default function CGOverview() {
  const [events, setEvents] = useState<ContextEvent[]>([]);
  const [profiles, setProfiles] = useState<ContextProfile[]>([]);
  useEffect(() => {
    fetchEvents(200).then(setEvents).catch(() => {});
    fetchProfiles().then(setProfiles).catch(() => {});
  }, []);
  const sum = summarize(events, profiles);
  return (
    <CGLayout title="Multi-Business Context Fabric"
      subtitle="Before any AI action, workflow, draft or external send, Liftor verifies which business it belongs to and refuses to mix brand voice, pricing, customers, legal entity, products, policies or compliance rules across businesses.">
      <FabricActivationCard />
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <CGStat label="Context profiles" value={sum.profiles} hint="One per business" />
        <CGStat label="Events 24h" value={sum.events_24h} />
        <CGStat label="Missing business" value={sum.missing_24h} />
        <CGStat label="Cross-contamination" value={sum.contamination_24h} />
        <CGStat label="Blocked (external)" value={sum.blocked_24h} />
        <CGStat label="Approval required" value={sum.approvals_24h} />
      </div>

      <CGSection title="Recent events" actions={<Link to="/founder/context-fabric/events" className="text-xs text-primary hover:underline">All →</Link>}>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">No events recorded.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {events.slice(0, 12).map(e => (
              <li key={e.id} className="flex items-center gap-2 flex-wrap">
                <SevBadge level={e.severity} />
                <ActionBadge action={e.action_taken} />
                <span className="text-muted-foreground font-mono">{e.business_id?.slice(0,8) ?? "—"}</span>
                <span className="text-muted-foreground">{e.source_module}</span>
                <span>{e.event_summary}</span>
              </li>
            ))}
          </ul>
        )}
      </CGSection>
    </CGLayout>
  );
}