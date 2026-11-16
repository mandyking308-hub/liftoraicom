import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock3, LockKeyhole, ShieldCheck, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import {
  loadKindnesssPrivacyOperations,
  privacyDueState,
  PRIVACY_OPERATOR_STATUSES,
  saveKindnesssPrivacyOperation,
  type PrivacyOperationCase,
  type PrivacyOperatorStatus,
} from "@/lib/kindnesssPrivacyOperations";
import { CommsLayout, Stat, StatusBadge } from "./_shared";

const DUE_LABELS = {
  overdue: "Overdue",
  due_soon: "Due within 72 hours",
  scheduled: "Scheduled",
  authoritatively_resolved: "Kindnesss resolution recorded",
  unverified: "Due time unverified",
} as const;

function formatTime(value: string | null): string {
  if (!value || Number.isNaN(Date.parse(value))) return "Unverified";
  return new Date(value).toLocaleString();
}

export default function CommsPrivacy() {
  const { user } = useAuth();
  const snapshotQuery = useQuery({
    queryKey: ["founder-kindnesss-privacy-operations"],
    queryFn: loadKindnesssPrivacyOperations,
    refetchInterval: 60_000,
  });
  const snapshot = snapshotQuery.data;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<PrivacyOperatorStatus>("acknowledged");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const selected = snapshot?.cases.find((item) => item.privacyRequestId === selectedId) ?? null;
  const activated = snapshot?.availability === "available";

  const selectCase = (item: PrivacyOperationCase) => {
    setSelectedId(item.privacyRequestId);
    setStatus(item.operatorStatus === "unacknowledged" ? "acknowledged" : item.operatorStatus);
    setSaveError(null);
  };

  const saveTriage = async () => {
    if (!selected || !user?.id || !activated) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveKindnesssPrivacyOperation({
        privacyRequestId: selected.privacyRequestId,
        ownerUserId: user.id,
        operationalStatus: status,
        expectedUpdatedAt: selected.operationsUpdatedAt,
      });
      await snapshotQuery.refetch();
    } catch {
      setSaveError("Triage was not saved. Delivery receipts and the Kindnesss case were not changed; refresh and retry.");
    } finally {
      setSaving(false);
    }
  };

  const cases = snapshot?.cases ?? [];
  const countWithDueState = (state: "overdue" | "due_soon") => cases.filter((item) => privacyDueState(item.dueAt, item.canonicalStatus) === state).length;

  return (
    <CommsLayout
      title="Kindnesss Privacy Operations"
      subtitle="Separate metadata-only privacy queue. No sales inbox, CRM contact, marketing automation, GHAT routing, external response or automatic email is connected."
    >
      <Card className="tech-card p-4 flex items-start gap-3" data-testid="privacy-activation-state">
        <LockKeyhole className="h-5 w-5 shrink-0 text-primary" />
        <div className="text-xs space-y-1">
          <p className="font-semibold">{activated ? "Privacy receipts available · receiver activation separately unverified" : "Not activated · delivery state unverified"}</p>
          <p className="text-muted-foreground">{snapshot?.detail ?? "Reading the dedicated privacy workstream. No availability is assumed."}</p>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Recorded deliveries" value={activated ? cases.reduce((sum, item) => sum + item.deliveryCount, 0) : "Unverified"} hint="Immutable receipts, not request totals" />
        <Stat label="Unacknowledged" value={activated ? cases.filter((item) => item.operatorStatus === "unacknowledged").length : "Unverified"} tone="warn" />
        <Stat label="Overdue" value={activated ? countWithDueState("overdue") : "Unverified"} tone={activated && countWithDueState("overdue") ? "bad" : undefined} />
        <Stat label="Due soon" value={activated ? countWithDueState("due_soon") : "Unverified"} tone="warn" />
        <Stat label="Owner assigned" value={activated ? cases.filter((item) => item.ownerUserId).length : "Unverified"} hint="Founder/admin operators only" />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Card className="tech-card p-4 space-y-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-semibold">1 · Delivery acknowledged</h2>
          <p className="text-xs text-muted-foreground">A 202/200 response follows durable immutable receipt storage. It does not mean a person has reviewed the request.</p>
        </Card>
        <Card className="tech-card p-4 space-y-2">
          <UserCheck className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-semibold">2 · Operator acknowledgement</h2>
          <p className="text-xs text-muted-foreground">Founder/admin ownership and triage are internal Liftor work tracking only. Due alerts are visual; no cron or email alert is active.</p>
        </Card>
        <Card className="tech-card p-4 space-y-2">
          <LockKeyhole className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-semibold">3 · Kindnesss authoritative decision</h2>
          <p className="text-xs text-muted-foreground">Only an authorised Kindnesss admin can verify identity, approve, reject or close the canonical case. Liftor provides none of those actions.</p>
        </Card>
      </div>

      <Card className="tech-card p-0 overflow-x-auto">
        <table className="w-full min-w-[940px] text-xs">
          <thead className="bg-secondary/30 text-muted-foreground">
            <tr><th className="text-left p-2">Case reference</th><th className="text-left p-2">Type</th><th className="text-left p-2">Deliveries</th><th className="text-left p-2">Due alert</th><th className="text-left p-2">Operator status</th><th className="text-left p-2">Owner</th><th className="text-left p-2">Last delivery</th><th className="text-left p-2">Action</th></tr>
          </thead>
          <tbody>
            {snapshotQuery.isLoading && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Reading privacy metadata…</td></tr>}
            {!snapshotQuery.isLoading && snapshot?.availability !== "available" && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground" data-testid="privacy-empty-state">Not activated. No delivery, ownership or request count is inferred.</td></tr>}
            {cases.map((item) => {
              const due = privacyDueState(item.dueAt, item.canonicalStatus);
              return (
                <tr key={item.privacyRequestId} className="border-t border-border/30 align-top">
                  <td className="p-2 max-w-[210px] break-all">{item.privacyRequestId}<span className="block text-[9px] text-muted-foreground">Request {item.requestRef}</span></td>
                  <td className="p-2">{item.requestType.replace(/_/g, " ")}</td>
                  <td className="p-2">{item.deliveryCount}<span className="block text-[9px] text-muted-foreground">{item.latestDeliveryKind.replace(/_/g, " ")}</span></td>
                  <td className="p-2"><Badge variant={due === "overdue" ? "destructive" : "outline"}>{DUE_LABELS[due]}</Badge><span className="block mt-1 text-[9px] text-muted-foreground">{formatTime(item.dueAt)}</span></td>
                  <td className="p-2"><StatusBadge status={item.operatorStatus} /></td>
                  <td className="p-2 max-w-[150px] break-all">{item.ownerUserId ?? "Unassigned"}</td>
                  <td className="p-2 whitespace-nowrap">{formatTime(item.lastDeliveryAt)}</td>
                  <td className="p-2"><Button size="sm" variant="outline" onClick={() => selectCase(item)}>Review</Button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {selected && (
        <Card className="tech-card p-4 space-y-4" data-testid="privacy-operation-review">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Privacy operator review</h2>
              <p className="text-xs text-muted-foreground break-all">Case {selected.privacyRequestId} · Request {selected.requestRef}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>Back to queue</Button>
          </div>

          <dl className="grid md:grid-cols-4 gap-3 text-xs">
            <div><dt className="text-muted-foreground">Delivery acknowledgement</dt><dd>Durable receipt recorded</dd></div>
            <div><dt className="text-muted-foreground">Operator acknowledgement</dt><dd>{formatTime(selected.operatorAcknowledgedAt)}</dd></div>
            <div><dt className="text-muted-foreground">Kindnesss case status</dt><dd>{selected.canonicalStatus.replace(/_/g, " ")}</dd></div>
            <div><dt className="text-muted-foreground">Due</dt><dd>{formatTime(selected.dueAt)}</dd></div>
          </dl>

          <div className="rounded border border-border/50 p-3 text-xs text-muted-foreground">
            No requester name, email, message, relationship, child information, notes or request details are read or stored here. The reference opens no commercial reply path.
          </div>

          <div className="grid md:grid-cols-2 gap-3 items-end">
            <div>
              <Label htmlFor="privacy-operator-status">Operator triage status</Label>
              <select id="privacy-operator-status" className="mt-1 h-9 w-full bg-background border border-border/50 rounded px-2 text-xs" value={status} onChange={(event) => setStatus(event.target.value as PrivacyOperatorStatus)} disabled={!activated || saving}>
                {PRIVACY_OPERATOR_STATUSES.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <Button onClick={saveTriage} disabled={!activated || !user?.id || saving}>
              <UserCheck className="h-4 w-4 mr-2" />{saving ? "Saving triage…" : "Save triage and assign to me"}
            </Button>
          </div>
          {!activated && <p className="text-xs text-muted-foreground">Triage controls remain disabled until the reviewed candidate schema is applied in the intended environment.</p>}
          {saveError && <p role="alert" className="text-xs text-destructive flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{saveError}</p>}
          <p className="text-xs text-muted-foreground flex items-start gap-2"><Clock3 className="h-4 w-4 shrink-0" />Saving updates only Liftor ownership/triage. It does not acknowledge the requester, verify identity, approve or close the Kindnesss case, send email, or create a CRM record.</p>
        </Card>
      )}
    </CommsLayout>
  );
}
