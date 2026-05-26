import { useQuery } from "@tanstack/react-query";
import { PMLayout, PerfTable } from "./_shared";
import { listPerfEvents } from "@/lib/platformMonitor";

export default function PMPerformance() {
  const { data: slow = [] } = useQuery({ queryKey: ["pm-slow"], queryFn: () => listPerfEvents({ event_type: "slow_page" }) });
  const { data: q = [] } = useQuery({ queryKey: ["pm-query"], queryFn: () => listPerfEvents({ event_type: "slow_query" }) });
  const { data: mem = [] } = useQuery({ queryKey: ["pm-mem"], queryFn: () => listPerfEvents({ event_type: "memory_warning" }) });
  const { data: bundle = [] } = useQuery({ queryKey: ["pm-bundle"], queryFn: () => listPerfEvents({ event_type: "bundle_warning" }) });
  return (
    <PMLayout title="Performance" subtitle="Slow pages, slow queries, memory pressure and bundle size warnings.">
      <h2 className="text-sm font-semibold">Slow pages</h2><PerfTable rows={slow} />
      <h2 className="text-sm font-semibold mt-3">Slow queries</h2><PerfTable rows={q} />
      <h2 className="text-sm font-semibold mt-3">Memory warnings</h2><PerfTable rows={mem} />
      <h2 className="text-sm font-semibold mt-3">Bundle warnings</h2><PerfTable rows={bundle} />
    </PMLayout>
  );
}