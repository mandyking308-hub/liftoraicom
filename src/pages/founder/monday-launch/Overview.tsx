import MondayLaunchChecklist from "@/components/founder/monday/MondayLaunchChecklist";

export default function MondayLaunchOverview() {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Monday Launch Checklist</h1>
        <p className="text-sm text-muted-foreground mt-1">
          One-screen launch console — switch to MONDAY_WATCH, activate only the three approved
          businesses, monitor health and approvals, and trigger emergency stop / read-only recovery
          if anything goes sideways.
        </p>
      </header>
      <MondayLaunchChecklist />
    </div>
  );
}