import { useQuery } from "@tanstack/react-query";
import { PMLayout, PerfTable } from "./_shared";
import { listPerfEvents } from "@/lib/platformMonitor";

export default function PMErrors() {
  const { data: edge = [] } = useQuery({ queryKey: ["pm-edge"], queryFn: () => listPerfEvents({ event_type: "edge_function_error" }) });
  const { data: api = [] } = useQuery({ queryKey: ["pm-api"], queryFn: () => listPerfEvents({ event_type: "api_error" }) });
  const { data: timeout = [] } = useQuery({ queryKey: ["pm-timeout"], queryFn: () => listPerfEvents({ event_type: "timeout" }) });
  return (
    <PMLayout title="Errors" subtitle="Edge function failures, provider API errors and timeouts. Severe errors link to the Incident Engine.">
      <h2 className="text-sm font-semibold">Edge function errors</h2><PerfTable rows={edge} />
      <h2 className="text-sm font-semibold mt-3">API errors</h2><PerfTable rows={api} />
      <h2 className="text-sm font-semibold mt-3">Timeouts</h2><PerfTable rows={timeout} />
    </PMLayout>
  );
}