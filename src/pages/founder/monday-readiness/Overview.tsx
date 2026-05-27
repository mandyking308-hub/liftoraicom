import FounderMondayLaunchPanel from "@/components/founder/monday/FounderMondayLaunchPanel";

export default function MondayReadinessOverview() {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Monday Readiness</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Final pre-launch verification across routes, queues, AI gateway, approvals, backups,
          context fabric, system health, business isolation, runtime modes, outbound controls,
          worker heartbeat, environment, RLS, founder access, and audit logging.
        </p>
      </header>
      <FounderMondayLaunchPanel />
    </div>
  );
}