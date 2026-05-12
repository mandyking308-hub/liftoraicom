import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/alert-dialog";
import { Loader2, Play, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

type BatchSummary = {
  batch_size_requested: number;
  eligible_selected: number;
  rescheduled_to_now?: number;
  future_scheduled_count?: number;
  sent: number;
  pending_before: number | null;
  pending_after: number | null;
  sent_before: number | null;
  sent_after: number | null;
  blocked_after: number | null;
  elapsed_ms: number;
  worker_error: string | null;
};
type BatchResult = {
  ok: boolean;
  message: string;
  note?: string;
  summary?: BatchSummary;
  recent_rows?: Array<{
    id: string;
    status: string;
    provider_response?: string | null;
    send_error?: string | null;
    block_reason?: string | null;
    delivery_kind?: string | null;
  }>;
  next_recommended_action?: string;
};

const PRESETS = [1, 5, 10] as const;

const ControlledLiveBatch = () => {
  const [size, setSize] = useState<number>(5);
  const [custom, setCustom] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);

  const effectiveSize = (() => {
    if (custom.trim()) {
      const n = Number(custom);
      if (Number.isFinite(n) && n >= 1 && n <= 500) return Math.floor(n);
    }
    return size;
  })();

  const runBatch = async () => {
    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("controlled-live-batch", {
        body: { batch_size: effectiveSize, confirm: true },
      });
      if (error) {
        toast.error(`Batch error: ${error.message}`);
        setResult({ ok: false, message: error.message });
      } else {
        setResult(data as BatchResult);
        if ((data as BatchResult).ok) toast.success((data as BatchResult).message);
        else toast.error((data as BatchResult).message);
      }
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(msg);
      setResult({ ok: false, message: msg });
    } finally {
      setRunning(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Card className="tech-card p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Run next live batch</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Process the next eligible queue items through the live worker. All real
            guardrails (suppressed/bounced/unsubscribed, reply-stop, duplicate step,
            inactive inbox/campaign, provider rejection) remain enforced.
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">LIVE</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((n) => (
          <Button
            key={n}
            type="button"
            size="sm"
            variant={!custom.trim() && size === n ? "default" : "outline"}
            onClick={() => { setSize(n); setCustom(""); }}
            disabled={running}
          >
            {n}
          </Button>
        ))}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Custom</span>
          <Input
            type="number"
            min={1}
            max={500}
            placeholder="—"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="h-8 w-24"
            disabled={running}
          />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          Selected batch size: <span className="font-mono">{effectiveSize}</span>
        </span>
      </div>

      <Button
        onClick={() => setConfirmOpen(true)}
        disabled={running || effectiveSize < 1}
        className="w-full"
      >
        {running ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running batch…</>
        ) : (
          <><Play className="mr-2 h-4 w-4" /> Run batch of {effectiveSize}</>
        )}
      </Button>

      {result && result.summary && (
        <div className="rounded-md border border-border/50 bg-muted/20 p-3 text-sm space-y-2">
          <div className="flex items-center gap-2">
            {result.ok ? (
              <ShieldCheck className="h-4 w-4 text-primary" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-destructive" />
            )}
            <span className="font-medium">{result.message}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
            <div>Sent before → after: {result.summary.sent_before ?? "—"} → {result.summary.sent_after ?? "—"}</div>
            <div>Queued before → after: {result.summary.pending_before ?? "—"} → {result.summary.pending_after ?? "—"}</div>
            <div>Eligible selected: {result.summary.eligible_selected}</div>
            <div>Rescheduled to now: {result.summary.rescheduled_to_now ?? 0}</div>
            <div>Future-scheduled in batch: {result.summary.future_scheduled_count ?? 0}</div>
            <div>Blocked total: {result.summary.blocked_after ?? "—"}</div>
            <div>Elapsed: {result.summary.elapsed_ms} ms</div>
            <div>Worker error: {result.summary.worker_error ?? "none"}</div>
          </div>
          {result.note && (
            <div className="text-xs text-foreground/80">{result.note}</div>
          )}
          {result.next_recommended_action && (
            <div className="text-xs text-muted-foreground">
              Next: {result.next_recommended_action}
            </div>
          )}
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm controlled live batch</AlertDialogTitle>
            <AlertDialogDescription>
              This will send up to <span className="font-mono">{effectiveSize}</span> real
              email{effectiveSize === 1 ? "" : "s"} through the live worker. All real
              guardrails apply. Unsafe contacts (suppressed, bounced, unsubscribed,
              replied, duplicate-step, inactive inbox/campaign) will be skipped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={running}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runBatch} disabled={running}>
              {running ? "Running…" : `Send batch of ${effectiveSize}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ControlledLiveBatch;