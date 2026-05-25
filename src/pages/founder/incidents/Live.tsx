import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { INCLayout, INCSection, INCEmpty, NoAutoNoticesBanner } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { INCIDENT_SEVERITY_TONE, INCIDENT_STATUS_TONE, INCIDENT_TYPE_LABEL } from "@/lib/incidentEngine";

type Incident = {
  id: string; incident_title: string; incident_type: string; severity: string;
  incident_status: string; affected_systems: string[]; affected_customers_count: number;
  customer_notification_required: boolean; regulator_notification_required: boolean;
  discovered_at: string; owner: string | null;
};

type Event = { id: string; incident_id: string; event_time: string; event_summary: string; event_type: string };

export default function IncidentsLive() {
  const [incs, setIncs] = useState<Incident[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const [iRes, eRes] = await Promise.all([
        sb.from("incident_records").select("*").order("discovered_at", { ascending: false }),
        sb.from("incident_timeline_events").select("*").order("event_time", { ascending: false }).limit(50),
      ]);
      setIncs(iRes.data ?? []);
      setEvents(eRes.data ?? []);
    })();
  }, []);

  const live = incs.filter(i => !["closed"].includes(i.incident_status));

  return (
    <INCLayout title="Live incident board" subtitle="All open incidents in detected / investigating / contained / resolved / postmortem state. Triage internally; external notices remain approval-gated.">
      <NoAutoNoticesBanner />
      <INCSection title={`Open incidents (${live.length})`}>
        {live.length === 0 ? <INCEmpty title="No live incidents" hint="Runtime failures and security events that escalate here will be triaged by the Incident Agent." /> : (
          <div className="space-y-2">
            {live.map(i => (
              <div key={i.id} className="rounded border border-border/50 p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm">{i.incident_title}</span>
                  <Badge variant="outline" className={`${INCIDENT_SEVERITY_TONE[i.severity]} text-[10px]`}>{i.severity}</Badge>
                  <Badge variant="outline" className={`${INCIDENT_STATUS_TONE[i.incident_status]} text-[10px]`}>{i.incident_status}</Badge>
                  <Badge variant="outline" className="text-[10px]">{INCIDENT_TYPE_LABEL[i.incident_type] ?? i.incident_type}</Badge>
                  {i.customer_notification_required && <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">customer notice needed</Badge>}
                  {i.regulator_notification_required && <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">regulator notice needed</Badge>}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Discovered {new Date(i.discovered_at).toLocaleString()}
                  {i.owner ? ` · owner ${i.owner}` : ""}
                  {i.affected_customers_count ? ` · ~${i.affected_customers_count} customers` : ""}
                  {i.affected_systems?.length ? ` · systems: ${i.affected_systems.join(", ")}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </INCSection>

      <INCSection title="Recent timeline events" description="Append-only log linking detection → mitigation → escalation → resolution.">
        {events.length === 0 ? <INCEmpty title="No timeline events yet" /> : (
          <div className="space-y-1 text-xs">
            {events.map(e => (
              <div key={e.id} className="flex gap-2 border-b border-border/30 pb-1">
                <span className="text-muted-foreground shrink-0">{new Date(e.event_time).toLocaleString()}</span>
                <Badge variant="outline" className="text-[10px] shrink-0">{e.event_type}</Badge>
                <span>{e.event_summary}</span>
              </div>
            ))}
          </div>
        )}
      </INCSection>
    </INCLayout>
  );
}