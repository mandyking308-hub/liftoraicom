import { useQuery } from "@tanstack/react-query";
import { PMLayout, PerfTable } from "./_shared";
import { listPerfEvents } from "@/lib/platformMonitor";

export default function PMRateLimits() {
  const { data: rows = [] } = useQuery({ queryKey: ["pm-rate"], queryFn: () => listPerfEvents({ event_type: "rate_limit" }) });
  return (
    <PMLayout title="Rate limits" subtitle="Provider, gateway and connector rate-limit warnings. Adjustments require approval.">
      <PerfTable rows={rows} />
    </PMLayout>
  );
}