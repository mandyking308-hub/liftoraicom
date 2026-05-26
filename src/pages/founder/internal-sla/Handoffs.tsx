import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlaLayout, HandoffTable } from "./_shared";
import { Card } from "@/components/ui/card";
import { listHandoffs, HandoffStatus, HandoffType } from "@/lib/internalSla";

export default function SlaHandoffs() {
  const [status, setStatus] = useState<HandoffStatus | "">("");
  const [type, setType] = useState<HandoffType | "">("");
  const { data: rows = [] } = useQuery({
    queryKey: ["sla-handoffs", status, type],
    queryFn: () => listHandoffs({ status: status || undefined, handoff_type: type || undefined, limit: 500 }),
  });
  return (
    <SlaLayout title="Handoff board" subtitle="Every handoff between AI, founder and human operators. Filter by type or status.">
      <Card className="tech-card p-3">
        <div className="grid md:grid-cols-2 gap-2 text-xs">
          <select className="h-8 bg-background border border-border/50 rounded px-2" value={type} onChange={e => setType(e.target.value as any)}>
            <option value="">All types</option>
            {["ai_to_founder","ai_to_human","human_to_ai","founder_to_human","agent_to_agent","adviser_review","technical_review"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="h-8 bg-background border border-border/50 rounded px-2" value={status} onChange={e => setStatus(e.target.value as any)}>
            <option value="">All statuses</option>
            {["created","accepted","in_progress","blocked","completed","overdue","cancelled"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </Card>
      <HandoffTable rows={rows} />
    </SlaLayout>
  );
}