import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Rocket, RefreshCw, ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  loadMondayReadiness, STATUS_CLS, CHECK_STATUS_CLS,
} from "@/lib/mondayReadinessEngine";

export default function FounderMondayLaunchPanel() {
  const qc = useQueryClient();
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["monday_readiness"],
    queryFn: loadMondayReadiness,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <Card className="tech-card">
        <CardContent className="p-6 text-sm text-muted-foreground">Running readiness verification…</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="tech-card">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" />
              Monday Launch Readiness
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Last verified {new Date(dataUpdatedAt).toLocaleTimeString()} · confidence {data.confidence}%
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={STATUS_CLS[data.status]}>{data.status.replace("_", " ")}</Badge>
            <Button size="sm" variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["monday_readiness"] })}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Re-verify
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-end justify-between mb-1">
              <span className="text-4xl font-semibold tracking-tight">{data.score}<span className="text-base text-muted-foreground">/100</span></span>
              <span className="text-xs text-muted-foreground">{data.recommendation}</span>
            </div>
            <Progress value={data.score} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <Stat icon={<ShieldAlert className="w-3.5 h-3.5" />} label="Blockers" value={data.blockers.length} cls="text-rose-300" />
            <Stat icon={<AlertTriangle className="w-3.5 h-3.5" />} label="Warnings" value={data.warnings.length} cls="text-amber-300" />
            <Stat icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Passing" value={data.checks.filter((c) => c.status === "pass").length} cls="text-emerald-300" />
          </div>
        </CardContent>
      </Card>

      {data.blockers.length > 0 && (
        <Card className="tech-card border-rose-400/30">
          <CardHeader><CardTitle className="text-rose-300 text-base">Blockers ({data.blockers.length})</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.blockers.map((b) => <CheckLine key={b.id} c={b} />)}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="tech-card">
        <CardHeader><CardTitle className="text-base">All Checks ({data.checks.length})</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.checks.map((c) => <CheckLine key={c.id} c={c} />)}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon, label, value, cls }: { icon: React.ReactNode; label: string; value: number; cls: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 py-3">
      <div className={`flex items-center justify-center gap-1 ${cls}`}>{icon}<span className="text-lg font-semibold">{value}</span></div>
      <div className="text-muted-foreground text-[10px] uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}

function CheckLine({ c }: { c: ReturnType<typeof Object> & { id: string; label: string; status: any; score: number; message: string; fix?: string } }) {
  return (
    <li className="rounded-md border border-border/60 bg-background/40 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{c.label}</span>
          <Badge variant="outline" className={CHECK_STATUS_CLS[c.status as keyof typeof CHECK_STATUS_CLS]}>{c.status}</Badge>
          <span className="text-xs text-muted-foreground">score {c.score}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">{c.message}</div>
        {c.fix && <div className="text-xs text-primary mt-1">Fix: {c.fix}</div>}
      </div>
    </li>
  );
}