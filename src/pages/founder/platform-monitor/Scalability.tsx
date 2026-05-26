import { useQuery } from "@tanstack/react-query";
import { PMLayout, PerfTable } from "./_shared";
import { listPerfEvents } from "@/lib/platformMonitor";

export default function PMScalability() {
  const { data: large = [] } = useQuery({ queryKey: ["pm-large"], queryFn: () => listPerfEvents({ event_type: "large_table" }) });
  const { data: bundle = [] } = useQuery({ queryKey: ["pm-bundle2"], queryFn: () => listPerfEvents({ event_type: "bundle_warning" }) });
  const { data: mem = [] } = useQuery({ queryKey: ["pm-mem2"], queryFn: () => listPerfEvents({ event_type: "memory_warning" }) });
  return (
    <PMLayout title="Scalability warnings" subtitle="Large tables without pagination, bundle bloat and memory pressure. Destructive pruning and provider scaling require approval.">
      <h2 className="text-sm font-semibold">Large tables</h2><PerfTable rows={large} />
      <h2 className="text-sm font-semibold mt-3">Bundle warnings</h2><PerfTable rows={bundle} />
      <h2 className="text-sm font-semibold mt-3">Memory pressure</h2><PerfTable rows={mem} />
    </PMLayout>
  );
}