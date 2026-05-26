import { useEffect, useState } from "react";
import { InsLayout, InsSection, EventTypeBadge, SeverityBadge, shortId } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { fetchEvents, type LiabilityEvent } from "@/lib/insuranceLiabilityEngine";

export default function InsuranceClaims() {
  const [rows, setRows] = useState<LiabilityEvent[]>([]);
  useEffect(() => { fetchEvents().then(setRows).catch(() => {}); }, []);

  return (
    <InsLayout title="Liability event board"
      subtitle="Complaints, claims, incidents, disputes, IP and data issues that may be insurance-relevant. Linked to policies. No insurer notification without approval.">
      <InsSection title={`Events (${rows.length})`} description="Source events flow in from Complaints, Incidents and Support. The agent flags insurance relevance only.">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No liability events logged.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Business</th>
                  <th className="text-left p-2">Summary</th>
                  <th className="text-left p-2">Severity</th>
                  <th className="text-left p-2">Insurance-relevant</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Logged</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(e => (
                  <tr key={e.id} className="border-b border-border/20 hover:bg-secondary/30">
                    <td className="p-2"><EventTypeBadge t={e.event_type} /></td>
                    <td className="p-2 text-muted-foreground">{shortId(e.business_id)}</td>
                    <td className="p-2">{e.event_summary ?? "—"}</td>
                    <td className="p-2"><SeverityBadge s={e.severity} /></td>
                    <td className="p-2">{e.insurance_relevant
                      ? <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Yes — adviser review</Badge>
                      : <span className="text-muted-foreground">No</span>}</td>
                    <td className="p-2 text-muted-foreground">{e.status}</td>
                    <td className="p-2 text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </InsSection>
    </InsLayout>
  );
}