import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ShieldCheck, ArrowRight, AlertTriangle } from "lucide-react";
import { useOutreachSafetyAudit } from "@/hooks/useOutreachSafetyAudit";

/**
 * READ-ONLY Outreach Safety / Queue Brake panel.
 * No mutation buttons. Same source of truth as /founder/outreach/queue-audit.
 */
const Stat = ({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "good" | "warn" | "danger" | "default" }) => {
  const cls =
    tone === "good" ? "text-green-400" :
    tone === "warn" ? "text-yellow-400" :
    tone === "danger" ? "text-destructive" :
    "text-foreground";
  return (
    <div className="rounded bg-secondary/40 p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${cls}`}>{value}</p>
    </div>
  );
};

export default function OutreachSafetyPanel() {
  const { data, isLoading, error, refetch, isFetching } = useOutreachSafetyAudit();

  const status = data?.summary?.safety_status;
  const cronCheck = data?.summary?.cron_check ?? data?.baseline?.cron_check;
  const isSafe = status === "SAFE_BLOCKED";
  const counts = data?.summary?.classification_counts;
  const reviewRequired = counts?.review_required ?? 0;
  const validFutureBlocked = counts?.valid_future_step_blocked ?? 0;
  const cancelCandidate = counts?.cancel_candidate ?? 0;
  const legacyPending = counts?.legacy_pending ?? 0;
  const orphanFollowup = counts?.orphan_followup ?? 0;
  const parkOrCancelTotal = cancelCandidate + legacyPending + orphanFollowup;
  const cleanupApplyEnabled = data?.cleanup_preview?.apply_button?.enabled ?? false;
  const cleanupApplyUnavailable = !cleanupApplyEnabled || parkOrCancelTotal === 0;

  const headerTone = error ? "danger" : isSafe ? "good" : "warn";
  const HeaderIcon = isSafe ? ShieldCheck : ShieldAlert;

  return (
    <Card className={`border-2 ${
      headerTone === "danger" ? "border-destructive/40 bg-destructive/5" :
      headerTone === "good" ? "border-green-500/40 bg-green-500/5" :
      "border-yellow-500/40 bg-yellow-500/5"
    }`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <HeaderIcon size={16} className={
            headerTone === "good" ? "text-green-400" :
            headerTone === "danger" ? "text-destructive" : "text-yellow-400"
          } />
          Outreach Safety / Queue Brake
          <Badge variant="outline" className="ml-2 text-[10px]">READ-ONLY</Badge>
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Refreshing…" : "Refresh"}
          </Button>
          <Link to="/founder/outreach/queue-audit">
            <Button size="sm" variant="outline">Open Queue Audit <ArrowRight size={12} className="ml-1" /></Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle size={14} />
            <span>Outreach safety audit unavailable — review required</span>
            <span className="text-xs text-muted-foreground ml-2">({error.message})</span>
          </div>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Loading safety audit…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="Safety status" value={status ?? "—"} tone={isSafe ? "good" : "danger"} />
              <Stat label="Cron check" value={cronCheck ?? "—"} tone={cronCheck === "verified_disabled" ? "good" : cronCheck === "active_sender_found_unsafe" ? "danger" : "warn"} />
              <Stat label="auto_send_enabled" value={String(data?.baseline?.auto_send_enabled_value ?? "missing")} tone={data?.baseline?.auto_send_is_strict_false ? "good" : "danger"} />
              <Stat label="Worker kill switch" value={data?.baseline?.worker_guard_present_in_source ? "yes" : "no"} tone={data?.baseline?.worker_guard_present_in_source ? "good" : "danger"} />
              <Stat label="Pending (Neon Candy)" value={data?.summary?.total_pending ?? 0} tone="warn" />
              <Stat label="Step 2 pending" value={data?.summary?.step2_pending ?? 0} />
              <Stat label="Step 4 pending" value={data?.summary?.step4_pending ?? 0} />
              <Stat label="Founder protected" value={data?.founder_protected ? "yes" : "no"} tone={data?.founder_protected ? "good" : "danger"} />
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Classification</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <Stat label="cancel_candidate" value={counts?.cancel_candidate ?? 0} />
                <Stat label="legacy_pending" value={counts?.legacy_pending ?? 0} />
                <Stat label="orphan_followup" value={counts?.orphan_followup ?? 0} />
                <Stat label="review_required" value={counts?.review_required ?? 0} tone="warn" />
                <Stat label="valid_future_step_blocked" value={counts?.valid_future_step_blocked ?? 0} />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="Cleanup gate exists" value="yes" tone="good" />
              <Stat label="Cleanup Apply available" value={data?.cleanup_preview?.apply_button?.enabled ? "yes" : "no"} tone={data?.cleanup_preview?.apply_button?.enabled ? "warn" : "good"} />
              <Stat label="Manual Send Apply absent" value="yes" tone="good" />
              <Stat label="Audit emails sent" value={data?.cleanup_preview?.counters?.emails_sent ?? 0} tone="good" />
              <Stat label="SMTP/provider calls" value={data?.cleanup_preview?.counters?.provider_calls ?? 0} tone="good" />
              <Stat label="Apollo calls" value={0} tone="good" />
              <Stat label="Apollo credits spent" value={data?.cleanup_preview?.counters?.apollo_credits_spent ?? 0} tone="good" />
              <Stat label="Queue rows changed" value={data?.cleanup_preview?.counters?.rows_changed ?? 0} tone="good" />
            </div>

            <div className="rounded-md border border-border/50 bg-background/40 p-2 text-xs space-y-1.5">
              <p>
                <span className="font-medium text-foreground">Next recommended action: </span>
                {!isSafe
                  ? "Verify outreach brake / cron status, then review Queue Audit before any cleanup or send action."
                  : reviewRequired > 0
                  ? `Open Queue Audit to inspect the ${reviewRequired} review_required row${reviewRequired === 1 ? "" : "s"}. Do not send. Decide whether each row needs compliance remediation, blocking, or parking. The ${validFutureBlocked} valid_future_step_blocked row${validFutureBlocked === 1 ? "" : "s"} remain held until Manual Send Apply is built.`
                  : parkOrCancelTotal > 0
                  ? "Open Queue Audit to review cleanup classification groups before any controlled manual send."
                  : "Open Queue Audit. No park/cancel candidates currently. No send action available."}
              </p>
              {cleanupApplyUnavailable && (
                <p className="text-muted-foreground">
                  Cleanup Apply unavailable for current classification.
                  {parkOrCancelTotal === 0 && " (cancel_candidate=0, legacy_pending=0, orphan_followup=0)"}
                </p>
              )}
              <p className="text-muted-foreground">
                Manual Send Apply is not built. SAFE_BLOCKED means safe to inspect and clean — not safe to send.
              </p>
            </div>

            {!isSafe && (
              <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-2 text-[11px] text-yellow-200">
                Queue creation is blocked until the send brake is verified.
                Queue creation is not harmless unless the send worker and cron are physically blocked.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}