import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { NCLayout, NCSection } from "./_shared";
import { fetchEscalations, SEVERITY_META, type Escalation } from "@/lib/notificationCentreEngine";

export default function NotificationsEscalations() {
  const [rows, setRows] = useState<Escalation[]>([]);
  useEffect(() => { fetchEscalations().then(setRows); }, []);
  const open = rows.filter(r => r.escalation_status !== "resolved" && r.escalation_status !== "cancelled");
  const closed = rows.filter(r => r.escalation_status === "resolved" || r.escalation_status === "cancelled");
  const renderRow = (r: Escalation) => {
    const sm = SEVERITY_META[r.severity] ?? SEVERITY_META.info;
    return (
      <div key={r.id} className="border border-border/50 rounded p-2 text-xs space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] ${sm.cls}`}>{sm.label}</Badge>
          <Badge variant="outline" className="text-[10px]">{r.escalation_type}</Badge>
          <Badge variant="outline" className="text-[10px]">{r.escalation_status}</Badge>
          <Badge variant="outline" className="text-[10px]">{r.source_module}</Badge>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {r.due_at ? `Due ${new Date(r.due_at).toLocaleDateString()}` : new Date(r.created_at).toLocaleString()}
          </span>
        </div>
        {r.escalation_reason && <p>{r.escalation_reason}</p>}
        <p className="text-[11px] text-muted-foreground">Owner: {r.assigned_to ?? r.assigned_to_type}</p>
      </div>
    );
  };
  return (
    <NCLayout title="Escalation Board" subtitle="Open escalations with owner, due date, source and reason.">
      <NCSection title={`Open (${open.length})`}>
        {open.length === 0 ? <p className="text-xs text-muted-foreground">No open escalations.</p>
          : <div className="space-y-2">{open.map(renderRow)}</div>}
      </NCSection>
      <NCSection title={`Resolved / cancelled (${closed.length})`}>
        {closed.length === 0 ? <p className="text-xs text-muted-foreground">None yet.</p>
          : <div className="space-y-2">{closed.slice(0, 50).map(renderRow)}</div>}
      </NCSection>
    </NCLayout>
  );
}