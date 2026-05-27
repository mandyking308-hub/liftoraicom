import BusinessActivationControlPanel from "@/components/founder/activation/BusinessActivationControlPanel";

export default function BusinessActivationOverview() {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Business Activation Control
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monday-safe runtime gate. Only the three controlled businesses can execute,
          send outbound, or trigger AI orchestration. Everything else is isolated.
        </p>
      </header>
      <BusinessActivationControlPanel />
    </div>
  );
}