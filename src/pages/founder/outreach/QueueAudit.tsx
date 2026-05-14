import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShieldAlert, ShieldCheck, RefreshCw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ReviewRequiredDecisionGate } from "@/components/founder/safety/ReviewRequiredDecisionGate";

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
  const { toast } = useToast();

  // ===== Cleanup gate state =====
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState<string>("founder_cleanup");
  const [action, setAction] = useState<"park" | "cancel">("park");
  const [previewedKey, setPreviewedKey] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [ackChecked, setAckChecked] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  const CONFIRM = "I understand this only parks/cancels pending rows and sends nothing";

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session?.access_token) {
      setError("Please log in as founder/admin to view queue audit.");
      setLoading(false);
      return;
    }
    let res: any = null;
    let errMsg: string | null = null;
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/outreach-queue-audit`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({}),
      });
      const text = await resp.text();
      let parsed: any = null;
      try { parsed = text ? JSON.parse(text) : null; } catch { /* ignore */ }
      if (!resp.ok) {
        errMsg = `[outreach-queue-audit] HTTP ${resp.status} ${resp.statusText}`
          + ` · session_token=present · authenticated=${!!session.user}`
          + ` · category=${resp.status === 401 ? "AUTH" : resp.status === 403 ? "AUTHORIZATION" : resp.status >= 500 ? "SERVER" : "CLIENT"}`
          + (parsed?.error ? ` · error="${parsed.error}"` : "")
          + (parsed?.detail ? ` · detail="${parsed.detail}"` : (text && !parsed ? ` · body="${text.slice(0,300)}"` : ""));
      } else {
        res = parsed;
      }
    } catch (netErr: any) {
      errMsg = `[outreach-queue-audit] NETWORK/CORS failure · session_token=present · authenticated=${!!session.user} · message="${netErr?.message ?? String(netErr)}"`;
    }
    if (errMsg) setError(errMsg);
    else {
      const r = res as AuditResponse;
      setData(r);
      // Default-select would_cancel + would_park; not would_review; not would_keep_blocked.
      const def = new Set<string>();
      const cp = r.cleanup_preview ?? {};
      for (const x of (cp.would_cancel ?? []) as any[]) def.add(x.queue_id);
      for (const x of (cp.would_park ?? []) as any[]) def.add(x.queue_id);
      // Defensive: never pre-select review_required rows for generic cleanup; they have a dedicated decision gate.
      const reviewIds = new Set<string>(((cp.would_review ?? []) as any[]).map((x: any) => x.queue_id));
      for (const id of [...def]) if (reviewIds.has(id)) def.delete(id);
      setSelected(def);
      setPreviewedKey(null);
      setPreviewResult(null);
      setAckChecked(false);
      setConfirmText("");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const selKey = () => `${action}|${reason}|${[...selected].sort().join(",")}`;
  const canApply = !!previewResult
    && previewedKey === selKey()
    && ackChecked
    && confirmText === CONFIRM
    && selected.size > 0
    && !busy;

  const runPreview = async () => {
    if (selected.size === 0) { toast({ title: "Select at least one row", variant: "destructive" }); return; }
    setBusy(true);
    const { data: res, error: err } = await supabase.functions.invoke("outreach-queue-cleanup", {
      body: { dry_run: true, queue_ids: [...selected], action, reason },
    });
    setBusy(false);
    if (err) { toast({ title: "Preview failed", description: err.message, variant: "destructive" }); return; }
    if (!(res as any)?.ok) { toast({ title: "Preview rejected", description: JSON.stringify(res), variant: "destructive" }); return; }
    setPreviewResult(res);
    setPreviewedKey(selKey());
    toast({ title: "Preview ready — review and confirm to apply." });
  };

  const runApply = async () => {
    if (!canApply) return;
    setBusy(true);
    const { data: res, error: err } = await supabase.functions.invoke("outreach-queue-cleanup", {
      body: { dry_run: false, queue_ids: [...selected], action, reason, confirmation: CONFIRM },
    });
    setBusy(false);
    if (err || !(res as any)?.ok) {
      toast({ title: "Apply failed", description: err?.message ?? JSON.stringify(res), variant: "destructive" });
      return;
    }
    toast({ title: `Cleanup applied — ${(res as any).rows_changed} row(s) ${(res as any).new_status}. No emails sent.` });
    await load();
  };

  const toggleRow = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    setPreviewResult(null);
    setPreviewedKey(null);
    setAckChecked(false);
    setConfirmText("");
  };

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

          {/* ====== Cleanup / Park Pending Rows ====== */}
          <Card>
            <CardHeader>
              <CardTitle>Cleanup / Park Pending Rows</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {/* Safety display */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="rounded border bg-muted/30 p-2"><div className="text-muted-foreground">auto_send_enabled</div><b>{JSON.stringify(data.baseline.auto_send_enabled_value)}</b></div>
                <div className="rounded border bg-muted/30 p-2"><div className="text-muted-foreground">worker kill switch</div><b>{data.baseline.worker_guard_present_in_source ? "yes" : "no"}</b></div>
                <div className="rounded border bg-muted/30 p-2"><div className="text-muted-foreground">cron_check</div><b>{data.baseline.cron_check}</b></div>
                <div className="rounded border bg-muted/30 p-2"><div className="text-muted-foreground">safety_status</div><b>{data.summary.safety_status}</b></div>
                <div className="rounded border bg-muted/30 p-2"><div className="text-muted-foreground">safe non-sendable park status</div><b>blocked</b></div>
                <div className="rounded border bg-muted/30 p-2"><div className="text-muted-foreground">safe non-sendable cancel status</div><b>cancelled</b></div>
                <div className="rounded border bg-muted/30 p-2"><div className="text-muted-foreground">dry_run default</div><b>true</b></div>
                <div className="rounded border bg-muted/30 p-2"><div className="text-muted-foreground">SMTP / Apollo calls</div><b>0 / 0</b></div>
              </div>

              {data.baseline.cron_check === "unreadable_review_required" && (
                <Alert>
                  <ShieldAlert />
                  <AlertTitle>Cron could not be verified.</AlertTitle>
                  <AlertDescription>Cleanup is allowed only because it removes rows from sendable pending state. Sending remains blocked.</AlertDescription>
                </Alert>
              )}

              {/* Action + reason */}
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Action</div>
                  <select className="w-full rounded border bg-background p-2 text-sm" value={action} onChange={(e) => { setAction(e.target.value as any); setPreviewResult(null); setPreviewedKey(null); setAckChecked(false); setConfirmText(""); }}>
                    <option value="park">park → blocked</option>
                    <option value="cancel">cancel → cancelled</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Reason</div>
                  <select className="w-full rounded border bg-background p-2 text-sm" value={reason} onChange={(e) => { setReason(e.target.value); setPreviewResult(null); setPreviewedKey(null); setAckChecked(false); setConfirmText(""); }}>
                    {["founder_cleanup","legacy_pending","orphan_followup","cancel_candidate","review_required","safety_baseline_unverified"].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="self-end text-xs text-muted-foreground">Selected rows: <b>{selected.size}</b> / max 10</div>
              </div>

              {/* Grouped selectable rows */}
              {[
                ["would_cancel", "Would cancel — selectable, default ON"],
                ["would_park", "Would park — selectable, default ON"],
                ["would_review", "Would require review — selectable, default OFF"],
                ["would_keep_blocked", "Would keep blocked — NOT selectable here"],
              ].map(([k, label]) => {
                const groupRows = (data.cleanup_preview[k] ?? []) as { queue_id: string; reason: string }[];
                const selectable = k !== "would_keep_blocked";
                return (
                  <div key={k} className="rounded-md border p-3">
                    <div className="font-medium mb-2">{label} ({groupRows.length})</div>
                    {groupRows.length === 0
                      ? <div className="text-xs text-muted-foreground">—</div>
                      : <div className="space-y-1">
                          {groupRows.map(gr => {
                            const it = data.items.find(i => i.queue_id === gr.queue_id);
                            return (
                              <div key={gr.queue_id} className="flex items-start gap-2 text-xs border-b py-1">
                                <Checkbox
                                  checked={selected.has(gr.queue_id)}
                                  disabled={!selectable}
                                  onCheckedChange={() => selectable && toggleRow(gr.queue_id)}
                                />
                                <div className="flex-1">
                                  <div className="font-medium">{it?.contact_name ?? "—"} <span className="text-muted-foreground">{it?.contact_email}</span></div>
                                  <div className="text-muted-foreground">step {it?.sequence_step} · {it?.classification} · <span className="font-mono">{gr.queue_id}</span></div>
                                  <div className="text-muted-foreground">reason: {gr.reason}</div>
                                  <div className="text-muted-foreground">recommended: {it?.recommended_action}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>}
                  </div>
                );
              })}

              {/* Preview + Apply controls */}
              <div className="flex flex-col gap-3 rounded-md border p-3 bg-muted/20">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={runPreview} disabled={busy || selected.size === 0} variant="outline">
                    {busy ? <Loader2 className="animate-spin" /> : null} Preview Cleanup
                  </Button>
                  <Button onClick={runApply} disabled={!canApply} variant="destructive">
                    Apply Cleanup — No Emails Sent
                  </Button>
                </div>

                {previewResult && previewedKey === selKey() && (
                  <div className="text-xs space-y-1 rounded border p-2 bg-background">
                    <div className="font-medium">Preview result (dry_run)</div>
                    <div>action: <b>{previewResult.preview.action}</b> → <b>{previewResult.preview.new_status}</b></div>
                    <div>reason: <b>{previewResult.preview.reason}</b></div>
                    <div>eligible_ids ({previewResult.preview.eligible_ids.length}): <span className="font-mono break-all">{previewResult.preview.eligible_ids.join(", ") || "—"}</span></div>
                    {previewResult.preview.rejected.length > 0 && (
                      <div className="text-destructive">rejected: {previewResult.preview.rejected.map((r: any) => `${r.queue_id.slice(0,8)}…(${r.reason})`).join(", ")}</div>
                    )}
                  </div>
                )}

                <label className="flex items-start gap-2 text-xs">
                  <Checkbox checked={ackChecked} onCheckedChange={(v) => setAckChecked(!!v)} disabled={!previewResult || previewedKey !== selKey()} />
                  <span>I understand this will only park/cancel pending queue rows and will not send emails.</span>
                </label>

                <div>
                  <div className="text-xs text-muted-foreground mb-1">Type to confirm: <span className="font-mono">{CONFIRM}</span></div>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    disabled={!previewResult || previewedKey !== selKey()}
                    placeholder={CONFIRM}
                  />
                </div>

                {previewResult && previewedKey !== selKey() && (
                  <div className="text-xs text-destructive">Selection or action/reason changed — re-run Preview before Apply.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground">Generated at {data.generated_at}</div>
        </>
      )}
    </div>
  );
};

export default QueueAudit;