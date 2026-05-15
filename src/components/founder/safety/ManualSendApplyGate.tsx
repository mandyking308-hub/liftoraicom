import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Lock, Send, ShieldCheck } from "lucide-react";

const ELIGIBLE = [
  { id: "2925f001-efb0-4a69-ae35-eec0621b7ee1", who: "Pooja · gpooja@amazon.com" },
  { id: "de234038-5eb6-441f-ac4f-ba3ac4f466cc", who: "Aaliah · aaliah@rxmusic.com" },
  { id: "693a85df-0fae-4938-bbbe-b0791168d417", who: "Morgan · morgann@spotify.com" },
] as const;

const EXACT_CONFIRMATION =
  "I understand this sends one manual proof email and calls the email provider once";

const Pill = ({ ok, label }: { ok: boolean; label: string }) => (
  <Badge
    variant="outline"
    className={
      ok
        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
        : "border-red-500/40 bg-red-500/10 text-red-300"
    }
  >
    {label}
  </Badge>
);

const KV = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex justify-between gap-2 text-[11px]">
    <span className="text-muted-foreground">{k}</span>
    <span className="font-mono text-foreground/90 text-right break-all">{v ?? "—"}</span>
  </div>
);

export default function ManualSendApplyGate() {
  const [selected, setSelected] = useState<string>(ELIGIBLE[0].id);
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState<"preview" | "apply" | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [previewedQueueId, setPreviewedQueueId] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const runPreview = async () => {
    setLoading("preview");
    setErr(null);
    setApplyResult(null);
    setPreview(null);
    const { data, error } = await supabase.functions.invoke("manual-send-apply", {
      body: { dry_run: true, queue_id: selected },
    });
    if (error) {
      setErr(error.message);
    } else {
      setPreview(data);
      setPreviewedQueueId(selected);
    }
    setLoading(null);
  };

  const confirmationExact = confirmation === EXACT_CONFIRMATION;

  const canApply = useMemo(() => {
    if (!preview) return false;
    if (previewedQueueId !== selected) return false;
    if (!confirmationExact) return false;
    if (!acknowledged) return false;
    if (preview.emails_to_send_if_applied !== 1) return false;
    if (preview.smtp_calls_if_applied !== 1) return false;
    if (preview.apollo_calls !== 0) return false;
    if (preview.review_required_rows_touched !== 0) return false;
    if (!preview.all_pass) return false;
    return true;
  }, [preview, previewedQueueId, selected, confirmationExact, acknowledged]);

  const applyChecklist = preview
    ? [
        { ok: !!preview, label: "Preview ran in this session" },
        { ok: previewedQueueId === selected, label: "Selected queue matches preview" },
        { ok: ELIGIBLE.some((e) => e.id === selected), label: "Exactly one eligible row selected" },
        { ok: confirmationExact, label: "Confirmation phrase exact" },
        { ok: acknowledged, label: "Founder acknowledgement checked" },
        { ok: preview.emails_to_send_if_applied === 1, label: "emails_to_send_if_applied = 1" },
        { ok: preview.smtp_calls_if_applied === 1, label: "smtp_calls_if_applied = 1" },
        { ok: preview.apollo_calls === 0, label: "apollo_calls = 0" },
        { ok: preview.review_required_rows_touched === 0, label: "review_required rows touched = 0" },
        { ok: !!preview.all_pass, label: "All preflight checks passed" },
      ]
    : [];

  const apply = async () => {
    if (!canApply) return;
    setLoading("apply");
    setErr(null);
    const { data, error } = await supabase.functions.invoke("manual-send-apply", {
      body: { dry_run: false, queue_id: selected, confirmation },
    });
    if (error) setErr(error.message);
    else setApplyResult(data);
    setLoading(null);
  };

  return (
    <Card
      id="manual-send-apply-gate"
      data-testid="manual-send-apply-gate"
      className="p-5 space-y-5 border-2 border-amber-500/30 scroll-mt-24"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-amber-300" />
            <h3 className="text-base font-semibold">Manual Send Apply Gate — batch size 1</h3>
            <Badge className="gap-1 text-[10px] bg-amber-500/15 text-amber-200 border border-amber-500/40">
              <Lock size={10} /> FOUNDER-CONTROLLED
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl mt-1">
            Sends exactly one proof email via the existing provider path. Background sending stays OFF.
            Cron stays disabled. The 7 review_required Step 4 rows cannot be selected here. No
            tracking pixel is injected.
          </p>
        </div>
      </div>

      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-[12px] text-amber-200 flex gap-2 items-start">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          This will send one real email via the provider if applied. Background sending remains off.
        </span>
      </div>

      {/* Selection */}
      <section className="rounded-md border border-border/60 p-3 space-y-2">
        <h4 className="text-sm font-semibold">Eligible rows (Step 2 only)</h4>
        <div className="space-y-2">
          {ELIGIBLE.map((row) => (
            <label
              key={row.id}
              className="flex items-center gap-2 text-xs cursor-pointer"
            >
              <input
                type="radio"
                name="manual-send-row"
                value={row.id}
                checked={selected === row.id}
                onChange={() => {
                  setSelected(row.id);
                  setApplyResult(null);
                }}
              />
              <span className="font-mono">{row.id}</span>
              <span className="text-muted-foreground">— {row.who}</span>
            </label>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          The 7 review_required Step 4 rows are excluded server-side and cannot be entered here.
        </p>
      </section>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={runPreview} disabled={loading !== null} variant="outline">
          {loading === "preview" ? "Previewing…" : "Preview Manual Send"}
        </Button>
        <Button
          onClick={apply}
          disabled={!canApply || loading !== null}
          className="bg-amber-500 text-amber-950 hover:bg-amber-400"
        >
          {loading === "apply" ? "Applying…" : "Apply Manual Send — One Email"}
        </Button>
      </div>

      {err && <p className="text-xs text-destructive">Error: {err}</p>}

      {preview && (
        <section className="rounded-md border border-border/60 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            <h4 className="text-sm font-semibold">Preview result (dry-run, no provider call)</h4>
            <Pill ok={!!preview.all_pass} label={preview.all_pass ? "all checks pass" : "blocked"} />
          </div>

          <div className="grid sm:grid-cols-2 gap-1">
            <KV k="queue_id" v={preview.queue_id} />
            <KV k="contact" v={`${preview.contact?.name ?? "—"} · ${preview.contact?.email ?? "—"}`} />
            <KV k="inbox" v={preview.inbox?.email_address} />
            <KV k="campaign" v={preview.campaign?.name} />
            <KV k="emails_to_send_if_applied" v={preview.emails_to_send_if_applied} />
            <KV k="smtp_calls_if_applied" v={preview.smtp_calls_if_applied} />
            <KV k="apollo_calls" v={preview.apollo_calls} />
            <KV k="review_required_rows_touched" v={preview.review_required_rows_touched} />
            <KV k="background_sending_enabled" v={String(preview.background_sending_enabled)} />
            <KV k="pixel_injected" v={String(preview.pixel_injected)} />
          </div>

          <div className="rounded-md border p-3 bg-background/40">
            <div className="text-[11px] text-muted-foreground">Assembled email — Subject</div>
            <div className="text-sm font-medium">{preview.assembled_email?.subject ?? "—"}</div>
            <div className="mt-2 text-[11px] text-muted-foreground">Body</div>
            <pre className="mt-1 text-[11px] whitespace-pre-wrap font-mono text-foreground/90">
              {preview.assembled_email?.body ?? "—"}
            </pre>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] text-muted-foreground">Preflight checks</div>
            <div className="grid gap-1">
              {(preview.checks ?? []).map((c: any) => (
                <div key={c.id} className="flex items-center gap-2 text-[11px]">
                  <Pill ok={c.pass} label={c.pass ? "pass" : "fail"} />
                  <span className="font-medium">{c.label}</span>
                  <span className="text-muted-foreground">— {c.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Confirmation */}
      <section className="rounded-md border border-border/60 p-3 space-y-3">
        <h4 className="text-sm font-semibold">Confirmation</h4>
        <div className="space-y-1">
          <Label htmlFor="confirm-phrase" className="text-xs">
            Type the exact confirmation phrase
          </Label>
          <Input
            id="confirm-phrase"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={EXACT_CONFIRMATION}
            className="font-mono text-xs"
          />
          <p className="text-[10px] text-muted-foreground">
            Required phrase: <span className="font-mono">{EXACT_CONFIRMATION}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="ack"
            checked={acknowledged}
            onCheckedChange={(v) => setAcknowledged(v === true)}
          />
          <Label htmlFor="ack" className="text-xs cursor-pointer">
            I understand this calls the live email provider exactly once.
          </Label>
        </div>

        {preview && (
          <div className="grid gap-1">
            <div className="text-[11px] text-muted-foreground">Apply readiness</div>
            {applyChecklist.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <Pill ok={c.ok} label={c.ok ? "ok" : "no"} />
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {applyResult && (
        <section className="rounded-md border border-border/60 p-3 space-y-1">
          <h4 className="text-sm font-semibold">Apply result</h4>
          <pre className="text-[11px] bg-muted/30 p-3 rounded overflow-auto max-h-[400px]">
            {JSON.stringify(applyResult, null, 2)}
          </pre>
        </section>
      )}
    </Card>
  );
}