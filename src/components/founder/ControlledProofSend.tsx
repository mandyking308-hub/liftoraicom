import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Mailbox,
} from "lucide-react";
import { toast } from "sonner";

type Check = { id: string; label: string; pass: boolean; detail: string };
type PreviewResult = {
  ok: boolean;
  stage: string;
  reason?: string;
  message?: string;
  system_mode?: string;
  queue_row?: any;
  contact?: any;
  inbox?: any;
  campaign?: any;
  sequence?: { step_number: number; subject: string; body_preview: string };
  checks?: Check[];
  all_pass?: boolean;
  blockers?: Check[];
};
type SendResult = {
  ok: boolean;
  stage: string;
  success?: boolean;
  system_mode?: string;
  queue_id?: string;
  contact_email?: string;
  inbox_email?: string;
  queue_after?: any;
  email_event?: any;
  worker_summary?: any;
  worker_error?: string | null;
  next_recommended_action?: string;
  reason?: string;
  message?: string;
  blockers?: Check[];
};

const ControlledProofSend = () => {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const runPreview = async () => {
    setLoading(true);
    setSendResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("controlled-proof-send", {
        body: { mode: "preview" },
      });
      if (error) throw error;
      setPreview(data as PreviewResult);
    } catch (e: any) {
      toast.error("Preview failed: " + (e.message ?? "unknown"));
    } finally {
      setLoading(false);
    }
  };

  const runSend = async () => {
    if (!preview?.queue_row?.id) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("controlled-proof-send", {
        body: { mode: "send", queue_id: preview.queue_row.id },
      });
      if (error) throw error;
      const result = data as SendResult;
      setSendResult(result);
      if (result.success) toast.success("Proof send delivered");
      else if (result.reason === "TEST_MODE_ACTIVE")
        toast.warning("System is in TEST MODE — switch to LIVE first");
      else toast.warning(result.message ?? `Result: ${result.queue_after?.status ?? "unknown"}`);
    } catch (e: any) {
      toast.error("Send failed: " + (e.message ?? "unknown"));
    } finally {
      setSending(false);
    }
  };

  const isLive = preview?.system_mode === "live";

  return (
    <Card className="p-5 space-y-4 border-2 border-primary/20">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Mailbox className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold">Controlled LIVE Proof Send</h3>
            {preview &&
              (isLive ? (
                <Badge variant="destructive" className="gap-1 text-[10px]">
                  <ShieldAlert size={10} /> LIVE
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-[10px] border-yellow-500/40 text-yellow-400">
                  <ShieldCheck size={10} /> TEST
                </Badge>
              ))}
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            One real outbound email through the existing campaign engine. All compliance, cap, throttle and
            reply-stop guardrails remain active. Sends only run in CONTROLLED LIVE mode after explicit founder
            confirmation.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={runPreview} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
          <span className="ml-1.5">Preview next eligible</span>
        </Button>
      </div>

      {preview && preview.queue_row && (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Contact</div>
              <div className="mt-1 font-medium">{preview.contact?.email}</div>
              <div className="text-muted-foreground">
                {preview.contact?.name || "—"} · {preview.contact?.company || "—"} ·{" "}
                {preview.contact?.role || "—"}
              </div>
              <div className="text-muted-foreground mt-0.5">
                Status: {preview.contact?.status} · Business: {preview.contact?.assigned_business || "—"}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Inbox & campaign</div>
              <div className="mt-1 font-medium">{preview.inbox?.email_address ?? "—"}</div>
              <div className="text-muted-foreground">
                {preview.campaign?.name} · step {preview.queue_row.sequence_step}
              </div>
              <div className="text-muted-foreground mt-0.5">
                Daily {preview.inbox?.emails_sent_today ?? 0}/{preview.inbox?.daily_send_limit ?? 0} · Hourly{" "}
                {preview.inbox?.hourly_send_count ?? 0}/{preview.inbox?.hourly_send_limit ?? 0}
              </div>
            </div>
          </div>

          {preview.sequence && (
            <div className="rounded-md border p-3 text-xs">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Subject</div>
              <div className="font-medium">{preview.sequence.subject}</div>
              <div className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                Body preview
              </div>
              <pre className="mt-1 text-[11px] whitespace-pre-wrap font-mono text-muted-foreground line-clamp-5">
                {preview.sequence.body_preview}
              </pre>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-1.5">
            {(preview.checks ?? []).map((c) => (
              <div
                key={c.id}
                className={`flex items-start gap-1.5 rounded-md border p-2 text-[11px] ${
                  c.pass
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-destructive/40 bg-destructive/5"
                }`}
              >
                {c.pass ? (
                  <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle size={13} className="mt-0.5 shrink-0 text-destructive" />
                )}
                <div className="min-w-0">
                  <div className="font-medium leading-tight">{c.label}</div>
                  <div className="text-muted-foreground">{c.detail}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-md border p-3 flex items-start justify-between gap-3 flex-wrap">
            <div className="text-xs space-y-1 min-w-0">
              {preview.all_pass && isLive && (
                <p className="font-medium text-emerald-500">All checks pass — ready to send 1 real email.</p>
              )}
              {preview.all_pass && !isLive && (
                <p className="font-medium text-yellow-400">
                  All checks pass, but system is in TEST MODE. Switch to CONTROLLED LIVE first.
                </p>
              )}
              {!preview.all_pass && (
                <>
                  <p className="font-medium text-destructive">
                    Cannot send — {preview.blockers?.length ?? 0} blocker(s):
                  </p>
                  <ul className="text-[11px] text-muted-foreground list-disc pl-4">
                    {(preview.blockers ?? []).map((b) => (
                      <li key={b.id}>
                        <span className="text-foreground/80">{b.label}:</span> {b.detail}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={!preview.all_pass || !isLive || sending}>
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Send 1 real proof email now
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Send 1 real proof email?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This sends one live email to <strong>{preview.contact?.email}</strong> via{" "}
                    <strong>{preview.inbox?.email_address}</strong> using the existing campaign engine. All
                    compliance, cap, throttle, suppression and reply-stop checks remain active. Only this single
                    queue row will be processed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={runSend}>Confirm — send now</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {preview && !preview.queue_row && (
        <p className="text-xs text-muted-foreground">
          {preview.message ?? "No eligible pending queue rows."}
        </p>
      )}

      {sendResult && (
        <div
          className={`rounded-md border p-3 text-xs space-y-1.5 ${
            sendResult.success
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-yellow-500/40 bg-yellow-500/5"
          }`}
        >
          <div className="font-medium flex items-center gap-1.5">
            {sendResult.success ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-yellow-400" />
            )}
            {sendResult.success
              ? `Sent successfully → ${sendResult.contact_email}`
              : `Result: ${sendResult.queue_after?.status ?? sendResult.reason ?? "unknown"}`}
          </div>
          <div className="grid sm:grid-cols-2 gap-1 text-[11px] text-muted-foreground">
            <div>Queue id: {sendResult.queue_id}</div>
            <div>Inbox: {sendResult.inbox_email}</div>
            <div>Status: {sendResult.queue_after?.status ?? "—"}</div>
            <div>Delivery: {sendResult.queue_after?.delivery_kind ?? "—"}</div>
            <div>SMTP accepted: {sendResult.queue_after?.smtp_accepted_at ?? "—"}</div>
            <div>Provider id: {sendResult.queue_after?.provider_message_id ?? "—"}</div>
            {sendResult.email_event && (
              <div className="sm:col-span-2">
                Email event: {sendResult.email_event.event_type} (id {sendResult.email_event.id})
              </div>
            )}
            {sendResult.queue_after?.send_error && (
              <div className="sm:col-span-2 text-destructive">
                Send error: {sendResult.queue_after.send_error}
              </div>
            )}
            {sendResult.queue_after?.block_reason && (
              <div className="sm:col-span-2 text-yellow-400">
                Block reason: {sendResult.queue_after.block_reason}
              </div>
            )}
            {sendResult.queue_after?.provider_response && (
              <div className="sm:col-span-2">
                Provider response: {sendResult.queue_after.provider_response}
              </div>
            )}
          </div>
          {sendResult.next_recommended_action && (
            <div className="text-[11px] pt-1 border-t border-border/40">
              <span className="font-medium">Next: </span>
              {sendResult.next_recommended_action}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default ControlledProofSend;