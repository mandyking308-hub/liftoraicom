import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, ShieldAlert, ShieldCheck, Zap } from "lucide-react";
import { KNOWN_DIRECT_AI_CALLERS } from "@/services/aiGateway";

type Status = "live_healthy" | "live_watch" | "live_bypass_detected" | "live_cost_alert" | "live_risk_alert" | "live_founder_pause";
const STATUS_LABEL: Record<Status, string> = {
  live_healthy: "Live — Healthy",
  live_watch: "Live — Watch",
  live_bypass_detected: "Live — Bypass Detected",
  live_cost_alert: "Live — Cost Alert",
  live_risk_alert: "Live — Risk Alert",
  live_founder_pause: "Live — Founder Pause Active",
};
const STATUS_TONE: Record<Status, string> = {
  live_healthy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  live_watch: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  live_bypass_detected: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  live_cost_alert: "bg-destructive/10 text-destructive border-destructive/30",
  live_risk_alert: "bg-destructive/10 text-destructive border-destructive/30",
  live_founder_pause: "bg-muted text-muted-foreground border-border",
};

export default function AIGatewayHealthPanel() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const sinceIso = today.toISOString();

  const { data: stats } = useQuery({
    queryKey: ["ai_gateway_health", sinceIso],
    queryFn: async () => {
      const [
        gatewayRows, approvalRows, failedRows, alertRows, securityRows, missingPricing,
      ] = await Promise.all([
        supabase.from("ai_usage_ledger").select("id,estimated_cost,status,model_used,audit_metadata,roi_estimate", { count: "exact" }).gte("created_at", sinceIso),
        supabase.from("ai_usage_ledger").select("id", { count: "exact", head: true }).eq("status", "human_review_required").gte("created_at", sinceIso),
        supabase.from("ai_usage_ledger").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", sinceIso),
        supabase.from("ai_cost_alerts").select("id,severity,alert_type", { count: "exact" }).gte("created_at", sinceIso),
        supabase.from("ai_cost_alerts").select("id", { count: "exact", head: true }).in("alert_type", ["prompt_injection", "redaction"]).gte("created_at", sinceIso),
        supabase.from("ai_cost_alerts").select("id", { count: "exact", head: true }).eq("alert_type", "pricing_missing").gte("created_at", sinceIso),
      ]);

      const rows = (gatewayRows.data ?? []) as any[];
      const totalCalls = gatewayRows.count ?? rows.length;
      const enforcedCalls = rows.filter((r) => r?.audit_metadata?.enforced_by?.startsWith?.("aiGateway") || r?.audit_metadata?.enforced_by === "edge:aiGateway").length;
      const totalCost = rows.reduce((a, r) => a + Number(r.estimated_cost || 0), 0);
      const highest = rows.reduce((max, r) => Number(r.estimated_cost || 0) > Number(max?.estimated_cost || 0) ? r : max, rows[0]);
      const lowestRoi = rows.filter((r) => r.roi_estimate != null).reduce((min, r) => Number(r.roi_estimate) < Number(min?.roi_estimate ?? Infinity) ? r : min, undefined as any);
      const blockedCalls = rows.filter((r) => r.status === "blocked").length;
      const failedCalls = failedRows.count ?? 0;
      const approvalCalls = approvalRows.count ?? 0;
      const alerts = alertRows.count ?? 0;
      const securityEvents = securityRows.count ?? 0;
      const missing = missingPricing.count ?? 0;

      return {
        totalCalls, enforcedCalls, blockedCalls, failedCalls, approvalCalls,
        alerts, securityEvents, missing,
        avgCost: totalCalls ? totalCost / totalCalls : 0,
        highest: highest ? Number(highest.estimated_cost || 0) : 0,
        highestModel: highest?.model_used ?? "—",
        lowestRoi: lowestRoi ? Number(lowestRoi.roi_estimate) : null,
      };
    },
    refetchInterval: 60_000,
  });

  const status: Status = useMemo(() => {
    if (!stats) return "live_healthy";
    if (stats.securityEvents > 0) return "live_risk_alert";
    if (stats.alerts > 5 || stats.failedCalls > 10) return "live_cost_alert";
    if (KNOWN_DIRECT_AI_CALLERS.length > 0) return "live_bypass_detected";
    if (stats.missing > 0 || stats.approvalCalls > 5) return "live_watch";
    return "live_healthy";
  }, [stats]);

  const tiles: Array<[string, string | number, string?]> = stats ? [
    ["Gateway calls today", stats.totalCalls],
    ["Enforced via aiGateway", stats.enforcedCalls],
    ["Bypass / direct (pending migration)", KNOWN_DIRECT_AI_CALLERS.length, "amber"],
    ["Blocked calls", stats.blockedCalls, stats.blockedCalls ? "amber" : ""],
    ["Approval required", stats.approvalCalls, stats.approvalCalls ? "amber" : ""],
    ["Failed calls", stats.failedCalls, stats.failedCalls ? "red" : ""],
    ["Missing pricing", stats.missing, stats.missing ? "amber" : ""],
    ["Redaction / injection events", stats.securityEvents, stats.securityEvents ? "red" : ""],
    ["Avg cost / call", `£${stats.avgCost.toFixed(4)}`],
    ["Highest cost call", `£${stats.highest.toFixed(4)}`],
  ] : [];

  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" /> AI Gateway Health
            <Badge variant="outline" className={`ml-2 ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</Badge>
          </CardTitle>
          <span className="text-[11px] text-muted-foreground">
            All AI calls in Liftor must route through <code className="text-primary">aiGateway</code>.
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {tiles.map(([label, value, tone]) => (
            <div key={label as string} className="rounded-lg border border-border bg-card/60 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
              <div className={`text-lg font-semibold ${tone === "red" ? "text-destructive" : tone === "amber" ? "text-amber-400" : "text-foreground"}`}>{value}</div>
            </div>
          ))}
        </div>

        {KNOWN_DIRECT_AI_CALLERS.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
              <AlertTriangle className="h-4 w-4" /> Direct AI calls detected — pending migration to aiGateway
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              These edge functions currently call the model provider directly. They continue to run live, but are not yet routed through the central enforcement layer. Each one should be migrated to <code>supabase/functions/_shared/aiGateway.ts</code>.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {KNOWN_DIRECT_AI_CALLERS.map((f) => (
                <code key={f.name} className="text-[10px] px-2 py-0.5 rounded border border-amber-500/30 text-amber-300 bg-amber-500/5">
                  {f.name}
                </code>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-primary mt-0.5" />
          <div>
            <div className="font-medium text-foreground mb-1">Enforcement rule</div>
            All AI calls must go through <code className="text-primary">aiGateway</code>. Direct provider calls are not permitted because they bypass cost control, audit logging, security checks, budgets, stop-loss and ROI tracking. The gateway assigns a <code>trace_id</code> to every call and writes it into <code>ai_usage_ledger.audit_metadata.trace_id</code>.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}