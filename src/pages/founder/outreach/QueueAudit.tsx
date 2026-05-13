import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShieldAlert, ShieldCheck, RefreshCw } from "lucide-react";

type AuditItem = {
  queue_id: string;
  contact_name: string | null;
  contact_email: string | null;
  sequence_step: number;
  scheduled_at: string;
  classification: string;
  recommended_action: string;
  reason: string;
  blockers: string[];
  prior_sent_steps: number[];
  last_sent_step: number | null;
  last_sent_at: string | null;
  last_provider_message_id: string | null;
  step1_sent: boolean;
  follows_last_sent_step: boolean;
  duplicate_pending_same_step: boolean;
  prior_reply: boolean;
  compliance_status: string | null;
  lawful_basis: string | null;
  unsubscribe_token_present: boolean;
  bcr_current_stage: string | null;
  bcr_campaign_eligible: boolean | null;
  bcr_do_not_contact: boolean | null;
  bcr_business_match: boolean;
  contact_status: string | null;
  inbox_email: string | null;
  campaign_name: string | null;
  provider_mode: string;
  subject: string | null;
  body_preview: string | null;
};

type AuditResponse = {
  ok: boolean;
  dry_run: boolean;
  founder_protected?: boolean;
  generated_at: string;
  baseline: any;
  summary: any;
  items: AuditItem[];
  cleanup_preview: any;
};

const classBadge = (c: string) => {
  switch (c) {
    case "valid_future_step_blocked": return <Badge variant="secondary">{c}</Badge>;
    case "cancel_candidate": return <Badge variant="destructive">{c}</Badge>;
    case "orphan_followup": return <Badge variant="destructive">{c}</Badge>;
    case "legacy_pending": return <Badge variant="outline">{c}</Badge>;
    default: return <Badge>{c}</Badge>;
  }
};

const Stat = ({ label, value, tone }: { label: string; value: string | number; tone?: "ok" | "warn" | "bad" }) => (
  <div className="rounded-md border bg-card p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={`text-2xl font-semibold ${tone === "ok" ? "text-primary" : tone === "bad" ? "text-destructive" : ""}`}>{value}</div>
  </div>
);

const QueueAudit = () => {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await supabase.functions.invoke("outreach-queue-audit", { body: {} });
    if (err) setError(err.message);
    else setData(res as AuditResponse);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="container max-w-7xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Queue Audit — Neon Candy</h1>
          <p className="text-muted-foreground text-sm mt-1">Read-only brake verification + parked queue classification.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />} Re-run audit
        </Button>
      </div>

      <Alert variant="destructive">
        <ShieldAlert />
        <AlertTitle>Queue creation is not harmless unless the send worker is physically blocked.</AlertTitle>
        <AlertDescription>
          This audit does not send, schedule, modify, cancel or create anything. It only verifies the brake and classifies parked pending rows.
        </AlertDescription>
      </Alert>

      {data && !data.founder_protected && (
        <Alert variant="destructive">
          <ShieldAlert />
          <AlertTitle>Security hardening required: audit endpoint must be founder-only before production use.</AlertTitle>
          <AlertDescription>The audit endpoint did not confirm founder/admin access on this call.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
        {["Auto-send is blocked","Pending rows are parked","Dry-run audit only","No SMTP calls made","No Apollo calls made","No queue rows changed","No contacts changed","No BCRs changed","No compliance records changed"].map(s => (
          <div key={s} className="rounded-md border bg-muted/30 px-2 py-1.5 text-center">{s}</div>
        ))}
      </div>

      {error && <Alert variant="destructive"><AlertTitle>Audit failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      {loading && !data && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin" /> Running audit…</div>}

      {data && (
        <>
          {/* Safety baseline */}
          <Card>
            <CardHeader className="flex-row items-center gap-2">
              {data.summary.safety_status === "SAFE_BLOCKED"
                ? <ShieldCheck className="text-primary" />
                : <ShieldAlert className="text-destructive" />}
              <CardTitle>Safety baseline: {data.summary.safety_status}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>auto_send_enabled present: <b>{String(data.baseline.auto_send_setting_present)}</b></div>
              <div>auto_send_enabled value: <b>{JSON.stringify(data.baseline.auto_send_enabled_value)}</b></div>
              <div>strict false: <b>{String(data.baseline.auto_send_is_strict_false)}</b></div>
              <div>worker fail-closed guard present in source: <b>{String(data.baseline.worker_guard_present_in_source)}</b></div>
              <div>worker exits before queue selection unless auto_send_enabled === true: <b>{String(data.baseline.worker_exits_before_queue_selection)}</b></div>
              <div>cron_check: <b className={
                data.baseline.cron_check === "verified_disabled" ? "text-primary"
                : data.baseline.cron_check === "active_sender_found_unsafe" ? "text-destructive"
                : "text-destructive"
              }>{data.baseline.cron_check}</b></div>
              <div>active outbound send cron jobs: <b>{data.baseline.cron_outbound_send_jobs.length}</b></div>
              <div>inbound-only cron jobs: <b>{data.baseline.cron_inbound_only_jobs.length}</b></div>
              <div>SMTP called by this audit: <b>{String(data.baseline.smtp_called)}</b></div>
              <div>Apollo called by this audit: <b>{String(data.baseline.apollo_called)}</b></div>
              <div>founder-protected: <b>{String(data.baseline.founder_protected)}</b> — {data.baseline.auth_reason}</div>
              {data.summary.unsafe_reasons.length > 0 && (
                <Alert variant="destructive" className="mt-3">
                  <AlertTitle>Review required</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5">{data.summary.unsafe_reasons.map((r: string) => <li key={r}>{r}</li>)}</ul>
                  </AlertDescription>
                </Alert>
              )}
              {data.baseline.notes?.length > 0 && (
                <div className="text-muted-foreground text-xs">Notes: {data.baseline.notes.join(" | ")}</div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Stat label="Total pending" value={data.summary.total_pending} tone={data.summary.matches_handover_count ? "ok" : "bad"} />
            <Stat label="Expected (handover)" value={data.summary.expected_pending} />
            <Stat label="Step 2 pending" value={data.summary.step2_pending} />
            <Stat label="Step 4 pending" value={data.summary.step4_pending} />
            <Stat label="orphan_followup" value={data.summary.classification_counts.orphan_followup} />
            <Stat label="legacy_pending" value={data.summary.classification_counts.legacy_pending} />
            <Stat label="valid_future_step_blocked" value={data.summary.classification_counts.valid_future_step_blocked} />
            <Stat label="cancel_candidate" value={data.summary.classification_counts.cancel_candidate} />
            <Stat label="review_required" value={data.summary.classification_counts.review_required} />
            <Stat label="Compliance blockers" value={data.summary.rows_with_compliance_blockers} />
            <Stat label="Suppression blockers" value={data.summary.rows_with_suppression_blockers} />
            <Stat label="BCR blockers" value={data.summary.rows_with_bcr_blockers} />
            <Stat label="Missing prior send proof" value={data.summary.rows_missing_prior_send_proof} />
            <Stat label="Duplicate queue risk" value={data.summary.rows_with_duplicate_risk} />
            <Stat label="Prior reply risk" value={data.summary.rows_with_prior_reply_risk} />
          </div>

          {/* Items table */}
          <Card>
            <CardHeader><CardTitle>Pending queue rows ({data.items.length})</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Step</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead>Blockers</TableHead>
                    <TableHead>Prior sends</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>BCR</TableHead>
                    <TableHead>Recommended</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((it) => (
                    <TableRow key={it.queue_id}>
                      <TableCell>
                        <div className="font-medium">{it.contact_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{it.contact_email}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{it.queue_id.slice(0, 8)}</div>
                      </TableCell>
                      <TableCell>{it.sequence_step}</TableCell>
                      <TableCell className="text-xs">{new Date(it.scheduled_at).toISOString().slice(0, 16).replace("T", " ")}</TableCell>
                      <TableCell>{classBadge(it.classification)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {it.blockers.length === 0
                            ? <span className="text-xs text-muted-foreground">none</span>
                            : it.blockers.map(b => <Badge key={b} variant="outline" className="text-[10px]">{b}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        steps: [{it.prior_sent_steps.join(",")}]<br />
                        last sent: {it.last_sent_step ?? "—"}{it.last_sent_at ? ` @ ${new Date(it.last_sent_at).toISOString().slice(0,16).replace("T"," ")}` : ""}<br />
                        msg-id: <span className="font-mono break-all">{it.last_provider_message_id ?? "—"}</span><br />
                        step1: {it.step1_sent ? "✓" : "✗"} | next: {it.follows_last_sent_step ? "✓" : "✗"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {it.compliance_status ?? "—"}<br />
                        basis: {it.lawful_basis ?? "—"}<br />
                        unsub: {it.unsubscribe_token_present ? "✓" : "✗"}
                      </TableCell>
                      <TableCell className="text-xs">
                        match: {it.bcr_business_match ? "✓" : "✗"}<br />
                        stage: {it.bcr_current_stage ?? "—"}<br />
                        eligible: {String(it.bcr_campaign_eligible)}<br />
                        dnc: {String(it.bcr_do_not_contact)}
                      </TableCell>
                      <TableCell className="text-xs max-w-[280px]">
                        <div>{it.recommended_action}</div>
                        <div className="text-muted-foreground mt-1">reason: {it.reason}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Cleanup preview */}
          <Card>
            <CardHeader><CardTitle>Cleanup gate — preview only (no apply)</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  ["would_cancel", "Would cancel"],
                  ["would_park", "Would park"],
                  ["would_review", "Would require human review"],
                  ["would_keep_blocked", "Would keep blocked (clean, hold)"],
                ].map(([k, label]) => {
                  const rows = (data.cleanup_preview[k] ?? []) as { queue_id: string; reason: string }[];
                  return (
                    <div key={k} className="rounded-md border p-3">
                      <div className="font-medium mb-1">{label} ({rows.length})</div>
                      {rows.length === 0
                        ? <div className="text-xs text-muted-foreground">—</div>
                        : <ul className="text-xs space-y-1">
                            {rows.map(r => (
                              <li key={r.queue_id}>
                                <span className="font-mono">{r.queue_id}</span>
                                <div className="text-muted-foreground">{r.reason}</div>
                              </li>
                            ))}
                          </ul>}
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {Object.entries(data.cleanup_preview.counters).map(([k, v]) => (
                  <div key={k} className="rounded border bg-muted/30 px-2 py-1.5">
                    <div className="text-muted-foreground">{k}</div>
                    <div className="font-mono">{String(v)}</div>
                  </div>
                ))}
              </div>
              <Button disabled className="mt-2">Apply disabled — audit hardening only</Button>
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground">Generated at {data.generated_at}</div>
        </>
      )}
    </div>
  );
};

export default QueueAudit;