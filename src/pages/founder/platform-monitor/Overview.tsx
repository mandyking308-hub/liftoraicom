import { useQuery } from "@tanstack/react-query";
import { PMLayout, Stat, PerfTable } from "./_shared";
import { summariseMonitor, listPerfEvents } from "@/lib/platformMonitor";
import { Card } from "@/components/ui/card";

export default function PMOverview() {
  const { data: s } = useQuery({ queryKey: ["pm-summary"], queryFn: summariseMonitor, refetchInterval: 60000 });
  const { data: recent = [] } = useQuery({ queryKey: ["pm-recent"], queryFn: () => listPerfEvents({ limit: 20 }) });
  return (
    <PMLayout title="Platform Performance, Cost & Scalability" subtitle="Live monitoring of slow pages, heavy queries, edge function failures, AI cost spikes, rate limits, large tables and bundle warnings. Infrastructure changes, plan upgrades and provider changes require founder approval.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Stat label="Events" value={s?.totalEvents ?? 0} />
        <Stat label="Open" value={s?.openEvents ?? 0} tone={s?.openEvents ? "warn" : undefined} />
        <Stat label="Critical" value={s?.criticalOpen ?? 0} tone={s?.criticalOpen ? "bad" : undefined} />
        <Stat label="High" value={s?.highOpen ?? 0} tone={s?.highOpen ? "warn" : undefined} />
        <Stat label="Edge errors" value={s?.edgeErrors ?? 0} tone={s?.edgeErrors ? "bad" : undefined} />
        <Stat label="Rate limits" value={s?.rateLimits ?? 0} tone={s?.rateLimits ? "warn" : undefined} />
        <Stat label="Slow pages" value={s?.slowPages ?? 0} tone={s?.slowPages ? "warn" : undefined} />
        <Stat label="Large tables" value={s?.largeTables ?? 0} tone={s?.largeTables ? "warn" : undefined} />
        <Stat label="Bundle warns" value={s?.bundleWarnings ?? 0} tone={s?.bundleWarnings ? "warn" : undefined} />
        <Stat label="30d cost USD" value={(s?.costLast30d ?? 0).toFixed(2)} />
        <Stat label="30d AI cost" value={(s?.aiCostLast30d ?? 0).toFixed(2)} />
        <Stat label="Recs (open)" value={s?.recsAwaitingApproval ?? 0} tone={s?.recsAwaitingApproval ? "warn" : undefined} />
      </div>
      {s && s.watchItems.length > 0 && (
        <Card className="tech-card p-3 border-yellow-500/40">
          <p className="text-xs text-yellow-300 font-semibold mb-1">Watch items</p>
          <ul className="text-xs text-yellow-200/90 list-disc pl-5">{s.watchItems.map((w,i) => <li key={i}>{w}</li>)}</ul>
        </Card>
      )}
      <h2 className="text-sm font-semibold mt-2">Recent events</h2>
      <PerfTable rows={recent} />
    </PMLayout>
  );
}