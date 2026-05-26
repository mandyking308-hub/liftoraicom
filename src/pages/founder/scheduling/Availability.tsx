import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SchedLayout } from "./_shared";
import { fetchAvailability, fetchResources, DAY_LABEL, type AvailabilityWindow, type SchedulingResource } from "@/lib/schedulingEngine";

export default function Availability() {
  const [rows, setRows] = useState<AvailabilityWindow[]>([]);
  const [resources, setResources] = useState<SchedulingResource[]>([]);
  useEffect(() => {
    fetchAvailability().then(setRows).catch(() => setRows([]));
    fetchResources().then(setResources).catch(() => setResources([]));
  }, []);
  const nameOf = (id: string) => resources.find(r => r.id === id)?.resource_name ?? id.slice(0,8);
  return (
    <SchedLayout title="Availability Board" subtitle="Weekly recurring windows per resource. Used to detect conflicts and recommend slots before booking.">
      <Card className="tech-card p-3">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground"><tr><th className="text-left p-1">Resource</th><th className="text-left p-1">Day</th><th className="text-left p-1">Start</th><th className="text-left p-1">End</th><th className="text-left p-1">TZ</th><th className="text-left p-1">Active</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border/50">
                <td className="p-1">{nameOf(r.resource_id)}</td>
                <td className="p-1">{DAY_LABEL[r.day_of_week] ?? r.day_of_week}</td>
                <td className="p-1 font-mono">{r.start_time}</td>
                <td className="p-1 font-mono">{r.end_time}</td>
                <td className="p-1">{r.timezone}</td>
                <td className="p-1">{r.active ? "Yes" : "No"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-3 text-muted-foreground text-center">No availability windows.</td></tr>}
          </tbody>
        </table>
      </Card>
    </SchedLayout>
  );
}