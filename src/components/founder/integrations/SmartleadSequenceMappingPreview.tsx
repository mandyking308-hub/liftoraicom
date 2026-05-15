import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListOrdered, RefreshCcw, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function SmartleadSequenceMappingPreview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const { data: res, error } = await supabase.functions.invoke(
      "smartlead-sequence-mapping-preview",
      { body: {} },
    );
    setLoading(false);
    setData(error ? { ok: false, error: error.message } : res);
  };
  useEffect(() => { run(); }, []);

  const steps: any[] = data?.converted_steps ?? [];
  const sl: any[] | null = data?.smartlead_sequence_raw ?? null;
  const summary = data?.validation_summary;
  const mismatches: string[] = data?.mismatch_warnings ?? [];

  const statusColor =
    summary?.overall_status === "error"
      ? "border-red-500/40 bg-red-500/5 text-red-200"
      : summary?.overall_status === "warning"
        ? "border-amber-500/40 bg-amber-500/5 text-amber-200"
        : "border-emerald-500/30 bg-emerald-500/5 text-emerald-200";

  return (
    <Card className="p-5 space-y-3 border-2 border-border/60 scroll-mt-24">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Smartlead Sequence Mapping Preview</h3>
          <Badge variant="outline" className="text-[10px]">read-only</Badge>
          <Badge variant="outline" className="text-[10px]">apply disabled</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>
          <RefreshCcw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      {!data && <p className="text-xs text-muted-foreground">Loading…</p>}

      {data && (
        <>
          <div className="grid sm:grid-cols-4 gap-2 text-[11px]">
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Liftor steps</div>
              <div className="font-mono text-sm">{data.liftor_step_count ?? 0}</div>
            </div>
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Smartlead steps</div>
              <div className="font-mono text-sm">{data.smartlead_step_count ?? "—"}</div>
            </div>
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Errors</div>
              <div className="font-mono text-sm">{summary?.total_errors ?? 0}</div>
            </div>
            <div className="rounded border border-border/60 p-2">
              <div className="text-muted-foreground">Warnings</div>
              <div className="font-mono text-sm">{summary?.total_warnings ?? 0}</div>
            </div>
          </div>

          <div className={`rounded border p-2 text-[11px] ${statusColor}`}>
            <div className="flex items-center gap-2">
              {summary?.overall_status === "ok" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              <span className="font-medium">Validation: {summary?.overall_status ?? "—"}</span>
            </div>
            {!data.smartlead_endpoint?.supported && (
              <div className="mt-1">
                Smartlead /sequences endpoint:&nbsp;
                {data.smartlead_endpoint?.called
                  ? `not available (http_${data.smartlead_endpoint?.http_status})`
                  : "not called (no active mapping or no API key)"}
              </div>
            )}
            {mismatches.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
                {mismatches.map((m) => <li key={m} className="font-mono">{m}</li>)}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            {steps.map((s: any) => {
              const c = s.conversion;
              const slStep = sl?.[s.step_number - 1] ?? null;
              return (
                <div key={s.step_number} className="rounded border border-border/60 p-2 text-[11px] space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">Step {s.step_number} · delay {s.delay_days}d</div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        c.validation_status === "error"
                          ? "border-red-500/50 text-red-300"
                          : c.validation_status === "warning"
                            ? "border-amber-500/50 text-amber-300"
                            : "border-emerald-500/50 text-emerald-300"
                      }`}
                    >
                      {c.validation_status}
                    </Badge>
                  </div>
                  <div className="grid md:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Liftor</div>
                      <div className="font-mono"><span className="text-muted-foreground">subject:</span> {s.subject}</div>
                      <pre className="font-mono whitespace-pre-wrap text-[10px] bg-muted/30 rounded p-2 max-h-40 overflow-auto">
                        {s.body}
                      </pre>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Smartlead-safe</div>
                      <div className="font-mono"><span className="text-muted-foreground">subject:</span> {c.converted_subject}</div>
                      <pre className="font-mono whitespace-pre-wrap text-[10px] bg-muted/30 rounded p-2 max-h-40 overflow-auto">
                        {c.converted_body}
                      </pre>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    <Badge variant="outline" className={c.has_unsubscribe ? "border-emerald-500/40" : "border-red-500/40 text-red-300"}>
                      {c.has_unsubscribe ? "unsubscribe ✓" : "unsubscribe ✗"}
                    </Badge>
                    <Badge variant="outline" className={c.has_signature ? "border-emerald-500/40" : "border-amber-500/40 text-amber-300"}>
                      {c.has_signature ? "signature ✓" : "signature ✗"}
                    </Badge>
                    {c.detected_unresolved_brackets.length > 0 && (
                      <Badge variant="outline" className="border-red-500/40 text-red-300">
                        unresolved: {c.detected_unresolved_brackets.join(" ")}
                      </Badge>
                    )}
                  </div>
                  {c.issues.length > 0 && (
                    <ul className="list-disc pl-4 text-[10px]">
                      {c.issues.map((i: any, idx: number) => (
                        <li key={idx} className={i.severity === "error" ? "text-red-300" : "text-amber-300"}>
                          [{i.severity}] {i.code}: {i.message}
                        </li>
                      ))}
                    </ul>
                  )}
                  {slStep && (
                    <div className="text-[10px] text-muted-foreground">
                      Smartlead step present (id: {slStep.id ?? slStep.sequence_id ?? "?"})
                    </div>
                  )}
                </div>
              );
            })}
            {steps.length === 0 && (
              <div className="text-[11px] text-muted-foreground">No Liftor sequence steps found.</div>
            )}
          </div>

          <div className="rounded border border-border/60 p-2 text-[10px] text-muted-foreground">
            Apply unavailable — sequence apply endpoint is not built. This panel is read-only:
            no Smartlead writes, no campaign mutation, no leads pushed, no emails sent.
          </div>
        </>
      )}
    </Card>
  );
}