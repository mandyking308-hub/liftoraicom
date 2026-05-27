import FounderApprovalOperationsPanel from "@/components/founder/approvals/FounderApprovalOperationsPanel";

export default function ApprovalsOpsOverview() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-3">
      <div>
        <h1 className="text-xl font-semibold">Approval Operations Centre</h1>
        <p className="text-xs text-muted-foreground">
          Unified view of every blocked, paused, pending, escalated and decided action across all businesses and agents.
        </p>
      </div>
      <FounderApprovalOperationsPanel />
    </div>
  );
}