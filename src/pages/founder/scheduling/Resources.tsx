import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SchedLayout } from "./_shared";
import { fetchResources, RESOURCE_TYPE_LABEL, type SchedulingResource } from "@/lib/schedulingEngine";

export default function Resources() {
  const [rows, setRows] = useState<SchedulingResource[]>([]);
  useEffect(() => { fetchResources().then(setRows).catch(() => setRows([])); }, []);
  return (
    <SchedLayout title="Resource Schedule" subtitle="Founder, operators, advisers, rooms, locations, virtual rooms and equipment.">
      <Card className="tech-card p-3">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground"><tr><th className="text-left p-1">Name</th><th className="text-left p-1">Type</th><th className="text-left p-1">Timezone</th><th className="text-left p-1">Availability</th><th className="text-left p-1">Active</th><th className="text-left p-1">Test</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border/50">
                <td className="p-1">{r.resource_name}</td>
                <td className="p-1"><Badge variant="outline" className="text-[10px]">{RESOURCE_TYPE_LABEL[r.resource_type]}</Badge></td>
                <td className="p-1">{r.timezone}</td>
                <td className="p-1 text-muted-foreground">{r.availability_summary ?? "—"}</td>
                <td className="p-1">{r.active ? "Yes" : "No"}</td>
                <td className="p-1">{r.audit_metadata?.live_internal_test ? <Badge variant="outline" className="text-[10px] bg-blue-500/15 text-blue-300 border-blue-500/30">TEST</Badge> : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-3 text-muted-foreground text-center">No resources yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </SchedLayout>
  );
}