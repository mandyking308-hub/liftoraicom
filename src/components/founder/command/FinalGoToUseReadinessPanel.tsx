import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, ShieldCheck, ListChecks } from "lucide-react";

export const FinalGoToUseReadinessPanel = ({ businessId }: { businessId?: string }) => {
  const [report, setReport] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("liftor-final-go-to-use-acceptance", {
        body: { business_id: businessId ?? null },
      });
      if (error) throw error;
      setReport(data);
      toast.success(`Final acceptance: ${data.status}`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const statusColor = report?.status === "PASS"
    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
    : report?.status === "FIXED"
      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
      : "bg-red-500/20 text-red-300 border-red-500/30";

  return (
    <Card className="tech-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" /> Final Go-To-Use Readiness
          <Badge variant="outline" className="ml-2">internal-only</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={run} disabled={busy}>Run final acceptance</Button>
          {report && <Badge className={statusColor}>{report.status}</Badge>}
          {report && <Badge variant="outline">{report.first_business_readiness}</Badge>}
        </div>

        {report && (
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div className="rounded border border-border/40 p-3">
              <div className="font-medium mb-1">Command Centre</div>
              {Object.entries(report.command_centre).map(([k, v]: any) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  {v ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <AlertTriangle className="h-3 w-3 text-amber-400" />}
                  {k}
                </div>
              ))}
            </div>
            <div className="rounded border border-border/40 p-3">
              <div className="font-medium mb-1">Business Activation</div>
              {Object.entries(report.business_activation).map(([k, v]: any) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  {v ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <AlertTriangle className="h-3 w-3 text-amber-400" />}
                  {k}
                </div>
              ))}
            </div>
            <div className="rounded border border-border/40 p-3">
              <div className="font-medium mb-1">Revenue Target Layer</div>
              {Object.entries(report.revenue_target_layer).map(([k, v]: any) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  {typeof v === "boolean" ? (v ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <AlertTriangle className="h-3 w-3 text-amber-400" />) : <span className="font-mono text-[10px]">{String(v)}</span>}
                  {k}
                </div>
              ))}
            </div>
            <div className="rounded border border-border/40 p-3">
              <div className="font-medium mb-1 flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> Safety audit</div>
              {Object.entries(report.safety_audit).map(([k, v]: any) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  {v ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <AlertTriangle className="h-3 w-3 text-red-400" />}
                  {k}
                </div>
              ))}
            </div>
          </div>
        )}

        {report?.blockers?.length > 0 && (
          <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <div className="font-medium text-amber-300 mb-1">Blockers</div>
            <ul className="list-disc ml-5 text-xs">
              {report.blockers.map((b: string, i: number) => <li key={i}>{b}</li>)}
            </ul>
          </div>
        )}

        {report?.next_actions?.length > 0 && (
          <div className="rounded border border-border/40 p-3 text-sm">
            <div className="font-medium mb-1">First 10 actions</div>
            <ol className="list-decimal ml-5 text-xs space-y-0.5">
              {report.next_actions.map((b: string, i: number) => <li key={i}>{b}</li>)}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FinalGoToUseReadinessPanel;