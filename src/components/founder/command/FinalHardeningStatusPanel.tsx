import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, CheckCircle2, AlertTriangle, Lock, ListChecks } from "lucide-react";

const ACCEPTANCE_FUNCTIONS = [
  "liftor-final-go-to-use-acceptance",
  "command-centre-usability-acceptance",
  "command-centre-full-link-check",
  "manual-closeout-acceptance",
  "liftor-user-manual-training-acceptance",
  "business-activation-acceptance",
  "business-rehearsal-acceptance",
  "rehearsal-reset-acceptance",
  "pre-live-baseline-acceptance",
];

type Status = "READY" | "PARTIAL" | "BLOCKED" | "LOCKED_AND_VISIBLE" | "UNSAFE";

const tone: Record<string, string> = {
  READY: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  LOCKED_AND_VISIBLE: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  PARTIAL: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  BLOCKED: "bg-red-500/20 text-red-300 border-red-500/30",
  UNSAFE: "bg-red-500/20 text-red-300 border-red-500/30",
};

export const FinalHardeningStatusPanel = ({ businessId }: { businessId?: string }) => {
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Record<string, any>>({});
  const [classifications, setClassifications] = useState<{
    command_centre: Status; manuals: Status; first_business: Status;
    external_go_live: Status; safety_gates: Status; revenue_target: Status; overall: string;
  } | null>(null);

  const run = async () => {
    setBusy(true);
    const out: Record<string, any> = {};
    for (const fn of ACCEPTANCE_FUNCTIONS) {
      try {
        const { data, error } = await supabase.functions.invoke(fn, { body: { business_id: businessId ?? null } });
        out[fn] = error ? { error: error.message } : data;
      } catch (e: any) {
        out[fn] = { error: String(e?.message ?? e) };
      }
    }
    setResults(out);

    const finalReport = out["liftor-final-go-to-use-acceptance"] ?? {};
    const manual = out["manual-closeout-acceptance"] ?? {};
    const usability = out["command-centre-usability-acceptance"] ?? {};

    const command_centre: Status = (usability?.status === "PASS" || finalReport?.command_centre) ? "READY" : "PARTIAL";
    const manuals: Status = manual?.manual_closeout_status === "PASS" ? "READY"
      : manual?.manual_closeout_status === "PARTIAL" ? "PARTIAL" : "BLOCKED";
    const first_business: Status = finalReport?.first_business_readiness === "FIRST_BUSINESS_READY_FOR_INTERNAL_USE" ? "READY"
      : finalReport?.first_business_readiness === "FIRST_BUSINESS_PARTIAL_READY_FOR_INTERNAL_USE" ? "PARTIAL" : "BLOCKED";
    const safety_gates: Status = "LOCKED_AND_VISIBLE";
    const external_go_live: Status = "BLOCKED"; // intentional — gates locked until per-channel approval
    const revenue_target: Status = finalReport?.revenue_target_layer?.tables_present ? "READY" : "PARTIAL";

    const overall = first_business === "READY" && manuals === "READY"
      ? "LIFTOR_READY_FOR_INTERNAL_USE"
      : first_business === "BLOCKED" || manuals === "BLOCKED"
        ? "LIFTOR_BLOCKED"
        : "LIFTOR_PARTIAL_READY_FOR_INTERNAL_USE";

    setClassifications({ command_centre, manuals, first_business, external_go_live, safety_gates, revenue_target, overall });
    toast.success(`Hardening: ${overall}`);
    setBusy(false);
  };

  const blockers: string[] = (results["liftor-final-go-to-use-acceptance"]?.blockers ?? []) as string[];
  const nextActions: string[] = (results["liftor-final-go-to-use-acceptance"]?.next_actions ?? []) as string[];

  return (
    <Card className="tech-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" /> Final Hardening Status
          <Badge variant="outline" className="ml-2">internal-only</Badge>
          <Badge variant="outline" className="ml-1 border-emerald-500/30 text-emerald-300"><Lock className="h-3 w-3 mr-1" />no auto external action</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={run} disabled={busy}>{busy ? "Running…" : "Run final hardening check"}</Button>
          {classifications && (
            <>
              <Badge className={tone[classifications.overall as any] ?? "bg-amber-500/20 text-amber-300 border-amber-500/30"}>{classifications.overall}</Badge>
              <Badge className={tone[classifications.command_centre]}>Command Centre: {classifications.command_centre}</Badge>
              <Badge className={tone[classifications.manuals]}>Manuals: {classifications.manuals}</Badge>
              <Badge className={tone[classifications.first_business]}>First Business: {classifications.first_business}</Badge>
              <Badge className={tone[classifications.safety_gates]}>Safety Gates: {classifications.safety_gates}</Badge>
              <Badge className={tone[classifications.revenue_target]}>Revenue Target: {classifications.revenue_target}</Badge>
              <Badge className={tone[classifications.external_go_live]}>External Go-Live: {classifications.external_go_live}</Badge>
            </>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-2 text-xs">
          {ACCEPTANCE_FUNCTIONS.map((fn) => {
            const r = results[fn];
            const ok = r && !r.error;
            return (
              <div key={fn} className="flex items-start gap-2 rounded border border-border/40 px-2 py-1">
                {ok ? <CheckCircle2 className="h-3 w-3 mt-0.5 text-emerald-400" /> : r?.error ? <AlertTriangle className="h-3 w-3 mt-0.5 text-amber-400" /> : <ListChecks className="h-3 w-3 mt-0.5 text-muted-foreground" />}
                <div className="flex-1">
                  <div className="font-mono">{fn}</div>
                  {r?.error && <div className="text-amber-300">{r.error}</div>}
                  {ok && r?.status && <div className="text-muted-foreground">status: {r.status}</div>}
                  {ok && r?.manual_closeout_status && <div className="text-muted-foreground">closeout: {r.manual_closeout_status}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {blockers.length > 0 && (
          <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <div className="font-medium text-amber-300 mb-1">Blockers</div>
            <ul className="list-disc ml-5 text-xs">
              {blockers.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </div>
        )}

        <div className="rounded border border-border/40 p-3 text-sm">
          <div className="font-medium mb-1">First 10 actions Mandy should take in Command Centre</div>
          <ol className="list-decimal ml-5 text-xs space-y-0.5">
            {(nextActions.length > 0 ? nextActions : [
              "Open /founder/command-centre and select Neon Candy",
              "Run Final Go-To-Use Readiness",
              "Confirm Clean Real Mode badge (Rehearsal panel)",
              "Create Pre-Live Baseline (CREATE PRE LIVE BASELINE)",
              "Set Revenue Target (£1,000 new subscriptions this month) — Dry-run plan",
              "Save target + plan (CREATE REVENUE TARGET PLAN)",
              "Run pace monitor (Dry-run, then Write snapshot)",
              "Review Today's Actions and Founder Approvals",
              "Confirm all external gates remain LOCKED",
              "Begin internal-only operating mode",
            ]).map((a, i) => <li key={i}>{a}</li>)}
          </ol>
        </div>

        <div className="text-xs text-muted-foreground border-t border-border/30 pt-2">
          External actions remain LOCKED: no emails, no posts, no DMs, no Apollo calls/credits, no Smartlead pushes/campaigns, no proposals/invoices/surveys/reports sent, no money movement, no filings, no real-data deletion, no secret exposure.
        </div>
      </CardContent>
    </Card>
  );
};

export default FinalHardeningStatusPanel;